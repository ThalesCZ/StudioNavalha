require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const firebase = require('firebase');
const Auth = require('./firebase.js');
const ejs = require('ejs');
const cookieParser = require('cookie-parser');
const admin = require('firebase-admin');
const path = require('path');

const app = express();
const publicDir = require('path').join(__dirname, '/public');

//banco
const pool = require('./db.js');


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

app.get('/agenda', authenticateUser, (req, res) => {
    res.render('agenda', { userLogged: true });
});



app.post('/createuser', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const { uid } = userCredential.user;

        const query = `
            INSERT INTO cliente (nome, email, uid)
            VALUES ($1, $2, $3)
        `;
        const values = [username, email, uid];
        await pool.query(query, values);

        res.redirect('/login');
    } catch (error) {
        console.error('Erro ao registrar cliente:', error);
        res.render('registro', { signUpError: "Ocorreu um erro ao processar o registro." });
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

        const userRecord = await admin.auth().getUserByEmail(email);
        const uid = userRecord.uid;

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
    } catch (error) {
        console.error('Erro durante o login:', error);
        let errorMessage = "Usuário ou senha inválida!";
        res.render('login', { loginError: errorMessage, signUpError: null });
    }
});


  

app.use((req, res) => {
    res.redirect('/');
});


app.listen(process.env.PORT || 3000);
