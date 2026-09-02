// Stub de @node-rs/argon2 para jest (binario nativo no cargable en test).
// Verificado en runtime real (arranque del servidor / e2e de integración).
module.exports = {
  hash: async (plain) => `mock-argon2:${plain}`,
  verify: async (hashed, plain) => hashed === `mock-argon2:${plain}`,
};
