import { PrismaService } from './prisma.service';

// @prisma/client y @prisma/adapter-pg se mapean a stubs vía moduleNameMapper
// (ver jest.config.js). El cliente/adapter reales se validan en el arranque.
describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(() => {
    service = new PrismaService();
  });

  it('se instancia (hereda de PrismaClient)', () => {
    expect(service).toBeInstanceOf(PrismaService);
  });

  it('conecta con $connect en onModuleInit', async () => {
    const spy = jest.spyOn(PrismaService.prototype, '$connect');
    await service.onModuleInit();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('desconecta con $disconnect en onModuleDestroy', async () => {
    const spy = jest.spyOn(PrismaService.prototype, '$disconnect');
    await service.onModuleDestroy();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
