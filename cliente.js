const { Clientes, Barbeiros, Servicos, Agendamentos, HorariosDisponiveis } = require('./db');

async function criarCliente(username, email, uid) {
  try {
    await Clientes.create({ nome: username, email: email, uid: uid });
  } catch (error) {
    throw new Error('Erro ao criar cliente: ' + error.message);
  }
}

async function obterUidPorEmail(email) {
  try {
    const cliente = await Clientes.findOne({
      where: { email: email },
      attributes: ['uid']
    });
    return cliente ? cliente.uid : null;
  } catch (error) {
    console.error('Erro ao obter UID:', error);
    throw error;
  }
}

async function obterClientePorUid(uid) {
  try {
    const cliente = await Clientes.findOne({
      where: { uid: uid }
    });
    return cliente;
  } catch (error) {
    console.error('Erro ao obter cliente por UID:', error);
    throw error;
  }
}

async function carregarAgendamentos(barbeiroId) {
  try {
      let whereCondition = {};
      if (barbeiroId) {
          whereCondition = { barbeiroId }; 
      }

      return await Agendamentos.findAll({
          where: whereCondition,
          include: [
              { model: Barbeiros },
              { model: Clientes },
              { model: Servicos }
          ],
          order: [
              ['dataHoraInicio', 'ASC'],
          ]
      });
  } catch (error) {
      throw new Error('Erro ao carregar os agendamentos:' + error.message);
  }
}


async function getAvailableDurationsForDate(date, barbeiroId) {
  try {
      const { Op } = require('sequelize');
      const { Agendamentos, HorariosDisponiveis, Servicos } = require('./db.js');

      const startOfDay = new Date(date);
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);

      const appointments = await Agendamentos.findAll({
          where: {
              barbeiroId,
              dataHoraInicio: {
                  [Op.gte]: startOfDay,
                  [Op.lt]: endOfDay
              }
          },
          include: [{ model: Servicos }]
      });

      const availableTimes = await HorariosDisponiveis.findAll();

      const timeSet = new Set();

      availableTimes.forEach(time => {
          const startTime = new Date(`${date}T${time.horario}`);
          const endTime = new Date(startTime.getTime() + (time.duracao * 60000));

          const isAvailable = !appointments.some(appointment => {
              const appointmentStart = new Date(appointment.dataHoraInicio);
              const appointmentEnd = new Date(appointment.dataHoraFim);

              return (
                  (startTime < appointmentEnd && startTime >= appointmentStart) ||
                  (endTime > appointmentStart && endTime <= appointmentEnd) ||
                  (startTime <= appointmentStart && endTime >= appointmentEnd)
              );
          });

          if (isAvailable) {
              timeSet.add(time.horario);
          }
      });

      return Array.from(timeSet);
  } catch (error) {
      throw new Error('Erro ao buscar horários disponíveis: ' + error.message);
  }
}

module.exports = {
  criarCliente,
  obterUidPorEmail,
  obterClientePorUid,
  carregarAgendamentos,
  getAvailableDurationsForDate
};

