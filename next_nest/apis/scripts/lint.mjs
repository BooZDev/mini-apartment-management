// Chạy oxlint trên mọi file .ts của src/ và test/.
// next_nest/.gitignore đang bỏ qua thư mục apis, nên oxlint tự duyệt thư mục sẽ không thấy file nào;
// script này liệt kê file rồi truyền thẳng cho oxlint.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const files = [];
const walk = (dir) => {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|mts)$/.test(entry.name)) files.push(full);
  }
};
walk('src');
walk('test');

const result = spawnSync('npx', ['oxlint', '--type-aware', ...process.argv.slice(2), ...files], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
process.exit(result.status ?? 1);
