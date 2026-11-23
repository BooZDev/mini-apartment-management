import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Trim } from 'src/common/decorators/trim.decorator';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';
import { DetailCode } from 'src/common/constants/error-codes';
import {
  IsDateAfter,
  IsDateOnly,
  IsOptionalNotNull,
  IsPeriod,
} from 'src/common/decorators/validators.decorator';
import { MAX_MONEY } from 'src/rooms/dto/create-room.dto';

const DUE_AFTER_BILLING = {
  message: 'Hạn thanh toán không được trước ngày thu',
  context: { code: DetailCode.DUE_BEFORE_BILLING },
};

export class CreateBillingPeriodDto {
  @ApiProperty({ description: 'Tháng thu (YYYY-MM), duy nhất', example: '2026-11' })
  @IsNotEmpty({ message: 'Tháng thu không được để trống' })
  @IsPeriod({ message: 'Tháng thu phải có dạng YYYY-MM' })
  period: string;

  @ApiPropertyOptional({ description: 'Ngày thu; mặc định theo thiết lập lịch thu của tòa', example: '2026-11-05' })
  @IsOptional()
  @IsDateOnly({ message: 'Ngày thu không hợp lệ' })
  billingDate?: string;

  @ApiPropertyOptional({ description: 'Hạn thanh toán; mặc định ngày thu + số ngày đến hạn', example: '2026-11-15' })
  @IsOptional()
  @IsDateOnly({ message: 'Hạn thanh toán không hợp lệ' })
  @IsDateAfter('billingDate', false, DUE_AFTER_BILLING)
  dueDate?: string;
}

export class UpdateBillingPeriodDto {
  @ApiPropertyOptional({ description: 'Ngày thu', example: '2026-11-05' })
  @IsOptionalNotNull()
  @IsDateOnly({ message: 'Ngày thu không hợp lệ' })
  billingDate?: string;

  @ApiPropertyOptional({ description: 'Hạn thanh toán', example: '2026-11-15' })
  @IsOptionalNotNull()
  @IsDateOnly({ message: 'Hạn thanh toán không hợp lệ' })
  @IsDateAfter('billingDate', false, DUE_AFTER_BILLING)
  dueDate?: string;
}

export class IssueInvoicesDto {
  @ApiPropertyOptional({ description: 'Phòng cần phát hành; không gửi là mọi phòng READY', type: [String] })
  @IsOptional()
  @IsArray({ message: 'Danh sách phòng không hợp lệ' })
  @ArrayMaxSize(500, { message: 'Tối đa 500 phòng' })
  @IsUUID('all', { each: true, message: 'roomIds chứa ID không hợp lệ' })
  roomIds?: string[];
}

export class CreateExtraChargeDto {
  @ApiProperty({ description: 'ID phòng' })
  @IsNotEmpty({ message: 'Phòng không được để trống' })
  @IsUUID('all', { message: 'roomId không hợp lệ' })
  roomId: string;

  @ApiProperty({ description: 'Nội dung khoản phát sinh, 1 đến 100 ký tự', example: 'Sửa vòi nước' })
  @Trim()
  @IsNotEmpty({ message: 'Nội dung không được để trống' })
  @IsString({ message: 'Nội dung không hợp lệ' })
  @Length(1, 100, { message: 'Nội dung tối đa 100 ký tự' })
  description: string;

  @ApiProperty({ description: 'Số tiền (đồng), lớn hơn 0', example: 150000 })
  @IsNotEmpty({ message: 'Số tiền không được để trống' })
  @IsInt({ message: 'Số tiền phải là số nguyên (đồng)' })
  @Min(1, { message: 'Số tiền phải lớn hơn 0' })
  @Max(MAX_MONEY, { message: 'Số tiền tối đa 1.000.000.000' })
  amount: number;
}
