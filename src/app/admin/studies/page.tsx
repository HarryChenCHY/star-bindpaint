'use client';
/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useState } from 'react';
import { api, preparePlan } from '@/lib/study/client';
import { PROTOCOL, RUBRIC, type StrokePlan } from '@/lib/study/protocol';
import type { StudyConfig } from '@/lib/study/types';
import type { report } from '@/lib/study/server/service';
import { GroupReport, PairReport } from '@/components/study/StudyReport';
import ImageUploader from '@/components/ImageUploader';
import '../../study/study.css';
type Data = { config: StudyConfig; report: ReturnType<typeof report> };
export default function StudyAdminPage() {
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
  async function load() {
    const d = await api<Data>(
      undefined,
      token,
      `?action=admin&studyId=${studyId}`,
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
    setBusy(true);
    setError('');
    try {
      setPrepared(await preparePlan(url));
      setReviewed(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
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
  return (
    <div className="study-shell">
      <div className="study-wrap">
        <nav className="study-row mb-6">
          <Link href="/study">← 测试入口</Link>
          <Link href="/rater">匿名评分工作台</Link>
          <Link href="/admin/analytics">体验统计</Link>
        </nav>
        <h1>研究工作台</h1>
        <p className="study-muted">
          协议 {PROTOCOL.version} · 每轮 12 分钟 · 简化画 ≤ 200 笔 ·
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
              <h2>材料与发布</h2>
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
                  <div className="study-grid">
                    <div>
                      <h3 className="font-bold">两条件共用的简化图</h3>
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
                    {['outline', 'large_color', 'small_color']
                      .map(
                        (phase, i) =>
                          `${['轮廓', '大色块', '小色块'][i]} ${prepared.plan.strokes.filter((s) => s.phase === phase).length}`,
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
                          {p.participantId} / {p.order}
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
