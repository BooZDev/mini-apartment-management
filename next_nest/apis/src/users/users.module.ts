import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRole } from 'src/entities/user-role.entity';
import { User } from 'src/entities/user.entity';
import { ProfileController } from './profile.controller';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserRole])],
  controllers: [UsersController, ProfileController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
