import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { paginationSchema, type PaginationQuery } from '../../common/validation/pagination';
import { Permissions } from '../authorization/decorators/permissions.decorator';
import { PermissionsGuard } from '../authorization/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, type AuthenticatedUser } from '../authorization/decorators/current-user.decorator';
import { InventoryService } from './inventory.service';
import {
  adjustStockSchema,
  setStockSchema,
  type AdjustStockDto,
  type SetStockDto,
} from './dto/inventory.dto';

/**
 * Inventario y stock (NL-08). Escrituras protegidas con `inventario:editar`;
 * lectura con `inventario:ver`. Reservas diferidas a NL-10 (pedidos).
 */
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('inventario:ver')
  list(@Query(new ZodValidationPipe(paginationSchema)) query?: PaginationQuery) {
    return this.inventoryService.list(query?.limit);
  }

  @Get(':variantId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('inventario:ver')
  get(@Param('variantId') variantId: string) {
    return this.inventoryService.getByVariant(variantId);
  }

  @Put(':variantId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('inventario:editar')
  set(
    @Param('variantId') variantId: string,
    @Body(new ZodValidationPipe(setStockSchema)) dto: SetStockDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryService.setStock(variantId, dto, user.userId);
  }

  @Post(':variantId/adjust')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('inventario:editar')
  adjust(
    @Param('variantId') variantId: string,
    @Body(new ZodValidationPipe(adjustStockSchema)) dto: AdjustStockDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryService.adjustStock(variantId, dto, user.userId);
  }
}