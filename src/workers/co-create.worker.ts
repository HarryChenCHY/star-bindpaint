import { planExpressivePainting, CO_CREATION_BUDGET, DEFAULT_EXPRESSION, type ExpressionSettings } from '../lib/expressive-painter';
import type { ImageSource } from '../lib/stroke-engine';

type Request = {
  target: ImageSource;
  current: ImageSource;
  priority?: { x: number; y: number; width: number; height: number };
  origin?: { x: number; y: number };
  resumePass?: number;
  settings?: ExpressionSettings;
};
self.onmessage = async ({ data }: MessageEvent<Request>) => {
  try {
    await planExpressivePainting(data.target, data.current, data.settings ?? DEFAULT_EXPRESSION, {
        budget: CO_CREATION_BUDGET,
        priority: data.priority,
        origin: data.origin,
        resumePass: data.resumePass,
        onProgress: progress => self.postMessage({ type: 'progress', progress }),
        onBatch: strokes => self.postMessage({ type: 'batch', strokes }),
      });
    self.postMessage({ type: 'done' });
  } catch (error) {
    self.postMessage({ type: 'error', message: error instanceof Error ? error.message : '续绘计算失败' });
  }
};
