// Stub de @prisma/adapter-pg para jest (evita crear un pool PG real en tests
// unitarios). El adapter real se usa en el arranque del servidor.
class MockPrismaPg {
  constructor(/* config */) {}
}

module.exports = {
  PrismaPg: MockPrismaPg,
};
