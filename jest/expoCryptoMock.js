// expo-crypto es un módulo nativo: en Jest (Node) se reemplaza por el crypto de Node.
const { randomUUID } = require('crypto');

module.exports = { randomUUID };
