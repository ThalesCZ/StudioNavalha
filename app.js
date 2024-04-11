require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const firebase = require('firebase');
const Auth = require('./firebase.js');
const ejs = require('ejs');

let userLogged;
const app = express()
var publicDir = require('path').join(__dirname,'/public');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(publicDir));
app.use('/', express.static(__dirname + '/www')); 
app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js')); 
app.use('/js', express.static(__dirname + '/node_modules/jquery/dist')); 
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css'));
app.use('/style', express.static(__dirname + '/style/')); 
app.set('view engine', 'ejs');

firebase.auth().onAuthStateChanged((user) => {
    if(user){
        userLogged = user
    } else {
        userLogged = null
    }
})

app.get('/', (req, res) => {
    res.render('index', { signUpError: null, loginError: null });
})

app.get('/registro', function(req, res){
    res.render('registro', { signUpError: null, loginError: null });
});

app.get('/login', function(req, res){
    res.render('login', { signUpError: null, loginError: null });
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
            let errorMessage = loginError.err === 'auth/wrong-password' ? "Senha incorreta." : "Erro ao fazer login.";
            res.render('login', { loginError: errorMessage, signUpError: null });
        });
});



app.get('/index', function(req, res){
    if(userLogged){
        Auth.GetData().then((data) => {
            res.render('index', {data});
        })
    }else{
        res.redirect('/login')
    }
});



app.listen(process.env.PORT || 3000)