const { Clientes } = require('./db');

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

module.exports = {
  criarCliente,
  obterUidPorEmail,
  obterClientePorUid
};
