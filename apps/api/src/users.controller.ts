import { Controller, Get } from '@nestjs/common';
import type { User, ApiResponse } from '@repo/types';
import { Role } from '@repo/types';

@Controller('users')
export class UsersController {
  @Get('example')
  getExample(): ApiResponse<User> {
    return {
      success: true,
      data: {
        id: '1',
        tenantId: 'tenant-1',
        name: 'John Doe',
        email: 'john@example.com',
        passwordHash: null,
        role: Role.MEMBER,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
  }
}
