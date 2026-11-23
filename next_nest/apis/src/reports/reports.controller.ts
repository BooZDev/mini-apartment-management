import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiParam, ApiProduces, ApiTags } from '@nestjs/swagger';
import { AuthUser } from 'src/auth/decorators/auth-user.decorator';
import { Roles } from 'src/auth/decorators/role.decorator';
import { Role } from 'src/auth/enums/role.enum';
import type { CurrentUser } from 'src/auth/types/current-user';
import { DebtsQueryDto, MonthRangeDto, OccupancyQueryDto, ReportType } from './dto/report.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiCookieAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // RPT-01 Công nợ
  @Roles(Role.ACCOUNTANT, Role.OWNER)
  @Get('debts')
  @ApiOperation({
    summary: 'Công nợ',
    description: 'RPT-01. Cần quyền ACCOUNTANT hoặc OWNER. Theo hợp đồng có hóa đơn còn nợ; `meta.totals` là tổng toàn bộ',
  })
  debts(@Query() query: DebtsQueryDto) {
    return this.reportsService.debts(query);
  }

  // RPT-02 Doanh thu theo tháng
  @Roles(Role.OWNER)
  @Get('revenue')
  @ApiOperation({ summary: 'Doanh thu theo tháng', description: 'RPT-02. Cần quyền OWNER. Doanh thu là tiền thực thu, tối đa 12 tháng' })
  revenue(@Query() query: MonthRangeDto) {
    return this.reportsService.revenue(query);
  }

  // RPT-03 Thu, chi, lợi nhuận
  @Roles(Role.OWNER)
  @Get('profit')
  @ApiOperation({ summary: 'Thu, chi, lợi nhuận', description: 'RPT-03. Cần quyền OWNER' })
  profit(@Query() query: MonthRangeDto) {
    return this.reportsService.profit(query);
  }

  // RPT-04 Lấp đầy, phòng trống, hợp đồng sắp hết hạn
  @Roles(Role.OWNER, Role.MANAGER)
  @Get('occupancy')
  @ApiOperation({ summary: 'Lấp đầy, phòng trống, hợp đồng sắp hết hạn', description: 'RPT-04. Cần quyền OWNER hoặc MANAGER' })
  occupancy(@Query() query: OccupancyQueryDto) {
    return this.reportsService.occupancy(query);
  }

  // RPT-05 Xuất báo cáo ra Excel; quyền như báo cáo tương ứng (kiểm ở service)
  @Roles(Role.ACCOUNTANT, Role.OWNER, Role.MANAGER)
  @Get(':reportType/export')
  @ApiOperation({ summary: 'Xuất báo cáo ra Excel', description: 'RPT-05. Quyền và tham số như báo cáo tương ứng' })
  @ApiParam({ name: 'reportType', enum: ReportType })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  export(@Param('reportType') reportType: string, @Query() query: Record<string, unknown>, @AuthUser() user: CurrentUser) {
    return this.reportsService.export(reportType, query, user);
  }
}
