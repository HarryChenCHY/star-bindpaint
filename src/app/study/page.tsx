'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, preparePlan, readLocal, syncAttempt } from '@/lib/study/client';
import {
  INTERVIEW,
  PROTOCOL,
  QUESTIONS,
  type Answers,
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
  onSubmit,
}: {
  post: boolean;
  onSubmit: (a: Answers) => Promise<void>;
}) {
  const [answers, setAnswers] = useState<Answers>({}),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const questions = QUESTIONS.slice(0, post ? 4 : 2);
  return (
    <div>
      <h2>{post ? '本轮结束后的感受' : '开始前的感受'}</h2>
      <p className="study-muted">
        1 非常不同意 · 4 既不同意也不反对 · 7 非常同意。可以选择不回答。
      </p>
      {questions.map((q) => (
        <fieldset key={q.id} className="my-5">
          <legend className="font-bold">{q.text}</legend>
          <div className="study-scale">
            {[1, 2, 3, 4, 5, 6, 7, null].map((n) => (
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
        提交问卷
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
    logs: false,
    artwork: false,
  });
  const [practice, setPractice] = useState<{
      plan: StrokePlan;
      material: string;
    } | null>(null),
    [clock, setClock] = useState(0),
    [interview, setInterview] = useState(['', '', '']);
  const [stage, setStage] = useState('novice-pilot-v1');
  const reload = async () => {
    setView(await api<View>());
  };
  useEffect(() => {
    void api<View>()
      .then(setView)
      .catch((e) => setError(String(e)));
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
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  const p = view?.participant,
    all = view?.sessions || [];
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
            ? `${p.researchCode ?? p.id} · ${view?.config.stage === 'pilot' ? '预试' : '正式测试'}`
            : '同一幅画，两种绘画方式。按自己的节奏，不是考试。'}
        </p>
        {error && (
          <p role="alert" className="study-error">
            {error}
          </p>
        )}
        {!view && !error && <p>正在读取研究状态…</p>}
        {!view && error && (
          <button className="primary" disabled={busy} onClick={() => void run(async () => {})}>
            {busy ? '正在重试…' : '重新读取研究状态'}
          </button>
        )}
        {view && !p && (
          <section className="study-card space-y-4">
            <h2>进入研究</h2>
            <p>
              每轮最多 12 分钟，包含练习、问卷与休息，全程约 40
              分钟。记录匿名操作摘要与问卷，并私有保存真实作品供两人评分。默认保留至采集后{' '}
              {PROTOCOL.retentionDays}{' '}
              天；不公开作品，不记录姓名、联系方式或完整触点轨迹。你可随时停止，并凭本浏览器的研究凭证申请撤回；研究者会处理已有副本，已经匿名发布的汇总无法逐人追溯。
            </p>
            <label>
              研究批次{' '}
              <select value={stage} onChange={(e) => setStage(e.target.value)}>
                <option value="novice-pilot-v1">预试</option>
                <option value="novice-formal-v1">正式测试</option>
              </select>
            </label>
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
            {[
              ['adult', '我已满 18 周岁'],
              [
                'eligible',
                '我未接受持续系统绘画训练，近 3 个月没有每周固定绘画练习',
              ],
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
                  busy || !Object.values(consents).every(Boolean) || !code
                }
                onClick={() =>
                  void run(() =>
                    api({
                      action: 'enroll',
                      code,
                      studyId: stage,
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
            ) : (
              <button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    setPractice(await preparePlan('/study/practice.svg'));
                  } catch (e) {
                    setError(String(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                准备练习图
              </button>
            )}
          </section>
        )}
        {p?.practiceAt && !p.withdrawnAt && !current && !second?.post && (
          <section className="study-card">
            <h2>{readySecond ? '轮间休息' : '第一轮准备'}</h2>
            <p>
              {readySecond
                ? `请稍作休息，下一轮仍绘制同一张图。剩余 ${Math.ceil(restLeft / 1000)} 秒。`
                : '请确认设备可用，随后填写两道题并开始绘画。'}
            </p>
            <button
              className="primary"
              disabled={busy || (readySecond && restLeft > 0)}
              onClick={() =>
                void run(() =>
                  api({ action: 'session', period: readySecond ? 2 : 1 }),
                )
              }
            >
              {readySecond ? '准备第二轮' : '准备第一轮'}
            </button>
          </section>
        )}
        {current && !p?.withdrawnAt && (
          <section className="study-card">
            {!current.pre ? (
              <Questionnaire
                key={`${current.id}-pre`}
                post={false}
                onSubmit={async (answers) => {
                  await api({
                    action: 'questionnaire',
                    sessionId: current.id,
                    phase: 'pre',
                    answers,
                  });
                  await reload();
                }}
              />
            ) : current.state === 'created' &&
              view?.config.plan &&
              view.config.material ? (
              <ResearchDrawing
                key={current.id}
                session={current}
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
              <h2>最后聊三句</h2>
              {p?.interview ? (
                <p>访谈已保存，谢谢参与。</p>
              ) : (
                <>
                  {INTERVIEW.map((q, i) => (
                    <label className="my-3 flex-col !items-start" key={q}>
                      {q}
                      <textarea
                        value={interview[i]}
                        maxLength={2000}
                        placeholder="可以留空，记为未回答"
                        onChange={(e) =>
                          setInterview((v) =>
                            v.map((s, j) => (i === j ? e.target.value : s)),
                          )
                        }
                      />
                    </label>
                  ))}
                  <button
                    onClick={() =>
                      void run(() =>
                        api({ action: 'interview', answers: interview }),
                      )
                    }
                    disabled={busy}
                  >
                    保存访谈
                  </button>
                </>
              )}
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
