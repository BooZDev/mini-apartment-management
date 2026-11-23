import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/role.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { ReqCtx, type RequestContext } from 'src/common/decorators/request-context.decorator';
import { CreateExpenseCategoryDto, CreateExpenseDto, FindExpensesDto } from './dto/expense.dto';
import { ExpensesService } from './expenses.service';

@ApiTags('expenses')
@ApiCookieAuth()
@Controller()
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  // EXP-01 Danh sách loại chi
  @Roles(Role.OWNER, Role.ACCOUNTANT)
  @Get('expense-categories')
  @ApiOperation({ summary: 'Danh sách loại chi', description: 'EXP-01. Cần quyền OWNER hoặc ACCOUNTANT' })
  findCategories() {
    return this.expensesService.findCategories();
  }

  // EXP-02 Thêm loại chi
  @Roles(Role.OWNER)
  @Post('expense-categories')
  @ApiOperation({ summary: 'Thêm loại chi', description: 'EXP-02. Cần quyền OWNER' })
  @ApiBody({ type: CreateExpenseCategoryDto })
  createCategory(@Body() dto: CreateExpenseCategoryDto) {
    return this.expensesService.createCategory(dto);
  }

  // EXP-03 Danh sách khoản chi
  @Roles(Role.ACCOUNTANT, Role.OWNER)
  @Get('expenses')
  @ApiOperation({ summary: 'Danh sách khoản chi', description: 'EXP-03. Cần quyền ACCOUNTANT hoặc OWNER' })
  findAll(@Query() query: FindExpensesDto) {
    return this.expensesService.findAll(query);
  }

  // EXP-04 Ghi khoản chi
  @Roles(Role.ACCOUNTANT)
  @Post('expenses')
  @ApiOperation({ summary: 'Ghi khoản chi', description: 'EXP-04. Cần quyền ACCOUNTANT' })
  @ApiBody({ type: CreateExpenseDto })
  create(@Body() dto: CreateExpenseDto, @ReqCtx() ctx: RequestContext) {
    return this.expensesService.create(dto, ctx);
  }
}
