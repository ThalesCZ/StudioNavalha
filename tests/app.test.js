const request = require('supertest');
const app = require('../app'); // O arquivo onde seu express app está definido

describe('Testando rotas', () => {
    it('Deve retornar o status 200 na rota GET /', async () => {
        const res = await request(app).get('/');
        expect(res.statusCode).toEqual(200);
        expect(res.text).toContain('Studio Navalha'); // Alterar conforme o conteúdo esperado
    });

    it('Deve retornar o status 200 na rota GET /login', async () => {
        const res = await request(app).get('/login');
        expect(res.statusCode).toEqual(200);
        expect(res.text).toContain('Login'); // Alterar conforme o conteúdo esperado
    });

    it('Deve retornar o status 200 na rota GET /registro', async () => {
        const res = await request(app).get('/registro');
        expect(res.statusCode).toEqual(200);
        expect(res.text).toContain('Registro'); // Alterar conforme o conteúdo esperado
    });

    it('Deve retornar erro ao tentar fazer login com credenciais inválidas', async () => {
        const res = await request(app)
            .post('/login')
            .send({ email: 'invalid@example.com', password: 'wrongpassword' });
        expect(res.statusCode).toEqual(200);
        expect(res.text).toContain('Usuário ou senha inválida!'); // Alterar conforme o conteúdo esperado
    });

    it('Deve retornar erro ao tentar criar usuário com email já existente', async () => {
        const res = await request(app)
            .post('/createuser')
            .send({
                username: 'admin',
                email: 'admin@gmail.com', // Use um e-mail que você sabe que já existe no sistema
                password: 'password123'
            });
        expect(res.statusCode).toEqual(200); // Verifica se o status da resposta é 200
        expect(res.text).toContain('O e-mail já cadastrado. Por favor, escolha outro.'); // Verifica a mensagem de erro
    });

    it('Deve retornar erro ao tentar criar usuário com senha fraca', async () => {
        const res = await request(app)
            .post('/createuser')
            .send({
                username: 'test',
                email: 'n11e1aaw@gmail.com',
                password: '123' // Use uma senha fraca que deve falhar na validação
            });
        expect(res.statusCode).toEqual(200); // Verifica se o status da resposta é 200
        expect(res.text).toContain('A senha deve ter pelo menos 6 caracteres.'); // Verifica a mensagem de erro
    });

    it('Deve criar usuário com sucesso', async () => {
        const res = await request(app)
            .post('/createuser')
            .send({
                username: 'testuser',
                email: 'ne2w11user1@example.com', // Use um e-mail que você sabe que não existe no sistema
                password: 'strongpassword123'
            });
        expect(res.statusCode).toBe(200); // Verifica se o status da resposta é 302 para redirecionamento
        expect(res.header.location).toBe('/login'); // Verifica se o redirecionamento é para /login
    });

    it('Deve redirecionar para /login se não estiver autenticado como admin na rota GET /admin', async () => {
        const res = await request(app).get('/admin');
        expect(res.statusCode).toEqual(302);
        expect(res.header.location).toBe('/login');
    });

    it('Deve redirecionar para /login se não estiver autenticado como usuário na rota GET /agenda', async () => {
        const res = await request(app).get('/agenda');
        expect(res.statusCode).toEqual(302);
        expect(res.header.location).toBe('/login');
    });

    it('Deve retornar erro ao tentar adicionar barbeiro sem estar autenticado como admin', async () => {
        const res = await request(app)
            .post('/add-barbeiro')
            .send({ nome: 'Novo Barbeiro' });
        expect(res.statusCode).toEqual(302);
        expect(res.header.location).toBe('/login');
    });
});
