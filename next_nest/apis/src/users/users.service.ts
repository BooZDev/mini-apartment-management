import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Not } from 'typeorm';
import { AuditLogsService } from 'src/audit-logs/audit-logs.service';
import { Role } from 'src/auth/enums/role.enum';
import { revokeUserSessions } from 'src/auth/services/session-store';
import { CurrentUser } from 'src/auth/types/current-user';
import { RequestContext } from 'src/common/decorators/request-context.decorator';
import { definedOnly, lockRow, selectOne, selectRows, WhereBuilder } from 'src/common/database/query.util';
import { Paginated } from 'src/common/dto/paginated.dto';
import { AppException } from 'src/common/exceptions/app.exception';
import { toVnDateTime, vnToday } from 'src/common/utils/date.util';
import { generateTemporaryPassword, hashPassword } from 'src/common/utils/password.util';
import { buildOrderBy } from 'src/common/utils/sort.util';
import { likeContains, sqlUnaccent } from 'src/common/utils/text.util';
import { UserRole } from 'src/entities/user-role.entity';
import { User } from 'src/entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { FindUsersDto } from './dto/find-users.dto';
import { LockUserDto } from './dto/lock-user.dto';
import { UpdateRolesDto } from './dto/update-roles.dto';
import { UpdateProfileDto, UpdateUserDto } from './dto/update-user.dto';
import { UserStatus } from './enums/user-status.enum';
import { AccountRow, UserResponse } from './types/account.type';
import { accountStatusSql, resolveAccountStatus } from './utils/account-status.util';

// Mỗi tài khoản người thuê gắn đúng một hợp đồng
const ACCOUNT_FROM = `
  from public.users u
  left join lateral (
    select c.id, c.room_id, c.primary_occupant_id, c.ended_on
      from public.contracts c
     where c.tenant_user_id = u.id
     order by c.created_at desc
     limit 1
  ) tc on true
  left join public.rooms r on r.id = tc.room_id`;

const ACCOUNT_COLUMNS = `
  u.id, u.username, u.full_name, u.phone, u.email, u.status, u.must_change_password,
  u.session_version, u.last_login_at, u.created_at,
  coalesce((select array_agg(ur.role order by ur.role) from public.user_roles ur where ur.user_id = u.id),
           '{}'::varchar[]) as roles,
  tc.id as contract_id, tc.room_id, r.code as room_code, tc.primary_occupant_id, tc.ended_on`;

const SORT_FIELDS = {
  username: 'lower(u.username)',
  fullName: 'u.full_name',
  createdAt: 'u.created_at',
  lastLoginAt: 'u.last_login_at',
};

// Tuần tự hóa các thao tác có thể làm mất Quản trị hệ thống cuối cùng
const SYSTEM_ADMIN_LOCK = `select pg_advisory_xact_lock(hashtext('users.system_admin'))`;

