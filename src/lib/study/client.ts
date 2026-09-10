import type { StrokePlan, StudyEvent } from './protocol';
import { STROKE_CONFIG, type PlanningProgress } from '../stroke-config';
export async function api<T = Record<string, unknown>>(
  body?: unknown,
  token = '',
  query = '',
): Promise<T> {
  const response = await fetch(`/api/studies${query}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: 'no-store',
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || '请求失败');
  return result;
}
export async function preparePlan(
  url: string,
  signal?: AbortSignal,
  onProgress?: (progress: PlanningProgress) => void,
): Promise<{ plan: StrokePlan; material: string }> {
  const img = new Image();
  img.src = url;
  await img.decode();
  if (signal?.aborted) throw new Error('已取消');
  const canvas = document.createElement('canvas'),
    scale = Math.min(1, 384 / Math.max(img.naturalWidth, img.naturalHeight));
  canvas.width = Math.max(4, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(4, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const source = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('../../workers/stroke-planner.worker.ts', import.meta.url),
    );
    const stop = () => {
      worker.terminate();
      signal?.removeEventListener('abort', cancel);
    };
    const cancel = () => {
      stop();
      reject(new Error('已取消'));
    };
    signal?.addEventListener('abort', cancel, { once: true });
    worker.onerror = () => {
      stop();
      reject(new Error('规划器运行失败，请重试'));
    };
    worker.onmessage = (e) => {
      if (e.data.type === 'progress') { onProgress?.(e.data.progress); return; }
      stop();
      if (!e.data.ok) return reject(new Error(e.data.error));
      ctx.putImageData(
        new ImageData(
          new Uint8ClampedArray(e.data.simplified.data),
          source.width,
          source.height,
        ),
        0,
        0,
      );
      resolve({ plan: e.data.plan, material: canvas.toDataURL('image/png') });
    };
    worker.postMessage({
      source: { width: source.width, height: source.height, data: source.data },
      budget: STROKE_CONFIG.defaultBudget,
    });
  });
}
export interface LocalAttempt {
  id: string;
  pageId: string;
  events: StudyEvent[];
  png?: string;
  ended?: boolean;
}
async function localStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('startrace-research', 1);
    open.onupgradeneeded = () =>
      open.result.createObjectStore('attempts', { keyPath: 'id' });
    open.onerror = () => reject(new Error('浏览器本地持久存储不可用'));
    open.onsuccess = () => {
      const db = open.result,
        tx = db.transaction('attempts', mode),
        request = fn(tx.objectStore('attempts'));
      tx.oncomplete = () => {
        db.close();
        resolve(request.result);
      };
      tx.onerror = () => {
        db.close();
        reject(new Error('本地备份写入失败'));
      };
      tx.onabort = () => {
        db.close();
        reject(new Error('本地备份中断'));
      };
    };
  });
}
export const saveLocal = (attempt: LocalAttempt) =>
  localStore('readwrite', (s) => s.put(attempt));
export const readLocal = (id: string): Promise<LocalAttempt | undefined> =>
  localStore('readonly', (s) => s.get(id));
export const removeLocal = (id: string) =>
  localStore('readwrite', (s) => s.delete(id));
export async function syncAttempt(attempt: LocalAttempt) {
  for (let i = 0; i < attempt.events.length; i += 200)
    await api({
      action: 'checkpoint',
      sessionId: attempt.id,
      pageId: attempt.pageId,
      events: attempt.events.slice(i, i + 200),
    });
  if (attempt.ended) {
    if (attempt.png)
      await api({
        action: 'artifact',
        sessionId: attempt.id,
        pageId: attempt.pageId,
        png: attempt.png,
      });
    await api({
      action: 'finish',
      sessionId: attempt.id,
      pageId: attempt.pageId,
    });
    await removeLocal(attempt.id);
  }
}
