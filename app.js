require('dotenv').config();

const { Sequelize } = require('sequelize');
const express = require('express');
const bodyParser = require('body-parser');
const firebase = require('firebase');
const Auth = require('./firebase.js');
const ejs = require('ejs');
const cookieParser = require('cookie-parser');
const admin = require('firebase-admin');
const path = require('path');
const { Op } = require('sequelize');

const app = express();
const publicDir = require('path').join(__dirname, '/public');

//banco
const db = require('./db.js');
const { Clientes, Barbeiros, Servicos, Agendamentos, HorariosDisponiveis } = require('./db');
const { criarCliente } = require('./cliente.js');
const { obterUidPorEmail } = require('./cliente');
const { obterClientePorUid } = require('./cliente');

app.use(cookieParser());

var serviceAccount = {
    type: process.env.TYPE,
    project_id: process.env.PROJECT_ID,
    private_key_id: process.env.PRIVATE_KEY_ID,
    private_key: process.env.PRIVATE_KEY,
    client_email: process.env.CLIENT_EMAIL,
    client_id: process.env.CLIENT_ID,
    auth_uri: process.env.AUTH_URI,
    token_uri: process.env.TOKEN_URI,
    auth_provider_x509_cert_url: process.env.AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.CLIENT_X509_CERT_URL,
    universe_domain: process.env.UNIVERSE_DOMAIN
};

serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://login-studio-default-rtdb.firebaseio.com/'
});

const adminEmail = process.env.ADMIN_EMAIL; 

const authenticateAdmin = (req, res, next) => {
    if (req.cookies['userLogged'] === 'true') {
        const uid = req.cookies['uid'];
        admin.auth().getUser(uid)
            .then((userRecord) => {
                if (userRecord.customClaims && userRecord.customClaims.admin) {
                    next();
                } else {
                    res.redirect('/');
                }
            })
            .catch((error) => {
                console.error('Erro ao verificar o usuário:', error);
                res.redirect('/');
            });
    } else {
        res.redirect('/login');
    }
};

const authenticateUser = (req, res, next) => {
    if (req.cookies['userLogged'] === 'true') {
        const uid = req.cookies['uid'];
        admin.auth().getUser(uid)
            .then((userRecord) => {
                if (userRecord.customClaims && userRecord.customClaims.admin) {
                    res.redirect('/admin');
                } else {
                    next();
                }
            })
            .catch((error) => {
                console.error('Erro ao verificar o usuário:', error);
                res.redirect('/');
            });
    } else {
        res.redirect('/login');
    }
};


app.use((req, res, next) => {
    res.locals.userLogged = req.cookies['userLogged'] === 'true';
    next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(publicDir));
app.use('/', express.static(__dirname + '/www'));
app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js'));
app.use('/js', express.static(__dirname + '/node_modules/jquery/dist'));
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css'));
app.use('/style', express.static(__dirname + '/style/'));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');


app.get('/', (req, res) => {
    res.render('index', { userLogged: res.locals.userLogged });
});

app.get('/registro', (req, res) => {
    res.render('registro', { signUpError: null, loginError: null });
});

app.get('/login', (req, res) => {
    res.render('login', { signUpError: null, loginError: null });
});

app.get('/admin', authenticateAdmin, (req, res) => {
    res.render('admin', { userLogged: true });
});

app.post('/createuser', async (req, res) => {
    try {
        const { username, email, password } = req.body;
    
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const { uid } = userCredential.user;
    
        await criarCliente(username, email, uid);
    
        res.redirect('/login');
      } catch (error) {
        console.error('Erro ao registrar cliente:', error);
    
        let errorMessage = '';
        if (error.code === 'auth/email-already-in-use') {
          errorMessage = 'O e-mail já cadastrado. Por favor, escolha outro.';
        } else if (error.code === 'auth/weak-password') {
          errorMessage = 'A senha deve ter pelo menos 6 caracteres.';
        } else {
          errorMessage = 'Erro ao criar usuário: ' + error.message;
        }
        res.render('registro', { signUpError: errorMessage, loginError: null });
      }
    });

app.get('/logout', (req, res) => {
    res.clearCookie('userLogged');
    res.redirect('/login');
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        await Auth.SignInWithEmailAndPassword(email, password);

        const uid = await obterUidPorEmail(email);

        if (uid) {
            if (email === adminEmail) {
                await admin.auth().setCustomUserClaims(uid, { admin: true });
            }
            res.cookie('userLogged', true);
            res.cookie('uid', uid);
            if (email === adminEmail) {
                res.redirect('/admin');
            } else {
                res.redirect('/agenda');
            }
        } else {
            throw new Error('UID não encontrado');
        }
    } catch (error) {
        console.error('Erro ao autenticar usuário:', error);
        let errorMessage = "Usuário ou senha inválida!";
        if (error.message === 'UID não encontrado') {
            errorMessage = 'Erro interno. Por favor, tente novamente.';
        }
        res.render('login', { loginError: errorMessage, signUpError: null });
    }
});

