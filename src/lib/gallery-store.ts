/**
 * gallery-store.ts — 画廊存储（支持 OSS URL 或 base64 降级）
 */

export interface GalleryItem {
  id: string;
  imageDataUrl: string;  // OSS URL 或 base64 data URL
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
  // 最多保存 50 张（URL 模式下每条只占几百字节）
  const trimmed = gallery.slice(0, 50);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage 满了，删一半旧的再试
    const half = trimmed.slice(0, Math.floor(trimmed.length / 2));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(half));
  }
  return newItem;
}

/**
 * 上传图片到 OSS 并保存到画廊（推荐方式）
 * 如果 OSS 未配置会自动降级为 base64 存储
 */
export async function uploadAndSaveToGallery(
  imageBase64: string,
  title: string,
  strokeCount: number,
  mode: string,
): Promise<GalleryItem> {
  let imageUrl = imageBase64;

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64 }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.url && !data.fallback) {
        imageUrl = data.url; // 用 OSS URL（几十字节）
      }
    }
  } catch {
    // OSS 上传失败，降级用 base64
  }

  return saveToGallery({ imageDataUrl: imageUrl, title, strokeCount, mode });
}

export function deleteFromGallery(id: string) {
  const gallery = loadGallery();
  const filtered = gallery.filter(item => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function clearGallery() {
  localStorage.removeItem(STORAGE_KEY);
}
