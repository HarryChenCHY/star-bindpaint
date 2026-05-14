/**
 * gallery-store.ts — localStorage 画廊存储
 */

export interface GalleryItem {
  id: string;
  imageDataUrl: string;  // Canvas toDataURL
  title: string;
  date: string;          // ISO date string
  strokeCount: number;
  mode: string;
}

const STORAGE_KEY = 'star-bindpaint-gallery';

export function loadGallery(): GalleryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveToGallery(item: Omit<GalleryItem, 'id' | 'date'>): GalleryItem {
  const gallery = loadGallery();
  const newItem: GalleryItem = {
    ...item,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    date: new Date().toISOString(),
  };
  gallery.unshift(newItem);
  // 最多保存 20 张
  const trimmed = gallery.slice(0, 20);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  return newItem;
}

export function deleteFromGallery(id: string) {
  const gallery = loadGallery();
  const filtered = gallery.filter(item => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function clearGallery() {
  localStorage.removeItem(STORAGE_KEY);
}
