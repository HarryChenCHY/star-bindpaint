import { planSimplifiedImage } from '../lib/stroke-planner';
self.onmessage = (e: MessageEvent) => {
  try {
    self.postMessage({
      ok: true,
      ...planSimplifiedImage(e.data.source, e.data.budget),
    });
  } catch (error) {
    self.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : '规划失败',
    });
  }
};
