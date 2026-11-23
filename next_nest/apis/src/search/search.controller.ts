import { Controller, Get, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser } from 'src/auth/decorators/auth-user.decorator';
import { Roles } from 'src/auth/decorators/role.decorator';
import { Role } from 'src/auth/enums/role.enum';
import type { CurrentUser } from 'src/auth/types/current-user';
import { SearchDto } from './search.dto';
import { SearchService } from './search.service';

@ApiTags('search')
@ApiCookieAuth()
@Roles(Role.MANAGER, Role.ACCOUNTANT)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  // SRCH-01 Tìm kiếm không dấu
  @Get()
  @ApiOperation({
    summary: 'Tìm kiếm không dấu',
    description: 'SRCH-01. Cần quyền MANAGER hoặc ACCOUNTANT. Mỗi nhóm tối đa 10 kết quả; SĐT chỉ với MANAGER',
  })
  search(@Query() query: SearchDto, @AuthUser() user: CurrentUser) {
    return this.searchService.search(query, user);
  }
}
