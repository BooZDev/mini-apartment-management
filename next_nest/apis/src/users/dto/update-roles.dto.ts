import { PickType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

// USR-05: thay thế toàn bộ vai trò hiện có
export class UpdateRolesDto extends PickType(CreateUserDto, ['roles'] as const) {}
