import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApprovalStatus } from 'src/adjustments/dto/adjustment.dto';
import { Trim } from 'src/common/decorators/trim.decorator';
import { IsDateAfter, IsDateOnly, IsNotFutureDate } from 'src/common/decorators/validators.decorator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { MAX_MONEY } from 'src/rooms/dto/create-room.dto';

export const INVALID_PAYMENT = { message: 'Vui lòng nhập khoản nộp hợp lí!' };

export enum PaymentMethod {
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  DEPOSIT = 'DEPOSIT',
}

export enum PaymentStatus {
  VALID = 'VALID',
  PENDING_CANCELLATION = 'PENDING_CANCELLATION',
  CANCELLED = 'CANCELLED',
}

export class CreatePaymentDto {
  @ApiProperty({ description: 'ID hóa đơn đã phát hành' })
  @IsNotEmpty({ message: 'Chưa chọn hóa đơn', context: INVALID_PAYMENT })
  @IsUUID('all', { message: 'invoiceId không hợp lệ', context: INVALID_PAYMENT })
  invoiceId: string;

  @ApiProperty({ description: 'Số tiền (đồng), lớn hơn 0, không vượt số còn nợ', example: 2000000 })
  @IsNotEmpty({ message: 'Số tiền không được để trống', context: INVALID_PAYMENT })
  @IsInt({ message: 'Số tiền phải là số nguyên (đồng)', context: INVALID_PAYMENT })
  @Min(1, { message: 'Số tiền phải lớn hơn 0', context: INVALID_PAYMENT })
  @Max(MAX_MONEY * 10, { message: 'Số tiền quá lớn', context: INVALID_PAYMENT })
  amount: number;

  // Cấn trừ tiền cọc chỉ do CTR-04 tạo
  @ApiProperty({ description: 'Hình thức', enum: ['CASH', 'BANK_TRANSFER'] })
  @IsNotEmpty({ message: 'Hình thức không được để trống' })
  @IsIn([PaymentMethod.CASH, PaymentMethod.BANK_TRANSFER], { message: 'Hình thức chỉ gồm CASH, BANK_TRANSFER' })
  method: PaymentMethod.CASH | PaymentMethod.BANK_TRANSFER;

  @ApiPropertyOptional({ description: 'Mã giao dịch chuyển khoản, tối đa 50 ký tự' })
  @IsOptional()
  @Trim({ emptyToNull: true })
  @IsString({ message: 'Mã giao dịch không hợp lệ' })
  @MaxLength(50, { message: 'Mã giao dịch tối đa 50 ký tự' })
  referenceCode?: string | null;

  @ApiPropertyOptional({ description: 'Người nộp là người ở của phòng; gửi một trong hai trường người nộp' })
  @IsOptional()
  @IsUUID('all', { message: 'payerOccupantId không hợp lệ' })
  payerOccupantId?: string;

  @ApiPropertyOptional({ description: 'Tên người nộp khi chọn "Khác", 1 đến 100 ký tự' })
  @IsOptional()
  @Trim()
  @IsString({ message: 'Tên người nộp không hợp lệ' })
  @Length(1, 100, { message: 'Tên người nộp từ 1 đến 100 ký tự' })
  payerName?: string;

  @ApiProperty({ description: 'Ngày nộp, không sau hôm nay', example: '2026-11-18' })
  @IsNotEmpty({ message: 'Ngày nộp không được để trống' })
  @IsDateOnly({ message: 'Ngày nộp không hợp lệ' })
  @IsNotFutureDate(false, { message: 'Ngày nộp không được sau hôm nay' })
  paidOn: string;

  @ApiPropertyOptional({ description: 'Ghi chú, tối đa 500 ký tự' })
  @IsOptional()
  @Trim({ emptyToNull: true })
  @IsString({ message: 'Ghi chú không hợp lệ' })
  @MaxLength(500, { message: 'Ghi chú tối đa 500 ký tự' })
  note?: string | null;
}

export class FindPaymentsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'ID hóa đơn' })
  @IsOptional()
  @IsUUID('all', { message: 'invoiceId không hợp lệ' })
  invoiceId?: string;

  @ApiPropertyOptional({ description: 'ID phòng' })
  @IsOptional()
  @IsUUID('all', { message: 'roomId không hợp lệ' })
  roomId?: string;

  @ApiPropertyOptional({ description: 'Từ ngày nộp', example: '2026-11-01' })
  @IsOptional()
  @IsDateOnly({ message: 'Từ ngày không hợp lệ' })
  fromDate?: string;

  @ApiPropertyOptional({ description: 'Đến ngày nộp', example: '2026-11-30' })
  @IsOptional()
  @IsDateOnly({ message: 'Đến ngày không hợp lệ' })
  @IsDateAfter('fromDate', false, { message: 'Đến ngày không được trước từ ngày' })
  toDate?: string;

  @ApiPropertyOptional({ description: 'Hình thức', enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod, { message: 'Hình thức không hợp lệ' })
  method?: PaymentMethod;

  @ApiPropertyOptional({ description: 'Trạng thái', enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus, { message: 'Trạng thái không hợp lệ' })
  status?: PaymentStatus;

  @ApiPropertyOptional({ description: 'Sắp xếp: paidOn, amount, recordedAt; thêm - để giảm dần' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sort?: string;
}

export class FindCancellationRequestsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Trạng thái', enum: ApprovalStatus })
  @IsOptional()
  @IsEnum(ApprovalStatus, { message: 'Trạng thái chỉ gồm PENDING, APPROVED, REJECTED' })
  status?: ApprovalStatus;
}
