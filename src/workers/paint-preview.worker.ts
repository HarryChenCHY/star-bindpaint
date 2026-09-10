import { decomposeImage, decomposeImageLegacy } from '../lib/stroke-engine';
self.onmessage = async (e: MessageEvent) => {
  try {
    const { source } = e.data;
    const strokes = await decomposeImage(source, source.width, source.height);
    const previous = await decomposeImage(source, source.width, source.height, { maxStrokes: 200 });
    const legacy = await decomposeImageLegacy(
      source,
      source.width,
      source.height,
    );
    self.postMessage({ ok: true, strokes, legacy, previous });
  } catch (error) {
    self.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : '规划失败',
    });
  }
};
