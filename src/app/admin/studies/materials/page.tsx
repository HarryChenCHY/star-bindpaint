'use client';
/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  MATERIAL_FIXTURES,
  type MaterialFixture,
} from '@/lib/stroke-planner/fixtures';
import { inspectPlan } from '@/lib/stroke-planner/quality';
import { preparePlan } from '@/lib/study/client';
import type { StrokePlan } from '@/lib/study/protocol';
import '../../../study/study.css';

interface Result {
  id: string;
  title: string;
  group: string;
  status: 'generated' | 'rejected';
  elapsedMs: number;
  plan?: StrokePlan;
  material?: string;
  checks?: ReturnType<typeof inspectPlan>;
  planHash?: string;
  deterministic?: boolean;
  error?: string;
}
async function digest(plan: StrokePlan) {
  const bytes = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify(plan)),
  );
  return [...new Uint8Array(bytes)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
function PlanPreview({ plan }: { plan: StrokePlan }) {
  const [count, setCount] = useState(plan.strokes.length);
  const selected = plan.strokes.slice(0, count);
  return (
    <div>
      <svg
        viewBox={`0 0 ${plan.width} ${plan.height}`}
        className="mx-auto max-h-64 w-full border bg-white"
        role="img"
        aria-label="按实际双图层合成的阶段预览"
      >
        {[
          ...selected.filter((s) => s.phase !== 'outline'),
          ...selected.filter((s) => s.phase === 'outline'),
        ].map((s) => (
          <polyline
            key={s.id}
            points={s.points.map((p) => `${p.x},${p.y}`).join(' ')}
            stroke={s.color}
            strokeWidth={s.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ))}
      </svg>
      <label className="my-3">
        逐笔检查 {count}/{plan.strokes.length}
        <input
          aria-label="预览笔数"
          className="min-w-0 flex-1"
          type="range"
          min="0"
          max={plan.strokes.length}
          value={count}
          onChange={(e) => setCount(+e.target.value)}
        />
      </label>
      <div className="study-row">
        <button onClick={() => setCount(Math.min(50, plan.strokes.length))}>前 50 笔</button>
        <button onClick={() => setCount(Math.min(100, plan.strokes.length))}>前 100 笔</button>
        <button onClick={() => setCount(plan.strokes.length)}>完整计划</button>
      </div>
    </div>
  );
}
function MaterialCard({
  fixture,
  result,
}: {
  fixture: MaterialFixture;
  result?: Result;
}) {
  return (
    <section className="study-card" data-material-id={fixture.id}>
      <h2>{fixture.title}</h2>
      <p className="study-muted">{fixture.inspect}</p>
      <div className="study-grid my-4">
        <div>
          <p>原始工程测试图</p>
          <img
            src={fixture.source}
            alt={fixture.title}
            className="mx-auto max-h-52 border bg-white"
          />
          {result?.material && (
            <>
              <p className="mt-3">两条件共用的参考原图</p>
              <img
                src={result.material}
                alt="参考原图"
                className="mx-auto max-h-52 border bg-white"
              />
            </>
          )}
        </div>
        <div>
          {result?.plan ? (
            <PlanPreview plan={result.plan} />
          ) : (
            <p>{result?.error || '尚未运行'}</p>
          )}
        </div>
      </div>
      {result && (
        <>
          <p>
            {result.checks
              ? `${result.checks.passed && result.deterministic ? '工程检查通过' : '发现问题'} · ${result.checks.total} 笔 · 轮廓 ${result.checks.counts.outline} / 大色块 ${result.checks.counts.large_color} / 小色块 ${result.checks.counts.small_color} / 顺序笔触 ${result.checks.counts.paint}`
              : '未生成计划'}{' '}
            · {result.elapsedMs.toFixed(0)} ms
          </p>
          {result.checks?.issues.map((s) => (
            <p className="study-error" key={s}>
              {s}
            </p>
          ))}
          {result.checks?.warnings.map((s) => (
            <p key={s} className="study-muted">
              {s}
            </p>
          ))}
          <p className="study-muted">
            人工质量审核：待执行。工程检查不判断主体是否丢失，也不证明人能在 12
            分钟内画完。
          </p>
        </>
      )}
    </section>
  );
}
export default function MaterialsPage() {
  const [results, setResults] = useState<Result[]>([]),
    [running, setRunning] = useState(false),
    [filter, setFilter] = useState('all');
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);
  async function run() {
    const controller = new AbortController();
    abort.current = controller;
    setRunning(true);
    setResults([]);
    try {
      for (const fixture of MATERIAL_FIXTURES) {
        if (controller.signal.aborted) break;
        const start = performance.now();
        let result: Result;
        try {
          const first = await preparePlan(fixture.source, controller.signal),
            elapsedMs = performance.now() - start;
          const second = await preparePlan(fixture.source, controller.signal),
            planHash = await digest(first.plan);
          result = {
            id: fixture.id,
            title: fixture.title,
            group: fixture.group,
            status: 'generated',
            elapsedMs,
            ...first,
            checks: inspectPlan(first.plan),
            planHash,
            deterministic: planHash === (await digest(second.plan)),
          };
        } catch (e) {
          if (controller.signal.aborted) break;
          result = {
            id: fixture.id,
            title: fixture.title,
            group: fixture.group,
            status: 'rejected',
            elapsedMs: performance.now() - start,
            error: String(e),
          };
        }
        setResults((old) => [...old, result]);
      }
    } finally {
      setRunning(false);
    }
  }
  function download() {
    const content = {
      kind: 'engineering-material-review',
      fixtureVersion: 'materials-1',
      createdAt: new Date().toISOString(),
      humanReview: 'pending',
      note: '预置工程图，不是受试者或论文效果数据。',
      results,
    };
    const url = URL.createObjectURL(
        new Blob([JSON.stringify(content, null, 2)], {
          type: 'application/json',
        }),
      ),
      a = document.createElement('a');
    a.href = url;
    a.download = 'P6-材料工程检查.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="study-shell">
      <div className="study-wrap">
        <Link href="/admin/studies">← 研究工作台</Link>
        <h1 className="mt-5">P6 · 材料与笔触质量检查</h1>
        <p>
          6 张简化画、3 张边界图、3
          张复杂图；每图独立生成两遍检查确定性。本页只处理预置工程图，不读取或修改参与者、正式材料或研究发布状态。
        </p>
        <section className="study-card">
          <div className="study-row">
            <button
              className="primary"
              disabled={running}
              onClick={() => void run()}
            >
              运行 12 张材料检查
            </button>
            {running && (
              <button onClick={() => abort.current?.abort()}>取消</button>
            )}
            <button disabled={running || !results.length} onClick={download}>
              导出检查 JSON
            </button>
            <select
              aria-label="材料分类"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">全部材料</option>
              <option value="simple">简化画</option>
              <option value="boundary">边界情况</option>
              <option value="complex">复杂输入</option>
            </select>
          </div>
          <p role="status">
            已检查 {results.length} / 12 · 生成{' '}
            {results.filter((r) => r.status === 'generated').length} · 未生成{' '}
            {results.filter((r) => r.status === 'rejected').length}
          </p>
          <p className="study-muted">
            逐笔滑块仅检查完整计划，不改变预算或截短输出。人工审核请看主体、主要颜色、细线连接和单笔动作，再到研究工作台确认实际材料。
          </p>
        </section>
        {MATERIAL_FIXTURES.filter(
          (f) => filter === 'all' || f.group === filter,
        ).map((f) => (
          <MaterialCard
            key={f.id}
            fixture={f}
            result={results.find((r) => r.id === f.id)}
          />
        ))}
      </div>
    </div>
  );
}