@Injectable()
export class UsersService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async findAccount(id: string, manager: EntityManager = this.dataSource.manager) {
    return selectOne<AccountRow>(
      manager,
      `select ${ACCOUNT_COLUMNS} ${ACCOUNT_FROM} where u.id = $1`,
      [id],
    );
  }

  // Chỉ đăng nhập mới đọc mật khẩu băm
  async findCredentials(username: string) {
    return selectOne<{ id: string; password_hash: string }>(
      this.dataSource.manager,
      `select id, password_hash from public.users where lower(username) = lower(btrim($1))`,
      [username],
    );
  }

  toResponse(row: AccountRow, today = vnToday()): UserResponse {
    const { status, readOnlyUntil } = resolveAccountStatus(row.status, row.ended_on, today);
    return {
      id: row.id,
      username: row.username,
      fullName: row.full_name,
      phone: row.phone,
      email: row.email,
      roles: row.roles,
      status,
      mustChangePassword: row.must_change_password,
      lastLoginAt: toVnDateTime(row.last_login_at),
      createdAt: toVnDateTime(row.created_at),
      tenant:
        row.contract_id && row.room_id && row.room_code && row.primary_occupant_id
          ? {
              roomId: row.room_id,
              roomCode: row.room_code,
              contractId: row.contract_id,
              occupantId: row.primary_occupant_id,
              readOnlyUntil,
            }
          : null,
    };
  }

  async findAll(query: FindUsersDto) {
    const today = vnToday();
    const where = new WhereBuilder();

    if (query.q) {
      const like = likeContains(query.q);
      where.add(
        `(lower(u.username) like ? escape '\\' or ${sqlUnaccent('u.full_name')} like ? escape '\\')`,
        like,
        like,
      );
    }
    if (query.role) {
      where.add('exists (select 1 from public.user_roles x where x.user_id = u.id and x.role = ?)', query.role);
    }
    // accountStatusSql('?') có đúng một chỗ đặt tham số cho ngày hôm nay
    if (query.status) where.add(`${accountStatusSql('?')} = ?`, today, query.status);

    const orderBy = buildOrderBy(query.sort, SORT_FIELDS, 'username', 'u.id');
    const limit = where.param(query.pageSize);
    const offset = where.param((query.page - 1) * query.pageSize);

    const rows = await selectRows<AccountRow>(
      this.dataSource.manager,
      `select ${ACCOUNT_COLUMNS}, count(*) over () as total
         ${ACCOUNT_FROM}
         ${where.sql}
        order by ${orderBy}
        limit ${limit} offset ${offset}`,
      where.params,
    );

    return new Paginated(
      rows.map((r) => this.toResponse(r, today)),
      query.page,
      query.pageSize,
      rows[0]?.total ?? 0,
    );
  }

  async findOne(id: string, manager?: EntityManager) {
    const row = await this.findAccount(id, manager);
    if (!row) throw new AppException('RESOURCE_NOT_FOUND');
    return this.toResponse(row);
  }

  // USR-02 Tạo tài khoản nhân viên
  async create(dto: CreateUserDto, ctx: RequestContext) {
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);

    return this.dataSource.transaction(async (manager) => {
      const { identifiers } = await manager.getRepository(User).insert({
        username: dto.username,
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone ?? null,
        email: dto.email ?? null,
        mustChangePassword: true,
      });
      const userId = identifiers[0].id as string;

      await manager
        .getRepository(UserRole)
        .insert(dto.roles.map((role) => ({ userId, role, assignedBy: ctx.user.id })));

      await this.auditLogsService.log(manager, ctx, {
        action: 'USER_CREATED',
        entityType: 'USER',
        entityId: userId,
        summary: `Tạo tài khoản ${dto.username} (${dto.roles.join(', ')})`,
        after: { username: dto.username, fullName: dto.fullName, roles: dto.roles },
      });

      return { user: await this.findOne(userId, manager), temporaryPassword };
    });
  }

  // USR-04 Sửa thông tin tài khoản
  async update(id: string, dto: UpdateUserDto) {
    const changes = definedOnly({ fullName: dto.fullName, phone: dto.phone, email: dto.email });
    if (Object.keys(changes).length > 0) {
      const result = await this.dataSource.getRepository(User).update({ id }, changes);
      if (!result.affected) throw new AppException('RESOURCE_NOT_FOUND');
    }
    return this.findOne(id);
  }

  // USR-09 Cập nhật thông tin cá nhân
  async updateProfile(user: CurrentUser, dto: UpdateProfileDto) {
    if (user.status === UserStatus.READ_ONLY) throw new AppException('TENANT_READ_ONLY');
    const changes = definedOnly({ phone: dto.phone, email: dto.email });
    if (Object.keys(changes).length > 0) {
      await this.dataSource.getRepository(User).update({ id: user.id }, changes);
    }
    return this.findOne(user.id);
  }

  // USR-05 Gán lại vai trò
  async replaceRoles(id: string, dto: UpdateRolesDto, ctx: RequestContext) {
    return this.dataSource.transaction(async (manager) => {
      await manager.query(SYSTEM_ADMIN_LOCK);
      const before = await this.lockAccount(manager, id);

      if (before.roles.includes(Role.TENANT)) throw new AppException('TENANT_ACCOUNT_NOT_EDITABLE');
      if (before.roles.includes(Role.SYSTEM_ADMIN) && !dto.roles.includes(Role.SYSTEM_ADMIN)) {
        await this.assertAnotherActiveAdmin(manager, id);
      }

      const roleRepo = manager.getRepository(UserRole);
      await roleRepo.delete({ userId: id, role: Not(In(dto.roles)) });
      const added = dto.roles.filter((role) => !before.roles.includes(role));
      if (added.length > 0) {
        await roleRepo.insert(added.map((role) => ({ userId: id, role, assignedBy: ctx.user.id })));
      }

      await this.auditLogsService.log(manager, ctx, {
        action: 'USER_ROLES_CHANGED',
        entityType: 'USER',
        entityId: id,
        summary: `Đổi vai trò của ${before.username}: ${dto.roles.join(', ')}`,
        before: { roles: before.roles },
        after: { roles: [...dto.roles].sort() },
      });

      // Có hiệu lực từ yêu cầu kế tiếp (vai trò đọc lại ở mỗi yêu cầu)
      return this.findOne(id, manager);
    });
  }

  // USR-06 Khóa tài khoản, USR-07 Mở khóa
  async setLocked(id: string, locked: boolean, dto: LockUserDto, ctx: RequestContext) {
    if (locked && id === ctx.user.id) throw new AppException('CANNOT_LOCK_SELF');

    return this.dataSource.transaction(async (manager) => {
      await manager.query(SYSTEM_ADMIN_LOCK);
      const account = await this.lockAccount(manager, id);
      const today = vnToday();

      if (locked) {
        if (account.roles.includes(Role.SYSTEM_ADMIN)) await this.assertAnotherActiveAdmin(manager, id);
        // Mọi phiên đang mở hết hiệu lực ngay
        await manager.query(
          `update public.users set status = 'LOCKED', session_version = session_version + 1 where id = $1`,
          [id],
        );
        await revokeUserSessions(manager, id);
      } else {
        const { status } = resolveAccountStatus('ACTIVE', account.ended_on, today);
        if (status === UserStatus.LOCKED) throw new AppException('TENANT_ACCESS_EXPIRED');
        await manager.getRepository(User).update({ id }, { status: 'ACTIVE' });
      }

      await this.auditLogsService.log(manager, ctx, {
        action: locked ? 'USER_LOCKED' : 'USER_UNLOCKED',
        entityType: 'USER',
        entityId: id,
        summary: `${locked ? 'Khóa' : 'Mở khóa'} tài khoản ${account.username}${dto.reason ? `: ${dto.reason}` : ''}`,
        before: { status: account.status },
        after: { status: locked ? 'LOCKED' : 'ACTIVE', reason: dto.reason ?? null },
      });

      return this.findOne(id, manager);
    });
  }

  // USR-08 Đặt lại mật khẩu
  async resetPassword(id: string, ctx: RequestContext) {
    if (id === ctx.user.id) throw new AppException('CANNOT_RESET_SELF');

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);

    return this.dataSource.transaction(async (manager) => {
      const account = await this.lockAccount(manager, id);

      // Quản lý chỉ đặt lại cho người thuê; tài khoản nhân viên do Quản trị hệ thống đặt lại
      const actorIsAdmin = ctx.user.roles.includes(Role.SYSTEM_ADMIN);
      if (!actorIsAdmin && !account.roles.includes(Role.TENANT)) throw new AppException('FORBIDDEN');

      await manager.query(
        `update public.users
            set password_hash = $2, must_change_password = true, session_version = session_version + 1
          where id = $1`,
        [id, passwordHash],
      );
      await revokeUserSessions(manager, id);

      await this.auditLogsService.log(manager, ctx, {
        action: 'PASSWORD_RESET',
        entityType: 'USER',
        entityId: id,
        summary: `Đặt lại mật khẩu cho ${account.username}`,
      });

      return { temporaryPassword };
    });
  }

  private async lockAccount(manager: EntityManager, id: string) {
    if (!(await lockRow(manager, 'users', id))) throw new AppException('RESOURCE_NOT_FOUND');
    const account = await this.findAccount(id, manager);
    if (!account) throw new AppException('RESOURCE_NOT_FOUND');
    return account;
  }

  // Gọi sau SYSTEM_ADMIN_LOCK
  private async assertAnotherActiveAdmin(manager: EntityManager, exceptUserId: string) {
    const other = await selectOne(
      manager,
      `select 1
         from public.user_roles ur
         join public.users u on u.id = ur.user_id
        where ur.role = 'SYSTEM_ADMIN' and u.status = 'ACTIVE' and u.id <> $1
        limit 1`,
      [exceptUserId],
    );
    if (!other) throw new AppException('LAST_SYSTEM_ADMIN');
  }
}
