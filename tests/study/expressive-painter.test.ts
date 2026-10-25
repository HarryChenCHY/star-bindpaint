import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planExpressivePainting, prepareExpressiveTarget, type ExpressiveStroke } from '../../src/lib/expressive-painter';
import { creativeMaterialSvg, surroundingColor } from '../../src/lib/creative-material';
import { CO_CREATE_MATERIALS } from '../../src/lib/co-create';
import type { ImageSource } from '../../src/lib/stroke-engine';

function solid(rgb: number[]): ImageSource {
  const data = new Uint8ClampedArray(48 * 36 * 4);
  for (let i = 0; i < data.length; i += 4) data.set([...rgb, 255], i);
  return { width: 48, height: 36, data };
}

test('default painting stays within 2000 attempts and streams all accepted marks', { timeout: 30000 }, async () => {
  const target = solid([255, 255, 255]);
  for (let y = 4; y < 32; y++) for (let x = 4; x < 44; x++) target.data.set([(x % 7) * 30, (y % 9) * 25, 130, 255], (y * 48 + x) * 4);
  const settings = { abstraction: 30, mood: 'original' as const };
  const streamed: ExpressiveStroke[] = [];
  const strokes = await planExpressivePainting(target, solid([255, 255, 255]), settings, { onBatch: batch => streamed.push(...batch) });
  assert.deepEqual(strokes, streamed);
  assert.ok(strokes.length > 0);
  assert.ok(strokes.length <= 2000);
  assert.deepEqual(await planExpressivePainting(solid([90, 130, 160]), solid([90, 130, 160]), { abstraction: 0, mood: 'original' }, {}), []);
});

test('expressive continuation streams reproducible curves and leaves inputs untouched', async () => {
  const target = solid([255, 255, 255]);
  for (let y = 5; y < 30; y++) for (let x = 6; x < 40; x++) {
    if ((x - 23) ** 2 + (y - 18) ** 2 < 150) target.data.set([210, 110 + x, 160, 255], (y * 48 + x) * 4);
  }
  const current = solid([255, 255, 255]), copy = current.data.slice(), targetCopy = target.data.slice();
  const streamed: ExpressiveStroke[] = [];
  const settings = { abstraction: 60, mood: 'original' as const };
  const result = await planExpressivePainting(target, current, settings, { budget: 80, onBatch: s => streamed.push(...s) });
  assert.ok(result.length > 10 && result.length <= 80);
  assert.deepEqual(result, streamed);
  assert.ok(result.some(s => s.points.length >= 5));
  for (const s of result) {
    assert.equal(s.points.length, s.radii.length);
    assert.ok(s.radii.every(v => Number.isFinite(v) && v > 0));
    assert.ok(s.color.every(v => v >= 0 && v <= 1));
    assert.ok(s.points.every(p => p.x >= 0 && p.x <= 48 && p.y >= 0 && p.y <= 36));
  }
  assert.deepEqual(current.data, copy);
  assert.deepEqual(target.data, targetCopy);
  assert.deepEqual(await planExpressivePainting(target, current, settings, { budget: 80 }), result);
});

test('completed targets do not repaint and invalid images/budgets reject', async () => {
  const target = solid([90, 130, 160]);
  assert.deepEqual(await planExpressivePainting(target, target, { abstraction: 0, mood: 'original' }, { budget: 30 }), []);
  await assert.rejects(planExpressivePainting(target, target, { abstraction: 0, mood: 'original' }, { budget: 2001 }), /预算/);
  await assert.rejects(planExpressivePainting(target, { ...target, data: new Uint8ClampedArray(0) }, { abstraction: 0, mood: 'original' }, { budget: 30 }), /图像/);
});

test('color moods change colored content without tinting untouched paper or accumulating changes', () => {
  const target = solid([255, 255, 255]);
  for (let y = 8; y < 28; y++) for (let x = 8; x < 36; x++) target.data.set([80 + x, 100 + y, 150, 255], (y * 48 + x) * 4);
  const settings = { abstraction: 80, mood: 'sunlit' as const };
  const a = prepareExpressiveTarget(target, settings), b = prepareExpressiveTarget(target, { ...settings, mood: 'dusk' });
  assert.notDeepEqual(a.pixels, b.pixels);
  assert.deepEqual(Array.from(a.pixels.slice(0, 3)), [1, 1, 1]);
  assert.deepEqual(prepareExpressiveTarget(target, settings).pixels, a.pixels);
});

test('procedural motifs are deterministic, vary their shape, and can use surrounding color', () => {
  for (const material of CO_CREATE_MATERIALS) {
    const a = creativeMaterialSvg(material.id, 0), b = creativeMaterialSvg(material.id, 1);
    assert.equal(a, creativeMaterialSvg(material.id, 0));
    assert.notEqual(a, b);
    assert.notEqual(a, creativeMaterialSvg(material.id, 0, [80, 140, 180]));
    assert.ok(!a.includes('http:') || a.includes('http://www.w3.org/2000/svg'));
  }
  const placement = { material: CO_CREATE_MATERIALS[0], x: 24, y: 18, width: 24, height: 24 };
  assert.equal(surroundingColor(solid([255, 255, 255]), placement), undefined);
  const color = surroundingColor(solid([80, 140, 180]), placement)!;
  color.forEach((v, i) => assert.ok(Math.abs(v - [80, 140, 180][i]) < .001));
});

test('new color moods are distinct, bounded and preserve white paper and source pixels', () => {
  const target = solid([145, 100, 170]);
  target.data.set([255, 255, 255, 255], 0);
  const original = target.data.slice();
  const outputs = (['original', 'sunlit', 'dusk', 'vivid', 'morandi', 'dopamine'] as const).map(mood => {
    const result = prepareExpressiveTarget(target, { abstraction: 60, mood });
    assert.ok(result.pixels.every(v => Number.isFinite(v) && v >= 0 && v <= 1));
    assert.deepEqual(Array.from(result.pixels.slice(0, 3)), [1, 1, 1]);
    return Array.from(result.pixels.slice(3, 6));
  });
  assert.equal(new Set(outputs.map(rgb => rgb.join(','))).size, 6);
  const saturation = (rgb: number[]) => Math.max(...rgb) - Math.min(...rgb);
  assert.ok(saturation(outputs[4]) < saturation(outputs[0]));
  assert.ok(saturation(outputs[5]) > saturation(outputs[0]));
  assert.deepEqual(target.data, original);
});
