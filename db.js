// const { Sequelize } = require('sequelize');

// const sequelize = new Sequelize(process.env.DATABASE_URL, {
//   dialect: 'postgres',
//   protocol: 'postgres',
//   dialectOptions: {
//     ssl: {
//       require: true, 
//       rejectUnauthorized: false 
//     }
//   },
//   logging: false
// });

// sequelize.authenticate()
//   .then(() => {
//     console.log('Conexão com o banco de dados estabelecida com sucesso.');
//   })
//   .catch(err => {
//     console.error('Não foi possível conectar ao banco de dados:', err);
//   });

// module.exports = sequelize;
