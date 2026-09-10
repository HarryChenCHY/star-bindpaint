import type { DecomposeOptions, ImageSource, StrokeDrawData } from './stroke-engine';

/** Termination cancels CPU work, not just the loading indicator. */
export function preparePainting(source: ImageSource, width: number, height: number,
  options: DecomposeOptions = {}, signal?: AbortSignal): Promise<StrokeDrawData[]> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error('已取消规划'));
    const worker = new Worker(new URL('../workers/painting.worker.ts', import.meta.url));
    const timeout = setTimeout(() => { stop(); reject(new Error('规划耗时过长，请重试或更换图片')); }, 120_000);
    function stop() { clearTimeout(timeout); worker.terminate(); signal?.removeEventListener('abort', cancel); }
    function cancel() { stop(); reject(new Error('已取消规划')); }
    signal?.addEventListener('abort', cancel, { once: true });
    worker.onerror = () => { stop(); reject(new Error('规划器运行失败，请重试')); };
    worker.onmessage = e => {
      if (e.data.type === 'progress') { options.onProgress?.(e.data.progress); return; }
      stop();
      if (e.data.type === 'result') resolve(e.data.strokes);
      else reject(new Error(e.data.error || '规划失败'));
    };
    const { onProgress: _onProgress, ...serializable } = options;
    void _onProgress;
    worker.postMessage({ source, width, height, options: serializable });
  });
}
