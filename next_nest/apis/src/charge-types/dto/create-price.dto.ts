import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, Max, Min } from 'class-validator';
import { IsDateOnly } from 'src/common/decorators/validators.decorator';
import { MAX_MONEY } from 'src/rooms/dto/create-room.dto';

const INVALID_AMOUNT = { message: 'Hãy nhập vào số tiền hợp lệ!' };

export class CreatePriceDto {
  @ApiProperty({ description: 'Đơn giá (đồng), 0 đến 1.000.000.000', example: 3456 })
  @IsNotEmpty({ message: 'Đơn giá không được để trống', context: INVALID_AMOUNT })
  @IsInt({ message: 'Đơn giá phải là số nguyên (đồng)', context: INVALID_AMOUNT })
  @Min(0, { message: 'Đơn giá không được âm', context: INVALID_AMOUNT })
  @Max(MAX_MONEY, { message: 'Đơn giá tối đa 1.000.000.000', context: INVALID_AMOUNT })
  unitPrice: number;

  @ApiProperty({ description: 'Ngày bắt đầu hiệu lực (YYYY-MM-DD)', example: '2026-12-01' })
  @IsNotEmpty({ message: 'Ngày hiệu lực không được để trống' })
  @IsDateOnly({ message: 'Ngày hiệu lực không hợp lệ' })
  effectiveFrom: string;
}
