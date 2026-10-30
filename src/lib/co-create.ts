import type { ImageSource } from './stroke-engine';

export const CO_CREATE_MATERIALS = [
  { id: 'flower', label: '花朵', src: '/materials/flower.svg', ratio: 1, color: '#FFE4EF' },
  { id: 'cloud', label: '云朵', src: '/materials/cloud.svg', ratio: 1.4, color: '#E8F2FF' },
  { id: 'sun', label: '太阳', src: '/materials/sun.svg', ratio: 1, color: '#FFF2C5' },
] as const;
export interface Material {
  id: string;
  label: string;
  src: string;
  ratio: number;
  color: string;
  kind?: 'uploaded';
}
export interface MaterialPlacement {
  material: Material;
  x: number;
  y: number;
  width: number;
  height: number;
}
export function constrainPlacement(p: MaterialPlacement, w: number, h: number): MaterialPlacement {
  const width = Math.max(80, Math.min(p.width, w, h * p.material.ratio));
  const height = width / p.material.ratio;
  return { ...p, width, height, x: Math.max(width / 2, Math.min(w - width / 2, p.x)), y: Math.max(height / 2, Math.min(h - height / 2, p.y)) };
}
export function readCanvas(canvas: HTMLCanvasElement): ImageSource {
  return { width: canvas.width, height: canvas.height, data: canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data };
}
export function loadLocalImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('图片加载失败，请重试。'));
    image.src = src;
  });
}
export function whiteCanvas(w: number, h: number) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
  return canvas;
}
