import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, openSync, writeFileSync, fsyncSync, closeSync, renameSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export const hash = (v: string | Buffer) => createHash('sha256').update(v).digest('hex');
export class StudyRepository {
  db: DatabaseSync;
  constructor(public root: string) {
    mkdirSync(root, { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(path.join(root, 'study.sqlite'));
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS records (kind TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY(kind,id)); CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY, at TEXT NOT NULL, action TEXT NOT NULL, target TEXT NOT NULL, detail TEXT NOT NULL);');
  }
  get<T>(kind: string, id: string): T | null {
    const row = this.db.prepare('SELECT data FROM records WHERE kind=? AND id=?').get(kind, id);
    return row ? JSON.parse(String(row.data)) as T : null;
  }
  all<T>(kind: string): T[] { return this.db.prepare('SELECT data FROM records WHERE kind=? ORDER BY id').all(kind).map(r => JSON.parse(String(r.data)) as T); }
  put(kind: string, id: string, value: unknown) { this.db.prepare('INSERT INTO records VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data').run(kind, id, JSON.stringify(value)); }
  transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = fn(); this.db.exec('COMMIT'); return result; } catch (e) { this.db.exec('ROLLBACK'); throw e; }
  }
  audit(action: string, target: string, detail: unknown = {}) { this.db.prepare('INSERT INTO audit(at,action,target,detail) VALUES(?,?,?,?)').run(new Date().toISOString(), action, target, JSON.stringify(detail)); }
  write(relative: string, data: string | Buffer) {
    if (!/^[a-zA-Z0-9_./+\-]+$/.test(relative) || relative.includes('..')) throw new Error('文件标识无效');
    const target = path.join(this.root, relative); mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
    const temp = `${target}.${randomUUID()}.tmp`, fd = openSync(temp, 'wx', 0o600);
    try { writeFileSync(fd, data); fsyncSync(fd); } finally { closeSync(fd); }
    renameSync(temp, target);
    const directory = openSync(path.dirname(target), 'r'); try { fsyncSync(directory); } finally { closeSync(directory); }
    return hash(data);
  }
  read(relative: string) { if (relative.includes('..') || path.isAbsolute(relative)) throw new Error('文件标识无效'); return readFileSync(path.join(this.root, relative)); }
}
let repository: StudyRepository | null = null;
export function getRepository() {
  if (process.env.NODE_ENV === 'production' && !process.env.STUDY_DATA_DIR) throw new Error('正式部署必须配置持久磁盘 STUDY_DATA_DIR');
  return repository ??= new StudyRepository(process.env.STUDY_DATA_DIR || path.join(process.cwd(), 'data/studies'));
}
