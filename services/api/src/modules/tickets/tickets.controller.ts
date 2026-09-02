import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { Permissions } from '../authorization/decorators/permissions.decorator';
import { PermissionsGuard } from '../authorization/guards/permissions.guard';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../authorization/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { TicketsService } from './tickets.service';
import {
  createTicketSchema,
  type CreateTicketDto,
  listTicketsQuerySchema,
  type ListTicketsQuery,
  updateTicketStatusSchema,
  type UpdateTicketStatusDto,
} from './dto/tickets.dto';

/**
 * Tickets de contacto (NL-13): formulario "Contact Us" del Store.
 * Alta pública (o asociada a un comprador logueado); gestión en Admin.
 */
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body(new ZodValidationPipe(createTicketSchema)) dto: CreateTicketDto,
    @CurrentUser() user: AuthenticatedUser | null,
  ) {
    return this.ticketsService.create(dto, user?.userId ?? null);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  mine(@CurrentUser() user: AuthenticatedUser) {
    return this.ticketsService.listByUser(user.userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('tickets:ver')
  list(@Query(new ZodValidationPipe(listTicketsQuerySchema)) query: ListTicketsQuery) {
    return this.ticketsService.list(query);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('tickets:gestionar')
  updateStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateTicketStatusSchema)) dto: UpdateTicketStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ticketsService.updateStatus(id, dto, user.userId);
  }
}