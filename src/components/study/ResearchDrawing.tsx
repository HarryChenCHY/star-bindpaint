'use client';
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from 'react';
import { StudyCanvas, type CanvasHandle } from './StudyCanvas';
import {
  api,
  saveLocal,
  syncAttempt,
  type LocalAttempt,
} from '@/lib/study/client';
import {
  PHASE_LABEL,
  PROTOCOL,
  type EndReason,
  type StrokePlan,
  type StudyEvent,
} from '@/lib/study/protocol';
import type { Session } from '@/lib/study/types';
export function ResearchDrawing({
  session,
  plan,
  material,
  onComplete,
  practice = false,
  autoStart = false,
}: {
  session?: Session;
  plan: StrokePlan;
  material: string;
  onComplete: () => void;
  practice?: boolean;
  autoStart?: boolean;
}) {
  const [running, setRunning] = useState(false),
    [ended, setEnded] = useState(false),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0),
    [step, setStep] = useState(0),
    [resting, setResting] = useState(false),
    [saveState, setSaveState] = useState('尚未开始');
  const panel = useRef<HTMLDivElement>(null);
  const canvas = useRef<CanvasHandle>(null),
    startTime = useRef(0),
    deadline = practice ? PROTOCOL.practiceMs : PROTOCOL.timeLimitMs;
  const wallStart = useRef(0),
    finished = useRef(false),
    journal = useRef<LocalAttempt | null>(null),
    sync = useRef(Promise.resolve()),
    local = useRef(Promise.resolve());
  const guided = !session || session.condition === 'guided',
    guide = guided ? plan.strokes[step] : undefined;
  const now = () =>
    Math.min(deadline, Math.max(0, performance.now() - startTime.current));
  function persist() {
    if (!journal.current || !session) return;
    const snapshot = structuredClone(journal.current);
    local.current = local.current
      .catch(() => {})
      .then(async () => {
        await saveLocal(snapshot);
      })
      .catch((e) => {
        setError(String(e));
        throw e;
      });
    void local.current.catch(() => {});
  }
  function event(type: string, payload: StudyEvent['payload'] = {}) {
    if (!journal.current || (finished.current && type !== 'task_ended')) return;
    journal.current.events.push({
      seq: journal.current.events.length + 1,
      type,
      offsetMs: type === 'task_started' ? 0 : now(),
      clientAt: new Date().toISOString(),
      payload,
    });
    persist();
  }
  function flush() {
    sync.current = sync.current
      .catch(() => {})
      .then(async () => {
        await local.current;
        if (!journal.current || !session) return;
        await syncAttempt(structuredClone(journal.current));
        setSaveState(finished.current ? '已保存到后端' : '过程已同步');
      });
    return sync.current;
  }
  const starting = useRef(false), startedAutomatically = useRef(false);
  async function start() {
    if (starting.current || running || ended) return;
    starting.current = true;
    setBusy(true);
    setError('');
    try {
      const image = new Image(); image.src = material; await image.decode();
      const pageId = crypto.randomUUID();
      journal.current = { id: session?.id || pageId, pageId, events: [] };
      if (practice) await api({ action: 'practice_start' });
      if (session) {
        await saveLocal(journal.current);
        await api({ action: 'start', sessionId: session.id, pageId });
      }
      startTime.current = performance.now();
      wallStart.current = Date.now();
      finished.current = false;
      event('task_started');
      setRunning(true);
      setSaveState('本地记录中');
    } catch (e) {
      setError(String(e));
    } finally {
      starting.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    if (autoStart && !startedAutomatically.current) {
      startedAutomatically.current = true;
      void start();
    }
    // A single explicit pre-questionnaire submission starts this mounted attempt once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);
  async function finishTask(reason: EndReason) {
    if (finished.current || !journal.current) return;
    // Close any in-flight pointer before the unique terminal event.
    const png = canvas.current!.freeze();
    event('task_ended', {
      reason,
      observedAfterDeadlineMs: Math.max(
        0,
        performance.now() - startTime.current - deadline,
      ),
    });
    finished.current = true;
    journal.current.png = png;
    journal.current.ended = true;
    persist();
    setRunning(false);
    setEnded(true);
    setBusy(true);
    try {
      await flush();
      if (session || practice) onComplete();
    } catch {
      setError('绘画已结束，记录仍在本地。请保持此页，联网后点击“重试保存”。');
      setSaveState('待同步');
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (!running) return;
    panel.current?.scrollIntoView({ block: 'start' });
    const timer = setInterval(() => {
      setElapsed(now());
      if (now() >= deadline) void finishTask('timeout');
      else if (
        Math.abs(
          Date.now() -
            wallStart.current -
            (performance.now() - startTime.current),
        ) > 5000
      )
        void finishTask('technical_error');
    }, 150);
    const syncTimer = setInterval(() => {
      void flush().catch(() => setSaveState('待同步（本地已备份）'));
    }, 5000);
    const visibility = () => {
      canvas.current?.interrupt();
      event(document.hidden ? 'hidden_started' : 'hidden_ended');
      if (now() >= deadline) void finishTask('timeout');
    };
    const leave = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('beforeunload', leave);
    return () => {
      clearInterval(timer);
      clearInterval(syncTimer);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('beforeunload', leave);
    };
    // The active task owns its clocks and journal; UI renders must not restart timers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);
  function advance(type: 'guide_advanced' | 'guide_skipped') {
    if (!guide || !running) return;
    canvas.current?.interrupt();
    event(type, {
      planStrokeId: guide.id,
      phase: guide.phase,
      source: 'manual',
    });
    setStep((s) => s + 1);
  }
  return (
    <div ref={panel} style={{ scrollMarginTop: 20 }}>
      <div className="study-row justify-between">
        <h2>
          {practice
            ? '操作练习'
            : session?.condition === 'control'
              ? '普通看图绘画'
              : '笔触指导绘画'}
        </h2>
        <span className="font-mono text-xl">
          {Math.floor((deadline - elapsed) / 60000)}:
          {String(
            Math.ceil(((deadline - elapsed) % 60000) / 1000) % 60,
          ).padStart(2, '0')}
        </span>
      </div>
      <p className="study-muted">
        请画出主体结构与主要颜色。休息和切页仍计入本轮时间。作品由你亲手绘制；觉得完成时可提交。
      </p>
      {error && (
        <p role="alert" className="study-error">
          {error}
        </p>
      )}
      <div className="study-grid mt-4">
        <div>
          <p className="mb-2 font-bold">共同参考图</p>
          <img
            src={material}
            alt="本次绘画参考图"
            className="mx-auto max-h-[40vh] rounded-xl border bg-white"
          />
          <p className="study-muted mt-2">{saveState}</p>
        </div>
        <div>
          <StudyCanvas
            ref={canvas}
            width={plan.width}
            height={plan.height}
            enabled={running && !resting}
            timeLimitMs={deadline}
            guide={running ? guide : undefined}
            now={now}
            onEvent={event}
            onStroke={(points) => {
              if (!guide) return;
              const threshold = Math.hypot(plan.width, plan.height) * 0.07;
              const dist = (
                p: { x: number; y: number },
                q: { x: number; y: number },
              ) => Math.hypot(p.x - q.x, p.y - q.y);
              const length = points
                .slice(1)
                .reduce((s, p, i) => s + dist(p, points[i]), 0);
              const matched =
                length >
                  Math.hypot(plan.width, plan.height) *
                    PROTOCOL.validLengthRatio &&
                dist(points[0], guide.points[0]) < threshold &&
                dist(points.at(-1)!, guide.points.at(-1)!) < threshold;
              event('guide_evaluated', { planStrokeId: guide.id, matched });
              if (matched) {
                event('guide_advanced', {
                  planStrokeId: guide.id,
                  phase: guide.phase,
                  source: 'matched',
                });
                setStep((s) => s + 1);
              }
            }}
          />
          {guided && (
            <div className="mt-3 space-y-2">
              <p className="study-muted">
                指导进度 {Math.min(step, plan.strokes.length)} /{' '}
                {plan.strokes.length} ·{' '}
                {guide ? PHASE_LABEL[guide.phase] : '指导已走完，可继续修改'}
                （不是作品完成度）
              </p>
              <div className="study-progress">
                <span
                  style={{
                    width: `${Math.min(100, (step / plan.strokes.length) * 100)}%`,
                  }}
                />
              </div>
              <div className="study-row">
                <button
                  disabled={!running || !guide || resting}
                  onClick={() => advance('guide_advanced')}
                >
                  本笔画完，下一笔
                </button>
                <button
                  disabled={!running || !guide || resting}
                  onClick={() => advance('guide_skipped')}
                >
                  跳过
                </button>
                <button
                  disabled={!running || step === 0 || resting}
                  onClick={() => {
                    event('guide_revisited', {
                      planStrokeId: plan.strokes[step - 1].id,
                    });
                    setStep((s) => s - 1);
                  }}
                >
                  返回上一笔
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="study-row mt-5">
        {!running && !ended && (
          <button className="primary" disabled={busy} onClick={start}>
            开始{practice ? '练习' : '本轮绘画'}
          </button>
        )}
        {running && (
          <>
            <button
              className="primary"
              disabled={practice && elapsed < deadline}
              onClick={() => void finishTask('submitted')}
            >
              完成并提交
            </button>
            <button
              onClick={() => {
                canvas.current?.interrupt();
                event(resting ? 'break_ended' : 'break_started');
                setResting(!resting);
              }}
            >
              {resting ? '继续绘画' : '休息一下（计时继续）'}
            </button>
            {!practice && (
              <button onClick={() => void finishTask('withdrawn')}>
                停止本轮
              </button>
            )}
          </>
        )}
        {ended && error && (
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await flush();
                setError('');
                onComplete();
              } catch {
                setError('仍未同步成功，请保持页面并重试。');
              } finally {
                setBusy(false);
              }
            }}
          >
            重试保存
          </button>
        )}
      </div>
    </div>
  );
}
