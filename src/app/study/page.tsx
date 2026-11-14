'use client';
/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, Clock3, FlaskConical, Sparkles } from 'lucide-react';
import FloatingStudyReference from '@/components/study/FloatingStudyReference';
import PaintWorkspace from '@/components/creation/PaintWorkspace';
import type { StudyStudioHandle } from '@/components/creation/useStudyStudio';
import {
  DEFAULT_SETUP, GROUP_LABEL, IMI, IMI_SOURCE, PHOTOS, PHOTO_LICENSE, PRACTICE_PHOTO,
  STEPS, STEP_LABEL, SUS, SUS_SOURCE, TASK_PROMPT, VERSION, consentSections, describeRound, drawingStep, experienceQuestions, studyAssignments, limitFor,
  type Form, type Mode, type RecordState, type StudyEvent, type StudyGroup, type StudySetup,
} from '@/lib/study/expression';
import { EXPRESSION_API, expressionRequest } from '@/lib/study/expression-client';
import '../creation.css';
import './study.css';
import './expression.css';

type StudyState = { record: RecordState | null; now: number; setup?: StudySetup; setupSignature?: string };
const modeLabel = { demo:'功能演示',pilot:'预试',formal:'正式测试' } as const;
const countdown = (ms: number) => {
  const seconds = Math.max(0,Math.ceil(ms/1000));
  return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
};

