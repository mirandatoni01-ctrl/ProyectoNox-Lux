// Stub de @prisma/client para jest (evita cargar el engine/adapter nativo en
// tests unitarios). El cliente real se valida en el arranque del servidor.
class MockPrismaClient {
  async $connect() {}
  async $disconnect() {}
  $on() {}
}

class PrismaClientKnownRequestError extends Error {
  constructor(message, { code, clientVersion }) {
    super(message);
    this.code = code;
    this.clientVersion = clientVersion;
    this.name = 'PrismaClientKnownRequestError';
  }
}

const RoleCode = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
};

const Prisma = {
  PrismaClientKnownRequestError,
};

module.exports = {
  PrismaClient: MockPrismaClient,
  Prisma,
  RoleCode,
};