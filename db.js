const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.POSTGRES_URL, {
  logging: false // Opção para desativar os logs do Sequelize
});

// Definindo o modelo da tabela Cliente
const Cliente = sequelize.define('cliente', {
  uid: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nome: {
    type: Sequelize.STRING(100),
    allowNull: false
  },
  email: {
    type: Sequelize.STRING(100),
    allowNull: false
  }
});

// Sincronizando o modelo com o banco de dados
(async () => {
  try {
    await sequelize.authenticate();
    console.log('Conexão com o banco de dados estabelecida com sucesso.');

    // Sincronizando o modelo com o banco de dados (criará a tabela se ela não existir)
    await Cliente.sync();
    console.log('Tabela cliente sincronizada com sucesso.');

  } catch (error) {
    console.error('Erro ao conectar/sincronizar com o banco de dados:', error);
  }
})();

module.exports = Cliente;
