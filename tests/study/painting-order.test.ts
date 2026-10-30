import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planExpressivePainting } from '../../src/lib/expressive-painter';
import { blurPaintingReference } from '../../src/lib/expressive-scheduling';
import type { ImageSource } from '../../src/lib/stroke-engine';

function image(width: number, height: number, color: number[]): ImageSource {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let p = 0; p < width * height; p++) data.set([...color, 255], p * 4);
  return { width, height, data };
}

test('coarse references suppress small variations without changing input or a uniform field', () => {
  const width = 24, height = 18;
  const pixels = new Float32Array(width * height * 3).fill(.4);
  const unchanged = pixels.slice();
  assert.ok(blurPaintingReference(pixels, width, height, 3).every(v => Math.abs(v - .4) < .00001));
  pixels.set([1, 1, 1], (9 * width + 12) * 3);
  const original = pixels.slice();
  const coarse = blurPaintingReference(pixels, width, height, 3);
  assert.ok(coarse[(9 * width + 12) * 3] < .5);
  assert.ok(coarse[(9 * width + 11) * 3] > unchanged[0]);
  assert.deepEqual(pixels, original);
});

test('painting progresses coarse-to-fine with short inter-stroke travel on separated color masses', async () => {
  const target = image(96, 72, [255, 255, 255]);
  for (let y = 4; y < 68; y++) for (let x = 4; x < 92; x++) {
    const column = Math.floor(x / 24), row = Math.floor(y / 24);
    target.data.set([40 + column * 50, 55 + row * 65, 180 - column * 30, 255], (y * 96 + x) * 4);
  }
  const strokes = await planExpressivePainting(target, image(96, 72, [255, 255, 255]), { abstraction: 60, mood: 'original' }, { budget: 500 });
  assert.ok(strokes.length > 100 && strokes.length <= 500);
  const passes = new Set(strokes.map(s => s.planning!.pass));
  assert.ok(passes.has(0) && passes.has(3));
  let total = 0, long = 0;
  for (let i = 1; i < strokes.length; i++) {
    assert.ok(strokes[i].planning!.pass >= strokes[i - 1].planning!.pass);
    const previous = strokes[i - 1].points.at(-1)!, next = strokes[i].points[0];
    const distance = Math.hypot(previous.x - next.x, previous.y - next.y) / 120;
    total += distance;
    if (distance > .25) long++;
  }
  assert.ok(total / (strokes.length - 1) < .15, 'average empty travel should stay within a local neighborhood');
  assert.ok(long / (strokes.length - 1) < .12, 'long cross-canvas moves should be occasional region changes');
});

test('material continuation starts at an appropriate scale and cannot mark distant completed pixels', async () => {
  const current = image(96, 72, [80, 130, 150]);
  const target = { ...current, data: current.data.slice() };
  const priority = { x: 36, y: 24, width: 20, height: 18 };
  for (let y = 24; y < 42; y++) for (let x = 36; x < 56; x++) target.data.set([230, 95, 140, 255], (y * 96 + x) * 4);
  const before = current.data.slice();
  const strokes = await planExpressivePainting(target, current, { abstraction: 0, mood: 'original' }, { budget: 180, priority, origin: { x: 5, y: 5 } });
  assert.ok(strokes.length > 0 && strokes.length <= 180);
  assert.ok(strokes.every(s => s.planning!.pass >= 1));
  assert.ok(strokes.some(s => s.color[0] > .7));
  // The scheduling halo is wider than the material, but cannot reach the far field.
  for (const s of strokes) for (let i = 0; i < s.points.length; i++) {
    const p = s.points[i], radius = s.radii[i];
    assert.ok(p.x - radius > 25 && p.x + radius < 67);
    assert.ok(p.y - radius > 13 && p.y + radius < 53);
  }
  assert.deepEqual(current.data, before);
  await assert.rejects(planExpressivePainting(target, current, { abstraction: 0, mood: 'original' }, { priority: { ...priority, x: NaN } }), /区域/);
});

test('adding material halfway through a photo still continues the unfinished areas', async () => {
  const target = image(96, 72, [70, 120, 170]);
  const current = image(96, 72, [255, 255, 255]);
  const priority = { x: 12, y: 12, width: 18, height: 18 };
  for (let y = 12; y < 30; y++) for (let x = 12; x < 30; x++) target.data.set([230, 85, 140, 255], (y * 96 + x) * 4);
  const strokes = await planExpressivePainting(target, current, { abstraction: 0, mood: 'original' }, { budget: 240, priority, resumePass: 0 });
  assert.ok(strokes.some(s => s.points.some(p => p.x > 70)), 'the unpainted far side must not be abandoned');
  assert.ok(strokes.slice(0, 20).some(s => s.points.some(p => p.x >= 12 && p.x <= 30 && p.y >= 12 && p.y <= 30)), 'the new material should receive an early response');
  assert.ok(strokes.some(s => s.planning!.pass === 0));
  await assert.rejects(planExpressivePainting(target, current, { abstraction: 0, mood: 'original' }, { priority, resumePass: NaN }), /阶段/);
});
