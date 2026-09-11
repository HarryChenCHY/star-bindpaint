import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NextRequest } from 'next/server';
import { GET, POST } from '../../src/app/api/studies/route';
import { getRepository, StudyRepository } from '../../src/lib/study/server/repository';

test('生产存储未配置或不可写时返回安全的 503，修复后恢复且重开保留数据', async () => {
  const oldMode = process.env.NODE_ENV;
  const oldDir = process.env.STUDY_DATA_DIR;
  const dir = mkdtempSync(join(tmpdir(), 'startrace-storage-'));
  let repo: StudyRepository | undefined;
  try {
    Object.assign(process.env, { NODE_ENV: 'production' });
    delete process.env.STUDY_DATA_DIR;
    const blocked = join(dir, 'not-a-directory');
    writeFileSync(blocked, 'fixture');
    for (const location of [undefined, blocked]) {
      if (location) process.env.STUDY_DATA_DIR = location;
      for (const response of [
        await GET(new NextRequest('http://localhost/api/studies')),
        await POST(new NextRequest('http://localhost/api/studies', {
          method: 'POST', body: JSON.stringify({ action: 'enroll' }),
        })),
      ]) {
        assert.equal(response.status, 503);
        const body = await response.json();
        assert.equal(body.code, 'STUDY_UNAVAILABLE');
        assert.match(body.error, /测试服务暂时不可用/);
        assert.doesNotMatch(body.error, /STUDY_DATA_DIR|SQLITE|ENOTDIR|not-a-directory/);
      }
    }
    process.env.STUDY_DATA_DIR = join(dir, 'persistent');
    const response = await GET(new NextRequest('http://localhost/api/studies'));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).participant, null);
    repo = getRepository();
    repo.put('storage-check', 'restart', { retained: true });
    repo.db.close();
    repo = new StudyRepository(process.env.STUDY_DATA_DIR);
    assert.deepEqual(repo.get('storage-check', 'restart'), { retained: true });
  } finally {
    repo?.db.close();
    if (oldMode === undefined) Reflect.deleteProperty(process.env, 'NODE_ENV');
    else Object.assign(process.env, { NODE_ENV: oldMode });
    if (oldDir === undefined) delete process.env.STUDY_DATA_DIR;
    else process.env.STUDY_DATA_DIR = oldDir;
    rmSync(dir, { recursive: true, force: true });
  }
});
