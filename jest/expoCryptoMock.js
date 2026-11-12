// expo-crypto es un módulo nativo: en Jest (Node) se reemplaza por el crypto de Node.
const { randomUUID, randomBytes } = require('crypto');

module.exports = {
  randomUUID,
  getRandomBytes: (byteCount) => new Uint8Array(randomBytes(byteCount)),
};
