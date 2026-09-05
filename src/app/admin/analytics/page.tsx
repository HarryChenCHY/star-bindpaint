'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  BarChart3,
  Brush,
  Clock3,
  Database,
  Download,
  LockKeyhole,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface ResearchSession {
  participantId: string;
  sessionId: string;
  startedAt: string | null;
  durationSec: number;
  outcome: string;
  initialMode: string;
  finalMode: string;
  guidanceLevel: string;
  difficulty: string;
  totalStrokes: number;
  manualAttemptCount: number | null;
  manualAcceptedCount: number;
  manualRejectedCount: number | null;
  aiRenderedCount: number;
  skippedStrokes: number;
  firstStrokeLatencySec: number | null;
  manualContributionRate: number | null;
  aiAssistanceRate: number | null;
  contentCoverageRate: number | null;
  averageStartIntervalSec: number | null;
  averageStrokeDurationSec: number | null;
  autoStartCount: number;
  schemaVersion: number;
  dataQuality: string;
  studyCondition: string;
  sessionKind: string;
  studyPhase: string;
}

interface StatsData {
  date: string;
  total: number;
  sessions: ResearchSession[];
  summary: {
    totalSessions: number;
    startedSessions: number;
    completedSessions: number;
    startRate: number | null;
    completionRate: number | null;
    avgDurationSec: number | null;
    avgFirstStrokeLatencySec: number | null;
    avgManualContributionRate: number | null;
    avgAiAssistanceRate: number | null;
    avgContentCoverageRate: number | null;
    avgManualAcceptedCount: number | null;
    byOutcome: Record<string, number>;
    byInitialMode: Record<string, number>;
    byGuidance: Record<string, number>;
    byDifficulty: Record<string, number>;
    legacyRecords: number;
  };
}

const OUTCOME_LABEL: Record<string, string> = {
  completed: '完成作品',
  abandoned: '中途离开',
  in_progress: '进行中',
  legacy_unknown: '旧记录·未知',
};

const GUIDANCE_LABEL: Record<string, string> = {
  full: '完整引导',
  balanced: '平衡引导',
  light: '轻量引导',
  unknown: '未记录',
};

function localDateKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function display(value: number | null, suffix = '', digits = 0) {
  return value === null ? '—' : `${value.toFixed(digits)}${suffix}`;
}

