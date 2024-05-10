const { Sequelize, DataTypes } = require('sequelize');

// Conexâo com o banco
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

// Definição da tabela Clientes
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

// Definição da tabela Barbeiros
const Barbeiros = sequelize.define('Barbeiros', {
    nome: {
        type: DataTypes.STRING,
        allowNull: false
    }
});

// Definição da tabela Servicos
const Servicos = sequelize.define('Servicos', {
    descricao: {
        type: DataTypes.STRING,
        allowNull: false
    },
    duracao: {
        type: DataTypes.INTEGER, 
        allowNull: false
    }
});

// Definição da tabela Agendamentos
const Agendamentos = sequelize.define('Agendamentos', {
    barbeiroId: {
        type: DataTypes.INTEGER,
        references: {
            model: Barbeiros,
            key: 'id'
        }
    },
    servicoId: {
        type: DataTypes.INTEGER,
        references: {
            model: Servicos,
            key: 'id'
        }
    },
    dataHoraInicio: {
        type: DataTypes.DATE,
        allowNull: false
    },
    dataHoraFim: {
        type: DataTypes.DATE,
        allowNull: false
    },
    clienteUid: {
        type: DataTypes.STRING,
        allowNull: false
    }
});

// Função para sincronizar o banco de dados
async function syncDB() {
    try {
        await sequelize.authenticate();
        console.log('Conexão com o banco de dados estabelecida com sucesso.');

        await Clientes.sync();
        await Barbeiros.sync();
        await Servicos.sync();
        await Agendamentos.sync();

        console.log('Tabelas criadas com sucesso.');
    } catch (error) {
        console.error('Erro ao conectar e sincronizar o banco de dados:', error);
    }
}

// Exportação
module.exports = {
    Clientes,
    Barbeiros,
    Servicos,
    Agendamentos,
    syncDB
};
