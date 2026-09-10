'use client';
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from 'react';
import type { report } from '@/lib/study/server/service';
type Report = ReturnType<typeof report>;
export function Artwork({ id, token = '' }: { id: string; token?: string }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const abort = new AbortController();
    let objectUrl = '';
    fetch(`/api/studies?action=artwork&id=${encodeURIComponent(id)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: abort.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error('作品不可读取');
        return r.blob();
      })
      .then((b) => {
        objectUrl = URL.createObjectURL(b);
        setUrl(objectUrl);
      })
      .catch(() => {});
    return () => {
      abort.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, token]);
  return url ? (
    <img
      src={url}
      alt="真实用户作品"
      className="mx-auto max-h-64 border bg-white"
    />
  ) : (
    <p className="study-muted">作品加载中或不可访问</p>
  );
}
const display = (n: number | null | undefined, suffix = '') =>
  n == null ? '待采集 / 不适用' : `${Math.round(n * 100) / 100}${suffix}`;
export function PairReport({
  pair,
  token = '',
}: {
  pair: Report['pairs'][number];
  token?: string;
}) {
  const a = pair.control,
    b = pair.guided;
  const rows = [
    ['作品完成度', a?.metrics.completion, b?.metrics.completion, ' 分'],
    [
      '任务观察时间',
      a?.metrics.elapsedMs == null ? null : a.metrics.elapsedMs / 1000,
      b?.metrics.elapsedMs == null ? null : b.metrics.elapsedMs / 1000,
      ' 秒',
    ],
    [
      '动笔延迟',
      a?.metrics.firstMarkMs == null ? null : a.metrics.firstMarkMs / 1000,
      b?.metrics.firstMarkMs == null ? null : b.metrics.firstMarkMs / 1000,
      ' 秒',
    ],
    ['真实绘画动作', a?.metrics.validStrokes, b?.metrics.validStrokes, ' 次'],
    ['停留（≥5秒）', a?.metrics.idleCount, b?.metrics.idleCount, ' 次'],
    ['再次绘画意愿', a?.post?.willingness, b?.post?.willingness, ' / 7'],
    ['满足感', a?.post?.satisfaction, b?.post?.satisfaction, ' / 7'],
    ['信心', a?.post?.confidence, b?.post?.confidence, ' / 7'],
    ['担忧', a?.post?.concern, b?.post?.concern, ' / 7'],
  ];
  return (
    <section className="study-card">
      <h2 id="pair-detail">{pair.researchCode} · 两次绘画对比</h2>
      <p className="study-muted">
        顺序 {pair.order}
        。作品完成度待两位评分者提交后更新。停留仅表示操作间隔。
      </p>
      <div className="study-grid my-4">
        {[a, b].map((s, i) => (
          <div key={i}>
            <h3 className="mb-2 font-bold">
              {i === 0 ? 'A 普通看图绘画' : 'B 笔触指导'}
            </h3>
            {s?.artifact ? (
              <Artwork id={s.id} token={token} />
            ) : (
              <p>暂无作品</p>
            )}
            <p className="study-muted">
              终止：{s?.state || '尚未开始'} ·{' '}
              {s?.metrics.completion == null
                ? '待评分'
                : s.metrics.qualified
                  ? '达到任务标准'
                  : '尚未达到任务标准'}
            </p>
          </div>
        ))}
      </div>
      <div className="study-scroll">
        <table>
          <thead>
            <tr>
              <th>指标</th>
              <th>A</th>
              <th>B</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, av, bv, unit]) => (
              <tr key={String(label)}>
                <td>{label}</td>
                <td>{display(av as number | null, String(unit))}</td>
                <td>{display(bv as number | null, String(unit))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3 className="mt-5 font-bold">过程时间线</h3>
      <p className="study-muted">
        紫：绘画；黄：主动休息；灰：页面隐藏；粉：系统阻塞。不同类别可能重叠，不能相加当成总时长。
      </p>
      {[a, b].map((s, i) => (
        <svg
          key={i}
          viewBox="0 0 760 72"
          className="my-2 w-full"
          role="img"
          aria-label={`${i ? 'B' : 'A'} 过程时间线`}
        >
          <text x="0" y="22" fontSize="13">
            {i ? 'B' : 'A'}
          </text>
          <rect x="25" y="8" width="720" height="54" fill="#f2f3f7" />
          {s?.events
            .filter(
              (e) => e.type === 'stroke_ended' && e.payload.valid === true,
            )
            .map((e) => (
              <rect
                key={e.seq}
                x={25 + Number(e.payload.startedMs) / 1000}
                y="9"
                width={Math.max(
                  1,
                  (e.offsetMs - Number(e.payload.startedMs)) / 1000,
                )}
                height="11"
                fill="#6558d9"
              />
            ))}
          {['break', 'hidden', 'system_block'].flatMap(
            (type, j) =>
              s?.events
                .filter((e) => e.type === `${type}_started`)
                .map((e) => {
                  const end =
                    s.events.find(
                      (v) => v.seq > e.seq && v.type === `${type}_ended`,
                    )?.offsetMs ??
                    s.metrics.elapsedMs ??
                    e.offsetMs;
                  return (
                    <rect
                      key={e.seq}
                      x={25 + e.offsetMs / 1000}
                      y={23 + j * 12}
                      width={Math.max(1, (end - e.offsetMs) / 1000)}
                      height="9"
                      fill={['#ffd166', '#8a93a7', '#ff8fab'][j]}
                    />
                  );
                }) || [],
          )}
          <text x="25" y="72" fontSize="9">
            0 分钟
          </text>
          <text x="704" y="72" fontSize="9">
            12 分钟
          </text>
        </svg>
      ))}
    </section>
  );
}
export function GroupReport({ data }: { data: Report }) {
  const plotted = data.pairs.filter(
    (p) =>
      !p.withdrawnAt &&
      p.control?.inclusion === 'include' &&
      p.guided?.inclusion === 'include' &&
      p.control.metrics.completion !== null &&
      p.guided.metrics.completion !== null,
  );
  return (
    <section className="study-card">
      <h2>群体配对结果</h2>
      <p>
        入组 {data.totalParticipants} 人 · 纳入配对 {data.includedPairs} ·
        完整评分配对 {plotted.length}
      </p>
      <p className="study-muted">
        AB {data.pairs.filter((p) => p.order === 'AB').length} 人 / BA{' '}
        {data.pairs.filter((p) => p.order === 'BA').length}{' '}
        人。每条线代表同一人；同图重复仍可能有练习影响。
      </p>
      <svg
        id="paired-score-chart"
        viewBox="0 0 600 310"
        className="mx-auto max-h-80 w-full"
        role="img"
        aria-label="完成度配对图"
      >
        <rect width="600" height="310" fill="white" />
        {[0, 20, 40, 60, 80, 100].map((v) => (
          <g key={v}>
            <line
              x1="60"
              y1={260 - v * 2.2}
              x2="550"
              y2={260 - v * 2.2}
              stroke="#e1e3e9"
            />
            <text x="20" y={265 - v * 2.2} fontSize="12">
              {v}
            </text>
          </g>
        ))}
        {plotted.map((p) => (
          <g key={p.pairId}>
            <title>
              {p.researchCode}: A {p.control!.metrics.completion} → B{' '}
              {p.guided!.metrics.completion}
            </title>
            <line
              x1="150"
              y1={260 - p.control!.metrics.completion! * 2.2}
              x2="450"
              y2={260 - p.guided!.metrics.completion! * 2.2}
              stroke={p.order === 'AB' ? '#6558d9' : '#168b82'}
              opacity=".55"
            />
            <circle
              cx="150"
              cy={260 - p.control!.metrics.completion! * 2.2}
              r="4"
              fill="#536079"
            />
            <circle
              cx="450"
              cy={260 - p.guided!.metrics.completion! * 2.2}
              r="4"
              fill="#6558d9"
            />
          </g>
        ))}
        <text x="115" y="294">
          A 普通临摹
        </text>
        <text x="410" y="294">
          B 笔触指导
        </text>
        {!plotted.length && (
          <text x="160" y="150">
            暂无已纳入的完整评分配对
          </text>
        )}
      </svg>
      <div className="study-scroll">
        <table>
          <thead>
            <tr>
              <th>指标</th>
              <th>配对数</th>
              <th>平均 B−A</th>
              <th>B 较高 / 相同 / 较低</th>
              <th>Holm p</th>
              <th>B 较高比例 95% 区间</th>
            </tr>
          </thead>
          <tbody>
            {[data.analysis.completion, data.analysis.willingness].map(
              (v, i) => (
                <tr key={i}>
                  <td>{i ? '再次绘画意愿' : '作品完成度'}</td>
                  <td>{v.n}</td>
                  <td>{display(v.meanDifference)}</td>
                  <td>
                    {v.positive} / {v.ties} / {v.negative}
                  </td>
                  <td>{display(data.analysis.holmP[i])}</td>
                  <td>
                    {v.positiveFractionCI
                      ? v.positiveFractionCI
                          .map((x) => `${(x * 100).toFixed(1)}%`)
                          .join('—')
                      : '不足以估计'}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
      <p className="study-muted">
        {data.protocol.analysis}{' '}
        尚未评分、缺答、退出、技术故障和未纳入记录不补零；各指标使用各自有效配对。此页不自动判定系统已被证明有效。
      </p>
      <p className="study-muted">
        区间针对排除平分后的“B
        较高”概率，使用精确二项区间，不是平均差的置信区间。
      </p>
      <h3 className="mt-4 font-bold">顺序与达标检查</h3>
      <div className="study-scroll">
        <table>
          <thead>
            <tr>
              <th>顺序</th>
              <th>完整评分配对</th>
              <th>平均 B−A</th>
            </tr>
          </thead>
          <tbody>
            {data.analysis.byOrder.map((v) => (
              <tr key={v.order}>
                <td>{v.order}</td>
                <td>{v.completion.n}</td>
                <td>{display(v.completion.meanDifference)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="study-muted">
        第一轮描述：
        {data.analysis.firstPeriod
          .map(
            (v) =>
              `${v.condition === 'control' ? 'A' : 'B'} n=${v.n}，均分 ${display(v.mean)}`,
          )
          .join('；')}
        。人数较少，只作顺序检查。
      </p>
      <p>
        两轮均达标 {data.analysis.qualification.both}；仅 A 达标{' '}
        {data.analysis.qualification.controlOnly}；仅 B 达标{' '}
        {data.analysis.qualification.guidedOnly}；均未达标{' '}
        {data.analysis.qualification.neither}；评分不完整{' '}
        {data.analysis.qualification.missing}。
      </p>
      <div className="study-row mt-3">
        <button onClick={() => window.print()}>打印 / 保存 PDF</button>
        <button
          onClick={() => {
            const svg = document.getElementById('paired-score-chart');
            if (!svg) return;
            const blob = new Blob(
              [new XMLSerializer().serializeToString(svg)],
              { type: 'image/svg+xml' },
            );
            const url = URL.createObjectURL(blob),
              a = document.createElement('a');
            a.href = url;
            a.download = 'paired-completion.svg';
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }}
        >
          导出配对图 SVG
        </button>
      </div>
    </section>
  );
}
