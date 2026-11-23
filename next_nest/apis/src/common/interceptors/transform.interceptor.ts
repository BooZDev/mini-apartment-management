import { CallHandler, ExecutionContext, Injectable, NestInterceptor, StreamableFile } from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { Paginated } from '../dto/paginated.dto';

// Khuôn phản hồi: `{ data }`, danh sách có thêm `meta`; 204 và file không bọc
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((result: unknown) => {
        if (result === undefined || result instanceof StreamableFile) return result;
        if (result instanceof Paginated) return { data: result.data, meta: result.meta };
        return { data: result };
      }),
    );
  }
}
