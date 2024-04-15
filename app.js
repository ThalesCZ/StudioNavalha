    require('dotenv').config();

    const express = require('express');
    const bodyParser = require('body-parser');
    const firebase = require('firebase');
    const Auth = require('./firebase.js');
    const ejs = require('ejs');
    const cookieParser = require('cookie-parser');

    const app = express();
    const publicDir = require('path').join(__dirname, '/public');



    app.use(cookieParser());


    const authenticateUser = (req, res, next) => {
        if (req.cookies['userLogged'] === 'true') {
            next(); // Se o usuário estiver autenticado, continua para a próxima rota
        } else {
            res.redirect('/login'); // Se o usuário não estiver autenticado, redireciona para a página de login
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

    app.get('/agenda', authenticateUser, (req, res) => {
        res.render('agenda', { userLogged: true });
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

    app.get('/logout', (req, res) => {
        res.clearCookie('userLogged');
        res.redirect('/login');
    });

    app.post('/login', (req, res) => {
        const { email, password } = req.body;
        Auth.SignInWithEmailAndPassword(email, password)
            .then(() => {
                res.cookie('userLogged', true);
                res.redirect('/');
            })
            .catch(loginError => {
                let errorMessage = "Usuário ou senha inválida!";
                res.render('login', { loginError: errorMessage, signUpError: null });
            });
    });

    app.listen(process.env.PORT || 3000);
