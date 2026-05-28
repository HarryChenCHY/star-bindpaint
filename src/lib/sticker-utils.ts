/** 按 SVG/图片原始比例计算贴纸尺寸，避免固定时压扁变形 */
export function stickerSizeFromNatural(
  naturalW: number,
  naturalH: number,
  baseSize = 100,
): { width: number; height: number } {
  const nw = naturalW > 0 ? naturalW : 1;
  const nh = naturalH > 0 ? naturalH : 1;
  if (nw >= nh) {
    return { width: baseSize, height: Math.round(baseSize * nh / nw) };
  }
  return { width: Math.round(baseSize * nw / nh), height: baseSize };
}

export function loadStickerDimensions(
  src: string,
  baseSize = 100,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(stickerSizeFromNatural(img.naturalWidth, img.naturalHeight, baseSize));
    img.onerror = () => resolve({ width: baseSize, height: baseSize });
    img.src = src;
  });
}

/** 贴到画布时用图片真实比例，避免压扁 */
export function drawStickerOnCanvas(
  ctx: CanvasRenderingContext2D,
  sticker: { x: number; y: number; width: number; height: number },
  img: HTMLImageElement,
) {
  const base = Math.max(sticker.width, sticker.height);
  const { width, height } = stickerSizeFromNatural(
    img.naturalWidth,
    img.naturalHeight,
    base,
  );
  ctx.drawImage(
    img,
    sticker.x - width / 2,
    sticker.y - height / 2,
    width,
    height,
  );
}
