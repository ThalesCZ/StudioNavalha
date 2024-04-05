const express = require('express');
const firebaseAdmin = require('firebase-admin');

// Inicializa o Firebase Admin SDK com as credenciais do seu projeto Firebase
const serviceAccount = require('./serviceAccountKey.json'); // Substitua pelo caminho do seu arquivo de chave do serviço Firebase
firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount),
});

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, 'public')));


// Middleware para verificar o token JWT enviado nos cabeçalhos da solicitação
const authenticateUser = async (req, res, next) => {
  const idToken = req.headers.authorization;
  if (!idToken) {
    return res.status(401).send('Token de autenticação não fornecido.');
  }

  try {
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(401).send('Token de autenticação inválido.');
  }
};

// Rota de autenticação para criar um novo usuário
app.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  try {
    const userRecord = await firebaseAdmin.auth().createUser({
      email,
      password,
    });
    res.status(201).send(`Usuário criado: ${userRecord.uid}`);
  } catch (error) {
    res.status(400).send('Erro ao criar usuário: ' + error.message);
  }
});

// Rota de autenticação para fazer login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const userCredential = await firebaseAdmin.auth().signInWithEmailAndPassword(email, password);
    const token = await userCredential.user.getIdToken();
    res.status(200).send(token);
  } catch (error) {
    res.status(401).send('Credenciais inválidas.');
  }
});

// Rota protegida que requer autenticação
app.get('/protected', authenticateUser, (req, res) => {
  res.send('Conteúdo protegido!');
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
