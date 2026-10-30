import type { Vec2 } from './stroke-engine';

export interface PaintingBounds { left: number; top: number; right: number; bottom: number }

/** 三次可分离盒式滤波近似高斯，只建立参考尺度，不改原图。 */
export function blurPaintingReference(pixels: Float32Array, width: number, height: number, radius: number) {
  if (radius < 1) return pixels;
  let source = pixels;
  const scratch = new Float32Array(pixels.length);
  const result = new Float32Array(pixels.length);
  const size = radius * 2 + 1;
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < height; y++) for (let c = 0; c < 3; c++) {
      let sum = 0;
      for (let dx = -radius; dx <= radius; dx++) sum += source[(y * width + Math.max(0, Math.min(width - 1, dx))) * 3 + c];
      for (let x = 0; x < width; x++) {
        scratch[(y * width + x) * 3 + c] = sum / size;
        sum += source[(y * width + Math.min(width - 1, x + radius + 1)) * 3 + c]
          - source[(y * width + Math.max(0, x - radius)) * 3 + c];
      }
    }
    for (let x = 0; x < width; x++) for (let c = 0; c < 3; c++) {
      let sum = 0;
      for (let dy = -radius; dy <= radius; dy++) sum += scratch[(Math.max(0, Math.min(height - 1, dy)) * width + x) * 3 + c];
      for (let y = 0; y < height; y++) {
        result[(y * width + x) * 3 + c] = sum / size;
        sum += scratch[(Math.min(height - 1, y + radius + 1) * width + x) * 3 + c]
          - scratch[(Math.max(0, y - radius) * width + x) * 3 + c];
      }
    }
    source = result;
  }
  return result;
}

/** 网格只用于挑选邻域，笔触可跨格；区域不构成绘制裁切边界。 */
export class PaintingNeighborhoods {
  readonly cellSize: number;
  private readonly columns: number;
  private readonly masses: Float64Array;
  private readonly visited: Uint8Array;
  private readonly blocked: Uint8Array;
  private active = -1;
  private attempts = 0;
  private failures = 0;
  private limit = 0;
  private visits = 0;

  constructor(private width: number, private height: number, private weights: Float64Array, private scope: PaintingBounds, private focus?: PaintingBounds) {
    this.cellSize = Math.max(12, Math.round(Math.min(width, height) / 5));
    this.columns = Math.ceil(width / this.cellSize);
    this.masses = new Float64Array(this.columns * Math.ceil(height / this.cellSize));
    this.visited = new Uint8Array(this.masses.length);
    this.blocked = new Uint8Array(this.masses.length);
    for (let p = 0; p < weights.length; p++) this.masses[this.regionOf(p)] += weights[p];
  }

  private regionOf(p: number) {
    return Math.floor(Math.floor(p / this.width) / this.cellSize) * this.columns + Math.floor(p % this.width / this.cellSize);
  }

  update(p: number, weight: number) {
    this.masses[this.regionOf(p)] += weight - this.weights[p];
    this.weights[p] = weight;
  }

  recordAttempt(accepted: boolean) {
    this.attempts++;
    this.failures = accepted ? 0 : this.failures + 1;
    if (this.failures >= 3 && this.active >= 0) this.blocked[this.active] = 1;
  }

  window(remaining: number, tip: Vec2 | null) {
    if (this.active < 0 || this.attempts >= this.limit || this.failures >= 3 || this.masses[this.active] < .00001) {
      let available = 0;
      const choose = () => {
        let chosen = -1, score = 0;
        available = 0;
        for (let r = 0; r < this.masses.length; r++) {
          if (this.visited[r] || this.blocked[r] || this.masses[r] < .00001) continue;
          available++;
          const x = (r % this.columns + .5) * this.cellSize, y = (Math.floor(r / this.columns) + .5) * this.cellSize;
          const distance = tip ? Math.hypot(x - tip.x, y - tip.y) / this.cellSize : 0;
          const focus = this.focus;
          const beginsNearMaterial = this.visits === 0 && focus && x + this.cellSize / 2 >= focus.left && x - this.cellSize / 2 < focus.right
            && y + this.cellSize / 2 >= focus.top && y - this.cellSize / 2 < focus.bottom;
          const value = this.masses[r] * (beginsNearMaterial ? 16 : 1) / (1 + distance * .7);
          if (value > score) { score = value; chosen = r; }
        }
        return chosen;
      };
      let chosen = choose();
      if (chosen < 0) { this.visited.fill(0); chosen = choose(); }
      if (chosen < 0) return null;
      this.active = chosen;
      this.visited[chosen] = 1;
      this.attempts = 0;
      this.failures = 0;
      this.limit = Math.min(20, Math.max(4, Math.ceil(remaining / Math.max(1, available))));
      this.visits++;
    }
    const x = this.active % this.columns * this.cellSize, y = Math.floor(this.active / this.columns) * this.cellSize;
    const overlap = Math.round(this.cellSize * .25);
    return {
      left: Math.max(this.scope.left, x - overlap), top: Math.max(this.scope.top, y - overlap),
      right: Math.min(this.scope.right, x + this.cellSize + overlap), bottom: Math.min(this.scope.bottom, y + this.cellSize + overlap),
      region: this.active, visit: this.visits,
    };
  }
}