export default function AnalyticsDashboard() {
  const [date, setDate] = useState(localDateKey);
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [adminToken, setAdminToken] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [tokenReady, setTokenReady] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('startrace-admin-token') || '';
    setAdminToken(stored);
    setTokenInput(stored);
    setTokenReady(true);
  }, []);

  const fetchData = useCallback(async (selectedDate: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/analytics/stats?date=${encodeURIComponent(selectedDate)}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || '查询失败');
      setData(json);
    } catch (requestError) {
      setData(null);
      setError(requestError instanceof Error ? requestError.message : '查询失败');
    } finally {
      setLoading(false);
    }
  }, [adminToken]);

  useEffect(() => {
    if (!tokenReady || !adminToken) return;
    const timer = window.setTimeout(() => fetchData(date), 0);
    return () => window.clearTimeout(timer);
  }, [adminToken, date, fetchData, tokenReady]);

  const unlock = () => {
    const nextToken = tokenInput.trim();
    if (!nextToken) return;
    sessionStorage.setItem('startrace-admin-token', nextToken);
    setAdminToken(nextToken);
  };

  const lock = () => {
    sessionStorage.removeItem('startrace-admin-token');
    setAdminToken('');
    setTokenInput('');
    setData(null);
    setError('');
  };

  const exportCsv = () => {
    if (!data?.sessions.length) return;
    const columns: Array<[keyof ResearchSession, string]> = [
      ['participantId', 'participant_id'],
      ['sessionId', 'session_id'],
      ['startedAt', 'started_at_cst'],
      ['outcome', 'outcome'],
      ['durationSec', 'duration_sec'],
      ['initialMode', 'initial_mode'],
      ['finalMode', 'final_mode'],
      ['guidanceLevel', 'guidance_level'],
      ['totalStrokes', 'planned_strokes'],
      ['manualAttemptCount', 'manual_attempts'],
      ['manualAcceptedCount', 'manual_accepted'],
      ['manualRejectedCount', 'manual_rejected'],
      ['aiRenderedCount', 'ai_rendered'],
      ['skippedStrokes', 'skipped'],
      ['firstStrokeLatencySec', 'first_stroke_latency_sec'],
      ['manualContributionRate', 'manual_contribution_pct'],
      ['aiAssistanceRate', 'ai_assistance_pct'],
      ['contentCoverageRate', 'content_coverage_pct'],
      ['schemaVersion', 'schema_version'],
      ['dataQuality', 'data_quality'],
      ['studyCondition', 'study_condition'],
      ['sessionKind', 'session_kind'],
      ['studyPhase', 'study_phase'],
    ];
    const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const rows = [
      columns.map(([, label]) => escape(label)).join(','),
      ...data.sessions.map(session => columns.map(([key]) => escape(session[key])).join(',')),
    ];
    const blob = new Blob([`\uFEFF${rows.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `startrace-sessions-${data.date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const summary = data?.summary;

  if (!tokenReady) return <main className="min-h-screen bg-[#F6F7FB]" />;

  if (!adminToken) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F6F7FB] px-4 pb-24">
        <section className="w-full max-w-md rounded-[1.8rem] border-2 border-[#17233F] bg-white p-6 shadow-[7px_7px_0_#B8ADF3] sm:p-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-[#17233F] bg-[#ECEAFE]"><LockKeyhole size={23} strokeWidth={2.8} /></span>
          <p className="mt-5 text-[10px] font-black tracking-[0.14em] text-[#6558D9]">PROTECTED RESEARCH CONSOLE</p>
          <h1 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[#17233F]">研究数据后台</h1>
          <p className="mt-3 text-sm font-bold leading-6 text-[#65708A]">请输入服务器配置的访问口令。口令只保存在当前标签页，关闭浏览器后自动清除。</p>
          <input type="password" value={tokenInput} onChange={event => setTokenInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') unlock(); }} autoComplete="current-password" placeholder="访问口令" className="mt-5 w-full rounded-2xl border-2 border-[#17233F] bg-[#F6F7FB] px-4 py-3 text-sm font-black text-[#17233F] outline-none focus:shadow-[3px_3px_0_#FFD166]" />
          <button type="button" onClick={unlock} disabled={!tokenInput.trim()} className="mt-3 w-full rounded-full border-2 border-[#17233F] bg-[#17233F] px-5 py-3 text-sm font-black text-white shadow-[4px_4px_0_#69D2C2] disabled:opacity-40">进入后台</button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F6F7FB] px-4 pb-28 pt-7 sm:px-8 sm:pt-10">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-[1.8rem] border-2 border-[#17233F] bg-[#ECEAFE] p-5 shadow-[7px_7px_0_#6558D9] sm:p-7">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black tracking-[0.14em] text-[#6558D9]"><Sparkles size={15} strokeWidth={2.8} /> RESEARCH CONSOLE</div>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.045em] text-[#17233F] sm:text-4xl">星迹智绘 · 研究数据</h1>
              <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-[#4D5870]">区分真实动笔、AI 辅助与画面覆盖，服务于零基础绘画入门研究。旧版数据只标记为技术验证样本。</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input type="date" value={date} onChange={event => setDate(event.target.value)} className="rounded-full border-2 border-[#17233F] bg-white px-4 py-2.5 text-xs font-black text-[#17233F]" />
              <button type="button" onClick={() => fetchData(date)} className="flex items-center gap-2 rounded-full border-2 border-[#17233F] bg-white px-4 py-2.5 text-xs font-black text-[#17233F] shadow-[3px_3px_0_#FFD166]">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> 刷新
              </button>
              <button type="button" onClick={exportCsv} disabled={!data?.sessions.length} className="flex items-center gap-2 rounded-full border-2 border-[#17233F] bg-[#17233F] px-4 py-2.5 text-xs font-black text-white shadow-[3px_3px_0_#69D2C2] disabled:opacity-40">
                <Download size={14} /> 导出 CSV
              </button>
              <button type="button" onClick={lock} className="flex items-center gap-2 rounded-full border-2 border-[#17233F] bg-white px-4 py-2.5 text-xs font-black text-[#17233F]"><LogOut size={14} /> 锁定</button>
            </div>
          </div>
        </header>

        {error && (
          <div className="mt-6 rounded-2xl border-2 border-[#17233F] bg-[#FFF0F5] p-4 text-sm font-black text-[#A61E55]">{error}</div>
        )}

        {loading && !summary && <div className="mt-10 text-center text-sm font-black text-[#65708A]">正在读取匿名会话数据…</div>}

        {summary && (
          <>
            <section className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-5">
              <SummaryCard icon={Database} color="#B8ADF3" label="进入画板" value={String(summary.totalSessions)} hint="全部会话" />
              <SummaryCard icon={Activity} color="#69D2C2" label="实际动笔率" value={display(summary.startRate, '%')} hint={`${summary.startedSessions} 次有画布输入`} />
              <SummaryCard icon={Clock3} color="#FFD166" label="平均首次动笔" value={display(summary.avgFirstStrokeLatencySec, ' 秒', 1)} hint="仅计算已动笔会话" />
              <SummaryCard icon={Brush} color="#FF8FAB" label="平均亲手完成" value={display(summary.avgManualContributionRate, '%', 1)} hint="亲手 / 规划星迹" />
              <SummaryCard icon={Sparkles} color="#F9B801" label="平均 AI 辅助" value={display(summary.avgAiAssistanceRate, '%', 1)} hint="自动 / 规划星迹" />
            </section>

            <section className="mt-6 grid gap-5 lg:grid-cols-2">
              <DistributionCard title="会话结果" data={summary.byOutcome} labels={OUTCOME_LABEL} total={summary.totalSessions} color="#69D2C2" />
              <DistributionCard title="初始引导等级" data={summary.byGuidance} labels={GUIDANCE_LABEL} total={summary.totalSessions} color="#B8ADF3" />
            </section>

            <section className="mt-6 rounded-[1.7rem] border-2 border-[#17233F] bg-white p-5 shadow-[6px_6px_0_#FFD166] sm:p-6">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <p className="text-[10px] font-black tracking-[0.12em] text-[#6558D9]">SESSION-LEVEL DATA</p>
                  <h2 className="mt-1 text-xl font-black text-[#17233F]">匿名会话明细</h2>
                </div>
                <p className="text-xs font-bold text-[#65708A]">{data.sessions.length} 条 · 旧数据 {summary.legacyRecords} 条</p>
              </div>
              {data.sessions.length === 0 ? (
                <div className="mt-6 rounded-2xl bg-[#F6F7FB] p-8 text-center text-sm font-bold text-[#65708A]">这一天还没有研究记录。</div>
              ) : (
                <div className="mt-5 max-h-[520px] overflow-auto rounded-2xl border-2 border-[#17233F]">
                  <table className="w-full min-w-[1080px] border-collapse text-left text-xs">
                    <thead className="sticky top-0 bg-[#17233F] text-white">
                      <tr>{['参与编号', '会话 ID', '结果', '首次动笔', '亲手笔触', 'AI 笔触', '亲手率', 'AI 率', '覆盖率', '引导', '研究阶段', '质量'].map(label => <th key={label} className="px-3 py-3 font-black">{label}</th>)}</tr>
                    </thead>
                    <tbody>
                      {data.sessions.map(session => (
                        <tr key={session.sessionId} className="border-t border-[#DDE1EA] odd:bg-white even:bg-[#F6F7FB]">
                          <td className="px-3 py-3 font-mono text-[10px] text-[#65708A]">{session.participantId.slice(0, 10)}</td>
                          <td className="px-3 py-3 font-mono text-[10px] text-[#65708A]">{session.sessionId.slice(0, 12)}</td>
                          <td className="px-3 py-3 font-black">{OUTCOME_LABEL[session.outcome] || session.outcome}</td>
                          <td className="px-3 py-3">{display(session.firstStrokeLatencySec, 's', 1)}</td>
                          <td className="px-3 py-3 font-black">{session.manualAcceptedCount}</td>
                          <td className="px-3 py-3">{session.aiRenderedCount}</td>
                          <td className="px-3 py-3">{display(session.manualContributionRate, '%', 1)}</td>
                          <td className="px-3 py-3">{display(session.aiAssistanceRate, '%', 1)}</td>
                          <td className="px-3 py-3">{display(session.contentCoverageRate, '%', 1)}</td>
                          <td className="px-3 py-3">{GUIDANCE_LABEL[session.guidanceLevel] || session.guidanceLevel}</td>
                          <td className="px-3 py-3">{session.studyPhase}</td>
                          <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-[9px] font-black ${session.dataQuality === 'legacy' ? 'bg-[#FFF0D6] text-[#8A5600]' : 'bg-[#E4F7F2] text-[#13786B]'}`}>{session.dataQuality}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.6rem] border-2 border-[#17233F] bg-[#FFF7D9] p-5">
                <div className="flex items-center gap-2"><BarChart3 size={19} strokeWidth={2.8} /><h3 className="font-black text-[#17233F]">统计边界</h3></div>
                <p className="mt-3 text-xs font-bold leading-5 text-[#4D5870]">当前面板描述交互行为，不直接证明绘画能力提升。因果结论需加入对照条件、统一任务、前后测与迁移任务。</p>
              </div>
              <div className="rounded-[1.6rem] border-2 border-[#17233F] bg-[#E4F7F2] p-5">
                <div className="flex items-center gap-2"><ShieldCheck size={19} strokeWidth={2.8} /><h3 className="font-black text-[#17233F]">导出边界</h3></div>
                <p className="mt-3 text-xs font-bold leading-5 text-[#4D5870]">CSV 不包含作品图片、原图路径、坐标与颜色。产品端默认不采集，只有主动同意后才关联随机匿名编号，并支持撤回与删除。</p>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function SummaryCard({ icon: Icon, color, label, value, hint }: { icon: typeof Database; color: string; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-[1.4rem] border-2 border-[#17233F] bg-white p-4 shadow-[4px_4px_0_#17233F]">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[#17233F]" style={{ background: color }}><Icon size={18} strokeWidth={2.8} /></span>
      <p className="mt-3 text-2xl font-black tracking-[-0.04em] text-[#17233F]">{value}</p>
      <p className="mt-1 text-xs font-black text-[#35415D]">{label}</p>
      <p className="mt-1 text-[9px] font-bold text-[#8E98AD]">{hint}</p>
    </div>
  );
}

function DistributionCard({ title, data, labels, total, color }: { title: string; data: Record<string, number>; labels: Record<string, string>; total: number; color: string }) {
  return (
    <div className="rounded-[1.6rem] border-2 border-[#17233F] bg-white p-5 shadow-[5px_5px_0_#17233F]">
      <h3 className="text-sm font-black text-[#17233F]">{title}</h3>
      <div className="mt-4 space-y-3">
        {Object.keys(data).length === 0 && <p className="text-xs font-bold text-[#8E98AD]">暂无数据</p>}
        {Object.entries(data).map(([key, count]) => (
          <div key={key} className="grid grid-cols-[92px_1fr_28px] items-center gap-2 text-xs">
            <span className="truncate font-black text-[#4D5870]">{labels[key] || key}</span>
            <div className="h-5 overflow-hidden rounded-full border border-[#C8CEDA] bg-[#F6F7FB]"><div className="h-full rounded-full" style={{ width: `${total > 0 ? count / total * 100 : 0}%`, minWidth: count > 0 ? 10 : 0, background: color }} /></div>
            <span className="text-right font-black text-[#17233F]">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
