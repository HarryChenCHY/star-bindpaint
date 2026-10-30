import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transformMaterial } from '../../src/lib/material-gestures';
import { CO_CREATE_MATERIALS } from '../../src/lib/co-create';
import type { MaterialInstance } from '../../src/lib/material-layout';

const item: MaterialInstance = { id: 'test', material: CO_CREATE_MATERIALS[0], x: 320, y: 240, width: 80, height: 80, rotation: 0, variation: 0, harmonize: true, src: 'test' };
const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-7, `${a} should equal ${b}`);

test('single pointer supports drag, radial resize and rotation across the angle wrap', () => {
  const moved = transformMaterial(item, [{ x: 320, y: 240 }], [{ x: 345, y: 255 }], 'move');
  close(moved.x, 345); close(moved.y, 255);
  close(transformMaterial(item, [{ x: 360, y: 240 }], [{ x: 400, y: 240 }], 'scale').width, 160);
  const point = (degrees: number) => ({ x: 320 + Math.cos(degrees * Math.PI / 180) * 50, y: 240 + Math.sin(degrees * Math.PI / 180) * 50 });
  close(transformMaterial(item, [point(179)], [point(-179)], 'rotate').rotation, 2);
  assert.equal(item.width, 80);
});

test('two fingers translate, scale and rotate around the fingers instead of the canvas origin', () => {
  const next = transformMaterial(item, [{ x: 300, y: 240 }, { x: 340, y: 240 }], [{ x: 350, y: 210 }, { x: 350, y: 290 }], 'move');
  close(next.x, 350); close(next.y, 250); close(next.width, 160); close(next.rotation, 90);
  const offset = transformMaterial({ ...item, x: 340 }, [{ x: 300, y: 240 }, { x: 340, y: 240 }], [{ x: 350, y: 210 }, { x: 350, y: 290 }], 'move');
  close(offset.x, 350); close(offset.y, 290);
});

test('lifting one finger and rebasing does not jump; extreme gestures stay finite and on canvas', () => {
  const pinched = transformMaterial(item, [{ x: 300, y: 240 }, { x: 340, y: 240 }], [{ x: 280, y: 240 }, { x: 360, y: 240 }], 'move');
  const remaining = { x: 280, y: 240 };
  assert.deepEqual(transformMaterial(pinched, [remaining], [remaining], 'move'), pinched);
  const next = transformMaterial(pinched, [remaining], [{ x: 290, y: 250 }], 'move');
  close(next.x, pinched.x + 10); close(next.y, pinched.y + 10);
  const large = transformMaterial(item, [{ x: 320, y: 240 }, { x: 320, y: 240 }], [{ x: -500, y: -100 }, { x: 900, y: 1000 }], 'move');
  assert.ok([large.width, large.height, large.x, large.y, large.rotation].every(Number.isFinite));
  assert.ok(large.x >= 0 && large.x <= 640 && large.y >= 0 && large.y <= 480);
});
