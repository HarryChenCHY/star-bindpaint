/** 画廊默认保存在浏览器；用户单独授权后才上传作品。 */

export interface GalleryItem {
  id: string;
  imageDataUrl: string;
  title: string;
  author?: string;       // Optional creator credit; older works have no signature.
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
  // 空间不足时交由界面提示下载，不能为了保存新作静默删掉旧作品。
  localStorage.setItem(STORAGE_KEY, JSON.stringify(gallery));
  window.dispatchEvent(new Event('startrace-gallery-updated'));
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
  window.dispatchEvent(new Event('startrace-gallery-updated'));
}

export function clearGallery() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event('startrace-gallery-updated'));
}
