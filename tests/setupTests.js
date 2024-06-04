const SequelizeMock = require('sequelize-mock');
const sinon = require('sinon');
const db = require('../db');

const DBConnectionMock = new SequelizeMock();

const ClientesMock = DBConnectionMock.define('Clientes', {
    uid: 'test-uid',
    nome: 'Teste Usario',
    email: 'test@exemplo.com'
});

const BarbeirosMock = DBConnectionMock.define('Barbeiros', {
    id: 1,
    nome: 'Barbeiro1'
});

const ServicosMock = DBConnectionMock.define('Servicos', {
    id: 1,
    descricao: 'Teste',
    duracao: 30,
    preco: 50.0
});

const AgendamentosMock = DBConnectionMock.define('Agendamentos', {
    id: 1,
    barbeiroId: 1,
    servicoId: 1,
    dataHoraInicio: new Date(),
    dataHoraFim: new Date(),
    clienteUid: 'test-uid'
});

db.Clientes = ClientesMock;
db.Barbeiros = BarbeirosMock;
db.Servicos = ServicosMock;
db.Agendamentos = AgendamentosMock;

module.exports = sinon;
