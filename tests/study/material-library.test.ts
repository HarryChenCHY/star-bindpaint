import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { MATERIAL_CATEGORIES } from '../../src/lib/material-categories';
import { harmonizeMaterialSvg } from '../../src/lib/creative-material';
import { MATERIAL_LIBRARY, MATERIAL_PREFERENCES_KEY, parseMaterialPreferences, filterMaterials, readMaterialPreferences, updateMaterialPreferences } from '../../src/lib/material-library';

const flower = 'twemoji-1f33c:0', sun = 'twemoji-2600:0', cloud = 'twemoji-2601:0';

test('library palette blending preserves geometry, transparency and unmodified source artwork', () => {
  const original = '<svg><path d="M0 0L3 3" fill="#FF0000" stroke="#fff"/><path fill="none"/></svg>';
  assert.equal(harmonizeMaterialSvg(original), original);
  assert.equal(harmonizeMaterialSvg(original, [0, 0, 255]), '<svg><path d="M0 0L3 3" fill="rgb(209,0,46)" stroke="rgb(209,209,255)"/><path fill="none"/></svg>');
});

test('material preferences migrate old variations and discard corrupt or unknown data', () => {
  assert.deepEqual(parseMaterialPreferences('broken'), { favorites: [], recent: [] });
  assert.deepEqual(parseMaterialPreferences('null'), { favorites: [], recent: [] });
  assert.deepEqual(parseMaterialPreferences(JSON.stringify({ favorites: ['flower:1', 'flower:2', flower, 'bad', 1], recent: ['sun:3', 'flower:1'] })), { favorites: [flower], recent: [sun, flower] });
  const keys = MATERIAL_LIBRARY.map(item => item.key);
  const full = parseMaterialPreferences(JSON.stringify({ favorites: keys, recent: keys }));
  assert.equal(full.favorites.length, 128);
  assert.equal(full.recent.length, 40);
});

test('search combines themes and multiple keywords while retaining recent order', () => {
  const prefs = { favorites: [flower, sun], recent: [sun, flower, cloud] };
  assert.deepEqual(filterMaterials('favorites', '小花', prefs).map(m => m.key), [flower]);
  assert.equal(filterMaterials('sky', '植物', prefs).length, 0);
  assert.deepEqual(filterMaterials('recent', '', prefs).map(m => m.key), prefs.recent);
  assert.equal(filterMaterials('plants', ' FLOWER 向日葵 ', prefs).length, 1);
  assert.equal(filterMaterials('all', 'unknown', prefs).length, 0);
  for (const category of MATERIAL_CATEGORIES) assert.equal(filterMaterials(category.id, '', prefs).length, 16);
});

test('128 default objects have unique source artwork and a traceable local SVG', () => {
  assert.equal(MATERIAL_CATEGORIES.length, 8);
  assert.equal(MATERIAL_LIBRARY.length, 128);
  assert.equal(new Set(MATERIAL_LIBRARY.map(m => m.key)).size, 128);
  const manifest = JSON.parse(readFileSync(new URL('../../public/materials/default-materials-manifest.json', import.meta.url), 'utf8'));
  const hashes = new Set<string>();
  for (const item of MATERIAL_LIBRARY) {
    const row = manifest.find((entry: { id: string }) => entry.id === item.material.id);
    assert.ok(row);
    const svg = readFileSync(new URL(`../../public${item.preview}`, import.meta.url), 'utf8');
    assert.equal(createHash('sha256').update(svg).digest('hex'), row.sha256);
    hashes.add(row.sha256);
    assert.equal(row.license, 'CC-BY-4.0');
    assert.match(row.source, /^https:\/\/github.com\/twitter\/twemoji\/blob\/v14.0.2\/assets\/svg\//);
    assert.equal(item.material.kind, 'library');
    assert.equal(item.material.svg, svg);
    assert.equal(decodeURIComponent(item.material.src.split(',')[1]), svg);
    assert.equal(item.variation, 0);
    assert.doesNotMatch(svg, /<(?:script|foreignObject|image)\b/i);
  }
  assert.equal(hashes.size, 128);
  assert.match(readFileSync(new URL('../../public/materials/twemoji/LICENSE-GRAPHICS', import.meta.url), 'utf8'), /Attribution 4.0/);
});

test('uploaded images remain available beside the default collection', () => {
  const upload = { id: 'uploaded-12345678-1234-1234-1234-123456789012', kind: 'uploaded' as const, label: '我的猫咪', ratio: 1, src: 'data:image/png;base64,AA', color: '#fff' };
  const prefs = { favorites: [`${upload.id}:0`], recent: [`${upload.id}:0`, sun] };
  assert.equal(filterMaterials('all', '', prefs, [upload]).length, 129);
  assert.deepEqual(filterMaterials('uploaded', '猫咪', prefs, [upload]).map(m => m.material), [upload]);
  assert.deepEqual(filterMaterials('favorites', '', prefs, [upload]).map(m => m.material), [upload]);
  assert.deepEqual(filterMaterials('recent', '', prefs, [upload]).map(m => m.key), prefs.recent);
});

test('favorites toggle without adding to recents and successful use persists deduplicated order', () => {
  const savedStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const savedWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const values = new Map<string, string>();
  const events: string[] = [];
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) } });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { dispatchEvent: (event: Event) => { events.push(event.type); return true; } } });
  try {
    assert.equal(updateMaterialPreferences('favorite', flower), true);
    assert.deepEqual(readMaterialPreferences(), { favorites: [flower], recent: [] });
    updateMaterialPreferences('use', flower);
    updateMaterialPreferences('use', sun);
    updateMaterialPreferences('use', flower);
    assert.deepEqual(parseMaterialPreferences(values.get(MATERIAL_PREFERENCES_KEY)!), { favorites: [flower], recent: [flower, sun] });
    updateMaterialPreferences('favorite', flower);
    assert.deepEqual(readMaterialPreferences().favorites, []);
    assert.equal(updateMaterialPreferences('use', 'invalid'), false);
    assert.equal(events.length, 5);
  } finally {
    if (savedStorage) Object.defineProperty(globalThis, 'localStorage', savedStorage); else Reflect.deleteProperty(globalThis, 'localStorage');
    if (savedWindow) Object.defineProperty(globalThis, 'window', savedWindow); else Reflect.deleteProperty(globalThis, 'window');
  }
});
