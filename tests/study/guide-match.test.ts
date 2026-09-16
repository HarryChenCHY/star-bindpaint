import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchScore } from '../../src/lib/drawing-engine';

test('长笔触按线段匹配，中段不再误判为远离端点', () => {
  const guide = [{ x: 0, y: 0 }, { x: 600, y: 0 }];
  const user = Array.from({ length: 20 }, (_, i) => ({ x: i * 30, y: 0 }));
  assert.equal(matchScore(user, guide), 1);
  assert.ok(matchScore(user.map(p => ({ ...p, y: 60 })), guide) > .3);
  assert.equal(matchScore(user.map(p => ({ ...p, y: 200 })), guide), 0);
});

test('屏幕缩放后相同偏差具有相同容错，重复点不会产生 NaN', () => {
  const guide = [{ x: 0, y: 0 }, { x: 300, y: 0 }];
  const user = [{ x: 0, y: 25 }, { x: 150, y: 25 }, { x: 300, y: 25 }];
  const scale = (p: { x: number; y: number }) => ({ x: p.x * 3, y: p.y * 3 });
  assert.equal(matchScore(user, guide, 100), matchScore(user.map(scale), guide.map(scale), 300));
  assert.ok(Number.isFinite(matchScore(user, [{ x: 0, y: 0 }, { x: 0, y: 0 }])));
  assert.equal(matchScore([], guide), 0);
});
