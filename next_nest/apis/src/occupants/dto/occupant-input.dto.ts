import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { Trim } from 'src/common/decorators/trim.decorator';
import { IsDateOnly, IsNotFutureDate } from 'src/common/decorators/validators.decorator';
import { PHONE_PATTERN } from 'src/users/dto/create-user.dto';
import { Gender } from '../enums/occupant.enum';

export class OccupantBaseDto {
  @ApiProperty({ description: 'Họ tên, 1 đến 100 ký tự', example: 'Nguyễn Văn A' })
  @Trim()
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  @IsString({ message: 'Họ tên không hợp lệ' })
  @Length(1, 100, { message: 'Họ tên tối đa 100 ký tự' })
  fullName: string;

  @ApiProperty({ description: 'Ngày sinh (YYYY-MM-DD), trước hôm nay', example: '1998-05-01' })
  @IsNotEmpty({ message: 'Ngày sinh không được để trống' })
  @IsDateOnly({ message: 'Ngày sinh không hợp lệ' })
  @IsNotFutureDate(true, { message: 'Ngày sinh phải trước hôm nay' })
  dateOfBirth: string;

  @ApiPropertyOptional({ description: 'Giới tính', enum: Gender })
  @IsOptional()
  @IsEnum(Gender, { message: 'Giới tính chỉ gồm MALE, FEMALE, OTHER' })
  gender?: Gender | null;

  @ApiProperty({ description: 'Quê quán, 1 đến 200 ký tự', example: 'Nam Định' })
  @Trim()
  @IsNotEmpty({ message: 'Quê quán không được để trống' })
  @IsString({ message: 'Quê quán không hợp lệ' })
  @Length(1, 200, { message: 'Quê quán tối đa 200 ký tự' })
  hometown: string;

  @ApiProperty({ description: 'Số CCCD, 12 chữ số', example: '036098000001' })
  @Trim()
  @IsNotEmpty({ message: 'Số CCCD không được để trống' })
  @IsString({ message: 'Số CCCD không hợp lệ' })
  @Matches(/^\d{12}$/, { message: 'Số CCCD gồm đúng 12 chữ số' })
  idNumber: string;

  @ApiPropertyOptional({ description: 'Số điện thoại 10 chữ số, bắt đầu bằng 0', example: '0912345678' })
  @IsOptional()
  @Trim({ emptyToNull: true })
  @IsString({ message: 'Số điện thoại không hợp lệ' })
  @Matches(PHONE_PATTERN, { message: 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0' })
  phone?: string | null;

  @ApiPropertyOptional({ description: 'Email', example: 'a.nguyen@example.com' })
  @IsOptional()
  @Trim({ emptyToNull: true })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @MaxLength(150, { message: 'Email tối đa 150 ký tự' })
  email?: string | null;

  @ApiPropertyOptional({ description: 'Ghi chú, tối đa 500 ký tự' })
  @IsOptional()
  @Trim({ emptyToNull: true })
  @IsString({ message: 'Ghi chú không hợp lệ' })
  @MaxLength(500, { message: 'Ghi chú tối đa 500 ký tự' })
  note?: string | null;
}

export class OccupantInputDto extends OccupantBaseDto {
  @ApiPropertyOptional({ description: 'Quan hệ với người đứng tên, tối đa 50 ký tự', example: 'Bạn cùng phòng' })
  @IsOptional()
  @Trim({ emptyToNull: true })
  @IsString({ message: 'Quan hệ với người đứng tên không hợp lệ' })
  @MaxLength(50, { message: 'Quan hệ với người đứng tên tối đa 50 ký tự' })
  relationshipToPrimary?: string | null;
}

// Người ở cùng khi nhập hợp đồng: bắt buộc có quan hệ với người đứng tên
export class AdditionalOccupantDto extends OccupantBaseDto {
  @ApiProperty({ description: 'Quan hệ với người đứng tên, tối đa 50 ký tự', example: 'Em gái' })
  @Trim()
  @IsNotEmpty({ message: 'Cần ghi quan hệ với người đứng tên' })
  @IsString({ message: 'Quan hệ với người đứng tên không hợp lệ' })
  @MaxLength(50, { message: 'Quan hệ với người đứng tên tối đa 50 ký tự' })
  relationshipToPrimary: string;
}
