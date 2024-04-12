require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const firebase = require('firebase');
const Auth = require('./firebase.js');
const ejs = require('ejs');

let userLogged;
const app = express()
var publicDir = require('path').join(__dirname, '/public');

app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

app.use((req, res, next) => {
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            res.locals.userLogged = user;
        } else {
            res.locals.userLogged = null;
        }
        next(); 
    });
});


app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(publicDir));
app.use('/', express.static(__dirname + '/www'));
app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js'));
app.use('/js', express.static(__dirname + '/node_modules/jquery/dist'));
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css'));
app.use('/style', express.static(__dirname + '/style/'));
app.set('view engine', 'ejs');

firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        userLogged = user
    } else {
        userLogged = null
    }
})

app.get('/', (req, res) => {
    res.render('index', { userLogged: res.locals.userLogged });
});

app.get('/registro', function (req, res) {
    res.render('registro', { signUpError: null, loginError: null });
});

app.get('/login', function (req, res) {
    res.render('login', { signUpError: null, loginError: null });
});

app.get('/agenda', function (req, res) {
    res.render('agenda', { signUpError: null, loginError: null });
});

app.post('/createuser', (req, res) => {
    Auth.SignUpWithEmailAndPassword(req.body.email, req.body.password)
        .then((user) => {
            if (!user.err) {
                let userData = JSON.parse(user);
                Auth.insertUserData(userData).then(() => {
                    res.redirect('/login');
                }).catch(err => {
                    res.render('registro', { signUpError: "Erro ao inserir dados do usuário: " + err.message, loginError: null });
                });
            } else {
                if (user.err === 'auth/email-already-in-use') {
                    res.render('registro', { signUpError: "O email já está em uso.", loginError: null });
                } else if (user.err === 'auth/weak-password') {
                    res.render('registro', { signUpError: "A senha deve ter pelo menos 6 caracteres.", loginError: null });
                } else {
                    res.render('registro', { signUpError: "Erro ao criar usuário: " + user.err, loginError: null });
                }
            }
        });
});

app.post('/login', (req, res) => {
    let getBody = req.body;
    Auth.SignInWithEmailAndPassword(getBody.email, getBody.password)
        .then(() => {
            res.redirect('/');
        })
        .catch(loginError => {
            let errorMessage = "Usuário ou senha inválida!";
            res.render('login', { loginError: errorMessage, signUpError: null });
        });
});

app.get('/agendar', function (req, res) {
    if (userLogged) {
        res.render('agenda', { signUpError: null, loginError: null });
    } else {
        res.redirect('/login');
    }
});

app.get('/logout', (req, res) => {
    firebase.auth().signOut().then(() => {
        res.redirect('/login');
    }).catch((error) => {
        console.error('Erro durante o logout:', error);
        res.redirect('/login');
    });
});




app.listen(process.env.PORT || 3000)