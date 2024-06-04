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


const Barbeiros = sequelize.define('Barbeiros', {
    nome: {
        type: DataTypes.STRING,
        allowNull: false
    }
});


const Servicos = sequelize.define('Servicos', {
    descricao: {
        type: DataTypes.STRING,
        allowNull: false
    },
    duracao: {
        type: DataTypes.INTEGER, 
        allowNull: false
    },
    preco: {
        type: DataTypes.FLOAT,
        allowNull: false
    }
});



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


const HorariosDisponiveis = sequelize.define('HorariosDisponiveis', {
    horario: {
        type: DataTypes.TIME,
        allowNull: false
    }
});

Agendamentos.belongsTo(Servicos, { foreignKey: 'servicoId' });

async function popularHorariosDisponiveis() {
    try {
        const startHour = 9; 
        const endHour = 19; 
        const interval = 30; 

        const horarios = [];
        for (let hour = startHour; hour < endHour; hour++) {
            for (let minute = 0; minute < 60; minute += interval) {
                const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
                horarios.push({ horario: timeString });
            }
        }

        await HorariosDisponiveis.bulkCreate(horarios);
        console.log('Horários disponíveis populados com sucesso.');
    } catch (error) {
        console.error('Erro ao popular os horários disponíveis:', error);
    }
}

Clientes.hasMany(Agendamentos, { foreignKey: 'clienteUid' });
Agendamentos.belongsTo(Clientes, { foreignKey: 'clienteUid' });
Barbeiros.hasMany(Agendamentos, { foreignKey: 'barbeiroId' });
Agendamentos.belongsTo(Barbeiros, { foreignKey: 'barbeiroId' });


async function syncDB() {
    try {
        await sequelize.authenticate();
        console.log('Conexão com o banco de dados estabelecida com sucesso.');

        await Clientes.sync();
        await Barbeiros.sync();
        await Servicos.sync();
        await Agendamentos.sync();
        await HorariosDisponiveis.sync();
        
        await popularHorariosDisponiveis();

        console.log('Tabelas criadas e horários disponíveis populados com sucesso.');
    } catch (error) {
        console.error('Erro ao conectar e sincronizar o banco de dados:', error);
    }
}


module.exports = {
    Clientes,
    Barbeiros,
    Servicos,
    Agendamentos,
    HorariosDisponiveis,
    syncDB
};