app.get('/agenda', authenticateUser, async (req, res) => {
    try {
        const barbeiros = await Barbeiros.findAll();
        const servicos = await Servicos.findAll(); 
        res.render('agenda', { 
            userLogged: true, 
            barbeiros: barbeiros,
            servicos: servicos 
        });
    } catch (error) {
        console.error('Erro ao carregar os dados para a agenda:', error);
        res.status(500).send('Erro ao carregar a página de agenda');
    }
});

app.post('/add-barbeiro', async (req, res) => {
    try {
        const { nome } = req.body;
        await Barbeiros.create({ nome });
        res.redirect('/admin'); 
    } catch (error) {
        console.error('Erro ao adicionar barbeiro:', error);
        res.status(500).send('Erro ao adicionar barbeiro');
    }
});

app.post('/add-servico', async (req, res) => {
    try {
        const { descricao, duracao } = req.body;
        await Servicos.create({ descricao, duracao });
        res.redirect('/admin'); 
    } catch (error) {
        console.error('Erro ao adicionar serviço:', error);
        res.status(500).send('Erro ao adicionar serviço');
    }
});


app.post('/agendar', async (req, res) => {
    const { barbeiroId, servicoId, dataHora } = req.body;
    const servico = await Servicos.findByPk(servicoId);
    const dataHoraInicio = new Date(dataHora);
    const dataHoraFim = new Date(dataHoraInicio.getTime() + servico.duracao * 60000);

    const conflito = await Agendamentos.findOne({
        where: {
            barbeiroId: barbeiroId,
            [Sequelize.Op.or]: [
                {
                    dataHoraInicio: {
                        [Sequelize.Op.between]: [dataHoraInicio, dataHoraFim]
                    }
                },
                {
                    dataHoraFim: {
                        [Sequelize.Op.between]: [dataHoraInicio, dataHoraFim]
                    }
                }
            ]
        }
    });

    if (!conflito) {
        await Agendamentos.create({
            barbeiroId,
            servicoId,
            dataHoraInicio,
            dataHoraFim,
            clienteUid: req.cookies['uid'] 
        });
        res.send('Agendamento confirmado!');
    } else {
        res.send('Este horário já está ocupado.');
    }
});

// Rota para obter os horários disponíveis
app.get('/horarios-disponiveis', async (req, res) => {
    const { date } = req.query; 
    try {
        const availableTimes = await getAvailableTimesForDate(date);
        res.json(availableTimes);
    } catch (error) {
        console.error('Erro ao buscar horários disponíveis:', error);
        res.status(500).send('Erro ao buscar horários disponíveis');
    }
});

async function getAvailableTimesForDate(date) {
    try {
        const startOfDay = new Date(date);
        const endOfDay = new Date(startOfDay);
        endOfDay.setDate(endOfDay.getDate() + 1);

        const appointments = await Agendamentos.findAll({
            where: {
                dataHoraInicio: {
                    [Op.gte]: startOfDay,
                    [Op.lt]: endOfDay
                }
            },
            include: [{ model: Servicos }]
        });

        const availableTimes = await HorariosDisponiveis.findAll();

        const filteredTimes = availableTimes.filter(time => {
            const startTime = new Date(`${date}T${time.horario}`);
            const endTime = new Date(startTime.getTime() + (time.duracao * 60000));

            // Verifica se o novo horário inicia ou termina durante outro agendamento
            return !appointments.some(appointment => {
                const appointmentStart = new Date(appointment.dataHoraInicio);
                const appointmentEnd = new Date(appointment.dataHoraFim);

                return (
                    (startTime < appointmentEnd && startTime >= appointmentStart) ||
                    (endTime > appointmentStart && endTime <= appointmentEnd) ||
                    (startTime <= appointmentStart && endTime >= appointmentEnd)
                );
            });
        });

        return filteredTimes.map(time => time.horario);
    } catch (error) {
        throw new Error('Erro ao buscar horários disponíveis: ' + error.message);
    }
}

// Este código deve ser executado como um script de migração ou diretamente em seu servidor de aplicativos durante a inicialização

async function updateServiceDurations() {
    try {
        await Servicos.update({ duracao: 29 }, {
            where: {
                descricao: {
                    [Op.or]: ['Corte', 'Hidratação']
                }
            }
        });
        await Servicos.update({ duracao: 59 }, {
            where: {
                descricao: {
                    [Op.or]: ['Corte e Barba', 'Infantil']
                }
            }
        });
        console.log('Durações dos serviços atualizadas com sucesso.');
    } catch (error) {
        console.error('Erro ao atualizar as durações dos serviços:', error);
    }
}

updateServiceDurations(); // Chamar essa função no ponto apropriado de sua aplicação


app.use((req, res) => {
    res.redirect('/');
});

db.syncDB().then(() => {
    app.listen(process.env.PORT || 3000, () => {
        console.log('Servidor está rodando na porta:', process.env.PORT || 3000);
    });
}).catch(err => {
    console.error('Erro ao iniciar o servidor:', err);
});

module.exports = app;
