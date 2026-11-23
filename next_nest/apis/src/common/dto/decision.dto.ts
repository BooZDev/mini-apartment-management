import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { Trim } from '../decorators/trim.decorator';

// Duyệt, từ chối phiếu điều chỉnh, yêu cầu hủy thanh toán

export class ApproveDto {
  @ApiPropertyOptional({ description: 'Ghi chú, tối đa 500 ký tự' })
  @IsOptional()
  @Trim({ emptyToNull: true })
  @IsString({ message: 'Ghi chú không hợp lệ' })
  @MaxLength(500, { message: 'Ghi chú tối đa 500 ký tự' })
  note?: string | null;
}

export class RejectDto {
  @ApiProperty({ description: 'Lý do từ chối, bắt buộc, tối đa 500 ký tự', example: 'Sai số tiền' })
  @Trim()
  @IsNotEmpty({ message: 'Cần ghi lý do từ chối' })
  @IsString({ message: 'Lý do không hợp lệ' })
  @Length(1, 500, { message: 'Lý do tối đa 500 ký tự' })
  note: string;
}

export class ReasonDto {
  @ApiProperty({ description: 'Lý do, 5 đến 500 ký tự', example: 'Ghi nhầm số tiền' })
  @Trim()
  @IsNotEmpty({ message: 'Cần ghi lý do' })
  @IsString({ message: 'Lý do không hợp lệ' })
  @Length(5, 500, { message: 'Lý do từ 5 đến 500 ký tự' })
  reason: string;
}
