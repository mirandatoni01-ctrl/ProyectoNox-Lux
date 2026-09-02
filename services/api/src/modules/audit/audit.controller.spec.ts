import { Test, TestingModule } from '@nestjs/testing';
import { PassportModule } from '@nestjs/passport';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

describe('AuditController (NL-12)', () => {
  let controller: AuditController;
  const auditService = { list: jest.fn(), record: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      controllers: [AuditController],
      providers: [{ provide: AuditService, useValue: auditService }],
    }).compile();
    controller = module.get(AuditController);
  });

  it('list delega en el servicio con los filtros', async () => {
    auditService.list.mockResolvedValue([]);
    await controller.list({ limit: 50, action: 'product.create', entity: 'product' } as any);
    expect(auditService.list).toHaveBeenCalledWith({
      limit: 50,
      action: 'product.create',
      entity: 'product',
    });
  });
});
