import { mkdir, readFile, readdir, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

export const localObjectsEnabled = () => !!process.env.STARTRACE_OBJECT_DATA_DIR;
function location(key: string) {
  const root = process.env.STARTRACE_OBJECT_DATA_DIR;
  if (!root) throw new Error('Object storage unavailable');
  if (!/^[a-zA-Z0-9_./-]+$/.test(key) || path.isAbsolute(key) || key.split('/').some(p => p === '..' || p === '.'))
    throw new Error('Invalid object key');
  return path.join(root, key);
}
export async function putLocalObject(key: string, data: string | Buffer) {
  const target = location(key);
  await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
  const temp = `${target}.${randomUUID()}.tmp`;
  await writeFile(temp, data, { mode: 0o600, flush: true });
  await rename(temp, target);
}
export const readLocalObject = (key: string) => readFile(location(key));
export async function deleteLocalObject(key: string) {
  try { await unlink(location(key)); } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
  }
}
export async function listLocalObjects(prefix: string): Promise<string[]> {
  const folder = location(prefix);
  const keys: string[] = [];
  async function walk(dir: string, key: string) {
    let entries;
    try { entries = await readdir(dir, { withFileTypes: true }); } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw e;
    }
    for (const item of entries) {
      const child = `${key}${item.name}`;
      if (item.isDirectory()) await walk(path.join(dir, item.name), `${child}/`);
      else if (item.isFile() && !item.name.endsWith('.tmp')) keys.push(child);
    }
  }
  await walk(folder, prefix.endsWith('/') ? prefix : `${prefix}/`);
  return keys;
}
function signature(key: string, expires: number) {
  const secret = process.env.ANALYTICS_ADMIN_TOKEN;
  if (!secret) throw new Error('Object signing unavailable');
  location(key);
  return createHmac('sha256', secret).update(`startrace-object\n${key}\n${expires}`).digest('hex');
}
export function localObjectUrl(key: string) {
  const expires = Math.floor(Date.now() / 1000) + 30 * 86400;
  return `/api/upload?${new URLSearchParams({ key, expires: String(expires), signature: signature(key, expires) })}`;
}
export function validObjectSignature(key: string, expires: number, provided: string) {
  if (!Number.isSafeInteger(expires) || expires <= Date.now() / 1000 || !/^[a-f0-9]{64}$/.test(provided)) return false;
  if (!/^gallery\/[a-zA-Z0-9_-]+\/\d{4}-\d{2}-\d{2}\/[a-f0-9]{24}\.(png|webp|jpg)$/.test(key)) return false;
  return timingSafeEqual(Buffer.from(signature(key, expires), 'hex'), Buffer.from(provided, 'hex'));
}
