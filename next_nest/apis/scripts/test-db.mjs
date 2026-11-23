// CSDL thử chạy trong bộ nhớ (PGlite), không cần Docker hay Supabase.
// Chạy đủ migration và seed của ../supabase rồi mở cổng TCP cho API nối vào:
//   pnpm db:test            (cổng mặc định 54329)
//   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54329/postgres
// Dữ liệu mất khi dừng tiến trình. Chỉ dùng để phát triển và kiểm thử.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

const here = path.dirname(fileURLToPath(import.meta.url));
const supabaseDir = path.resolve(here, '../../supabase');
const port = Number(process.env.TEST_DB_PORT ?? 54329);

const db = await PGlite.create({ extensions: { btree_gist } });
// Vai trò sẵn có trên Supabase, migration bảo mật thu hồi quyền của hai vai trò này
await db.exec(`create role anon nologin; create role authenticated nologin;
               grant usage on schema public to anon, authenticated;`);

const migrations = path.join(supabaseDir, 'migrations');
for (const file of fs.readdirSync(migrations).filter((f) => f.endsWith('.sql')).sort()) {
  await db.exec(fs.readFileSync(path.join(migrations, file), 'utf8'));
  console.log('migration:', file);
}
await db.exec(fs.readFileSync(path.join(supabaseDir, 'seed.sql'), 'utf8'));
console.log('seed: tài khoản mẫu, mật khẩu Abc@12345');

// PGlite chỉ có một kết nối thật; API cần đặt DATABASE_POOL_MAX=1 để các giao dịch không đan xen
const server = new PGLiteSocketServer({ db, port, host: '127.0.0.1', maxConnections: 1 });
await server.start();
console.log(`READY postgresql://postgres:postgres@127.0.0.1:${port}/postgres`);

const stop = async () => {
  await server.stop();
  await db.close();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
