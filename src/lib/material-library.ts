import { CO_CREATE_MATERIALS, type Material } from './co-create';
import { creativeMaterialSvg } from './creative-material';

export interface LibraryItem { key: string; material: Material; variation: number; label: string; category: string; keywords: string; preview: string }
export const MATERIAL_LIBRARY: LibraryItem[] = CO_CREATE_MATERIALS.flatMap(material => Array.from({ length: 4 }, (_, variation) => ({
  key: `${material.id}:${variation}`,
  material,
  variation,
  label: `${material.label} · ${variation === 0 ? '基础' : `变化 ${variation}`}`,
  category: material.id === 'flower' ? 'plants' : 'sky',
  keywords: material.id === 'flower' ? '花卉 植物 花草 flower plant' : material.id === 'sun' ? '太阳 阳光 日光 sun sunshine' : '云朵 天空 云 cloud sky',
  preview: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(creativeMaterialSvg(material.id, variation))}`,
})));
export type LibraryPreferences = { favorites: string[]; recent: string[] };
export const MATERIAL_PREFERENCES_KEY = 'startrace-material-library-v1';
export const MATERIAL_PREFERENCES_EVENT = 'startrace-material-library-updated';
const validKey = (key: string) => MATERIAL_LIBRARY.some(item => item.key === key) || /^uploaded-[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}:0$/i.test(key);

export function parseMaterialPreferences(raw: string | null): LibraryPreferences {
  try {
    const value = JSON.parse(raw ?? '{}');
    const valid = (items: unknown) => Array.isArray(items) ? [...new Set(items.filter((id): id is string => typeof id === 'string' && validKey(id)))].slice(0, 40) : [];
    return { favorites: valid(value?.favorites), recent: valid(value?.recent) };
  } catch { return { favorites: [], recent: [] }; }
}
let fallback: LibraryPreferences = { favorites: [], recent: [] };
let storageFailed = false;
export function readMaterialPreferences(): LibraryPreferences {
  if (storageFailed) return fallback;
  try { fallback = parseMaterialPreferences(localStorage.getItem(MATERIAL_PREFERENCES_KEY)); } catch { storageFailed = true; }
  return fallback;
}
export function updateMaterialPreferences(action: 'favorite' | 'use', key: string) {
  const previous = readMaterialPreferences();
  if (!validKey(key)) return false;
  const next = action === 'favorite'
    ? { ...previous, favorites: previous.favorites.includes(key) ? previous.favorites.filter(id => id !== key) : [...previous.favorites, key] }
    : { ...previous, recent: [key, ...previous.recent.filter(id => id !== key)].slice(0, 40) };
  fallback = next;
  try { localStorage.setItem(MATERIAL_PREFERENCES_KEY, JSON.stringify(next)); storageFailed = false; } catch { storageFailed = true; }
  window.dispatchEvent(new Event(MATERIAL_PREFERENCES_EVENT));
  return !storageFailed;
}

export function filterMaterials(category: string, query: string, preferences: LibraryPreferences, uploads: Material[] = []) {
  const library: LibraryItem[] = [...MATERIAL_LIBRARY, ...uploads.map(material => ({ key: `${material.id}:0`, material, variation: 0, label: material.label, category: 'uploaded', keywords: '我的 上传 自定义 照片 图片 uploaded photo', preview: material.src }))];
  const source = category === 'recent' ? preferences.recent.flatMap(key => library.filter(item => item.key === key)) : library;
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return source.filter(item => (category !== 'favorites' || preferences.favorites.includes(item.key))
    && (!['plants', 'sky', 'uploaded'].includes(category) || item.category === category)
    && terms.every(term => `${item.label} ${item.keywords}`.toLowerCase().includes(term)));
}
