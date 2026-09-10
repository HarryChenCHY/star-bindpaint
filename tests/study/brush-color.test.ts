import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveBrushColor, type BrushColor } from '../../src/lib/brush-color';
import { MASTER_STYLES, stylizeStroke } from '../../src/lib/style-transfer';

test('自由笔刷 HSV 调节限制范围，低饱和度不会被误算为暗色', () => {
  assert.deepEqual(resolveBrushColor([1, 0, 0], 0, 1), [1, 1, 1]);
  const color = resolveBrushColor([.95, .85, .1], .6, 1.3);
  assert.equal(color[0], 1);
  assert.ok(color[1] > .9 && color[2] > .4);
  for (const base of [[1, 0, 0], [0, 1, 0], [0, 0, 1], [.2, .2, .2]] as BrushColor[])
    for (const s of [0, .6, 1, 2]) for (const v of [0, .3, 1.3, 2])
      assert.ok(resolveBrushColor(base, s, v).every(n => n >= 0 && n <= 1));
});
test('六种笔刷最终颜色接近预览，覆盖色偏受控', () => {
  const points = Array.from({ length: 40 }, (_, i) => ({ x: i * 4, y: 30 }));
  for (const base of [[.95, .85, .1], [.1, .3, .7], [.9, .2, .2]] as BrushColor[]) {
    const preview = resolveBrushColor(base, .6, 1.3);
    for (const style of MASTER_STYLES) {
      const segments = stylizeStroke(points, points.map(() => .5), base, style, 16, .6, 1.3);
      for (const segment of segments) for (const color of segment.colors) {
        color.forEach((c, i) => assert.ok(Math.abs(c - preview[i]) < .04));
        for (const background of [0, .5, 1]) color.forEach((c, i) => {
          const rendered = c * segment.opacity + background * (1 - segment.opacity);
          assert.ok(Math.abs(rendered - preview[i]) * 255 < 20);
        });
      }
    }
  }
});
