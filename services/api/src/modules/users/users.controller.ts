import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Permissions } from '../authorization/decorators/permissions.decorator';
import { PermissionsGuard } from '../authorization/guards/permissions.guard';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../authorization/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { updateUserSchema } from './dto/users.dto';

/** Gestión de usuarios (Admin, NL-13). */
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('usuarios:ver')
  list(
    @Query('q') q?: string,
    @Query('roleCode') roleCode?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.usersService.list({
      q,
      roleCode,
      isActive: isActive === undefined ? undefined : isActive === 'true',
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('usuarios:ver')
  get(@Param('id') id: string) {
    return this.usersService.getById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('usuarios:gestionar')
  update(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (user.userId === id) {
      throw new BadRequestException(
        'No puedes modificar tus propios roles o estado desde esta vista',
      );
    }
    const parsed = updateUserSchema.parse(body);
    return this.usersService.update(id, parsed, user.userId);
  }
}