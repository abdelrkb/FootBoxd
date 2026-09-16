import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id/profile')
  profile(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.getProfile(id);
  }
}
