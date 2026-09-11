import { DatabaseSync } from 'node:sqlite';
import {
  mkdirSync,
  existsSync,
  cpSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  chmodSync,
} from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { createHash } from 'node:crypto';
const source = resolve(process.argv[2] || 'data/studies');
const destination = process.argv[3] && resolve(process.argv[3]);
if (
  !destination ||
  destination.startsWith(source + '/') ||
  destination === source ||
  existsSync(destination)
)
  throw new Error(
    '用法：node scripts/study-backup.mjs <研究目录> <尚不存在的备份目录>。备份前暂停采集和删除操作。',
  );
if (!existsSync(join(source, 'study.sqlite')))
  throw new Error('研究数据库不存在');
mkdirSync(destination, { recursive: true, mode: 0o700 });
const db = new DatabaseSync(join(source, 'study.sqlite'));
try {
  db.exec(
    `VACUUM INTO '${join(destination, 'study.sqlite').replaceAll("'", "''")}'`,
  );
} finally {
  db.close();
}
for (const folder of ['artworks', 'raw', 'exports', 'pilot-reviews', 'handoffs', 'objects'])
  if (existsSync(join(source, folder)))
    cpSync(join(source, folder), join(destination, folder), {
      recursive: true,
    });
const manifest = [];
function walk(dir) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, item.name);
    if (item.isDirectory()) {
      chmodSync(path, 0o700);
      walk(path);
    } else {
      chmodSync(path, 0o600);
      manifest.push({
        path: relative(destination, path),
        sha256: createHash('sha256').update(readFileSync(path)).digest('hex'),
      });
    }
  }
}
walk(destination);
writeFileSync(
  join(destination, 'backup-manifest.json'),
  JSON.stringify(
    { createdAt: new Date().toISOString(), files: manifest },
    null,
    2,
  ),
  { mode: 0o600 },
);
console.log(
  `备份完成，${manifest.length} 个文件。恢复时使用新目录校验，勿覆盖现有研究数据。`,
);
