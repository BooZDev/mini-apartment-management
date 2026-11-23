import { ParseUUIDPipe } from '@nestjs/common';
import { AppException } from '../exceptions/app.exception';

// Mã trên đường dẫn không phải UUID: coi như không tìm thấy
export const ParseIdPipe = new ParseUUIDPipe({
  exceptionFactory: () => new AppException('RESOURCE_NOT_FOUND'),
});
