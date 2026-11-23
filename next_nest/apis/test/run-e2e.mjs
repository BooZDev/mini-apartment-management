// Chạy lần lượt các kịch bản đầu cuối trên cùng một CSDL thử mới khởi tạo
import { spawnSync } from 'node:child_process';

const files = ['test/api.e2e.mjs', 'test/billing.e2e.mjs'];
for (const file of files) {
  console.log(`\n### ${file}`);
  const result = spawnSync(process.execPath, [file, ...process.argv.slice(2)], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
