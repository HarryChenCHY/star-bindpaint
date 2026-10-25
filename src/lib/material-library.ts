import { CO_CREATE_MATERIALS } from './co-create';
import { creativeMaterialSvg } from './creative-material';

export const MATERIAL_LIBRARY = CO_CREATE_MATERIALS.flatMap(material => Array.from({ length: 4 }, (_, variation) => ({
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

export function parseMaterialPreferences(raw: string | null): LibraryPreferences {
  try {
    const value = JSON.parse(raw ?? '{}');
    const valid = (items: unknown) => Array.isArray(items) ? [...new Set(items.filter((id): id is string => typeof id === 'string' && MATERIAL_LIBRARY.some(m => m.key === id)))].slice(0, 40) : [];
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
  if (!MATERIAL_LIBRARY.some(item => item.key === key)) return false;
  const next = action === 'favorite'
    ? { ...previous, favorites: previous.favorites.includes(key) ? previous.favorites.filter(id => id !== key) : [...previous.favorites, key] }
    : { ...previous, recent: [key, ...previous.recent.filter(id => id !== key)].slice(0, 40) };
  fallback = next;
  try { localStorage.setItem(MATERIAL_PREFERENCES_KEY, JSON.stringify(next)); storageFailed = false; } catch { storageFailed = true; }
  window.dispatchEvent(new Event(MATERIAL_PREFERENCES_EVENT));
  return !storageFailed;
}

export function filterMaterials(category: string, query: string, preferences: LibraryPreferences) {
  const source = category === 'recent' ? preferences.recent.flatMap(key => MATERIAL_LIBRARY.filter(item => item.key === key)) : MATERIAL_LIBRARY;
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return source.filter(item => (category !== 'favorites' || preferences.favorites.includes(item.key))
    && (!['plants', 'sky'].includes(category) || item.category === category)
    && terms.every(term => `${item.label} ${item.keywords}`.toLowerCase().includes(term)));
}
