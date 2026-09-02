import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { Permissions } from '../authorization/decorators/permissions.decorator';
import { PermissionsGuard } from '../authorization/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser, type AuthenticatedUser } from '../authorization/decorators/current-user.decorator';
import { OrdersService } from './orders.service';
import {
  createOrderSchema,
  listOrdersQuerySchema,
  updateOrderStatusSchema,
  type CreateOrderDto,
  type ListOrdersQuery,
  type UpdateOrderStatusDto,
} from './dto/order.dto';

/**
 * Pedidos (NL-10). El alta es ANÓNIMA (cliente Store, sin JWT): crea el pedido
 * en estado pending, reserva stock y notifica por WhatsApp el enlace wa.me.
 * La gestión posterior (lista, detalle y transiciones de estado) exige
 * `pedidos:ver` / `pedidos:gestionar`.
 */
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  create(
    @Body(new ZodValidationPipe(createOrderSchema)) dto: CreateOrderDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser | null,
  ) {
    const ip = req.ip ?? req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.ordersService.create(dto, {
      ip,
      userAgent,
      userId: user?.userId ?? null,
    });
  }

  /** Historial de pedidos del comprador autenticado (rol CUSTOMER/ADMIN). */
  @Get('mine')
  @UseGuards(JwtAuthGuard)
  mine(@CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.listByUser(user.userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('pedidos:ver')
  list(@Query(new ZodValidationPipe(listOrdersQuerySchema)) query: ListOrdersQuery) {
    return this.ordersService.list(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('pedidos:ver')
  get(@Param('id') id: string) {
    return this.ordersService.getById(id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('pedidos:gestionar')
  updateStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateOrderStatusSchema)) dto: UpdateOrderStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.updateStatus(id, dto, user.userId);
  }
}