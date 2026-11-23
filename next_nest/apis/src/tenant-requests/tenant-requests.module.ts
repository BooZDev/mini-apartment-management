import { Module } from '@nestjs/common';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { OccupantsModule } from 'src/occupants/occupants.module';
import { TenantRequestsController } from './tenant-requests.controller';
import { TenantRequestsService } from './tenant-requests.service';

@Module({
  imports: [OccupantsModule, NotificationsModule],
  controllers: [TenantRequestsController],
  providers: [TenantRequestsService],
  exports: [TenantRequestsService],
})
export class TenantRequestsModule {}
