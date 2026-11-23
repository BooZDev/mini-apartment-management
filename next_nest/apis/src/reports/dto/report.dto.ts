import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, Max, Min } from 'class-validator';
import { ToBoolean } from 'src/common/decorators/trim.decorator';
import { IsPeriod } from 'src/common/decorators/validators.decorator';
import { SearchPaginationQueryDto } from 'src/common/dto/pagination-query.dto';

export enum ReportType {
  DEBTS = 'debts',
  REVENUE = 'revenue',
  PROFIT = 'profit',
  OCCUPANCY = 'occupancy',
}

export class DebtsQueryDto extends SearchPaginationQueryDto {
  @ApiPropertyOptional({ description: 'Chỉ hợp đồng có hóa đơn quá hạn', default: false })
  @IsOptional()
  @ToBoolean()
  @IsBoolean({ message: 'overdueOnly phải là true hoặc false' })
  overdueOnly?: boolean;
}

export class MonthRangeDto {
  @ApiProperty({ description: 'Từ tháng (YYYY-MM)', example: '2026-01' })
  @IsNotEmpty({ message: 'Từ tháng không được để trống' })
  @IsPeriod({ message: 'Từ tháng phải có dạng YYYY-MM' })
  fromMonth: string;

  @ApiProperty({ description: 'Đến tháng (YYYY-MM), tối đa 12 tháng', example: '2026-12' })
  @IsNotEmpty({ message: 'Đến tháng không được để trống' })
  @IsPeriod({ message: 'Đến tháng phải có dạng YYYY-MM' })
  toMonth: string;
}

export class OccupancyQueryDto {
  @ApiPropertyOptional({ description: 'Hợp đồng hết hạn trong N ngày tới', default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Số ngày không hợp lệ' })
  @Min(0, { message: 'Số ngày từ 0 đến 365' })
  @Max(365, { message: 'Số ngày từ 0 đến 365' })
  expiringWithinDays: number = 30;
}
