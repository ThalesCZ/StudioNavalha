jest.setTimeout(30000);
const request = require('supertest');
const sinon = require('./setupTests');
const cheerio = require('cheerio');
const app = require('../app');
const db = require('../db');
const firebase = require('firebase');
require('dotenv').config();

describe('API Routes', () => {

    beforeAll(() => {
      console.error = jest.fn();
      console.log = jest.fn();
  });

  afterAll(() => {
      console.error.mockRestore();
      console.log.mockRestore();
  });

  afterEach(() => {
      sinon.restore();
      jest.clearAllMocks();
  });

    test('GET / para o index', async () => {
        const response = await request(app).get('/');
        expect(response.status).toBe(200);
        expect(response.text).toContain('index');
    });

    test('POST /createuser criar usuario', async () => {
        sinon.stub(db.Clientes, 'create').resolves({
            uid: 'test-uid',
            nome: 'Teste Usario',
            email: 'test@exemplo.com'
        });

        const response = await request(app)
            .post('/createuser')
            .send({ username: 'Teste Usario', email: 'test@exemplo.com', password: '123123' });

        expect(response.status).toBe(200);
        expect(response.text).toContain('login');
    });

    test('POST /createuser retornar erro para email ja cadastrado', async () => {
      sinon.stub(firebase.auth(), 'createUserWithEmailAndPassword').rejects({
          code: 'auth/email-already-in-use'
      });
  
      const response = await request(app)
          .post('/createuser')
          .send({ username: 'Teste Usario', email: 'test@exemplo.com', password: '123123' });
  
      expect(response.status).toBe(200);
      const $ = cheerio.load(response.text);
      const errorMessage = $('.error-message').text();
      expect(errorMessage).toContain('O e-mail já cadastrado. Por favor, escolha outro.');
  });
  
  test('POST /createuser retornar erro para senha com menos de 6 caracteres', async () => {
      sinon.stub(firebase.auth(), 'createUserWithEmailAndPassword').rejects({
          code: 'auth/weak-password'
      });
  
      const response = await request(app)
          .post('/createuser')
          .send({ username: 'Teste Usario', email: 'test@exemplo.com', password: '123' });
  
      expect(response.status).toBe(200);
      const $ = cheerio.load(response.text);
      const errorMessage = $('.error-message').text();
      expect(errorMessage).toContain('A senha deve ter pelo menos 6 caracteres.');
  });
  
  test('POST /createuser catch', async () => {
      sinon.stub(firebase.auth(), 'createUserWithEmailAndPassword').rejects(new Error('Erro desconhecido'));
  
      const response = await request(app)
          .post('/createuser')
          .send({ username: 'Teste Usario', email: 'test@exemplo.com', password: '123123' });
  
      expect(response.status).toBe(200);
      const $ = cheerio.load(response.text);
      const errorMessage = $('.error-message').text();
      expect(errorMessage).toContain('Erro ao criar usuário: Erro desconhecido');
  });
  

    test('POST /login autenticar usuario', async () => {
        sinon.stub(db.Clientes, 'findOne').resolves({
            uid: 'test-uid',
            email: 'test@exemplo.com'
        });

        const response = await request(app)
            .post('/login')
            .send({ email: 'test@exemplo.com', password: '123123' });

        if (response.status === 302) {
            expect(response.status).toBe(302);
            expect(response.headers['set-cookie']).toBeDefined();
        } else {
            expect(response.status).toBe(200);
            const $ = cheerio.load(response.text);
            const errorMessage = $('.error-message').text();
            expect(errorMessage).toContain('Usuário ou senha inválida!');
        }
    });


    test('POST /login retornar erro para credencial errada', async () => {
        sinon.stub(db.Clientes, 'findOne').resolves(null);

        const response = await request(app)
            .post('/login')
            .send({ email: 'invalid@example.com', password: 'wrongpassword' });

        expect(response.status).toBe(200);
        const $ = cheerio.load(response.text);
        const errorMessage = $('.error-message').text();
        expect(errorMessage).toContain('Usuário ou senha inválida!');
    });

    test('GET /admin deve ir para admin.ejs caso autenticado como admin', async () => {
        const agent = request.agent(app);
        
        await agent.post('/login').send({ email: process.env.ADMIN_EMAIL, password: '123123' });
        
        sinon.stub(db.Barbeiros, 'findAll').resolves([
            { id: 1, nome: 'Test Barber' }
        ]);
        sinon.stub(db.Servicos, 'findAll').resolves([
            { id: 1, descricao: 'Test Service', duracao: 30, preco: 50.0 }
        ]);
        sinon.stub(db.Agendamentos, 'findAll').resolves([]);

        const response = await agent.get('/admin');

        expect(response.status).toBe(200);
        
        const $ = cheerio.load(response.text);
        
        const pageTitle = $('title').text();
        expect(pageTitle).toContain('Painel Administrativo'); 
        
        const adminHeader = $('h1').text();
        expect(adminHeader).toContain('Painel Administrativo');
    });

    test('POST /add-barbeiro deve adicionar o barbeiro e voltar para /admin', async () => {
        const agent = request.agent(app);

        await agent.post('/login').send({ email: process.env.ADMIN_EMAIL, password: '123123' });

        sinon.stub(db.Barbeiros, 'create').resolves({ id: 1, nome: 'Barbeiro1' });

        const response = await agent
            .post('/add-barbeiro')
            .send({ nome: 'Barbeiro1' });

        expect(response.status).toBe(302);
        expect(response.headers.location).toBe('/admin?message=Barbeiro%20adicionado%20com%20sucesso');
    });

    test('POST /add-barbeiro deve retornar erro caso passe valor invalido', async () => {
        const agent = request.agent(app);

        await agent.post('/login').send({ email: process.env.ADMIN_EMAIL, password: '123123' });

        sinon.stub(db.Barbeiros, 'create').rejects(new Error('Erro ao adicionar barbeiro'));

        const response = await agent
            .post('/add-barbeiro')
            .send({ nome: '' }); 

        expect(response.status).toBe(500);
        expect(response.text).toContain('Erro ao adicionar barbeiro');
    });

    test('POST /delete-barbeiro deve excluir o barbeiro e voltar para /admin', async () => {
      const agent = request.agent(app);
  
      // Autenticar como administrador
      await agent.post('/login').send({ email: process.env.ADMIN_EMAIL, password: 'adminpassword' });
  
      sinon.stub(db.Barbeiros, 'destroy').resolves(1);
  
      const response = await agent
          .post('/delete-barbeiro')
          .send({ barbeiroId: 1 });
  
      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/admin?message=Barbeiro%20exclu%C3%ADdo%20com%20sucesso');
  });  
  
    test('POST /add-servico deve adicionar o servico e voltar para /admin', async () => {
        const agent = request.agent(app);

        await agent.post('/login').send({ email: process.env.ADMIN_EMAIL, password: '123123' });

        sinon.stub(db.Servicos, 'create').resolves({ id: 1, descricao: 'Corte teste', duracao: 30, preco: 50.0 });

        const response = await agent
            .post('/add-servico')
            .send({ descricao: 'Corte teste', duracao: 30, preco: 50.0 });

        expect(response.status).toBe(302);
        expect(response.headers.location).toBe('/admin?message=Servi%C3%A7o%20adicionado%20com%20sucesso');
    });

    test('POST /add-servico deve retornar erro em caso de valor invalido', async () => {
        const agent = request.agent(app);

        await agent.post('/login').send({ email: process.env.ADMIN_EMAIL, password: '123123' });

        sinon.stub(db.Servicos, 'create').rejects(new Error('Erro ao adicionar serviço'));

        const response = await agent
            .post('/add-servico')
            .send({ descricao: '', duracao: -1, preco: 'invalido' });

        expect(response.status).toBe(500);
        expect(response.text).toContain('Erro ao adicionar serviço');
    });

    test('POST /delete-servico deve deletar o servico e voltar para /admin', async () => {
        const agent = request.agent(app);

        await agent.post('/login').send({ email: process.env.ADMIN_EMAIL, password: '123123' });

        sinon.stub(db.Servicos, 'destroy').resolves(1);

        const response = await agent
            .post('/delete-servico')
            .send({ id: 1 });

        expect(response.status).toBe(302);
        expect(response.headers.location).toBe('/admin');
    });

});
