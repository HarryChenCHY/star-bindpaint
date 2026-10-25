import { test } from 'node:test';
import assert from 'node:assert/strict';
import { strokeFrame, bristleFade, lightSpeedCount } from '../../src/lib/stroke-playback';
import type { ExpressiveStroke } from '../../src/lib/expressive-painter';

const stroke: ExpressiveStroke = { points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 30 }], radii: [2, 4, 10], color: [.3, .4, .5], opacity: .6 };
test('bristles fade completely after three seconds and light speed includes every stroke by eight seconds', () => {
  assert.equal(bristleFade(0), 1);
  assert.equal(bristleFade(1500), .5);
  assert.equal(bristleFade(3000), 0);
  assert.equal(bristleFade(9000), 0);
  for (const count of [0, 1, 373, 1000]) {
    assert.equal(lightSpeedCount(count, 0), 0);
    assert.equal(lightSpeedCount(count, 8000), count);
    assert.equal(lightSpeedCount(count, 10000), count);
    assert.ok(lightSpeedCount(count, 4000) <= count / 2);
  }
});
test('brush and partial paint share arc-length position and interpolated radius', () => {
  const sample = strokeFrame(stroke, .5);
  assert.deepEqual(sample.tip, { x: 10, y: 10 });
  assert.deepEqual(sample.stroke.points.at(-1), sample.tip);
  assert.equal(sample.stroke.radii.at(-1), 6);
  assert.equal(sample.angle, 90);
  assert.equal(sample.length, 40);
  assert.equal(stroke.points.length, 3);
  assert.deepEqual(stroke.points.at(-1), { x: 10, y: 30 });
});
test('final frame uses the original complete stroke without changing color or opacity', () => {
  assert.equal(strokeFrame(stroke, 1).stroke, stroke);
  assert.equal(strokeFrame(stroke, 2).stroke, stroke);
  assert.deepEqual(strokeFrame(stroke, 1).tip, { x: 10, y: 30 });
  assert.deepEqual(strokeFrame(stroke, -1).tip, { x: 0, y: 0 });
});
test('duplicate path points do not cause non-finite brush positions', () => {
  const duplicate = { ...stroke, points: [{ x: 3, y: 4 }, { x: 3, y: 4 }], radii: [2, 2] };
  for (const progress of [0, .2, 1]) {
    assert.deepEqual(strokeFrame(duplicate, progress).tip, { x: 3, y: 4 });
    assert.ok(Number.isFinite(strokeFrame(duplicate, progress).angle));
  }
});
