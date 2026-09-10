import { decomposeImage } from '../lib/stroke-engine';
self.onmessage = async (event: MessageEvent) => {
  try {
    const { source, width, height, options } = event.data;
    const strokes = await decomposeImage(source, width, height, {
      ...options,
      onProgress: (progress) => self.postMessage({ type: 'progress', progress }),
    });
    self.postMessage({ type: 'result', strokes });
  } catch (error) {
    self.postMessage({ type: 'error', error: error instanceof Error ? error.message : '生成失败' });
  }
};
