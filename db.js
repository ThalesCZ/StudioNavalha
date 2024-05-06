const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

pool.query(`
  CREATE TABLE IF NOT EXISTS cliente (
    uid SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL
  )
`, (err, res) => {
  if (err) {
    console.error('Erro ao criar a tabela cliente:', err);
  } else {
    console.log('Tabela cliente criada com sucesso');
  }
});

module.exports = pool;