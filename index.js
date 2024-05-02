const sequelize = require('.db');
const Cliente = require('./models/cliente');

async function init() {
  try {
    await sequelize.authenticate();
    console.log('Conexão bem-sucedida com o banco de dados.');

    await sequelize.sync({ alter: true });
    console.log('Modelos sincronizados com o banco de dados.');
  } catch (error) {
    console.error('Erro ao conectar ou sincronizar com o banco de dados:', error);
  }
}

init();
