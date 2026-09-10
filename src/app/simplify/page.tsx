'use client';
/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import ImageUploader from '@/components/ImageUploader';
import {
  drawStroke,
  imageSourceFromImage,
  type StrokeDrawData,
} from '@/lib/stroke-engine';
import '../study/study.css';

type Preview = {
  source: string;
  width: number;
  height: number;
  strokes: StrokeDrawData[];
  legacy: StrokeDrawData[];
  images: string[];
  errors: number[];
};
export default function BudgetExperience() {
  const router = useRouter();
  const [result, setResult] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [step, setStep] = useState(1000);
  const worker = useRef<Worker | null>(null),
    generation = useRef(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(
    () => () => {
      generation.current++;
      worker.current?.terminate();
    },
    [],
  );
  useEffect(() => {
    if (!result || !canvas.current) return;
    const ctx = canvas.current.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, result.width, result.height);
    result.strokes.slice(0, step).forEach((s) => drawStroke(ctx, s));
  }, [result, step]);
  async function prepare(url: string) {
    const id = ++generation.current;
    worker.current?.terminate();
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      if (id !== generation.current) return;
      const source = imageSourceFromImage(img, 512);
      const base = document.createElement('canvas');
      base.width = source.width;
      base.height = source.height;
      const ctx = base.getContext('2d')!;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, base.width, base.height);
      ctx.drawImage(img, 0, 0, base.width, base.height);
      const reference = base.toDataURL('image/png');
      const pixels = ctx.getImageData(0, 0, base.width, base.height).data;
      const w = new Worker(
        new URL('../../workers/paint-preview.worker.ts', import.meta.url),
      );
      worker.current = w;
      w.onerror = () => {
        w.terminate();
        if (id === generation.current) {
          setError('规划失败，请重试');
          setBusy(false);
        }
      };
      w.onmessage = (e) => {
        w.terminate();
        if (id !== generation.current) return;
        setBusy(false);
        if (!e.data.ok) {
          setError(e.data.error);
          return;
        }
        const { strokes, legacy, previous } = e.data as {
          strokes: StrokeDrawData[];
          legacy: StrokeDrawData[];
          previous: StrokeDrawData[];
        };
        const errors: number[] = [];
        const images = [legacy, previous, strokes].map((list) => {
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, base.width, base.height);
          list.forEach((s) => drawStroke(ctx, s));
          const rendered = ctx.getImageData(0, 0, base.width, base.height).data;
          let sum = 0;
          for (let i = 0; i < pixels.length; i++)
            if (i % 4 !== 3) sum += Math.abs(pixels[i] - rendered[i]);
          errors.push(sum / (base.width * base.height * 3));
          return base.toDataURL('image/png');
        });
        setResult({
          source: reference,
          width: base.width,
          height: base.height,
          strokes,
          legacy,
          images,
          errors,
        });
        setStep(strokes.length);
      };
      w.postMessage({ source });
    } catch (e) {
      if (id === generation.current) {
        setError(String(e));
        setBusy(false);
      }
    }
  }
  return (
    <div className="study-shell">
      <div className="study-wrap">
        <Link href="/create">← 返回选图</Link>
        <h1 className="mt-5">1000 笔效果预览</h1>
        <p>
          直接拆解原图，按笔触序列逐笔绘画。没有单独描轮廓的步骤。复杂纹理、人脸与细小文字可能无法在
          1000 笔内还原，先看效果再开始。
        </p>
        <section className="study-card">
          <div className="study-row mb-4">
            <button
              disabled={busy}
              onClick={() => void prepare('/study/plant.svg')}
            >
              试试盆栽
            </button>
            <button
              disabled={busy}
              onClick={() =>
                void prepare('/masterworks/monet/impression_sunrise.jpg')
              }
            >
              试试油画
            </button>
            <button
              disabled={busy}
              onClick={() => {
                const source = sessionStorage.getItem('star-bindpaint-source');
                if (source) void prepare(source);
                else setError('请先选择图片或在下方上传。');
              }}
            >
              使用刚才选择的图片
            </button>
            {busy && (
              <button
                onClick={() => {
                  generation.current++;
                  worker.current?.terminate();
                  setBusy(false);
                }}
              >
                取消规划
              </button>
            )}
          </div>
          <ImageUploader
            preview={null}
            onLoadingChange={() => {}}
            onImageLoaded={async (img) => {
              const source = document.createElement('canvas');
              const ratio = Math.min(
                1,
                512 / Math.max(img.naturalWidth, img.naturalHeight),
              );
              source.width = Math.max(1, Math.round(img.naturalWidth * ratio));
              source.height = Math.max(
                1,
                Math.round(img.naturalHeight * ratio),
              );
              source
                .getContext('2d')!
                .drawImage(img, 0, 0, source.width, source.height);
              await prepare(source.toDataURL());
            }}
          />
          {busy && <p role="status">正在优化 1000 笔，并生成旧算法对比…</p>}
          {error && (
            <p role="alert" className="study-error">
              {error}
            </p>
          )}
        </section>
        {result && (
          <>
            <section className="study-card">
              <div className="study-grid">
                {[result.source, ...result.images].map((url, i) => (
                  <div key={i}>
                    <h2>
                      {
                        [
                          '参考原图',
                          `旧算法完整 ${result.legacy.length} 笔`,
                          '200 笔预算效果（对照）',
                          `新算法 ${result.strokes.length} 笔`,
                        ][i]
                      }
                    </h2>
                    <img
                      src={url}
                      alt={
                        [
                          '参考原图',
                          '旧算法完整效果',
                          '200笔预算效果',
                          '新算法完整效果',
                        ][i]
                      }
                      className="mx-auto max-h-80 max-w-full border bg-white"
                    />
                    {i > 0 && (
                      <p className="study-muted">
                        平均像素色差 MAE：{result.errors[i - 1].toFixed(2)} /
                        255
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <p className="study-muted mt-3">
                所有效果均从白纸绘制，不叠加原图。色差越低代表像素更接近，不代表更精美，也不代表人的绘画完成度。旧算法含随机顺序，对照值会有波动。
              </p>
            </section>
            <section className="study-card">
              <h2>逐笔查看绘画顺序</h2>
              <canvas
                ref={canvas}
                width={result.width}
                height={result.height}
                className="mx-auto block max-h-80 max-w-full border bg-white"
                style={{ aspectRatio: `${result.width}/${result.height}` }}
              />
              <label>
                第 {step} / {result.strokes.length} 笔
                <input
                  aria-label="预览笔数"
                  type="range"
                  min={0}
                  max={result.strokes.length}
                  value={step}
                  onChange={(e) => setStep(+e.target.value)}
                />
              </label>
              <div className="study-row">
                <button
                  className="primary"
                  disabled={!result.strokes.length}
                  onClick={() => {
                    sessionStorage.setItem(
                      'star-bindpaint-source',
                      result.source,
                    );
                    sessionStorage.setItem('star-bindpaint-roughness', '1');
                    sessionStorage.removeItem('star-bindpaint-free-style');
                    sessionStorage.removeItem('star-bindpaint-master');
                    router.push('/paint');
                  }}
                >
                  用这张图开始逐笔绘画
                </button>
                <button
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = result.images[2];
                    a.download = '1000笔效果预览.png';
                    a.click();
                  }}
                >
                  保存效果预览
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
