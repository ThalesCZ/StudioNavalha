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

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//banco
const db = require('./db.js');
const { Clientes, Barbeiros, Servicos, Agendamentos, HorariosDisponiveis } = require('./db');
const { criarCliente, obterUidPorEmail, obterClientePorUid, getAvailableDurationsForDate, carregarAgendamentos } = require('./cliente.js');

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
    console.log('Middleware authenticateAdmin chamado');
    if (process.env.NODE_ENV === 'test') {
        req.cookies['userLogged'] = 'true';
        req.cookies['uid'] = 'test-admin-uid';
        req.isAdmin = true; 
        return next();
    }

    if (req.cookies['userLogged'] === 'true') {
        const uid = req.cookies['uid'];
        admin.auth().getUser(uid)
            .then((userRecord) => {
                if (userRecord.customClaims && userRecord.customClaims.admin) {
                    console.log('Usuário é um administrador');
                    next();
                } else {
                    console.log('Usuário não é um administrador');
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
    if (process.env.NODE_ENV === 'test') {
        req.cookies['userLogged'] = 'true';
        req.cookies['uid'] = 'test-user-uid';
        return next();
    }

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
    res.render('login', { signUpSuccess: null, loginError: null });
});

app.get('/logout', (req, res) => {
    res.clearCookie('userLogged');
    res.redirect('/login');
});

app.get('/admin', authenticateAdmin, async (req, res) => {
    try {
        let barbeiroId = req.query.barbeiro;
        const barbeiros = await Barbeiros.findAll();

        if (!barbeiroId && barbeiros.length > 0) {
            barbeiroId = barbeiros[0].id;
        }

        const agendamentos = await carregarAgendamentos(barbeiroId);
        const servicos = await Servicos.findAll();
        const message = req.query.message;
        const errorMessage = req.query.errorMessage;

        res.render('admin', { 
            userLogged: true, 
            servicos, 
            barbeiros, 
            agendamentos, 
            selectedBarbeiroId: parseInt(barbeiroId, 10), 
            message, 
            errorMessage 
        });
    } catch (error) {
        console.error('Erro ao carregar os serviços:', error);
        res.status(500).send('Erro ao carregar a página de administração');
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

app.get('/horarios-disponiveis', authenticateUser, async (req, res) => {
    const { date, barbeiroId } = req.query; 
    try {
        const availableTimes = await getAvailableDurationsForDate(date, barbeiroId);
        res.json(availableTimes);
    } catch (error) {
        console.error('Erro ao buscar horários disponíveis:', error);
        res.status(500).send('Erro ao buscar horários disponíveis');
    }
});

app.post('/admin/select-barbeiro', authenticateAdmin, async (req, res) => {
    try {
        const { barbeiroId } = req.body;
        res.redirect(`/admin?barbeiro=${barbeiroId}`);
    } catch (error) {
        console.error('Erro ao selecionar o barbeiro:', error);
        res.status(500).send('Erro ao selecionar o barbeiro');
    }
});

app.post('/excluir-agendamento', authenticateAdmin, async (req, res) => {
    try {
        const { agendamentoId } = req.body;
        await Agendamentos.destroy({ where: { id: agendamentoId } });
        res.redirect('/admin?message=Agendamento excluído com sucesso');
    } catch (error) {
        console.error('Erro ao excluir agendamento:', error);
        res.status(500).send('Erro ao excluir agendamento');
    }
});

app.post('/createuser', async (req, res) => {
    try {
        const { username, email, password } = req.body;
    
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const { uid } = userCredential.user;
    
        await criarCliente(username, email, uid);
    
        res.render('login', { signUpSuccess: true, loginError: null });
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
        res.render('login', { signUpSuccess: null, loginError: errorMessage });
    }
});

app.post('/add-barbeiro', authenticateAdmin, async (req, res) => {
    try {
        const { nome } = req.body;
        await Barbeiros.create({ nome });
        res.redirect('/admin?message=Barbeiro adicionado com sucesso');
    } catch (error) {
        console.error('Erro ao adicionar barbeiro:', error);
        res.status(500).send('Erro ao adicionar barbeiro');
    }
});

app.post('/delete-barbeiro', authenticateAdmin, async (req, res) => {
    try {
        const { barbeiroId } = req.body;
        await Barbeiros.destroy({ where: { id: barbeiroId } });
        res.redirect(`/admin?message=Barbeiro excluído com sucesso`);
    } catch (error) {
        console.error('Erro ao excluir barbeiro:', error);
        res.redirect(`/admin?errorMessage=Exclua todos os agendamentos relacionados a este serviço antes!`);
        res.status(500).send('Erro ao excluir barbeiro');
    }
});

app.post('/add-servico', authenticateAdmin, async (req, res) => {
    try {
        const { descricao, duracao, preco } = req.body;
        await Servicos.create({ descricao, duracao, preco });
        res.redirect('/admin?message=Serviço adicionado com sucesso');
    } catch (error) {
        console.error('Erro ao adicionar serviço:', error);
        res.status(500).send('Erro ao adicionar serviço');
    }
});

app.post('/delete-servico', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.body;
        await Servicos.destroy({ where: { id: id } });
        res.redirect('/admin');
    } catch (error) {
        console.error('Erro ao excluir serviço:', error);
        res.redirect('/admin?errorMessage=Exclua todos os agendamentos relacionados a este serviço antes!');
    }
});

app.post('/agendar', async (req, res) => {
    try {
        const { barbeiroId, servicoId, dataHora } = req.body;
        const servico = await Servicos.findByPk(servicoId);

        if (!servico) {
            return res.status(404).send('Serviço não encontrado.');
        }

        const dataHoraInicio = new Date(dataHora);
        const dataHoraFim = new Date(dataHoraInicio.getTime() + servico.duracao * 60000);

        const conflito = await Agendamentos.findOne({
            where: {
                barbeiroId: barbeiroId,
                [Op.or]: [
                    {
                        dataHoraInicio: {
                            [Op.lt]: dataHoraFim,
                            [Op.gte]: dataHoraInicio
                        }
                    },
                    {
                        dataHoraFim: {
                            [Op.gt]: dataHoraInicio,
                            [Op.lte]: dataHoraFim
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
            res.redirect('/meus_agendamentos');
        } else {
            res.status(409).send('Este horário já está ocupado.');
        }
    } catch (error) {
        console.error('Erro ao agendar:', error);
        res.status(500).send('Erro ao agendar.');
    }
});


app.get('/meus_agendamentos', authenticateUser, async (req, res) => {
    try {
        const uid = req.cookies['uid'];
        const agendamentos = await Agendamentos.findAll({
            where: { clienteUid: uid },
            include: [
                { model: Barbeiros },
                { model: Servicos }
            ],
            order: [
                ['dataHoraInicio', 'DESC'],
            ]
        });

        res.render('meus_agendamentos', { 
            userLogged: true, 
            agendamentos 
        });
    } catch (error) {
        console.error('Erro ao carregar os agendamentos do cliente:', error);
        res.status(500).send('Erro ao carregar os agendamentos');
    }
});

app.delete('/excluir-agendamento/:id', authenticateUser, async (req, res) => {
    try {
        const agendamentoId = req.params.id;
        const agendamento = await Agendamentos.findByPk(agendamentoId);

        if (!agendamento) {
            return res.status(404).send('Agendamento não encontrado.');
        }

        const dataHoraInicio = new Date(agendamento.dataHoraInicio);
        if (dataHoraInicio < new Date()) {
            return res.status(403).send('Não é possível excluir agendamentos passados.');
        }

        await agendamento.destroy();
        res.status(200).send('Agendamento excluído com sucesso.');
    } catch (error) {
        console.error('Erro ao excluir agendamento:', error);
        res.status(500).send('Erro ao excluir agendamento.');
    }
});


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
