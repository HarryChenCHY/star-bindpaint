'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, preparePlan, readLocal, syncAttempt } from '@/lib/study/client';
import {
  CONSENT_SECTIONS,
  IMI_QUESTIONS,
  LEGACY_POST_QUESTIONS,
  LEGACY_PRE_QUESTIONS,
  OUTCOME_QUESTIONS,
  POST_QUESTIONS,
  PRE_QUESTIONS,
  PROTOCOL,
  SUS_QUESTIONS,
  type Answers,
  type QuestionnaireItem,
  type StrokePlan,
} from '@/lib/study/protocol';
import type { Participant, Session, StudyConfig } from '@/lib/study/types';
import type { report } from '@/lib/study/server/service';
import { ResearchDrawing } from '@/components/study/ResearchDrawing';
import { PairReport } from '@/components/study/StudyReport';
import './study.css';
interface View {
  participant: Participant | null;
  config: StudyConfig;
  sessions?: Session[];
  report?: ReturnType<typeof report>['pairs'][number];
}
function Questionnaire({
  post,
  legacy = false,
  onSubmit,
  submitLabel = '保存感受',
}: {
  post: boolean;
  legacy?: boolean;
  submitLabel?: string;
  onSubmit: (a: Answers) => Promise<void>;
}) {
  const [answers, setAnswers] = useState<Answers>({}),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const questions = legacy
    ? post
      ? LEGACY_POST_QUESTIONS
      : LEGACY_PRE_QUESTIONS
    : post
      ? POST_QUESTIONS
      : PRE_QUESTIONS;
  const sections: { title: string; note?: string; items: readonly QuestionnaireItem[] }[] =
    post && !legacy
      ? [
          { title: '本轮结果感受', items: OUTCOME_QUESTIONS },
          { title: '内在动机量表（IMI）', note: '请按刚才这一轮真实体验作答。', items: IMI_QUESTIONS },
          { title: '系统可用性量表（SUS）', note: '以下“这种绘画方式”只指刚才使用的方式。', items: SUS_QUESTIONS },
        ]
      : [{ title: post ? '本轮结果感受' : '画前状态', items: questions }];
  return (
    <div>
      <h2>{post ? '本轮结束后的感受' : '开始前的感受'}</h2>
      <p className="study-muted">
        请按刚才这一轮独立作答。7 点题：1 非常不同意、4 中立、7 非常同意；SUS 为 5 点题。可以选择不回答，缺答不会被补零。
      </p>
      {sections.map((section) => <section key={section.title} className="my-6">
        <h3 className="font-bold">{section.title}</h3>
        {section.note && <p className="study-muted">{section.note}</p>}
        {section.items.map((q) => (
          <fieldset key={q.id} className="my-5">
            <legend className="font-bold">{q.text}</legend>
            <div className="study-scale">
              {[...Array.from({ length: q.max }, (_, index) => index + 1), null].map((n) => (
                <label key={String(n)}>
                  <input
                    type="radio"
                    name={q.id}
                    checked={q.id in answers && answers[q.id] === n}
                    onChange={() => setAnswers((a) => ({ ...a, [q.id]: n }))}
                  />
                  {n ?? '不回答'}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </section>)}
      {error && (
        <p role="alert" className="study-error">
          {error}
        </p>
      )}
      <button
        className="primary"
        disabled={busy || questions.some((q) => !(q.id in answers))}
        onClick={async () => {
          setBusy(true);
          try {
            await onSubmit(answers);
          } catch (e) {
            setError(String(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? '正在保存…' : submitLabel}
      </button>
    </div>
  );
}
export default function StudyPage() {
  const [view, setView] = useState<View | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [code, setCode] = useState('');
  const [consents, setConsents] = useState({
    adult: false,
    eligible: false,
    informationRead: false,
    voluntary: false,
    privacyUnderstood: false,
    logs: false,
    artwork: false,
  });
  const [profile, setProfile] = useState({
    ageBand: 'prefer-not',
    drawingFrequency: 'prefer-not',
    digitalDrawingExperience: 'prefer-not',
  });
  const [practice, setPractice] = useState<{
      plan: StrokePlan;
      material: string;
    } | null>(null),
    [clock, setClock] = useState(0);
  const [autoStartId, setAutoStartId] = useState('');
  const [practiceError, setPracticeError] = useState('');
  const [practiceRetry, setPracticeRetry] = useState(0);
  const reload = async () => {
    setView(await api<View>());
  };
  useEffect(() => {
    void api<View>()
      .then(result => { setView(result); setClock(Date.now()); })
      .catch((e) => setError(e instanceof Error ? e.message : '测试服务暂时不可用，请稍后重试。'));
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await fn();
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作未完成，请稍后重试。');
    } finally {
      setBusy(false);
    }
  }
  const p = view?.participant,
    all = view?.sessions || [];
  const legacyQuestionnaire = view?.config.protocolVersion !== PROTOCOL.version;
  const first = all.filter((s) => s.period === 1).at(-1),
    second = all.filter((s) => s.period === 2).at(-1);
  const current =
    first && first.post && ['submitted', 'timeout'].includes(first.state)
      ? second
      : first;
  const readySecond =
    !!first?.post && ['submitted', 'timeout'].includes(first.state);
  const restLeft = first?.finalizedAt
    ? Math.max(0, PROTOCOL.restMs - (clock - Date.parse(first.finalizedAt)))
    : 0;
  const progressStep = !p ? 0 : !p.practiceAt ? 1 : second?.post ? 4 : readySecond ? 3 : 2;
  const needsPractice = !!p && !p.withdrawnAt && !p.practiceAt;
  useEffect(() => {
    if (!needsPractice) return;
    const controller = new AbortController();
    void preparePlan('/study/practice.svg', controller.signal)
      .then(result => { if (!controller.signal.aborted) setPractice(result); })
      .catch(e => { if (!controller.signal.aborted) setPracticeError(e instanceof Error ? e.message : '练习图加载失败'); });
    return () => controller.abort();
  }, [needsPractice, practiceRetry]);
  async function beginRound(answers: Answers, session?: Session) {
    const round = (await api<{ session: Session }>({ action: 'session', period: session?.period ?? (readySecond ? 2 : 1) })).session;
    if (!round.pre) await api({ action: 'questionnaire', sessionId: round.id, phase: 'pre', answers });
    setAutoStartId(round.id);
    await reload();
  }
  const readyQuestionnaire = (session?: Session) => <>
    <h2>第{(session?.period ?? (readySecond ? 2 : 1)) === 1 ? '一' : '二'}轮 · 画前准备</h2>
    <p className="study-muted">回答两道画前状态题后直接开始。每轮最多12分钟，觉得完成时可提前提交。</p>
    <Questionnaire key={session?.id ?? `ready-${readySecond ? 2 : 1}`} post={false} legacy={legacyQuestionnaire}
      submitLabel={`开始第${(session?.period ?? (readySecond ? 2 : 1)) === 1 ? '一' : '二'}轮绘画`}
      onSubmit={answers => beginRound(answers, session)} />
  </>;
  return (
    <div className="study-shell">
      <div className="study-wrap">
        <nav className="study-row justify-between mb-6">
          <Link href="/">← 星迹智绘</Link>
          <Link href="/admin/studies">研究者入口</Link>
        </nav>
        <h1>两次绘画，一次体验记录</h1>
        <p className="study-muted">
          {p
            ? `研究码：${p.researchCode ?? p.id}`
            : '同一幅画，两种绘画方式。按自己的节奏，不是考试。'}
        </p>
        <ol className="study-steps" aria-label="测试进度">
          {['进入', '熟悉工具', '第一轮', '第二轮', '完成对比'].map((label, index) => <li key={label} aria-current={index === progressStep ? 'step' : undefined} data-done={index < progressStep}><span>{index < progressStep ? '✓' : index + 1}</span>{label}</li>)}
        </ol>
        {error && (
          <p role="alert" className="study-error">
            {error}
          </p>
        )}
        {!view && !error && <p>正在读取研究状态…</p>}
        {!view && error && (
          <button className="primary" disabled={busy} onClick={() => void run(async () => {})}>
            {busy ? '正在重试…' : '重试'}
          </button>
        )}
        {view && !p && (
          <section className="study-card space-y-4">
            <h2>进入测试</h2>
            {!view.config.published && <p role="status">测试暂未开放，请联系研究者；也可以先自由体验。</p>}
            <p>
              每轮最多 12 分钟，另含练习、两轮量表、休息和口头访谈，全程约 50–60
              分钟。记录匿名操作摘要与问卷，并私有保存真实作品供两人评分。默认保留至采集后{' '}
              {PROTOCOL.retentionDays}{' '}
              天；不公开作品，不记录姓名、联系方式或完整触点轨迹。你可随时停止，并凭本浏览器的研究凭证申请撤回；研究者会处理已有副本，已经匿名发布的汇总无法逐人追溯。
            </p>
            <div className="rounded-xl border p-4" aria-label="研究知情同意说明">
              <h3 className="font-bold">研究信息与知情同意</h3>
              {CONSENT_SECTIONS.map(([title, body]) => <details key={title} className="my-2" open={title === '研究目的' || title === '参与内容'}>
                <summary className="font-bold">{title}</summary>
                <p className="study-muted">{body}</p>
              </details>)}
              <dl className="my-3 rounded-xl bg-[#f6f7fb] p-3">
                <dt className="font-bold">研究负责人及联系方式</dt><dd>{view.config.governance?.researcherContact || '历史批次未在系统中配置，请向现场研究者索取。'}</dd>
                <dt className="mt-2 font-bold">参与补偿办法</dt><dd>{view.config.governance?.compensation || '历史批次未在系统中配置，请向现场研究者确认。'}</dd>
                <dt className="mt-2 font-bold">导师 / 伦理审批状态</dt><dd>{view.config.governance?.ethicsStatement || '历史批次未在系统中配置；未确认前不应参加正式研究。'}</dd>
              </dl>
            </div>
            <label>
              研究码{' '}
              <input
                type="text"
                maxLength={64}
                placeholder="自定义一个新的研究码"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoComplete="off"
              />
            </label>
            <p className="study-muted">研究码用于命名本次两轮测试，请勿填写姓名或联系方式。支持文字、数字、下划线和短横线；已使用的研究码不能重复创建。</p>
            <div className="study-grid">
              <label>年龄段
                <select value={profile.ageBand} onChange={e => setProfile(v => ({ ...v, ageBand: e.target.value }))}>
                  <option value="prefer-not">不回答</option><option value="18-24">18–24</option><option value="25-34">25–34</option><option value="35-44">35–44</option><option value="45-plus">45 岁及以上</option>
                </select>
              </label>
              <label>近三个月绘画频率
                <select value={profile.drawingFrequency} onChange={e => setProfile(v => ({ ...v, drawingFrequency: e.target.value }))}>
                  <option value="prefer-not">不回答</option><option value="never">没有画过</option><option value="few-year">偶尔几次</option><option value="monthly">约每月一次，但没有固定训练</option>
                </select>
              </label>
              <label>数字画布经验
                <select value={profile.digitalDrawingExperience} onChange={e => setProfile(v => ({ ...v, digitalDrawingExperience: e.target.value }))}>
                  <option value="prefer-not">不回答</option><option value="never">从未使用</option><option value="tried">尝试过</option><option value="occasional">偶尔使用</option>
                </select>
              </label>
            </div>
            {[
              ['adult', '我已满 18 周岁'],
              [
                'eligible',
                '我未接受持续系统绘画训练，近 3 个月没有每周固定绘画练习',
              ],
              ['informationRead', '我已阅读并理解研究目的、流程、可能风险与可能受益'],
              ['voluntary', '我知道参与完全自愿，可以跳题、停止或申请撤回，且不会受到惩罚'],
              ['privacyUnderstood', '我理解记录内容、保存期限、访问范围与撤回边界，并有机会向研究者提问'],
              ['logs', '我同意按上述用途记录本次匿名行为数据与问卷'],
              [
                'artwork',
                '我同意私有保存本次真实作品用于研究评分（不公开展示）',
              ],
            ].map(([key, label]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={consents[key as keyof typeof consents]}
                  onChange={(e) =>
                    setConsents((c) => ({ ...c, [key]: e.target.checked }))
                  }
                />
                {label}
              </label>
            ))}
            <div className="study-row">
              <button
                className="primary"
                disabled={
                  busy || !view.config.published || !Object.values(consents).every(Boolean) || !code
                }
                onClick={() =>
                  void run(() =>
                    api({
                      action: 'enroll',
                      code,
                      studyId: view.config.id,
                      profile,
                      ...consents,
                    }),
                  )
                }
              >
                同意并进入
              </button>
              <Link className="study-link" href="/create">
                只想自由体验
              </Link>
            </div>
          </section>
        )}
        {p?.withdrawnAt && (
          <section className="study-card">
            <h2>已停止参与并登记撤回</h2>
            <p>
              编号 {p.id}
              。数据已从当前分析及评分队列移除，研究者将按同意说明处理已保存副本。
            </p>
            <button onClick={() => void run(() => api({ action: 'logout' }))}>
              退出此编号
            </button>
          </section>
        )}
        {p && !p.withdrawnAt && !p.practiceAt && (
          <section className="study-card">
            <h2>先熟悉工具</h2>
            <p>
              练习使用另一张图片。试着画线、选择颜色、切换轮廓/颜色层、使用橡皮和撤销。每个人都接受
              90 秒相同练习。
            </p>
            {practice ? (
              <ResearchDrawing
                practice
                plan={practice.plan}
                material={practice.material}
                onComplete={() => void run(() => api({ action: 'practice' }))}
              />
            ) : practiceError ? (
              <div><p role="alert">{practiceError}</p><button onClick={() => { setPracticeError(''); setPracticeRetry(v => v + 1); }}>重试加载练习图</button></div>
            ) : (
              <p role="status">正在准备练习画布…</p>
            )}
          </section>
        )}
        {p?.practiceAt && !p.withdrawnAt && !current && !second?.post && (
          <section className="study-card">
            {readySecond && restLeft > 0 ? <>
              <h2>轮间休息</h2><p>第一轮已保存。请休息一下，{Math.ceil(restLeft / 1000)}秒后显示第二轮开始卡片。</p>
              <p className="study-muted">下一轮使用同一张图和另一种绘画方式。休息结束不会自动开始计时。</p>
            </> : readyQuestionnaire()}
          </section>
        )}
        {current && !p?.withdrawnAt && (
          <section className="study-card">
            {!current.pre ? (
              readyQuestionnaire(current)
            ) : current.state === 'created' &&
              view?.config.plan &&
              view.config.material ? (
              <ResearchDrawing
                key={current.id}
                session={current}
                autoStart={autoStartId === current.id}
                plan={view.config.plan}
                material={view.config.material}
                onComplete={() =>
                  void reload().catch((e) => setError(String(e)))
                }
              />
            ) : current.state === 'running' ? (
              <div>
                <h2>检测到尚未结束的任务</h2>
                <p>
                  请优先返回原绘画页面。若原页面已经关闭，可先补传本地记录；页面中断的任务会标记技术故障，保留已知记录，请研究者安排重测。
                </p>
                <button
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      const local = await readLocal(current.id);
                      if (local?.ended) await syncAttempt(local);
                      else
                        await api({
                          action: 'recover',
                          sessionId: current.id,
                          pageId: local?.pageId,
                          events: local?.events,
                        });
                    })
                  }
                >
                  原页面已关闭，恢复记录
                </button>
              </div>
            ) : current.finalizedAt && !current.post ? (
              <Questionnaire
                key={`${current.id}-post`}
                post
                legacy={legacyQuestionnaire}
                submitLabel={current.period === 1 ? '保存感受，进入休息' : '保存感受，查看对比'}
                onSubmit={async (answers) => {
                  await api({
                    action: 'questionnaire',
                    sessionId: current.id,
                    phase: 'post',
                    answers,
                  });
                  await reload();
                }}
              />
            ) : ['technical_error', 'withdrawn'].includes(current.state) ? (
              <p>
                本轮已停止（{current.state}
                ），记录已保留。请联系研究者决定是否按协议重测。
              </p>
            ) : null}
          </section>
        )}
        {second?.post && !p?.withdrawnAt && (
          <>
            <section className="study-card">
              <h2>测试完成，谢谢参与</h2>
              <p>两轮绘画和感受问卷已保存。下方可以查看作品与过程对比；作品评分由研究者后续补充。</p>
              <p className="study-muted">如研究者安排简短访谈，可以口头回答，由研究者记录，无需再填写文字。</p>
            </section>
            {view?.report && <PairReport pair={view.report} />}
            <button onClick={() => void run(() => api({ action: 'logout' }))}>
              结束并退出此编号
            </button>
          </>
        )}
        {p && !p.withdrawnAt && (
          <div className="mt-8">
            <button
              disabled={busy}
              onClick={() => {
                if (window.confirm('停止参与并申请撤回本次研究数据？'))
                  void run(() => api({ action: 'withdraw' }));
              }}
            >
              停止参与并申请撤回数据
            </button>
            <p className="study-muted">
              请保存自己的编号 {p.id}
              。研究凭证保存在此浏览器，请不要在研究结束前清除浏览器数据。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
