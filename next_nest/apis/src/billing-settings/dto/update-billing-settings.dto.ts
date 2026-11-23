import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, Max, Min } from 'class-validator';

export class UpdateBillingSettingsDto {
  @ApiProperty({
    description: 'Ngày thu gợi ý trong tháng, 1 đến 31; tháng không có ngày này thì lấy ngày cuối tháng',
    example: 5,
  })
  @IsNotEmpty({ message: 'Ngày thu không được để trống' })
  @IsInt({ message: 'Ngày thu phải là số nguyên' })
  @Min(1, { message: 'Ngày thu từ 1 đến 31' })
  @Max(31, { message: 'Ngày thu từ 1 đến 31' })
  defaultBillingDay: number;

  @ApiProperty({ description: 'Số ngày từ ngày thu đến hạn thanh toán, 0 đến 60', example: 10 })
  @IsNotEmpty({ message: 'Số ngày đến hạn không được để trống' })
  @IsInt({ message: 'Số ngày đến hạn phải là số nguyên' })
  @Min(0, { message: 'Số ngày đến hạn từ 0 đến 60' })
  @Max(60, { message: 'Số ngày đến hạn từ 0 đến 60' })
  defaultPaymentTermDays: number;
}
