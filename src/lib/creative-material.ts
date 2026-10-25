import type { ImageSource } from './stroke-engine';
import type { MaterialPlacement } from './co-create';

/** Feather only silhouette alpha. Pigment and the opaque center stay unchanged. */
export function softenMaterialSvg(svg: string) {
  const opening = svg.indexOf('>') + 1;
  const closing = svg.lastIndexOf('</svg>');
  return `${svg.slice(0, opening)}<defs><filter id="soft-edge" filterUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceAlpha" stdDeviation="2" result="edge"/><feComposite in="SourceAlpha" in2="edge" operator="arithmetic" k1="0" k2="0.4" k3="0.6" k4="0" result="mask"/><feComposite in="SourceGraphic" in2="mask" operator="in"/></filter></defs><g filter="url(#soft-edge)">${svg.slice(opening, closing)}</g></svg>`;
}

/** A deterministic variation of the selected motif, never an inferred/new object. */
export function creativeMaterialSvg(id: MaterialPlacement['material']['id'], variation: number, ambient?: [number, number, number]) {
  const v = Math.abs(Math.floor(variation)) % 12;
  const color = (base: number[], mix = .22) => `rgb(${base.map((c, i) => Math.round(c * (ambient ? 1 - mix : 1) + (ambient?.[i] ?? 0) * mix)).join(',')})`;
  const pinks = [[227, 136, 165], [217, 130, 111], [172, 143, 198], [233, 173, 115]];
  const petal = color(pinks[v % pinks.length]);
  const leaf = color([88, 137, 105]), leafLight = color([137, 171, 113]);
  const gold = color([239, 184, 79]), cloud = color([166, 196, 216]);
  const shade = color([126, 167, 192]), warm = color([224, 143, 80]);
  let body = '';
  if (id === 'flower') {
    const petals = 5 + v % 4, rotation = v * .31;
    const outline: string[] = [];
    for (let k = 0; k <= 120; k++) {
      const a = k / 120 * Math.PI * 2;
      const r = 45 + 14 * Math.cos(petals * a + rotation) + 2.5 * Math.sin(a * 3 + v);
      outline.push(`${k ? 'L' : 'M'}${(100 + Math.cos(a) * r).toFixed(2)},${(72 + Math.sin(a) * r).toFixed(2)}`);
    }
    body = `<path d="M100 99 Q${120 - v * 2} 140 99 183" fill="none" stroke="${leaf}" stroke-width="9" stroke-linecap="round"/>
      <path d="M102 154 Q51 151 52 124 Q89 119 102 154Z" fill="${leafLight}"/>
      <path d="M104 137 Q150 138 147 111 Q117 111 104 137Z" fill="${leaf}"/>
      <path d="${outline.join(' ')}Z" fill="${petal}"/>
      <circle cx="100" cy="72" r="${18 + v % 4}" fill="${gold}"/>
      <path d="M89 66Q99 60 109 67" fill="none" stroke="${color([255, 218, 139])}" stroke-width="5" stroke-linecap="round"/>`;
  } else if (id === 'cloud') {
    const lift = (v % 4) * 4;
    body = `<path d="M49 151 C9 150 10 91 55 91 C49 ${42 + lift} 116 ${30 + lift} 138 69 C174 ${40 + lift} 220 70 217 103 C258 100 268 150 224 151 Z" fill="${cloud}"/>
      <path d="M39 133 Q89 ${153 - lift} 136 130 Q187 149 239 128 Q252 151 224 151 H49 Q32 149 29 135Z" fill="${shade}"/>
      <path d="M66 86 Q85 ${57 + lift} 114 74" fill="none" stroke="${color([210, 224, 229])}" stroke-width="8" stroke-linecap="round"/>`;
  } else {
    const count = 9 + v % 4;
    for (let k = 0; k < count; k++) {
      const a = k / count * Math.PI * 2 + v * .12, bend = .12 + (v % 3) * .07;
      const point = (r: number, t: number) => `${100 + Math.cos(t) * r},${100 + Math.sin(t) * r}`;
      body += `<path d="M${point(63, a)} Q${point(74, a + bend)} ${point(86, a + bend)}" fill="none" stroke="${warm}" stroke-width="${7 + v % 3}" stroke-linecap="round"/>`;
    }
    body += `<circle cx="100" cy="100" r="48" fill="${gold}"/><path d="M72 82 Q87 62 112 73" fill="none" stroke="${color([255, 219, 140])}" stroke-width="8" stroke-linecap="round"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${id === 'cloud' ? 280 : 200}" height="200" viewBox="0 0 ${id === 'cloud' ? 280 : 200} 200">${body}</svg>`;
}

/** Sample the surrounding target, ignoring paper so a blank canvas keeps the motif's own colors. */
export function surroundingColor(image: ImageSource, placement: MaterialPlacement): [number, number, number] | undefined {
  const sum = [0, 0, 0]; let total = 0;
  const x0 = Math.max(0, Math.floor(placement.x - placement.width * .75));
  const x1 = Math.min(image.width, Math.ceil(placement.x + placement.width * .75));
  const y0 = Math.max(0, Math.floor(placement.y - placement.height * .75));
  const y1 = Math.min(image.height, Math.ceil(placement.y + placement.height * .75));
  for (let y = y0; y < y1; y += 6) for (let x = x0; x < x1; x += 6) {
    const i = (y * image.width + x) * 4;
    const rgb = Array.from(image.data.slice(i, i + 3));
    if (Math.min(...rgb) > 240 || image.data[i + 3] < 200) continue;
    const weight = .2 + (Math.max(...rgb) - Math.min(...rgb)) / 255;
    rgb.forEach((c, j) => { sum[j] += c * weight; }); total += weight;
  }
  return total ? sum.map(c => c / total) as [number, number, number] : undefined;
}
