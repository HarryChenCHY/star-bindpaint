'use client';
/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import ImageUploader from '@/components/ImageUploader';
import { preparePlan } from '@/lib/study/client';
import { StudyCanvas, type CanvasHandle } from '@/components/study/StudyCanvas';
import type { StrokePlan } from '@/lib/study/protocol';
import '../study/study.css';
export default function SimplifiedExperience() {
  const [prepared, setPrepared] = useState<{
      plan: StrokePlan;
      material: string;
    } | null>(null),
    [drawing, setDrawing] = useState(false),
    [step, setStep] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const canvas = useRef<CanvasHandle>(null),
    abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);
  async function prepare(url: string) {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setError('');
    setPrepared(null);
    setDrawing(false);
    setStep(0);
    try {
      const result = await preparePlan(url, controller.signal);
      if (!controller.signal.aborted) setPrepared(result);
    } catch (e) {
      if (!controller.signal.aborted) setError(String(e));
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return (
    <div className="study-shell">
      <div className="study-wrap">
        <Link href="/create">← 返回选图</Link>
        <h1 className="mt-5">用少一些笔，画完整的主体</h1>
        <p>
          简化画优先：轮廓 → 大色块 →
          小色块。先确认简化后的画面，再开始绘画。此处是自由体验，不采集研究数据。
        </p>
        {error && (
          <p className="study-error" role="alert">
            {error}
          </p>
        )}
        {!drawing && (
          <section className="study-card">
            <div className="study-row mb-4">
              <button
                disabled={busy}
                onClick={() => void prepare('/study/plant.svg')}
              >
                试试简洁盆栽
              </button>
              <button
                disabled={busy}
                onClick={() => {
                  const source = sessionStorage.getItem(
                    'star-bindpaint-source',
                  );
                  if (source) void prepare(source);
                  else setError('请先在选图页选择图片，或直接在下方上传。');
                }}
              >
                使用刚才选择的图片
              </button>
              {busy && (
                <button
                  onClick={() => {
                    abort.current?.abort();
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
              onImageLoaded={async (_img, file) => {
                const url = URL.createObjectURL(file);
                try {
                  await prepare(url);
                } finally {
                  URL.revokeObjectURL(url);
                }
              }}
            />
            {busy && <p role="status">正在简化区域并规划完整笔触…</p>}
          </section>
        )}
        {prepared && (
          <section className="study-card">
            <div className="study-grid">
              <div>
                <h2>简化后的参考图</h2>
                <img
                  src={prepared.material}
                  alt="简化图预览"
                  className="mx-auto max-h-80 border bg-white"
                />
                <p>计划 {prepared.plan.strokes.length} 笔 · 上限 200 笔</p>
                <p className="study-muted">
                  细小纹理会被省略。实际重试和修改次数不受计划笔数限制。
                </p>
                {!drawing && (
                  <button className="primary" onClick={() => setDrawing(true)}>
                    确认这张图，开始绘画
                  </button>
                )}
              </div>
              {drawing && (
                <div>
                  <StudyCanvas
                    ref={canvas}
                    width={prepared.plan.width}
                    height={prepared.plan.height}
                    enabled
                    guide={prepared.plan.strokes[step]}
                    now={() => performance.now()}
                    onEvent={() => {}}
                  />
                  <p className="study-muted my-3">
                    指导进度 {step} / {prepared.plan.strokes.length}
                  </p>
                  <div className="study-row">
                    <button
                      disabled={step === 0}
                      onClick={() => setStep((s) => s - 1)}
                    >
                      上一笔
                    </button>
                    <button
                      disabled={step >= prepared.plan.strokes.length}
                      onClick={() => setStep((s) => s + 1)}
                    >
                      画完本笔，继续
                    </button>
                    <button
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = canvas.current!.snapshot();
                        a.download = '我的简化画.png';
                        a.click();
                      }}
                    >
                      保存我的画
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
