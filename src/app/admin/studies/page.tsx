'use client';
/* eslint-disable @next/next/no-img-element -- Private JPEGs require the browser session cookie. */

import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { EXPRESSION_API, ExpressionRequestError, expressionRequest } from '@/lib/study/expression-client';
import { DEFAULT_SETUP, GROUP_LABEL, LIMITS, VERSION, describeRound, studyAssignments, type DrawingStep, type Mode, type RecordState, type RecruitmentStage, type StudyAssignment } from '@/lib/study/expression';
import type { roundExperience } from '@/lib/study/server/expression';
import '../../study/study.css';
import '../../study/expression.css';

type Entry = Pick<RecordState,'id'|'version'|'mode'|'assignment'|'rounds'|'status'|'step'|'updatedAt'|'profile'|'artwork'|'draftArtwork'> & { name?:string; hasRevision:boolean; roundExperience: ReturnType<typeof roundExperience> };
const stages = { pilot:'预试',formal:'正式测试',demo:'演示' } as const;
const statuses = { active:'进行中',completed:'已完成',exited:'已保存并退出' } as const;
const labels = { practice:'练习',round1:'第一轮',round2:'第二轮' } as const;
const formatScore = (score: number | null | undefined) => score == null ? '—' : Number(score.toFixed(2));

