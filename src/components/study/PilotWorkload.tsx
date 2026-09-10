import type { pilotWorkload } from '@/lib/study/pilot-workload';
type Workload = ReturnType<typeof pilotWorkload>;
const number = (v: number | null, divisor = 1) => v === null ? '待记录' : (v / divisor).toFixed(1);
export function PilotWorkload({ data }: { data: Workload }) {
  return <section className="study-card">
    <h2>任务负担复盘</h2>
    <p>计划 {data.plannedStrokes || '待生成'} 笔 · 每轮 {data.timeLimitMs / 60000} 分钟。以下为预试描述，不作有效性检验。</p>
    <div className="study-grid my-4">
      {data.groups.map(g => <div key={g.condition} className="rounded-xl border p-3">
        <h3 className="font-bold">{g.condition === 'control' ? '传统绘画' : '笔触指导'}</h3>
        <p>可用终态 {g.n} 人 · 超时 {g.timeouts} 人</p>
        <p>任务用时中位数 {number(g.elapsedMs.median, 60000)} 分钟（n={g.elapsedMs.n}）</p>
        {g.elapsedMs.median !== null && <progress aria-label={`${g.condition} 用时占限时比例`} className="w-full" max={data.timeLimitMs} value={Math.min(data.timeLimitMs, g.elapsedMs.median)} />}
        <p>有效落笔中位数 {number(g.validStrokes.median)}（n={g.validStrokes.n}）</p>
        <p>停留次数中位数 {number(g.idleCount.median)}（n={g.idleCount.n}）</p>
        <p>双人评分完成度中位数 {number(g.completion.median)} / 100（n={g.completion.n}）</p>
        <p>达标提交用时中位数 {number(g.qualifiedTimeMs.median, 60000)} 分钟（n={g.qualifiedTimeMs.n}）</p>
        {g.condition === 'guided' && <p>曾推进或跳过的指导占比中位数 {number(g.guidanceRatio.median, .01)}%（n={g.guidanceRatio.n}）</p>}
      </div>)}
    </div>
    <p>同一人的任务用时差（指导 − 传统）中位数：{number(data.pairedElapsedDifferenceMs.median, 1000)} 秒；有效配对 n={data.pairedElapsedDifferenceMs.n}，其中 AB {data.orderCounts.AB}、BA {data.orderCounts.BA}。正数仅表示指导任务持续更久，不表示画得更差。</p>
    {!data.rows.length && <p className="my-3 font-bold">尚无实际预试数据，暂不能判断 1000 笔的任务负担。</p>}
    {data.rows.map(row => <details key={row.id} className="my-3 rounded-xl border p-3">
      <summary className="cursor-pointer font-bold">{row.id} · {row.order} · 查看两轮记录</summary>
      {(['control', 'guided'] as const).map(condition => {
        const s = row[condition];
        return <div key={condition} className="my-3">
          <h3 className="font-bold">{condition === 'control' ? '传统绘画' : '笔触指导'}</h3>
          {!s ? <p>待开始</p> : <>
            <p>状态 {s.state} · {s.reason || '进入任务负担汇总'}</p>
            <p>任务用时 {number(s.elapsedMs, 1000)} 秒 · 有效落笔 {s.validStrokes} / 原始动作 {s.attempts} · 撤销 {s.undoCount}</p>
            <p>停留 {s.idleCount} 次 / {number(s.idleMs, 1000)} 秒 · 主动休息 {number(s.breakMs, 1000)} 秒 · 页面隐藏 {number(s.hiddenMs, 1000)} 秒</p>
            {s.guidance && <p>曾推进或跳过 {s.guidance.visited}/{s.guidance.total}；匹配过 {s.guidance.matched}，跳过过 {s.guidance.skipped}。按笔触编号去重；返回重画后类别可能重叠。{s.guidance.unknownGuideEvents > 0 ? '检测到无法对应计划的事件，占比暂不计算。' : ''}</p>}
          </>}
        </div>;
      })}
    </details>)}
    {data.notes.map(note => <p className="study-muted mt-2" key={note}>{note}</p>)}
  </section>;
}
