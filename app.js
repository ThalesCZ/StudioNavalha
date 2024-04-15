    require('dotenv').config();

    const express = require('express');
    const bodyParser = require('body-parser');
    const firebase = require('firebase');
    const Auth = require('./firebase.js');
    const ejs = require('ejs');
    const cookieParser = require('cookie-parser');
    const admin = require('firebase-admin');

    const app = express();
    const publicDir = require('path').join(__dirname, '/public');



    app.use(cookieParser());

    const serviceAccount = require('./serviceAccountKey.json');

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: 'https://login-studio-default-rtdb.firebaseio.com/'
      });

      const uid = 'yKWwU1bJncRFiY9gN7igEWQPNoK2';

      admin.auth().setCustomUserClaims(uid, { admin: true })
        .then(() => {
        })
        .catch(error => {
          console.error('Erro ao atribuir custom claim de administrador ao usuário:', error);
        });
      

    const authenticateUser = (req, res, next) => {
        if (req.cookies['userLogged'] === 'true') {
            next(); 
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

    app.get('/admin', authenticateUser, (req, res) => {
        res.render('admin', { userLogged: true });
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
                admin.auth().getUserByEmail(email)
                    .then((userRecord) => {
                        const uid = userRecord.uid;
                        admin.auth().getUser(uid)
                            .then((userRecord) => {
                                if (userRecord.customClaims && userRecord.customClaims.admin) {
                                    res.cookie('userLogged', true);
                                    res.redirect('/admin');
                                } else {
                                    res.cookie('userLogged', true);
                                    res.redirect('/');
                                }
                            })
                            .catch((error) => {
                                console.error('Erro ao obter o usuário do Firebase:', error);
                                res.redirect('/');
                            });
                    })
                    .catch((error) => {
                        console.error('Erro ao obter o usuário do Firebase:', error);
                        res.redirect('/');
                    });
            })
            .catch(loginError => {
                let errorMessage = "Usuário ou senha inválida!";
                res.render('login', { loginError: errorMessage, signUpError: null });
            });
    });
    

    app.listen(process.env.PORT || 3000);
