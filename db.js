  const { Sequelize, DataTypes } = require('sequelize');

  const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,

    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false 
      }
    }
  });

  const Clientes = sequelize.define('Clientes', {
    uid: {
      type: DataTypes.STRING,
      primaryKey: true
    },
    nome: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true 
    }
  });

  async function syncDB() {
    try {
      await sequelize.authenticate();
      console.log('Conexão com o banco de dados estabelecida com sucesso.');

      await Clientes.sync();
      console.log('Tabela Cliente criada com sucesso.');
    } catch (error) {
      console.error('Erro ao conectar e sincronizar o banco de dados:', error);
    }
  }

  module.exports = {
    Clientes,
    syncDB
  };
