import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Trim } from 'src/common/decorators/trim.decorator';
import { IsDateOnly } from 'src/common/decorators/validators.decorator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

export enum RequestType {
  OCCUPANT_CHANGE = 'OCCUPANT_CHANGE',
  MAINTENANCE = 'MAINTENANCE',
}

export enum OccupantChangeAction {
  ADD = 'ADD',
  MOVE_OUT = 'MOVE_OUT',
  UPDATE = 'UPDATE',
}

export enum MaintenanceStatus {
  NEW = 'NEW',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  REJECTED = 'REJECTED',
}

export class OccupantChangeDto {
  @ApiProperty({ description: 'Hành động', enum: OccupantChangeAction })
  @IsNotEmpty({ message: 'Chưa chọn hành động' })
  @IsEnum(OccupantChangeAction, { message: 'Hành động chỉ gồm ADD, MOVE_OUT, UPDATE' })
  action: OccupantChangeAction;

  @ApiPropertyOptional({ description: 'Người ở của phòng mình; bắt buộc khi MOVE_OUT, UPDATE' })
  @IsOptional()
  @IsUUID('all', { message: 'occupantId không hợp lệ' })
  occupantId?: string;

  @ApiPropertyOptional({ description: 'Thông tin người ở: đủ trường bắt buộc khi ADD, trường cần đổi khi UPDATE' })
  @IsOptional()
  @IsObject({ message: 'proposedData không hợp lệ' })
  proposedData?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Ngày rời đi, bắt buộc khi MOVE_OUT', example: '2026-11-30' })
  @IsOptional()
  @IsDateOnly({ message: 'Ngày rời đi không hợp lệ' })
  moveOutDate?: string;
}

// TEN-07 Gửi yêu cầu
export class CreateTenantRequestDto {
  @ApiProperty({ description: 'Loại yêu cầu', enum: RequestType })
  @IsNotEmpty({ message: 'Chưa chọn loại yêu cầu' })
  @IsEnum(RequestType, { message: 'Loại yêu cầu chỉ gồm OCCUPANT_CHANGE, MAINTENANCE' })
  type: RequestType;

  @ApiProperty({ description: 'Tiêu đề, 5 đến 100 ký tự', example: 'Vòi nước nhà tắm bị rỉ' })
  @Trim()
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  @IsString({ message: 'Tiêu đề không hợp lệ' })
  @Length(5, 100, { message: 'Tiêu đề từ 5 đến 100 ký tự' })
  title: string;

  @ApiPropertyOptional({ description: 'Mô tả, tối đa 1.000 ký tự' })
  @IsOptional()
  @Trim({ emptyToNull: true })
  @IsString({ message: 'Mô tả không hợp lệ' })
  @MaxLength(1000, { message: 'Mô tả tối đa 1.000 ký tự' })
  description?: string | null;

  @ApiPropertyOptional({ description: 'Bắt buộc khi OCCUPANT_CHANGE', type: OccupantChangeDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => OccupantChangeDto)
  occupantChange?: OccupantChangeDto;
}

export class FindTenantRequestsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Loại yêu cầu', enum: RequestType })
  @IsOptional()
  @IsEnum(RequestType, { message: 'Loại yêu cầu không hợp lệ' })
  type?: RequestType;

  @ApiPropertyOptional({ description: 'Trạng thái (PENDING, APPROVED, REJECTED, NEW, IN_PROGRESS, DONE)' })
  @IsOptional()
  @IsIn(['PENDING', 'APPROVED', 'REJECTED', 'NEW', 'IN_PROGRESS', 'DONE'], { message: 'Trạng thái không hợp lệ' })
  status?: string;

  @ApiPropertyOptional({ description: 'ID phòng' })
  @IsOptional()
  @IsUUID('all', { message: 'roomId không hợp lệ' })
  roomId?: string;
}

export class ResponseNoteDto {
  @ApiPropertyOptional({ description: 'Phản hồi cho người thuê, tối đa 500 ký tự; bắt buộc khi từ chối' })
  @IsOptional()
  @Trim({ emptyToNull: true })
  @IsString({ message: 'Phản hồi không hợp lệ' })
  @MaxLength(500, { message: 'Phản hồi tối đa 500 ký tự' })
  responseNote?: string | null;
}

// REQ-05 Cập nhật trạng thái yêu cầu sửa chữa
export class UpdateMaintenanceStatusDto extends ResponseNoteDto {
  @ApiProperty({ description: 'Trạng thái mới', enum: MaintenanceStatus })
  @IsNotEmpty({ message: 'Chưa chọn trạng thái' })
  @IsEnum(MaintenanceStatus, { message: 'Trạng thái chỉ gồm NEW, IN_PROGRESS, DONE, REJECTED' })
  status: MaintenanceStatus;
}