export default function ResearchDashboard() {
  const [rows,setRows] = useState<Entry[]|null>(null);
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [notice,setNotice] = useState('');
  const [error,setError] = useState('');
  const [editor,setEditor] = useState<{ id:string; number:number; sourceRevision:number; json:string; reason:string }|null>(null);
  const [filter,setFilter] = useState<Mode|'all'>('all');
  const [allocationStage, setAllocationStage] = useState<RecruitmentStage>('formal');
  const refresh = useCallback(async () => {
    try {
      const data = await expressionRequest<{ records:Entry[] }>('?action=list');
      setRows(data.records);
    } catch (failure) {
      if (failure instanceof ExpressionRequestError && failure.status === 401) setRows(null);
      else setError((failure as Error).message);
    } finally { setLoading(false); }
  },[]);
  useEffect(() => { const task=window.setTimeout(() => void refresh(),0); return () => window.clearTimeout(task); },[refresh]);
  async function login(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setBusy(true); setError('');
    try { await expressionRequest('',{action:'login',password:values.get('password')}); await refresh(); }
    catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }
  async function editRecord(id:string) {
    setBusy(true); setError(''); setNotice('');
    try {
      const data = await expressionRequest<{ forms:RecordState['forms']; number:number; sourceRevision:number }>(`?action=edit-record&id=${id}`);
      setEditor({ id, number:data.number, sourceRevision:data.sourceRevision, json:JSON.stringify(data.forms,null,2), reason:'' });
    } catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }
  async function saveRevision(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor) return;
    let forms:unknown;
    try { forms=JSON.parse(editor.json); }
    catch { setError('JSON 格式有误，请检查引号、逗号和括号。'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const { id, number, sourceRevision, reason } = editor;
      const saved = await expressionRequest<{ number:number }>('',{ action:'admin-revise',id,number,sourceRevision,reason,forms });
      setEditor(null);
      await refresh();
      setNotice(`已保存第 ${saved.number} 版修订。请在该记录中点击「下载修订 JSON」。`);
    } catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }
  async function remove(id:string) {
    if (!window.confirm('确认删除本次身份信息、作答、评分和作品？此操作用于处理撤回或到期清理。')) return;
    setBusy(true); setError(''); setNotice('');
    try { await expressionRequest('',{action:'admin-delete',id}); await refresh(); setNotice('服务器上的本次记录已删除。'); }
    catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }
  async function logout() {
    try { await expressionRequest('',{action:'logout'}); setRows(null); setEditor(null); setError(''); setNotice(''); }
    catch (failure) { setError((failure as Error).message); }
  }
  async function copyAssignment(slot: StudyAssignment) {
    const instructions = [
      `${stages[slot.stage]} · 参与者编号 ${slot.code} · ${GROUP_LABEL[slot.group]}`,
      ...slot.rounds.map((round, index) => `第 ${index + 1} 轮：${describeRound(round)}`),
      '打开测试页，选择上面的阶段和组别，从下拉列表选择参与者编号。',
    ].join('\n');
    try {
      await navigator.clipboard.writeText(instructions);
      setNotice(`已复制 ${slot.code} 的测试通知。`);
    } catch {
      setError('浏览器无法访问剪贴板，可以手动复制该行分配信息。');
    }
  }

  const shown=rows?.filter(row => filter === 'all' || row.mode === filter) ?? [];
  return <main className="study-shell expression-study"><div className="study-wrap">
    <header className="expression-header"><div><Link href="/">星迹智绘</Link><h1>创作表达研究后台</h1></div><div className="study-tools"><Link className="study-link" href="/study">测试入口</Link>{rows && <button onClick={() => void logout()}>退出后台</button>}</div></header>
    {error && <p role="alert" className="study-error">{error}</p>}
    {notice && rows && <p role="status">{notice}</p>}
    {loading ? <p>正在读取登录状态…</p> : !rows ? <section className="study-card"><h2>研究者登录</h2><form className="expression-fields" onSubmit={login}><label>管理员密码<input name="password" type="password" required maxLength={256} autoComplete="current-password" /></label><div><button className="primary" disabled={busy}>{busy ? '正在登录…':'登录'}</button></div></form></section> : <>
      <section className="study-card">
        <h2>知情同意书</h2>
        <p>{DEFAULT_SETUP.researcher} · {DEFAULT_SETUP.contact}</p>
        <p className="study-muted">研究资料自填写同意书之日起保存 3 年。每条记录保留签署日期与同意书版本。</p>
        <div className="study-tools"><Link className="study-link" href="/study?mode=demo">演示入口</Link><Link className="study-link" href="/study?mode=pilot">预试入口</Link><Link className="study-link" href="/study?mode=formal">正式测试入口</Link></div>
      </section>
      <section className="study-card">
        <div className="expression-header">
          <h2>参与者分配表</h2>
          <div className="study-tools" role="group" aria-label="分配表阶段">
            {(['formal','pilot'] as const).map(stage => <button key={stage} type="button" className={allocationStage === stage ? 'primary' : ''} aria-pressed={allocationStage === stage}
              onClick={() => setAllocationStage(stage)}>{stages[stage]} · {LIMITS[stage]} 个编号</button>)}
          </div>
        </div>
        <p className="study-muted">每人固定一个绘制组别。正式阶段每组有四种顺序，每种顺序分配三个编号。</p>
        <div className="expression-allocation-scroll">
          <table className="expression-allocation" aria-label={stages[allocationStage]+'参与者分配表'}>
            <thead><tr><th scope="col">编号</th><th scope="col">组别 / 顺序</th><th scope="col">第一轮</th><th scope="col">第二轮</th><th scope="col">登记状态</th><th scope="col">通知</th></tr></thead>
            <tbody>{studyAssignments(allocationStage).map(slot => {
              const registered = rows.find(row => row.assignment?.code === slot.code);
              return <tr key={slot.code}>
                <th scope="row">{slot.code}</th>
                <td>{GROUP_LABEL[slot.group]} · {slot.groupSequence}</td>
                {slot.rounds.map(round => <td key={round.photo}>{round.materials ? '有素材' : '无素材'} · 照片 {round.photo.toUpperCase()}</td>)}
                <td>{registered ? statuses[registered.status] : '待登记'}</td>
                <td><button type="button" onClick={() => void copyAssignment(slot)} aria-label={`复制 ${slot.code} 测试通知`}>复制</button></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      </section>
      <section className="study-card">
        <div className="expression-header"><h2>测试记录</h2><button type="button" onClick={() => void refresh()}>刷新</button></div>
        <p>当前版本 · {(Object.keys(stages) as Mode[]).map(m=>`${stages[m]} ${rows.filter(r=>r.version===VERSION && r.mode===m && r.status==='completed').length} 人完成`).join(' · ')}</p>
        <div className="study-tools">
          <label>筛选 <select value={filter} onChange={e=>setFilter(e.target.value as typeof filter)}><option value="all">全部记录</option><option value="pilot">预试</option><option value="formal">正式测试</option><option value="demo">演示</option></select></label>
          <a className="expression-download" href={EXPRESSION_API+'?action=export-all'+(filter==='all' ? '' : '&mode='+filter)}>导出{filter==='all' ? '研究记录（不含演示）' : stages[filter]} JSON</a>
          {filter==='all' && <a className="expression-download" href={EXPRESSION_API+'?action=export-all&mode=all'}>导出全部（含演示）</a>}
        </div>
        {!shown.length && <p>此筛选下没有记录。</p>}
        {shown.length > 0 && <p className="study-muted">创作体验按轮次展示。完整的 IMI 分量表和原始作答可查看 JSON。</p>}
        {shown.map(row => <article className="expression-record" key={row.id}>
          <div className="expression-header"><h3>{row.name || '未登记姓名'} · {stages[row.mode]} · {statuses[row.status]}</h3><small>{new Date(row.updatedAt).toLocaleString()}</small></div>
          <p className="study-muted">{row.assignment?.code ?? row.id} · {row.version} · {row.profile.age} 岁 · {row.profile.device}</p>
          {row.assignment && <p className="study-muted">{GROUP_LABEL[row.assignment.group]} · 顺序 {row.assignment.groupSequence} · {row.rounds.map(describeRound).join(' → ')}</p>}
          <div className="study-tools">
            <a className="expression-download" href={EXPRESSION_API+`?action=json&id=${row.id}&view=1`} target="_blank" rel="noreferrer">查看 JSON</a>
            <a className="expression-download" href={EXPRESSION_API+`?action=json&id=${row.id}`}>下载 JSON</a>
            {row.status !== 'active' && <button type="button" disabled={busy} onClick={() => void editRecord(row.id)}>编辑作答</button>}
            {row.hasRevision && <a className="expression-download" href={EXPRESSION_API+`?action=revised-json&id=${row.id}`}>下载修订 JSON</a>}
            <button type="button" disabled={busy} onClick={() => void remove(row.id)}>删除记录</button>
          </div>
          {editor?.id === row.id && <form className="expression-fields" onSubmit={saveRevision}>
            <p>可修改任务计划、问卷与访谈等作答。保存时重新计算量表分数，并记录修改原因。</p>
            <label>作答 JSON<textarea rows={16} value={editor.json} spellCheck={false} onChange={e => setEditor({ ...editor, json:e.target.value })} required /></label>
            <label>修改原因<input value={editor.reason} onChange={e => setEditor({ ...editor, reason:e.target.value })} maxLength={500} required /></label>
            <div className="study-tools">
              <button type="submit" className="primary" disabled={busy}>保存为修订 JSON</button>
              <button type="button" disabled={busy} onClick={() => setEditor(null)}>取消</button>
            </div>
          </form>}
          <div className="expression-allocation-scroll">
            <table className="expression-allocation" aria-label="两轮创作体验">
              <thead><tr>
                <th scope="col">轮次与条件</th><th scope="col">确认素材布局</th>
                <th scope="col">表达实现 / 7</th><th scope="col">创作掌控 / 7</th>
                <th scope="col">操作负担 / 7</th><th scope="col">IMI 兴趣 / 7</th><th scope="col">SUS / 100</th>
              </tr></thead>
              <tbody>{row.roundExperience.map(round => <tr key={round.round}>
                <th scope="row">第 {round.round} 轮 · {describeRound(round)}</th>
                <td>{!round.materials ? '未提供' : round.materialLayoutConfirmed === null ? '—' : round.materialLayoutConfirmed ? '已确认' : '未确认'}</td>
                <td>{formatScore(round.expressionRealized)}</td>
                <td>{formatScore(round.creativeControl)}</td>
                <td>{formatScore(round.interactionEffort)}</td>
                <td>{formatScore(round.imi.interestEnjoyment)}</td>
                <td>{formatScore(round.sus)}</td>
              </tr>)}</tbody>
            </table>
          </div>
          <div className="expression-artworks">{(Object.keys(labels) as DrawingStep[]).filter(key=>row.artwork[key]).map(key=><figure key={key}>
            <img loading="lazy" src={EXPRESSION_API+`?action=artwork&id=${row.id}&file=${key}&view=1`} alt={labels[key]+'作品'}/>
            <figcaption><a className="expression-download" href={EXPRESSION_API+`?action=artwork&id=${row.id}&file=${key}`}>下载{labels[key]} JPG</a></figcaption>
          </figure>)}
          {(Object.keys(labels) as DrawingStep[]).filter(key=>row.draftArtwork?.[key]).map(key=><figure key={key+'-draft'}>
            <img loading="lazy" src={EXPRESSION_API+`?action=draft&id=${row.id}&file=${key}&view=1`} alt={labels[key]+'待确认布局'}/>
            <figcaption><a className="expression-download" href={EXPRESSION_API+`?action=draft&id=${row.id}&file=${key}`}>下载{labels[key]}布局草稿 JPG</a></figcaption>
          </figure>)}</div>
        </article>)}
      </section>
    </>}
  </div></main>;
}
