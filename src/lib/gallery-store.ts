/** 画廊默认保存在浏览器；用户单独授权后才上传作品。 */

export interface GalleryItem {
  id: string;
  imageDataUrl: string;
  title: string;
  date: string;          // ISO date string
  strokeCount: number;
  mode: string;
  userStrokeCount?: number;
  guidanceLevel?: 'full' | 'balanced' | 'light';
  durationMs?: number;
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
  const trimmed = gallery.slice(0, 50);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    const half = trimmed.slice(0, Math.floor(trimmed.length / 2));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(half));
  }
  return newItem;
}

export async function uploadAndSaveToGallery(
  imageBase64: string,
  title: string,
  strokeCount: number,
  mode: string,
  practice?: Pick<GalleryItem, 'userStrokeCount' | 'guidanceLevel' | 'durationMs'>,
  allowCloudUpload = false,
  participantId?: string | null,
): Promise<GalleryItem> {
  let imageUrl = imageBase64;

  if (allowCloudUpload) {
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, participantId }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url && !data.fallback) imageUrl = data.url;
      }
    } catch {
      imageUrl = imageBase64;
    }
  }

  return saveToGallery({ imageDataUrl: imageUrl, title, strokeCount, mode, ...practice });
}

export function deleteFromGallery(id: string) {
  const gallery = loadGallery();
  const filtered = gallery.filter(item => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function clearGallery() {
  localStorage.removeItem(STORAGE_KEY);
}
