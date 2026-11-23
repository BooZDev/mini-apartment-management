import { ApiHideProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Allow, IsBoolean } from 'class-validator';
import { IsOptionalNotNull } from 'src/common/decorators/validators.decorator';
import { CreateRoomDto } from './create-room.dto';

// ROOM-04: chỉ gửi trường cần đổi. `code` chỉ đổi được khi phòng chưa từng có hợp đồng
// skipNullProperties: false để gửi `null` cho trường bắt buộc (floor, areaM2...) vẫn bị báo lỗi
export class UpdateRoomDto extends PartialType(CreateRoomDto, { skipNullProperties: false }) {
  @ApiPropertyOptional({ description: 'Đặt hoặc bỏ bảo trì', example: false })
  @IsOptionalNotNull()
  @IsBoolean({ message: 'isUnderMaintenance phải là true hoặc false' })
  isUnderMaintenance?: boolean;

  // Trạng thái trống / đang thuê do hợp đồng quyết định: gửi lên thì báo READ_ONLY_FIELD
  @ApiHideProperty()
  @Allow()
  status?: unknown;
}
