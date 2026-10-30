import type { Material } from './co-create';

export const MATERIAL_IMAGE_ACCEPT = '.jpg,.jpeg,.png,.webp,.gif,.bmp,.avif,image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif';
const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/x-ms-bmp', 'image/avif']);
export const MAX_UPLOADED_MATERIALS = 20;

export function validateMaterialFile(file: Pick<File, 'name' | 'size' | 'type'>) {
  if (!TYPES.has(file.type.toLowerCase()) && !(!file.type && /\.(jpe?g|png|webp|gif|bmp|avif)$/i.test(file.name))) throw new Error('请选择 JPG、PNG、WebP、GIF、BMP 或 AVIF 图片。');
  if (file.size <= 0) throw new Error('这张图片是空文件，请重新选择。');
  if (file.size >= 20 * 1024 * 1024) throw new Error('素材图片需小于 20 MB。');
}

/** 只在本地解码并缩至512px，保留PNG透明度，不发送网络请求。 */
export async function readUploadedMaterial(file: File, signal: AbortSignal): Promise<Material> {
  validateMaterialFile(file);
  const url = URL.createObjectURL(file);
  const image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      const abort = () => { image.src = ''; reject(new DOMException('已取消', 'AbortError')); };
      const cleanup = () => signal.removeEventListener('abort', abort);
      image.onload = () => { cleanup(); resolve(); };
      image.onerror = () => { cleanup(); reject(new Error('无法读取素材，请尝试 JPG 或 PNG 格式。')); };
      signal.addEventListener('abort', abort, { once: true });
      if (signal.aborted) { cleanup(); abort(); } else image.src = url;
    });
    if (signal.aborted) throw new DOMException('已取消', 'AbortError');
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('素材图片没有有效尺寸。');
    const scale = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法处理素材图片，请重试。');
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return { id: `uploaded-${crypto.randomUUID()}`, kind: 'uploaded', label: file.name.replace(/\.[^.]+$/, '').trim().slice(0, 40) || '我的素材', src: canvas.toDataURL('image/png'), ratio: canvas.width / canvas.height, color: '#282828' };
  } finally {
    image.onload = null; image.onerror = null;
    URL.revokeObjectURL(url);
  }
}
