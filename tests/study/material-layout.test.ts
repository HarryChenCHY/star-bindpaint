import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CO_CREATE_MATERIALS } from '../../src/lib/co-create';
import { constrainMaterial, drawMaterial, layoutBounds, materialBounds, type MaterialInstance } from '../../src/lib/material-layout';

const item: MaterialInstance = { id: 'flower-1', material: CO_CREATE_MATERIALS[0], x: 320, y: 240, width: 160, height: 160, rotation: 0, variation: 0, harmonize: true, src: 'preview' };

test('rotated materials keep all four corners inside the canvas at every edge and preserve aspect ratio', () => {
  for (const material of CO_CREATE_MATERIALS) for (const rotation of [-720, -179, -90, -45, 0, 33, 90, 180, 765]) {
    for (const x of [-200, 320, 900]) for (const y of [-200, 240, 900]) {
      const source = { ...item, material, rotation, width: 1500, x, y };
      const p = constrainMaterial(source);
      const angle = p.rotation * Math.PI / 180;
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
        const cx = p.x + sx * p.width / 2 * Math.cos(angle) - sy * p.height / 2 * Math.sin(angle);
        const cy = p.y + sx * p.width / 2 * Math.sin(angle) + sy * p.height / 2 * Math.cos(angle);
        assert.ok(cx >= -1e-8 && cx <= 640 + 1e-8 && cy >= -1e-8 && cy <= 480 + 1e-8);
      }
      assert.ok(Math.abs(p.width / p.height - material.ratio) < 1e-8);
      assert.equal(source.width, 1500);
      assert.ok(p.rotation >= -180 && p.rotation < 180);
    }
  }
});

test('continuation priority covers every rotated material and stays within the canvas', () => {
  const items = [constrainMaterial({ ...item, x: 0, y: 0, rotation: 45 }), constrainMaterial({ ...item, id: 'flower-2', x: 640, y: 480, rotation: -33 })];
  const bounds = layoutBounds(items);
  for (const placed of items) {
    const b = materialBounds(placed);
    assert.ok(bounds.x <= b.x + 1e-8 && bounds.y <= b.y + 1e-8);
    assert.ok(bounds.x + bounds.width >= b.x + b.width - 1e-8);
    assert.ok(bounds.y + bounds.height >= b.y + b.height - 1e-8);
  }
  assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= 640 && bounds.y + bounds.height <= 480);
});

test('confirmation draws around each instance center and restores context between overlapping instances', () => {
  const calls: unknown[][] = [];
  const context = Object.fromEntries(['save', 'translate', 'rotate', 'drawImage', 'restore'].map(name => [name, (...args: unknown[]) => calls.push([name, ...args])])) as unknown as CanvasRenderingContext2D;
  const image = {} as CanvasImageSource;
  drawMaterial(context, image, { ...item, rotation: 90 });
  drawMaterial(context, image, { ...item, id: 'flower-2', x: 360, rotation: -45 });
  assert.deepEqual(calls.slice(0, 5), [['save'], ['translate', 320, 240], ['rotate', Math.PI / 2], ['drawImage', image, -80, -80, 160, 160], ['restore']]);
  assert.deepEqual(calls.slice(5), [['save'], ['translate', 360, 240], ['rotate', -Math.PI / 4], ['drawImage', image, -80, -80, 160, 160], ['restore']]);
});
