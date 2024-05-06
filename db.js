const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: "postgres://default:bS1ZtW6iMdqH@ep-frosty-glitter-a46qayt7-pooler.us-east-1.aws.neon.tech:5432/verceldb?sslmode=require?sslmode=require",
});

pool.query(`
  CREATE TABLE IF NOT EXISTS cliente (
    id SERIAL PRIMARY KEY,
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
