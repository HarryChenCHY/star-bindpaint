import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { NextRequest } from 'next/server';
import { POST as upload, GET as download } from '../../src/app/api/upload/route';
import { POST as collect, DELETE as withdraw } from '../../src/app/api/analytics/route';
import { GET as stats } from '../../src/app/api/analytics/stats/route';
import { readLocalObject, listLocalObjects } from '../../src/lib/server-object-store';

test('腾讯云本机存储保持作品签名访问、统计鉴权、研究同意和撤回删除', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'startrace-objects-'));
  const oldDir = process.env.STARTRACE_OBJECT_DATA_DIR;
  const oldToken = process.env.ANALYTICS_ADMIN_TOKEN;
  const token = randomBytes(32).toString('hex');
  process.env.STARTRACE_OBJECT_DATA_DIR = dir;
  process.env.ANALYTICS_ADMIN_TOKEN = token;
  const req = (route: string, body: unknown, method = 'POST') => new NextRequest(`https://localhost${route}`, { method, body: JSON.stringify(body) });
  const participantId = 'p_fixtureabcdefgh';
  try {
    const imageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aYXsAAAAASUVORK5CYII=';
    const response = await upload(req('/api/upload', { participantId, imageBase64 }));
    assert.equal(response.status, 200);
    const image = await response.json();
    assert.match(image.url, /^\/api\/upload\?/);
    const valid = await download(new NextRequest(`https://localhost${image.url}`));
    assert.equal(valid.status, 200);
    assert.deepEqual(Buffer.from(await valid.arrayBuffer()), Buffer.from(imageBase64.split(',')[1], 'base64'));
    const tampered = new URL(image.url, 'https://localhost');
    tampered.searchParams.set('key', '../study.sqlite');
    assert.equal((await download(new NextRequest(tampered))).status, 403);
    const expired = new URL(image.url, 'https://localhost');
    expired.searchParams.set('expires', '1');
    assert.equal((await download(new NextRequest(expired))).status, 403);
    assert.throws(() => readLocalObject('../study.sqlite'), /Invalid object key/);
    const data = { participantId, sessionId: 'session_fixture', researchConsent: true, totalStrokes: 10 };
    assert.equal((await collect(req('/api/analytics', { ...data, researchConsent: false }))).status, 403);
    assert.equal((await (await collect(req('/api/analytics', data))).json()).stored, true);
    assert.equal((await stats(new NextRequest('https://localhost/api/analytics/stats'))).status, 401);
    const summary = await stats(new NextRequest('https://localhost/api/analytics/stats', { headers: { Authorization: `Bearer ${token}` } }));
    assert.equal(summary.status, 200);
    assert.equal((await summary.json()).total, 1);
    assert.equal((await (await withdraw(req('/api/analytics', { participantId, confirm: true }, 'DELETE'))).json()).deleted, 2);
    assert.equal((await download(new NextRequest(`https://localhost${image.url}`))).status, 404);
    assert.deepEqual(await listLocalObjects('sessions/'), []);
    assert.deepEqual(await listLocalObjects('gallery/'), []);
  } finally {
    if (oldDir === undefined) delete process.env.STARTRACE_OBJECT_DATA_DIR;
    else process.env.STARTRACE_OBJECT_DATA_DIR = oldDir;
    if (oldToken === undefined) delete process.env.ANALYTICS_ADMIN_TOKEN;
    else process.env.ANALYTICS_ADMIN_TOKEN = oldToken;
    rmSync(dir, { recursive: true, force: true });
  }
});
