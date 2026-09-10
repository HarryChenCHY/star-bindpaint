import { test } from 'node:test';
import assert from 'node:assert/strict';
import { api } from '../../src/lib/study/client';

test('研究接口区分 HTML 故障、损坏 JSON 和正常业务响应', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch');
  fetchMock.mock.mockImplementation(async () => new Response('<!DOCTYPE html><html>Server error</html>', {
    status: 500, headers: { 'Content-Type': 'text/html' },
  }));
  await assert.rejects(api(), /研究服务暂时不可用（HTTP 500）/);
  fetchMock.mock.mockImplementation(async () => new Response('{', {
    headers: { 'Content-Type': 'application/json' },
  }));
  await assert.rejects(api(), /数据不完整/);
  fetchMock.mock.mockImplementation(async () => Response.json({ error: '研究尚未发布' }, { status: 409 }));
  await assert.rejects(api(), /研究尚未发布/);
  fetchMock.mock.mockImplementation(async () => Response.json({ participant: null }));
  assert.deepEqual(await api(), { participant: null });
});
