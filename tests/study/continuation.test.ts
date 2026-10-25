import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planBudgetStrokes } from '../../src/lib/budget-strokes';
import { CO_CREATE_MATERIALS, constrainPlacement } from '../../src/lib/co-create';
import type { ImageSource, StrokeDrawData } from '../../src/lib/stroke-engine';

function solid(r: number, g: number, b: number): ImageSource {
  const data = new Uint8ClampedArray(32 * 24 * 4);
  for (let i = 0; i < data.length; i += 4) data.set([r, g, b, 255], i);
  return { width: 32, height: 24, data };
}

test('a completed colored canvas needs no repaint; default planning still starts on white', async () => {
  const target = solid(90, 170, 130);
  const continued = await planBudgetStrokes(target, 32, 24, 60, 1, .85, undefined, { initialCanvas: target });
  assert.deepEqual(continued, []);
  assert.ok((await planBudgetStrokes(target, 32, 24, 60)).length > 0);
});

test('an added material produces a streamed continuation without mutating current pixels', async () => {
  const initial = solid(90, 170, 130);
  const untouched = initial.data.slice();
  const target = { ...initial, data: initial.data.slice() };
  for (let y = 8; y < 18; y++) for (let x = 18; x < 28; x++) target.data.set([250, 90, 170, 255], (y * 32 + x) * 4);
  const batches: StrokeDrawData[] = [];
  const strokes = await planBudgetStrokes(target, 32, 24, 80, 1, .85, undefined, {
    initialCanvas: initial,
    priorityRegion: { x: 18, y: 8, width: 10, height: 10 },
    onBatch: batch => batches.push(...batch),
  });
  assert.ok(strokes.length > 0 && strokes.length <= 80);
  assert.deepEqual(batches, strokes);
  assert.deepEqual(initial.data, untouched);
  assert.ok(strokes.some(s => s.color[0] > s.color[1]));
  await assert.rejects(planBudgetStrokes(target, 32, 24, 10, 1, .85, undefined, {
    initialCanvas: { width: 32, height: 24, data: new Uint8ClampedArray(0) },
  }), /续绘画布像素无效/);
});

test('all static material previews stay on canvas and keep their proportions', () => {
  for (const material of CO_CREATE_MATERIALS) {
    const p = constrainPlacement({ material, x: -50, y: 900, width: 900, height: 900 }, 640, 480);
    assert.equal(p.width / p.height, material.ratio);
    assert.ok(p.x - p.width / 2 >= 0 && p.x + p.width / 2 <= 640);
    assert.ok(p.y - p.height / 2 >= 0 && p.y + p.height / 2 <= 480);
  }
});
