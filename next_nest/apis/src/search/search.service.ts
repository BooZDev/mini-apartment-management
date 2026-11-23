import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Role } from 'src/auth/enums/role.enum';
import { CurrentUser } from 'src/auth/types/current-user';
import { selectRows } from 'src/common/database/query.util';
import { vnToday } from 'src/common/utils/date.util';
import { likeContains, sqlUnaccent } from 'src/common/utils/text.util';
import { SearchDto, SEARCH_TYPES } from './search.dto';

const LIMIT = 10;

@Injectable()
export class SearchService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  // SRCH-01 Tìm kiếm không dấu; tìm theo SĐT chỉ với MANAGER
  async search(query: SearchDto, user: CurrentUser) {
    const types = new Set(query.types?.length ? query.types : SEARCH_TYPES);
    const like = likeContains(query.q);
    const isManager = user.roles.includes(Role.MANAGER);
    const manager = this.dataSource.manager;
    const today = vnToday();

    const [rooms, occupants, invoices] = await Promise.all([
      types.has('rooms')
        ? selectRows<{ id: string; code: string; status: string }>(
            manager,
            `select r.id, r.code,
                    case when r.is_under_maintenance then 'MAINTENANCE'
                         when exists (select 1 from public.contracts c
                                       where c.room_id = r.id and c.ended_on is null and c.start_date <= $2::date) then 'OCCUPIED'
                         else 'VACANT' end as status
               from public.rooms r where lower(r.code) like $1 escape '\\'
              order by r.code limit ${LIMIT}`,
            [like, today],
          )
        : null,
      types.has('occupants')
        ? selectRows<{ id: string; full_name: string; room_code: string; phone: string | null }>(
            manager,
            `select distinct on (o.id) o.id, o.full_name, r.code as room_code, o.phone
               from public.occupants o
               join public.contract_occupants co on co.occupant_id = o.id
               join public.contracts c on c.id = co.contract_id
               join public.rooms r on r.id = c.room_id
              where not o.is_anonymized
                and (${sqlUnaccent('o.full_name')} like $1 escape '\\' ${isManager ? `or o.phone like $1 escape '\\'` : ''})
              order by o.id, co.move_in_date desc
              limit ${LIMIT}`,
            [like],
          )
        : null,
      types.has('invoices')
        ? selectRows<{ id: string; code: string; room_code: string; status: string }>(
            manager,
            `select i.id, i.code, r.code as room_code,
                    case when i.balance > 0 and $2::date > i.due_date then 'OVERDUE' else i.status end as status
               from public.invoices i join public.rooms r on r.id = i.room_id
              where lower(i.code) like $1 escape '\\' or lower(r.code) like $1 escape '\\'
              order by i.issued_at desc limit ${LIMIT}`,
            [like, today],
          )
        : null,
    ]);

    return {
      ...(rooms && { rooms }),
      ...(occupants && {
        occupants: occupants.map((o) => ({
          id: o.id,
          fullName: o.full_name,
          roomCode: o.room_code,
          ...(isManager && { phone: o.phone }),
        })),
      }),
      ...(invoices && { invoices: invoices.map((i) => ({ id: i.id, code: i.code, roomCode: i.room_code, status: i.status })) }),
    };
  }
}