export default function StudyPage() {
  const router = useRouter();
  const [record,setRecord] = useState<RecordState|null>(null);
  const [setup,setSetup] = useState<StudySetup>(DEFAULT_SETUP);
  const [setupSignature,setSetupSignature] = useState('');
  const [mode,setMode] = useState<Mode|null>(null);
  const [group, setGroup] = useState<StudyGroup | ''>('');
  const [participantCode, setParticipantCode] = useState('');
  const [loaded,setLoaded] = useState(false);
  const [form,setForm] = useState<Form>({});
  const [clock,setClock] = useState(0);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [saved,setSaved] = useState<number|null>(null);
  const [dialog,setDialog] = useState<'home'|'exit'|null>(null);

  const current = useRef<RecordState|null>(null);
  const draft = useRef<Form>({});
  const events = useRef<StudyEvent[]>([]);
  const canvas = useRef<StudyStudioHandle>(null);
  const confirmDialog = useRef<HTMLDialogElement>(null);
  const taskDialog = useRef<HTMLDialogElement>(null);
  const timeOffset = useRef(0);
  const queued = useRef<Promise<void>>(Promise.resolve());
  const pendingCheckpoint = useRef(false);
  const actionPending = useRef(false);
  const lastSignature = useRef('');
  const fieldTimer = useRef<ReturnType<typeof setTimeout>|null>(null);

  const accept = useCallback((data: StudyState, force = false) => {
    timeOffset.current = data.now-Date.now();
    setClock(data.now);
    const before = current.current;
    current.current = data.record;
    if (force || before?.step !== data.record?.step || before?.status !== data.record?.status || before?.id !== data.record?.id) {
      draft.current = data.record ? data.record.forms[data.record.step] ?? {} : {};
      setForm(draft.current); setRecord(data.record); lastSignature.current='';
    }
    if (data.setup) setSetup(data.setup);
    if (data.setupSignature) setSetupSignature(data.setupSignature);
  },[]);

  useEffect(() => {
    let active = true;
    const stage = new URLSearchParams(location.search).get('mode');
    expressionRequest<StudyState>().then(data => {
      if (!active) return;
      accept(data,true);
      if (data.record) setMode(data.record.mode);
      else if (stage === 'pilot' || stage === 'formal' || stage === 'demo') setMode(stage);
      setLoaded(true);
    }).catch(failure => { if (active) setError(failure.message); });
    return () => { active=false; if (fieldTimer.current) clearTimeout(fieldTimer.current); };
  },[accept]);

  useEffect(() => {
    const element=confirmDialog.current;
    if (dialog && element && !element.open) element.showModal();
    if (!dialog && element?.open) element.close();
  },[dialog]);

  const log = useCallback((type: string, detail?: string) => {
    if (current.current?.status === 'active') events.current.push({ type, at: Date.now()+timeOffset.current, detail });
  },[]);

  const persist = useCallback((action: 'checkpoint'|'next'|'exit', onSaved?: () => void) => {
    const background = action === 'checkpoint' && !onSaved;
    if (background) {
      if (pendingCheckpoint.current || actionPending.current) return queued.current;
      pendingCheckpoint.current=true;
    } else {
      if (actionPending.current) return queued.current;
      actionPending.current=true; setBusy(true);
      canvas.current?.pause();
    }
    const requested = current.current;
    const task = queued.current.then(async () => {
      const before = current.current;
      if (!before || before.status !== 'active' || (action === 'next' && (before.step !== requested?.step || before.id !== requested?.id))) return;
      const batch = events.current.slice(0,2000);
      const snapshot = drawingStep(before.step) ? await canvas.current?.capture() : undefined;
      const payload = { form:draft.current, ...snapshot };
      const signature = JSON.stringify(payload);
      const expired = drawingStep(before.step) && Date.now()+timeOffset.current >= before.enteredAt+limitFor(before.step);
      if (background && !expired && !batch.length && signature === lastSignature.current) return;
      const data = await expressionRequest<StudyState>('',{ action, step:before.step, revision:before.revision, ...payload, events:batch });
      events.current.splice(0,batch.length);
      lastSignature.current=signature;
      accept(data);
      setSaved(data.now); setError('');
      if (!background) setDialog(null);
      onSaved?.();
    }).catch(failure => {
      setError(failure instanceof Error ? failure.message : '当前内容尚未保存，请重试。');
      if (!background) setDialog(null);
    }).finally(() => {
      if (background) pendingCheckpoint.current=false;
      else { actionPending.current=false; setBusy(false); }
    });
    queued.current=task;
    return task;
  },[accept]);

  useEffect(() => {
    if (record?.status !== 'active') return;
    const frame = window.setInterval(() => {
      const now=Date.now()+timeOffset.current;
      setClock(now);
      const active=current.current;
      if (active && drawingStep(active.step) && now >= active.enteredAt+limitFor(active.step)) void persist('next');
    },500);
    const auto = window.setInterval(() => void persist('checkpoint'),3500);
    function visibility() {
      log(document.hidden ? 'browser_hidden' : 'browser_visible');
      if (document.hidden) void persist('checkpoint');
    }
    function pagehide() {
      const active=current.current;
      if (!active || actionPending.current || pendingCheckpoint.current) return;
      const payload={ action:'checkpoint', step:active.step, revision:active.revision, form:draft.current, events:events.current.slice(0,50) };
      const snapshot = drawingStep(active.step) ? canvas.current?.captureQuick() : undefined;
      const full = JSON.stringify({...payload,...snapshot});
      const beacon = (data: string) => {
        const body = new Blob([data], { type: 'application/json' });
        return body.size <= 60_000 && navigator.sendBeacon(EXPRESSION_API, body);
      };
      if (beacon(full)) return;
      if (snapshot?.image) {
        const compact = canvas.current?.captureQuick(.35);
        if (compact?.image && beacon(JSON.stringify({...payload, image:compact.image}))) return;
      }
      beacon(JSON.stringify(payload));
    }
    document.addEventListener('visibilitychange',visibility);
    window.addEventListener('pagehide',pagehide);
    return () => {
      clearInterval(frame); clearInterval(auto);
      document.removeEventListener('visibilitychange',visibility); window.removeEventListener('pagehide',pagehide);
    };
  },[record?.status,log,persist]);

  function answer(key: string, value: Form[string]) {
    draft.current={ ...draft.current,[key]:value }; setForm(draft.current);
    if (fieldTimer.current) clearTimeout(fieldTimer.current);
    fieldTimer.current=setTimeout(() => void persist('checkpoint'),650);
  }

  function chooseStage(stage: Mode) {
    setMode(stage);
    setGroup('');
    setParticipantCode('');
    setError('');
  }

  async function enroll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mode || !group) return;
    setBusy(true); setError('');
    const values = new FormData(event.currentTarget);
    try {
      const data = await expressionRequest<StudyState>('',{
        action:'enroll',version:VERSION,setupSignature,mode,group,participantCode,accepted:values.get('accepted') === 'on',
        name:String(values.get('name') || ''),age:Number(values.get('age')),experience:String(values.get('experience') || ''),
        device:String(values.get('device') || ''),gender:String(values.get('gender') || ''),
      });
      accept(data,true);
    } catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }
  async function release() {
    setBusy(true);
    try {
      const data=await expressionRequest<StudyState>('',{action:'release'});
      setSaved(null); setError(''); events.current=[]; accept(data,true);
      setMode(null); setGroup(''); setParticipantCode('');
    } catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }

  const participantSlots = mode === 'pilot' || mode === 'formal'
    ? studyAssignments(mode).filter(slot => slot.group === group)
    : [];
  const assignmentPreview = participantSlots.find(slot => slot.code === participantCode);
  const active=record?.status === 'active';
  const index=record ? STEPS.indexOf(record.step) : -1;
  const r=record?.rounds[record.step.endsWith('2') ? 1 : 0];
  const remain=record && limitFor(record.step) ? record.enteredAt+limitFor(record.step)-clock : 0;
  const taskPhoto=r ? PHOTOS[r.photo] : null;
  const questions = experienceQuestions(record?.version ?? VERSION, record?.interviewVersion, record?.rounds[0].auto);
  const practicePrompt = record?.rounds[0].auto
    ? '试着调整参考图或添加素材，再点「确认并继续绘制」，观察系统转绘。'
    : '试画几笔，再把一个素材贴到作品画布，熟悉手绘和拼贴。';
  const materialPrompt = r?.materials
    ? r.auto
      ? '请打开素材库，使用素材拼贴功能。至少选一个素材，调整好位置后点击「确认并继续绘制」。'
      : '请从素材库选至少一个素材，调整位置后点「贴到画布」。你可以在同一张画布上继续手绘。'
    : null;
  const timerDone=Boolean(record && drawingStep(record.step) && remain <= 0);
  const proceed=(label:string,disabled=false) => <button type="button" className="primary" disabled={busy || disabled} onClick={() => void persist('next')}>{busy ? '正在保存…' : label}</button>;

  const confirmation = <dialog ref={confirmDialog} className="studio-exit-dialog expression-modal" role="alertdialog" aria-modal="true" aria-labelledby="expression-exit-title" aria-describedby="expression-exit-description" onCancel={e => { e.preventDefault(); if (!busy) setDialog(null); }}>
    {dialog && <>
      <h2 id="expression-exit-title">{dialog === 'home' ? '保存进度并返回主页？' : '保存并退出测试？'}</h2>
      <p id="expression-exit-description">
        {dialog === 'home' ? (record && drawingStep(record.step) ? '重新打开测试页即可继续。离开期间，创作倒计时照常运行。' : '重新打开测试页即可继续。')
          : '会保存当前已填写内容、操作记录，以及可取得的当前画面。'}
      </p>
      <div className="studio-exit-actions">
        <button type="button" autoFocus disabled={busy} onClick={() => setDialog(null)}>返回</button>
        <button type="button" className="night-primary" disabled={busy} onClick={() => {
          if (dialog === 'home') void persist('checkpoint', () => router.push('/'));
          else void persist('exit');
        }}>{busy ? '正在处理…' : '确认'}</button>
      </div>
    </>}
  </dialog>;

  if (record && active && drawingStep(record.step) && r) {
    const step = record.step;
    const practice = step === 'practice';
    const photo = practice ? PRACTICE_PHOTO : PHOTOS[r.photo].path;
    const allowLayout = practice || r.materials;
    const condition = practice ? `${GROUP_LABEL[r.auto ? 'auto' : 'manual']} · 练习参考图` : describeRound(r);
    const taskInstruction = practice ? practicePrompt : materialPrompt ?? (r.auto
      ? '点击「开始绘制」，观察系统怎样把参考图逐步转成笔触。'
      : '参考照片，在空白画布上手绘你想表达的内容。');
    const nextInstruction = practice ? '熟悉工具后，结束练习即可进入第一轮准备。' : '创作结束后，填写本轮体验问卷。';
    const resumeImage = record.artwork[step] ? `${EXPRESSION_API}?action=resume-image&file=${step}` : undefined;
    const resumeReference = record.reference[step]
      ? `${EXPRESSION_API}?action=resume-image&file=${step}-reference`
      : record.version === 'expression-2x2-v1' && resumeImage && r.auto ? photo : undefined;
    return <PaintWorkspace key={`${record.id}-${step}`} entry={{ mode: r.auto ? 'co-create' : 'free', source: r.auto ? photo : null }}
      locked={busy || timerDone}
      study={{ handle: canvas, photo, allowLayout, resumeImage, resumeReference, resumeLayout: record.layouts[step], onEvent: log, onSave: () => { canvas.current?.pause(); return persist('checkpoint'); } }}
      header={<>
        <h1><button type="button" onClick={() => taskDialog.current?.showModal()} aria-label={`${STEP_LABEL[step]}：查看任务`}><FlaskConical size={16} aria-hidden="true" />{STEP_LABEL[step]}</button></h1>
        <span className="study-studio-timer" aria-label="剩余时间"><Clock3 size={14} aria-hidden="true" />{countdown(remain)}</span>
      </>}>
      <aside className="study-task-banner" aria-label="当前测试任务">
        <strong>{practice ? '练习 · 熟悉创作工具' : `${STEP_LABEL[step]} · ${condition}`}</strong>
        <p>{taskInstruction}</p>
        <p className="study-task-next">{nextInstruction}</p>
      </aside>
      <FloatingStudyReference src={photo} title={practice ? '练习参考图' : `参考图 ${r.photo.toUpperCase()}`} />
      <div className="study-studio-controls" role="region" aria-label="测试操作">
        {error && <p role="alert" className="night-alert">{error}</p>}
        {timerDone && !error && <p role="status" className="study-studio-message">时间到，正在保存画面</p>}
        <div className="study-studio-buttons">
          <button type="button" className="night-secondary study-studio-home" aria-label="返回主页" title="返回主页" disabled={busy} onClick={() => setDialog('home')}>
            <ArrowLeft size={16} aria-hidden="true" /><span>返回主页</span>
          </button>
          <button type="button" className="night-primary" disabled={busy} onClick={() => void persist('next')}>{busy ? '正在保存…' : timerDone ? '保存画面' : practice ? '结束练习' : '结束本轮创作'}</button>
        </div>
      </div>
      <dialog ref={taskDialog} className="studio-exit-dialog" aria-labelledby="study-task-title">
        <h2 id="study-task-title">{STEP_LABEL[step]}</h2>
        {!practice && <p>{TASK_PROMPT}</p>}
        <p className="night-muted">{condition}</p>
        {!practice && <p>你最初的想法：{record.forms.intent?.[r.photo]}</p>}
        <p>{taskInstruction} {nextInstruction}</p>
        {saved && <p className="night-muted">最近保存 {new Date(saved).toLocaleTimeString()}</p>}
        <div className="studio-exit-actions">
          <button type="button" className="night-primary" autoFocus onClick={() => taskDialog.current?.close()}>回到画布</button>
        </div>
      </dialog>
      {confirmation}
    </PaintWorkspace>;
  }

  return <main className="study-shell expression-study"><div className="study-wrap">
    <header className="expression-header">
      <div><span className="expression-brand"><Sparkles size={18} aria-hidden="true" />星迹智绘</span><h1>创作表达用户测试</h1></div>
      <div className="study-tools">
        {active
          ? <button type="button" disabled={busy} onClick={() => setDialog('home')}>返回主页</button>
          : <Link className="study-link" href="/">返回主页</Link>}
        {!active && <Link className="study-link" href="/admin/studies">研究后台</Link>}
      </div>
    </header>
    {error && <p role="alert" className="study-error">{error}</p>}
    {!loaded && !error && <p role="status">正在读取测试进度…</p>}
    {loaded && !record && <section className="study-card">
      <h2>选择测试阶段</h2>
      <p className="study-muted">请按研究者通知选择阶段，再核对绘制组别与编号。</p>
      <div className="study-tools expression-stage-picker" role="group" aria-label="选择测试阶段">
        {(['pilot', 'formal', 'demo'] as const).map(stage => <button type="button" key={stage} disabled={busy}
          aria-pressed={mode === stage} className={mode === stage ? 'primary' : ''} onClick={() => chooseStage(stage)}>{modeLabel[stage]}</button>)}
      </div>
    </section>}
    {loaded && !record && mode && <section className="study-card">
      <h2>参与者知情同意书 · {modeLabel[mode]}</h2>
      {mode === 'demo' && <p>这是功能演示。请使用虚构姓名，演示记录会单独标记。</p>}
        <form onSubmit={enroll} className="expression-fields" key={mode}>
          <label>绘制组别<select name="group" required value={group} onChange={event => {
            setGroup(event.target.value as StudyGroup | '');
            setParticipantCode('');
          }}>
            <option value="">请选择{mode === 'demo' ? '要体验的' : '研究者告知的'}组别</option>
            <option value="manual">手绘组</option><option value="auto">自动转绘组</option>
          </select></label>
          {mode !== 'demo' && <>
            <label>参与者编号
              <select name="participantCode" value={participantCode} onChange={event => setParticipantCode(event.target.value)} required disabled={!group}>
                <option value="">{group ? '请选择分配给你的编号' : '请先选择绘制组别'}</option>
                {participantSlots.map(slot => <option key={slot.code} value={slot.code}>{slot.code}</option>)}
              </select>
            </label>
            {assignmentPreview && <div className="expression-assignment-preview" aria-live="polite">
              <strong>{assignmentPreview.code} · {GROUP_LABEL[assignmentPreview.group]} · 顺序 {assignmentPreview.groupSequence}</strong>
              {assignmentPreview.rounds.map((round, index) => <p key={round.photo}>第 {index + 1} 轮　{describeRound(round)}</p>)}
            </div>}
          </>}
          <div className="expression-consent-details">
        <p className="study-muted">版本 {VERSION} · 请先阅读研究信息。如有疑问，可在同意前向研究者咨询。</p>
        {consentSections(mode === 'demo' ? DEFAULT_SETUP : setup, mode === 'demo').map(([title,body]) => <div className="expression-consent" key={title}><h3>{title}</h3><p>{body}</p></div>)}
          </div>
          <label className="expression-consent-check"><input type="checkbox" name="accepted" required />我已阅读以上信息，年满18岁，并自愿同意参加及按上述方式处理本次数据。</label>
          <label>姓名<input name="name" required maxLength={80} autoComplete="off" placeholder={mode === 'demo' ? '演示化名' : '用于签署同意与联系研究者核对'} /></label>
          <label>年龄<input name="age" type="number" min={18} max={120} required /></label>
          <label>性别<select name="gender" defaultValue="" required><option value="" disabled>请选择</option><option>女</option><option>男</option><option>其他</option></select></label>
          <label>数字绘画经验<select name="experience" defaultValue="" required><option value="" disabled>请选择</option><option>没有经验</option><option>偶尔尝试</option><option>经常使用</option><option>有专业学习或从业经历</option></select></label>
          <label>主要操作设备<select name="device" defaultValue="" required><option value="" disabled>请选择</option><option>电脑鼠标</option><option>电脑触控板</option><option>数位板或手写笔</option><option>手机或平板触屏</option></select></label>
          <div className="study-tools"><button className="primary" disabled={busy || !group || (mode !== 'demo' && !assignmentPreview)}>{busy ? '正在登记…' : '同意并开始'}</button><Link className="study-link" href="/">不同意，返回</Link></div>
        </form>
    </section>}
    {record && <section className="study-card">
      <div className="expression-stage-heading"><div><p className="study-muted">{modeLabel[record.mode]} · {GROUP_LABEL[record.rounds[0].auto ? 'auto' : 'manual']} · 研究编号 {record.assignment?.code ?? record.id}</p><h2>{active ? STEP_LABEL[record.step] : record.status === 'exited' ? '已保存并退出' : '测试完成'}</h2></div>
        {active && <button type="button" disabled={busy} onClick={() => setDialog('exit')}>保存并退出</button>}
      </div>
      {active && <><p className="study-muted">第 {index+1} 步，共 {STEPS.length-1} 步</p><progress value={index+1} max={STEPS.length-1} aria-label="测试步骤进度" /></>}
      {saved && <p className="study-muted" role="status">最近保存 {new Date(saved).toLocaleTimeString()}</p>}
      {active && record.step === 'intent' && <>
        <div className="expression-assignment-preview">{record.rounds.map((round, i) => <p key={round.photo}>第 {i + 1} 轮　{describeRound(round)}</p>)}</div>
        <p>{TASK_PROMPT} 请先分别写下看到两张照片时的感受，以及你想在作品里表达什么。</p>
        <div className="expression-photo-pair">{record.rounds.map(({photo}) => <div key={photo}>
          <img src={PHOTOS[photo].path} alt={PHOTOS[photo].title}/>
          <label className="expression-stacked">{PHOTOS[photo].title} · 看图感受（必填）<textarea required maxLength={1600} value={String(form[`${photo}Feeling`] ?? '')} onChange={e=>answer(`${photo}Feeling`,e.target.value)} /></label>
          <label className="expression-stacked">{PHOTOS[photo].title} · 我想表达什么（必填）<textarea required maxLength={1600} value={String(form[photo] ?? '')} onChange={e=>answer(photo,e.target.value)} /></label>
        </div>)}</div>
        <p className="study-muted">练习提示：{practicePrompt}</p>
        {proceed('保存想法，进入练习',!['a','b','aFeeling','bFeeling'].every(key => String(form[key] ?? '').trim()))}
      </>}
      {active && (record.step === 'plan1' || record.step === 'plan2') && r && taskPhoto && <>
        <p>{TASK_PROMPT}</p>
        <p><strong>{describeRound(r)}</strong></p>
        <p>{materialPrompt ?? (r.auto ? '进入画布后点击「开始绘制」，系统会把参考照片转绘为笔触。' : '看着参考照片，使用自由画布手绘。')} 开始后计时 10 分钟。</p>
        <img className="expression-plan-photo" src={taskPhoto.path} alt={taskPhoto.title}/>
        <p>你最初的想法：{record.forms.intent?.[r.photo]}</p>
        <label className="expression-stacked">你准备怎么做？（必填）<textarea required maxLength={1600} value={String(form.plan ?? '')} onChange={e=>answer('plan',e.target.value)} /></label>
        {proceed('开始本轮计时',!String(form.plan ?? '').trim())}
      </>}
      {active && (record.step === 'survey1' || record.step === 'survey2') && <>
        <p>请按刚才这轮体验逐题作答，答完后提交。</p>
        {([{ name:'本轮创作体验',items:questions.outcomes,note:'1 完全不同意 · 7 完全同意' },{ name:'IMI 任务体验问卷',items:IMI, note:'1 完全不符合 · 4 有些符合 · 7 非常符合' },{ name:'SUS 系统可用性量表',items:SUS,note:'“系统”指刚刚使用的创作界面。1 非常不同意 · 5 非常同意' }]).map(({name,items,note}) => <section className="expression-survey" key={name}>
          <h3>{name}</h3><p className="study-muted">{note}</p>
          {items.map((q,i) => <fieldset key={q.id}><legend>{i+1}. {q.text}</legend><div className="study-scale">{Array.from({length:q.max},(_,j)=>j+1).map(value => <label key={String(value)}><input type="radio" name={q.id} checked={form[q.id]===value} onChange={()=>answer(q.id,value)}/>{value}</label>)}</div></fieldset>)}
        </section>)}
        {proceed('保存本轮问卷',[...questions.outcomes,...IMI,...SUS].some(q => typeof form[q.id] !== 'number'))}
      </>}
      {active && record.step === 'rest' && <><p>第一轮已保存。建议休息两分钟，准备好后可以随时结束休息。</p><p className="expression-countdown"><strong>{countdown(remain)}</strong></p>{proceed(remain > 0 ? '结束休息，继续第二轮' : '继续第二轮')}</>}
      {active && record.step === 'interview' && <><p>请在下面逐题填写你的回答。可以先回看两轮画面，再说说哪些操作影响了你的表达。请回答全部题目。若没有相关经历，可以如实填写「没有」，并说明当时的情况。</p>
        <div className="study-tools" aria-label="创作画面回看">
          {(['round1','round2'] as const).map((step, index) => record.artwork[step] && (
            <a key={step} className="study-link" href={`${EXPRESSION_API}?action=resume-image&file=${step}`} target="_blank" rel="noreferrer">回看第 {index + 1} 轮画面</a>
          ))}
        </div>
        {questions.interview.map((q,i)=><label className="expression-stacked" key={q.id}>{i+1}. {q.text}<textarea required maxLength={1600} value={String(form[q.id] ?? '')} onChange={e=>answer(q.id,e.target.value)}/></label>)}
        {proceed('保存访谈并完成测试',questions.interview.some(q => !String(form[q.id] ?? '').trim()))}
      </>}
      {!active && <><p>已保留提交的记录及已存画面。可使用上方编号向研究者核对记录。</p><div className="study-tools"><Link className="study-link" href="/">返回首页</Link><button type="button" disabled={busy} onClick={() => void release()}>结束本机测试，登记下一位</button></div></>}
    </section>}
    {confirmation}
    <footer className="expression-sources"><a href={IMI_SOURCE} target="_blank" rel="noreferrer">IMI 原量表</a> · <a href={SUS_SOURCE} target="_blank" rel="noreferrer">SUS 原量表</a> · <a href="/study/expression/SOURCES.md" target="_blank" rel="noreferrer">任务照片来源</a> · <a href={PHOTO_LICENSE} target="_blank" rel="noreferrer">CC BY-SA 2.0</a></footer>
  </div></main>;
}
