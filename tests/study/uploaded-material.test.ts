import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateMaterialFile } from '../../src/lib/uploaded-material';
import { filterMaterials, parseMaterialPreferences } from '../../src/lib/material-library';
import type { Material } from '../../src/lib/co-create';

test('custom material files reject non-images, empty files and oversized images', () => {
  assert.throws(() => validateMaterialFile({ name: 'x.svg', type: 'image/svg+xml', size: 1024 }), /请选择/);
  assert.throws(() => validateMaterialFile({ name: 'x.png', type: 'image/png', size: 0 }), /空文件/);
  assert.throws(() => validateMaterialFile({ name: 'x.jpg', type: 'image/jpeg', size: 20 * 1024 * 1024 }), /20 MB/);
  assert.doesNotThrow(() => validateMaterialFile({ name: 'photo.PNG', type: '', size: 4000 }));
});

test('uploaded materials can be reused, searched and resolved through favorites and recents without creating stale entries', () => {
  const material: Material = { id: 'uploaded-2bb60981-73d2-41d4-9abc-44b008056aff', kind: 'uploaded', label: '我的猫', src: 'data:image/png;base64,preview', ratio: 1.5, color: '#282828' };
  const key = `${material.id}:0`;
  const prefs = parseMaterialPreferences(JSON.stringify({ favorites: [key], recent: [key, 'flower:0'] }));
  assert.equal(filterMaterials('uploaded', '猫', prefs, [material])[0].material, material);
  assert.equal(filterMaterials('favorites', '', prefs, [material])[0].key, key);
  assert.deepEqual(filterMaterials('recent', '', prefs, [material]).map(item => item.key), [key, 'flower:0']);
  assert.deepEqual(filterMaterials('recent', '', prefs).map(item => item.key), ['flower:0']);
  assert.equal(filterMaterials('plants', '', prefs, [material]).some(item => item.key === key), false);
});
