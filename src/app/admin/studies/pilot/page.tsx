'use client';
import Link from 'next/link';
import { useState } from 'react';
import { api } from '@/lib/study/client';
import { PilotWorkload } from '@/components/study/PilotWorkload';
import type { pilotSnapshot, PilotIssue } from '@/lib/study/server/pilot';
import '../../../study/study.css';
type Snapshot = ReturnType<typeof pilotSnapshot>;
const labels: Record<string, string> = { device: '实际设备与输入操作已核对', workload: '1000 笔与实验时限的负担已实测', rating: '两位评分者已试评并核对规则', storage: '实际保存、导出与备份恢复已复核' };
export default function PilotPage() {
  const [token, setToken] = useState(''), [data, setData] = useState<Snapshot | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [checks, setChecks] = useState<Record<string, boolean>>({}), [note, setNote] = useState('');
  const [title, setTitle] = useState(''), [severity, setSeverity] = useState('blocking');
  const [resolutions, setResolutions] = useState<Record<string, string>>({});
  async function load() {
    const d = await api<Snapshot>(undefined, token, '?action=pilot');
    setData(d); setChecks(d.reviewCurrent ? d.review!.checks : {}); setNote(d.reviewCurrent ? d.review!.note : '');
    setResolutions(Object.fromEntries(d.issues.map(i => [i.id, i.resolution])));
  }
  async function run(fn: () => Promise<unknown>) {
    setBusy(true); setError('');
    try { await fn(); await load(); } catch (e) { setError(String(e)); } finally { setBusy(false); }
  }
  async function updateIssue(i: PilotIssue, status: string) {
    await api({ action: 'pilotIssue', ...i, status, resolution: resolutions[i.id] ?? '' }, token);
  }
  async function downloadReview(id: string) {
    const response = await fetch(`/api/studies?action=pilotDownload&id=${id}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error('下载失败，请刷新后重试');
    const url = URL.createObjectURL(await response.blob());
    const a = document.createElement('a'); a.href = url; a.download = `预试复盘-${id}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="study-shell"><div className="study-wrap">
    <Link href="/admin/studies">← 研究工作台</Link>
    <h1 className="mt-5">六人预试看板</h1>
    <p>自动汇总真实记录；软件不会代填参与者、问卷或评分。备注仅记录操作与问题，请勿填写姓名、联系方式。</p>
    <section className="study-card study-row">
      <label>研究者口令<input type="password" value={token} onChange={e => setToken(e.target.value)} autoComplete="off" /></label>
      <button disabled={busy || !token} onClick={() => void run(load)}>读取 / 刷新</button>
    </section>
    {error && <p role="alert" className="study-error">{error}</p>}
    {data && <>
      <section className="study-card">
        <h2>预试进度</h2>
        <p>完整流程 {data.complete} / {data.target} · 完整且双人评分 {data.rated} / {data.target} · 未解决阻断问题 {data.blocking}</p>
        <progress className="w-full" aria-label="完整预试人数" value={data.complete} max={data.target} />
        <p className="my-3 font-bold">{data.ready ? '软件记录满足进入正式发布复核的条件；仍须研究负责人确认真实执行。' : '尚未满足正式发布条件，请完成下列流程与复核。'}</p>
        <p className="break-all study-muted">当前材料计划哈希：{data.planHash || '尚未保存材料'}</p>
        {!data.participants.length && <p>尚无预试参与者。先在研究工作台审核并发布预试材料，再由参与者进入测试。</p>}
        {data.participants.map(p => <div key={p.id} className="my-3 rounded-xl border p-3">
          <h3 className="font-bold">{p.id}{p.withdrawn ? ' · 已撤回，不计入完成' : ''}</h3>
          <p>练习 {p.practice ? '✓' : '待完成'} · 传统绘画及后测 {p.control ? '✓' : '待完成'} · 指导绘画及后测 {p.guided ? '✓' : '待完成'}</p>
          <p>访谈 {p.interview ? '✓' : '待完成'} · 双人评分 {p.rated ? '✓' : '待完成'}</p>
        </div>)}
      </section>
      <PilotWorkload data={data.workload} />
      <section className="study-card">
        <h2>实际执行复核</h2>
        {!data.reviewCurrent && data.review && <p className="study-error">材料版本已变化，旧复核仅保留历史；需要针对当前材料重新核对。</p>}
        {Object.entries(labels).map(([key, label]) => <label key={key} className="my-3"><input type="checkbox" checked={checks[key] ?? false} onChange={e => setChecks(v => ({ ...v, [key]: e.target.checked }))} />{label}</label>)}
        <label>实际复核说明<textarea maxLength={2000} value={note} onChange={e => setNote(e.target.value)} placeholder="填写设备、实际操作耗时、评分规则问题及备份复核结果；未执行的项目不要勾选。" /></label>
        <button disabled={busy || !data.planHash} onClick={() => void run(() => api({ action: 'pilotReview', revision: data.review?.revision ?? 0, planHash: data.planHash, checks: Object.fromEntries(Object.keys(labels).map(k => [k, checks[k] ?? false])), note }, token))}>保存实际复核</button>
      </section>
      <section className="study-card">
        <h2>预试问题与修复</h2>
        <label>问题描述<textarea maxLength={500} value={title} onChange={e => setTitle(e.target.value)} /></label>
        <label>问题等级<select value={severity} onChange={e => setSeverity(e.target.value)}><option value="blocking">阻断：影响采集或公平比较</option><option value="general">一般：可用性改进</option></select></label>
        <button disabled={busy || !title.trim()} onClick={() => void run(async () => { await api({ action: 'pilotIssue', revision: 0, title, severity, status: 'open', resolution: '' }, token); setTitle(''); })}>记录问题</button>
        {data.issues.map(i => <article key={i.id} className="my-4 rounded-xl border p-3">
          <h3 className="font-bold">{i.title}</h3><p>{i.severity === 'blocking' ? '阻断' : '一般'} · {i.status === 'open' ? '待解决' : '已解决'} · 修订 {i.revision}</p>
          <label>修复与复验说明<textarea maxLength={2000} value={resolutions[i.id] ?? ''} onChange={e => setResolutions(v => ({ ...v, [i.id]: e.target.value }))} /></label>
          <button disabled={busy} onClick={() => void run(() => updateIssue(i, i.status === 'open' ? 'resolved' : 'open'))}>{i.status === 'open' ? '保存说明并解决' : '重新打开问题'}</button>
        </article>)}
      </section>
      <section className="study-card">
        <h2>导出预试执行记录</h2><p>包含流程进度、版本、问题和当前复核。修改历史由后端审计日志保留；该文件不是实验结果证明。</p>
        <button disabled={busy} onClick={() => void run(async () => {
          const saved = await api<{ id: string }>({ action: 'pilotExport' }, token);
          await load();
          await downloadReview(saved.id);
        })}>保存复盘到后端并下载</button>
        {data.exports.map(item => <div className="my-2" key={item.id}><button disabled={busy} onClick={() => void run(() => downloadReview(item.id))}>下载已存复盘 · {item.createdAt}</button></div>)}
        <button disabled={busy} onClick={() => void run(async () => {
          const current = await api<Snapshot>(undefined, token, '?action=pilot');
          const url = URL.createObjectURL(new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), ...current }, null, 2)], { type: 'application/json' }));
          const a = document.createElement('a'); a.href = url; a.download = '六人预试执行记录.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        })}>下载预试执行记录 JSON</button>
      </section>
    </>}
  </div></div>;
}
