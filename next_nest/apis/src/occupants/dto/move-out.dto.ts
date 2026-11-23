import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { IsDateOnly, IsNotFutureDate } from 'src/common/decorators/validators.decorator';

export class MoveOutDto {
  @ApiProperty({ description: 'Ngày rời đi (YYYY-MM-DD), không sau hôm nay', example: '2026-11-20' })
  @IsNotEmpty({ message: 'Ngày rời đi không được để trống' })
  @IsDateOnly({ message: 'Ngày rời đi không hợp lệ' })
  @IsNotFutureDate(false, { message: 'Ngày rời đi không được sau hôm nay' })
  moveOutDate: string;
}
