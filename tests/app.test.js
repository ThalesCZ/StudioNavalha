const { SignUpWithEmailAndPassword, SignInWithEmailAndPassword } = require('../firebase');
const request = require('supertest');
const app = require('../app');

describe('Firebase Auth', () => {
  test('registro firebase com email e senha', async () => {
    const email = 'test@example.com';
    const password = 'password123';
    const user = await SignUpWithEmailAndPassword(email, password);
    const parsedUser = JSON.parse(user);
    expect(parsedUser).toHaveProperty('email', email);
  });

  test('logar firebase com email e senha', async () => {
    const email = 'test@example.com';
    const password = 'password123';
    const user = await SignInWithEmailAndPassword(email, password);
    expect(user).toHaveProperty('email', email);
  });
});

describe('Rotas do aplicativo', () => {
  test('POST /createuser deve criar um usuário e redirecionar para /login', async () => {
    const response = await request(app)
      .post('/createuser')
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });

    expect(response.status).toBe(200); // Verifica se a resposta foi bem-sucedida
    expect(response.text).toContain('login'); // Verifica se redireciona para a página de login
  });

  describe('GET /admin', () => {
    it('deve retornar 200 se autenticado como admin', async () => {
        process.env.NODE_ENV = 'test'; // Definindo o ambiente de teste
        const response = await request(app)
            .get('/admin')
            .set('Cookie', ['userLogged=true', 'uid=test-admin-uid']);
        expect(response.statusCode).toBe(200);
    });

    it('deve redirecionar para /login se não autenticado', async () => {
        const response = await request(app).get('/admin');
        expect(response.statusCode).toBe(302);
        expect(response.headers.location).toBe('/login');
    });
});

  // test('DELETE /delete-barbeiro deve deletar um barbeiro e retornar status 302', async () => {
  //   // Simular a autenticação do administrador para o teste
  //   app.use((req, res, next) => {
  //       req.cookies['userLogged'] = 'true';
  //       req.cookies['uid'] = 'test-admin-uid';
  //       req.isAdmin = true; // Adiciona uma flag para simular o administrador
  //       next();
  //   });

  //   const response = await request(app)
  //       .post('/delete-barbeiro') // Certifique-se de usar o método POST conforme a rota definida
  //       .send({
  //           barbeiroId: 2 // Enviando barbeiroId como esperado pela rota
  //       });

  //   // Verifica se a resposta tem status 302 (redirecionamento)
  //   expect(response.status).toEqual(302);

  //   // Verifica se a resposta redireciona para a localização correta
  //   expect(response.header.location).toEqual('/admin?message=Barbeiro excluído com sucesso');
  // });

});
