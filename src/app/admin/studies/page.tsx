'use client';
/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { STROKE_CONFIG } from '@/lib/stroke-config';
import { api, preparePlan } from '@/lib/study/client';
import { PROTOCOL, RUBRIC, type StrokePlan } from '@/lib/study/protocol';
import type { StudyConfig } from '@/lib/study/types';
import type { report } from '@/lib/study/server/service';
import { GroupReport, PairReport } from '@/components/study/StudyReport';
import { ResearcherInterview } from '@/components/study/ResearcherInterview';
import ImageUploader from '@/components/ImageUploader';
import '../../study/study.css';
type Data = { enrollmentTarget: string; config: StudyConfig; report: ReturnType<typeof report>; tests: Array<{ pairId: string; researchCode: string; studyId: string; createdAt: string; withdrawnAt: string | null }>; handoffs: Array<{ id: string; createdAt: string; status: string; sha256: string }> };
export default function StudyAdminPage() {
  const preparation = useRef<AbortController | null>(null);
  const [preparationStatus, setPreparationStatus] = useState('');
  useEffect(() => () => preparation.current?.abort(), []);
  const [token, setToken] = useState(''),
    [studyId, setStudyId] = useState('novice-pilot-v1'),
    [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [prepared, setPrepared] = useState<{
      plan: StrokePlan;
      material: string;
    } | null>(null);
  const [rubric, setRubric] = useState<string[]>([...RUBRIC]),
    [reviewed, setReviewed] = useState(false),
    [selected, setSelected] = useState(''),
    [exportId, setExportId] = useState('');
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  async function load(targetStudyId = studyId) {
    const d = await api<Data>(
      undefined,
      token,
      `?action=admin&studyId=${encodeURIComponent(targetStudyId)}`,
    );
    setData(d);
    setRubric(d.config.rubric);
  }
  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await fn();
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function prepare(url: string) {
    preparation.current?.abort();
    const controller = new AbortController();
    preparation.current = controller;
    setBusy(true);
    setError('');
    setPrepared(null);
    setPreparationStatus('正在读取图片…');
    try {
      const result = await preparePlan(url, controller.signal, p => {
        setPreparationStatus(`画面优化 ${Math.round(p.completed / p.total * 100)}% · 已规划 ${p.strokes} 笔`);
      });
      if (controller.signal.aborted) return;
      setPrepared(result);
      setReviewed(false);
    } catch (e) {
      if (preparation.current === controller) setError(String(e));
    } finally {
      if (preparation.current === controller) { setBusy(false); setPreparationStatus(''); }
    }
  }
  async function download(format: string) {
    const r = await fetch(
      `/api/studies?action=download&id=${exportId}&format=${format}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!r.ok) {
      setError('导出读取失败');
      return;
    }
    const url = URL.createObjectURL(await r.blob()),
      a = document.createElement('a');
    a.href = url;
    a.download = `startrace-${exportId}.${format}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const pair = data?.report.pairs.find((p) => p.pairId === selected);
  async function downloadHandoff(id: string) {
    const response = await fetch(`/api/studies?action=handoffDownload&id=${id}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error('交接包下载或完整性校验失败，请刷新后重试');
    const url = URL.createObjectURL(await response.blob());
    const a = document.createElement('a'); a.href = url; a.download = `研究版本交接-${id}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="study-shell">
      <div className="study-wrap">
        <nav className="study-row mb-6">
          <Link href="/study">← 测试入口</Link>
          <Link href="/rater">匿名评分工作台</Link>
          <Link href="/admin/studies/materials">P6 材料质量检查</Link>
          <Link href="/admin/studies/pilot">六人预试看板</Link>
          <Link href="/admin/analytics">体验统计</Link>
        </nav>
        <h1>研究工作台</h1>
        <p className="study-muted">
          协议 {PROTOCOL.version} · 每轮 12 分钟 · 原图笔触预算 ≤ 1000 笔 ·
          预试与正式研究独立保存
        </p>
        <section className="study-card study-row">
          <label>
            研究者口令{' '}
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoComplete="off"
            />
          </label>
          <select
            value={studyId}
            onChange={(e) => {
              setStudyId(e.target.value);
              setData(null);
              setPrepared(null);
            }}
          >
            <option value="novice-pilot-v1">预试（6 人）</option>
            <option value="novice-formal-v1">正式研究</option>
          </select>
          <button disabled={busy || !token} onClick={() => void run(load)}>
            读取 / 刷新
          </button>
        </section>
        {error && (
          <p role="alert" className="study-error">
            {error}
          </p>
        )}
        {data && (
          <>
            <section className="study-card">
              <h2>已有研究测试（{data.tests.length}）</h2>
              <p className="study-muted">按自定义研究码管理，每份测试包含同一人的两轮绘画。这里显示全部批次，包括尚未完成的测试。</p>
              {!data.tests.length && <p>尚未创建测试。参与者在已开放的批次输入新研究码并同意参与后，会显示在这里。</p>}
              <div className="study-scroll"><table>
                <thead><tr><th>研究码</th><th>批次</th><th>创建时间</th><th>操作</th></tr></thead>
                <tbody>{data.tests.map(test => <tr key={test.pairId}>
                  <td className="break-all">{test.researchCode}{test.withdrawnAt ? '（已撤回）' : ''}</td>
                  <td>{test.studyId.includes('pilot') ? '预试' : '正式测试'}</td>
                  <td>{new Date(test.createdAt).toLocaleString('zh-CN')}</td>
                  <td><button disabled={busy} onClick={async () => {
                    setBusy(true); setError('');
                    try {
                      await load(test.studyId); setStudyId(test.studyId); setSelected(test.pairId); setPrepared(null);
                      setTimeout(() => document.getElementById('pair-detail')?.scrollIntoView({ behavior: 'smooth' }), 0);
                    } catch (e) { setError(String(e)); } finally { setBusy(false); }
                  }}>查看测试</button></td>
                </tr>)}</tbody>
              </table></div>
            </section>
            <section className="study-card">
              <h2>材料与发布</h2>
              <p className="study-muted">当前采用算法：{STROKE_CONFIG.version} · 预算 {STROKE_CONFIG.defaultBudget} 笔</p>
              {data.config.plan && <div className="my-3 rounded-xl border p-3">
                <p>已存材料版本：{data.config.plan.version} · {data.config.plan.strokes.length} 笔</p>
                <p>{data.config.plan.version === `${STROKE_CONFIG.version}-opaque` ? '该材料使用当前算法。' : '这是历史材料；若要使用新算法，请在尚未入组的批次重新生成并审核。'}</p>
                <p className="break-all study-muted">计划哈希：{data.config.planHash}</p>
                <button onClick={() => {
                  const card = { generatedAt: new Date().toISOString(), studyId, stage: data.config.stage,
                    published: data.config.published, materialReviewed: data.config.materialReviewed,
                    algorithmVersion: data.config.plan!.version, planHash: data.config.planHash,
                    materialHash: data.config.materialHash, plannedStrokes: data.config.plan!.strokes.length,
                    timeLimitMs: PROTOCOL.timeLimitMs, rubric: data.config.rubric,
                    instructions: ['同一参与者使用同一材料，遵循系统 AB/BA 分配', '完成统一练习、两轮前后测、休息和访谈', '两位评分者独立评分后核对报告', '记录真实预试问题；执行卡不代表已完成预试'] };
                  const url = URL.createObjectURL(new Blob([JSON.stringify(card, null, 2)], { type: 'application/json' }));
                  const a = document.createElement('a'); a.href = url; a.download = `${studyId}-预试执行卡.json`; a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                }}>下载预试执行卡</button>
              </div>}
              {preparationStatus && <div role="status" className="study-row my-3"><p>{preparationStatus}</p><button onClick={() => preparation.current?.abort()}>取消规划</button></div>}
              <p>
                当前状态：
                {data.config.published ? '已开放入组，材料冻结' : '未发布'}
                。入组后不能修改本批次材料和协议。
              </p>
              {!data.report.totalParticipants && (
                <>
                  <div className="study-row my-4">
                    <button
                      disabled={busy}
                      onClick={() => void prepare('/study/plant.svg')}
                    >
                      准备盆栽候选图
                    </button>
                    <button
                      disabled={busy || !data.config.plan}
                      onClick={() => {
                        setPrepared({
                          plan: data.config.plan!,
                          material: data.config.material!,
                        });
                      }}
                    >
                      查看已存材料
                    </button>
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
                </>
              )}
              {prepared && (
                <div className="my-5">
                  <p className="mb-3">绘画负担核对：{prepared.plan.strokes.length} 笔 / {PROTOCOL.timeLimitMs / 60000} 分钟。若跟完全部指导，平均每笔仅有 {(PROTOCOL.timeLimitMs / 1000 / Math.max(1, prepared.plan.strokes.length)).toFixed(2)} 秒（包括观察、换色和操作）。这是任务算术，不是完成能力的预测；请据真实预试决定材料是否适用。</p>
                  <div className="study-grid">
                    <div>
                      <h3 className="font-bold">两条件共用的参考图</h3>
                      <img
                        src={prepared.material}
                        alt="待审核任务图"
                        className="max-h-72 mx-auto border"
                      />
                    </div>
                    <div>
                      <h3 className="font-bold">计划回放预览</h3>
                      <svg
                        viewBox={`0 0 ${prepared.plan.width} ${prepared.plan.height}`}
                        className="mx-auto max-h-72 border bg-white"
                        role="img"
                        aria-label="全部规划笔触预览"
                      >
                        {[
                          ...prepared.plan.strokes.filter(
                            (s) => s.phase !== 'outline',
                          ),
                          ...prepared.plan.strokes.filter(
                            (s) => s.phase === 'outline',
                          ),
                        ].map((s) => (
                          <polyline
                            key={s.id}
                            points={s.points
                              .map((p) => `${p.x},${p.y}`)
                              .join(' ')}
                            stroke={s.color}
                            strokeWidth={s.width}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                          />
                        ))}
                      </svg>
                    </div>
                  </div>
                  <p>
                    最终 {prepared.plan.strokes.length} 笔：
                    {['outline', 'large_color', 'small_color', 'paint']
                      .map(
                        (phase, i) =>
                          `${['轮廓', '大色块', '小色块', '顺序笔触'][i]} ${prepared.plan.strokes.filter((s) => s.phase === phase).length}`,
                      )
                      .join(' / ')}
                  </p>
                  <p className="study-muted">
                    {prepared.plan.quality.notes.join(' ')}
                  </p>
                  <h3 className="my-3 font-bold">
                    10 项共同完成标准（第 1、4 项为主体必需项）
                  </h3>
                  {rubric.map((r, i) => (
                    <label key={i} className="mb-2">
                      {i + 1}
                      <input
                        className="w-full"
                        value={r}
                        maxLength={120}
                        onChange={(e) =>
                          setRubric((old) =>
                            old.map((v, j) => (i === j ? e.target.value : v)),
                          )
                        }
                      />
                    </label>
                  ))}
                  <label className="my-4">
                    <input
                      type="checkbox"
                      checked={reviewed}
                      onChange={(e) => setReviewed(e.target.checked)}
                    />
                    已核对任务图、完整预览、关键主体、单笔可执行性与独立评分清单
                  </label>
                  <button
                    disabled={
                      busy || !reviewed || !!data.report.totalParticipants
                    }
                    onClick={() =>
                      void run(() =>
                        api(
                          {
                            action: 'configure',
                            studyId,
                            ...prepared,
                            rubric,
                            materialReviewed: reviewed,
                          },
                          token,
                        ),
                      )
                    }
                  >
                    保存材料与计划
                  </button>
                </div>
              )}
              {!data.config.published && (
                <div className="mt-4">
                  {studyId.includes('formal') &&
                    Object.entries({
                      pilotReviewed: '6 人预试已复核，问题已处理',
                      backupRestored: '已实际执行备份恢复验证',
                      deviceChecked: '正式设备输入与两条件工具已核对',
                      protocolApproved: '导师/研究负责人已审核协议、题文和评分',
                    }).map(([k, label]) => (
                      <label key={k} className="my-2">
                        <input
                          type="checkbox"
                          checked={checks[k] || false}
                          onChange={(e) =>
                            setChecks((v) => ({ ...v, [k]: e.target.checked }))
                          }
                        />
                        {label}
                      </label>
                    ))}
                  <button
                    className="primary"
                    disabled={busy || !data.config.materialReviewed}
                    onClick={() =>
                      void run(() =>
                        api({ action: 'publish', studyId, checks }, token),
                      )
                    }
                  >
                    发布此研究批次
                  </button>
                </div>
              )}
            </section>
            <section className="study-card">
              <h2>参与测试入口</h2>
              <p>首页“参与测试”当前进入：{data.enrollmentTarget === 'novice-formal-v1' ? '正式测试' : '预试'}。参与者无需选择批次；已有参与者继续原批次。</p>
              <button disabled={busy || !data.config.published || data.enrollmentTarget === studyId} onClick={() => void run(() => api({ action: 'enrollmentTarget', studyId }, token))}>将当前批次设为参与测试入口</button>
              {!data.config.published && <p className="study-muted">请先完成材料审核并发布当前批次。</p>}
            </section>
            <GroupReport data={data.report} />
            <section className="study-card">
              <h2>配对、质量与纳入管理</h2>
              <div className="study-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>编号 / 顺序</th>
                      <th>A / B 状态</th>
                      <th>质量</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.report.pairs.map((p) => (
                      <tr key={p.pairId}>
                        <td>
                          {p.researchCode} / {p.order}
                          {p.withdrawnAt && '（已撤回）'}
                        </td>
                        <td>
                          {p.control?.state || '缺轮'} /{' '}
                          {p.guided?.state || '缺轮'}
                        </td>
                        <td>
                          {[
                            ...(p.control?.quality || []),
                            ...(p.guided?.quality || []),
                          ].join('、') || '未发现事件质量标记'}
                        </td>
                        <td>
                          <button onClick={() => setSelected(p.pairId)}>
                            查看配对
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            {pair && (
              <>
                <PairReport pair={pair} token={token} />
                <ResearcherInterview key={`${pair.pairId}-${pair.interviewRecordedAt ?? ''}`} pairId={pair.pairId} code={pair.researchCode} answers={pair.interview} token={token} available={!pair.withdrawnAt && !!pair.control?.post && !!pair.guided?.post} onSaved={() => load()} />
                {pair.interview && <p className="study-muted">访谈来源：{pair.interviewSource === 'researcher' ? '研究者口头访谈录入' : '参与者填写（历史流程）'}{pair.interviewRecordedAt ? ` · ${new Date(pair.interviewRecordedAt).toLocaleString()}` : ''}</p>}

                <section className="study-card">
                  <h2>按预设规则处理记录</h2>
                  {pair.withdrawnAt && (
                    <button
                      disabled={busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            '删除此撤回者的在线作品、会话和关联批次导出？离线备份仍需人工处理。',
                          )
                        )
                          void run(() =>
                            api(
                              {
                                action: 'purge_withdrawal',
                                pairId: pair.pairId,
                              },
                              token,
                            ),
                          );
                      }}
                    >
                      处理撤回并清除在线副本
                    </button>
                  )}
                  {[pair.control, pair.guided].map(
                    (s, i) =>
                      s && (
                        <div key={s.id} className="study-row my-3">
                          <span>
                            {i ? 'B' : 'A'} · 尝试 {s.attempt} · {s.inclusion}
                          </span>
                          {[
                            'include',
                            'exclude',
                            ...(s.state === 'technical_error'
                              ? ['retest']
                              : []),
                          ].map((action) => (
                            <button
                              key={action}
                              disabled={busy || !!pair.withdrawnAt}
                              onClick={() => {
                                const reason =
                                  window.prompt('请填写依据既定协议的处理原因');
                                if (reason)
                                  void run(() =>
                                    api(
                                      {
                                        action:
                                          action === 'retest'
                                            ? 'retest'
                                            : 'include',
                                        sessionId: s.id,
                                        decision: action,
                                        reason,
                                      },
                                      token,
                                    ),
                                  );
                              }}
                            >
                              {action === 'include'
                                ? '纳入'
                                : action === 'exclude'
                                  ? '排除'
                                  : '安排技术重测'}
                            </button>
                          ))}
                        </div>
                      ),
                  )}
                </section>
              </>
            )}
            <section className="study-card">
              <h2>研究版本与材料交接</h2>
              <p>保存当前材料原图、完整笔触计划、问卷、评分规则与能力配置。交接包不含参与者记录和口令，不替代数据备份，也不会自动发布研究。</p>
              <button disabled={busy || !data.config.plan || !data.config.material} onClick={() => void run(async () => {
                const item = await api<{ id: string }>({ action: 'handoffExport', studyId }, token);
                await load(); await downloadHandoff(item.id);
              })}>保存并下载版本交接包</button>
              {data.handoffs.map(item => <div className="my-3 rounded-xl border p-3" key={item.id}>
                <p>{item.status === 'draft' ? '草稿（不能作为正式冻结证明）' : item.status === 'published-pilot' ? '已发布预试配置' : '已发布正式配置'} · {item.createdAt}</p>
                <p className="break-all study-muted">文件 SHA-256：{item.sha256}</p>
                <button disabled={busy} onClick={() => void run(() => downloadHandoff(item.id))}>重新下载交接包</button>
              </div>)}
            </section>
            <section className="study-card">
              <h2>冻结分析快照与导出</h2>
              <p>
                保存版本化数据集、每条件“编号—时间—模式.json”、配对 JSON、CSV
                和文件哈希清单。未纳入与缺失情况仍保留供审计。
              </p>
              <button
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const result = await api<{ exportId: string }>(
                      { action: 'freeze', studyId },
                      token,
                    );
                    setExportId(result.exportId);
                  })
                }
              >
                冻结并生成后端导出文件
              </button>
              {exportId && (
                <div className="study-row mt-3">
                  <button onClick={() => void download('json')}>
                    下载完整 JSON
                  </button>
                  <button onClick={() => void download('csv')}>
                    下载一人一行 CSV
                  </button>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
