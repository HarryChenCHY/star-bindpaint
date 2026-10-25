import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MATERIAL_LIBRARY, MATERIAL_PREFERENCES_KEY, parseMaterialPreferences, filterMaterials, readMaterialPreferences, updateMaterialPreferences } from '../../src/lib/material-library';

test('material preferences discard corrupt data, unknown entries and duplicates', () => {
  assert.deepEqual(parseMaterialPreferences('broken'), { favorites: [], recent: [] });
  assert.deepEqual(parseMaterialPreferences('null'), { favorites: [], recent: [] });
  assert.deepEqual(parseMaterialPreferences(JSON.stringify({ favorites: ['flower:1', 'flower:1', 'bad', 1], recent: ['sun:3', 'flower:1'] })), { favorites: ['flower:1'], recent: ['sun:3', 'flower:1'] });
});

test('search combines category, favorites and keywords while retaining recent order', () => {
  const prefs = { favorites: ['flower:2', 'sun:1'], recent: ['sun:2', 'flower:1', 'cloud:3'] };
  assert.deepEqual(filterMaterials('favorites', 'flower', prefs).map(m => m.key), ['flower:2']);
  assert.equal(filterMaterials('sky', '植物', prefs).length, 0);
  assert.deepEqual(filterMaterials('recent', '', prefs).map(m => m.key), prefs.recent);
  assert.equal(filterMaterials('all', ' FLOWER 变化 ', prefs).length, 3);
  assert.equal(filterMaterials('all', 'unknown', prefs).length, 0);
});

test('each selectable variation has a unique key and matching procedural preview', () => {
  assert.equal(MATERIAL_LIBRARY.length, 12);
  assert.equal(new Set(MATERIAL_LIBRARY.map(m => m.key)).size, 12);
  assert.equal(new Set(MATERIAL_LIBRARY.map(m => m.preview)).size, 12);
  assert.ok(MATERIAL_LIBRARY.every(m => m.preview.startsWith('data:image/svg+xml;') && m.variation >= 0 && m.variation < 4));
});

test('favorites toggle without adding to recents and successful use persists deduplicated order', () => {
  const savedStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const savedWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const values = new Map<string, string>();
  const events: string[] = [];
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) } });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { dispatchEvent: (event: Event) => { events.push(event.type); return true; } } });
  try {
    assert.equal(updateMaterialPreferences('favorite', 'flower:2'), true);
    assert.deepEqual(readMaterialPreferences(), { favorites: ['flower:2'], recent: [] });
    updateMaterialPreferences('use', 'flower:2');
    updateMaterialPreferences('use', 'sun:1');
    updateMaterialPreferences('use', 'flower:2');
    assert.deepEqual(parseMaterialPreferences(values.get(MATERIAL_PREFERENCES_KEY)!), { favorites: ['flower:2'], recent: ['flower:2', 'sun:1'] });
    updateMaterialPreferences('favorite', 'flower:2');
    assert.deepEqual(readMaterialPreferences().favorites, []);
    assert.equal(updateMaterialPreferences('use', 'invalid'), false);
    assert.equal(events.length, 5);
  } finally {
    if (savedStorage) Object.defineProperty(globalThis, 'localStorage', savedStorage); else Reflect.deleteProperty(globalThis, 'localStorage');
    if (savedWindow) Object.defineProperty(globalThis, 'window', savedWindow); else Reflect.deleteProperty(globalThis, 'window');
  }
});
