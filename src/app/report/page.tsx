'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Brush,
  CalendarDays,
  ChevronLeft,
  Clock3,
  Database,
  Route,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import MoonCompanion from '@/components/MoonCompanion';
import { loadGallery } from '@/lib/gallery-store';
import {
  buildLocalLearningFeedback,
  deriveLearningMetrics,
  RESEARCH_METRIC_DEFINITIONS,
} from '@/lib/learning-feedback';
import type { PaintingSession } from '@/lib/painting-tracker';
import { getPracticeOverview, PracticeOverview } from '@/lib/practice-store';

type NarrativeStatus = 'idle' | 'loading' | 'ready' | 'local';

const GUIDANCE_LABEL: Record<string, string> = {
  full: '完整引导',
  balanced: '平衡引导',
  light: '轻量引导',
};

function formatPercent(value: number | null) {
  return value === null ? '—' : `${Math.round(value)}%`;
}

function formatSeconds(value: number | null) {
  return value === null ? '未记录' : `${Math.round(value)} 秒`;
}

export default function ReportPage() {
  const router = useRouter();
  const [session, setSession] = useState<PaintingSession | null>(null);
  const [artwork, setArtwork] = useState('');
  const [overview, setOverview] = useState<PracticeOverview | null>(null);
  const [narrative, setNarrative] = useState('');
  const [narrativeStatus, setNarrativeStatus] = useState<NarrativeStatus>('idle');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setOverview(getPracticeOverview());

      const stored = sessionStorage.getItem('star-bindpaint-session');
      if (!stored) return;

      try {
        const parsed = JSON.parse(stored) as PaintingSession;
        setSession(parsed);

        const galleryId = sessionStorage.getItem('star-bindpaint-report-gallery-id');
        const galleryArtwork = galleryId
          ? loadGallery().find(item => item.id === galleryId)?.imageDataUrl
          : loadGallery()[0]?.imageDataUrl;
        setArtwork(parsed.finalImageBase64 || galleryArtwork || '');

        const metrics = deriveLearningMetrics(parsed);
        const work = parsed.masterwork
          ? `${parsed.masterwork.artist}《${parsed.masterwork.title}》`
          : parsed.mode === 'free' ? '自由创作' : '自选参考图练习';
        setNarrativeStatus('loading');
        fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ metrics, work }),
        })
          .then(async response => {
            if (!response.ok) throw new Error('optional narrative unavailable');
            return response.json();
          })
          .then(data => {
            if (typeof data.report === 'string' && data.report.trim()) {
              setNarrative(data.report.trim());
              setNarrativeStatus('ready');
            } else {
              setNarrativeStatus('local');
            }
          })
          .catch(() => setNarrativeStatus('local'));
      } catch {
        sessionStorage.removeItem('star-bindpaint-session');
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const metrics = useMemo(() => session ? deriveLearningMetrics(session) : null, [session]);
  const feedback = useMemo(() => metrics ? buildLocalLearningFeedback(metrics) : null, [metrics]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-white pb-28">
      <div className="pointer-events-none absolute inset-0 opacity-60" style={{ backgroundImage: 'radial-gradient(#6558D9 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
      <div className="pointer-events-none absolute -left-20 top-32 h-64 w-64 rounded-full bg-[#FFD166]/35 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-8 h-72 w-72 rounded-full bg-[#69D2C2]/30 blur-3xl" />

      <header className="relative z-10 flex items-center justify-between border-b-2 border-[#17233F] bg-white/90 px-4 py-4 backdrop-blur-sm sm:px-8">
        <button type="button" onClick={() => router.push('/gallery')} className="flex items-center gap-1 rounded-full border-2 border-[#17233F] bg-white px-4 py-2 text-xs font-black text-[#17233F] shadow-[3px_3px_0_#17233F]">
          <ChevronLeft size={16} strokeWidth={3} /> 星图
        </button>
        <div className="flex items-center gap-2 text-[#17233F]">
          <Sparkles size={18} color="#6558D9" strokeWidth={2.8} />
          <h1 className="text-base font-black tracking-[-0.04em] sm:text-xl">星迹学习反馈</h1>
        </div>
        <span className="hidden rounded-full border-2 border-[#17233F] bg-[#ECEAFE] px-3 py-1.5 text-[10px] font-black tracking-[0.08em] text-[#6558D9] sm:block">LEARNING LOG</span>
        <span className="w-16 sm:hidden" />
      </header>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-7 sm:px-8 sm:py-10">
        {!session || !metrics || !feedback ? (
          <EmptyReport overview={overview} onStart={() => router.push('/create')} />
        ) : (
          <>
            <section className="grid gap-5 lg:grid-cols-[0.78fr_1.22fr]">
              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="rounded-[1.8rem] border-2 border-[#17233F] bg-white p-4 shadow-[7px_7px_0_#6558D9] sm:p-5">
                <div className="relative aspect-square overflow-hidden rounded-[1.25rem] border-2 border-[#17233F] bg-[#F6F7FB]">
                  {artwork ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={artwork} alt="本次绘画作品" className="h-full w-full object-contain" />
                  ) : (
                    <div className="flex h-full items-center justify-center px-8 text-center text-sm font-bold text-[#65708A]">作品图像没有保存在当前设备，但过程数据仍可查看。</div>
                  )}
                  <span className="absolute left-3 top-3 rounded-full border-2 border-[#17233F] bg-[#FFD166] px-3 py-1 text-[10px] font-black text-[#17233F]">
                    {GUIDANCE_LABEL[metrics.guidanceLevel || 'full']}
                  </span>
                </div>
                <div className="mt-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black tracking-[0.12em] text-[#6558D9]">本次作品</p>
                    <h2 className="mt-1 text-lg font-black tracking-[-0.03em] text-[#17233F]">
                      {session.masterwork ? `${session.masterwork.artist}《${session.masterwork.title}》` : session.mode === 'free' ? '自由星域创作' : '自选参考图练习'}
                    </h2>
                  </div>
                  <span className="rounded-full bg-[#E4F7F2] px-3 py-1.5 text-[10px] font-black text-[#13786B]">已记录</span>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="flex flex-col gap-5">
                <div className="rounded-[1.8rem] border-2 border-[#17233F] bg-[#ECEAFE] p-5 shadow-[7px_7px_0_#FFD166] sm:p-7">
                  <div className="mb-5 rounded-[1.25rem] border-2 border-[#17233F] bg-white p-4">
                    <MoonCompanion state="cheering" compact message="我只根据这次真实的动笔记录提供反馈，不给作品或能力打分。" />
                  </div>
                  <p className="text-[10px] font-black tracking-[0.14em] text-[#6558D9]">{feedback.eyebrow}</p>
                  <h2 className="mt-2 text-2xl font-black leading-tight tracking-[-0.045em] text-[#17233F] sm:text-3xl">{feedback.headline}</h2>
                  <div className="mt-5 space-y-3">
                    {feedback.observations.map((observation, index) => (
                      <div key={observation} className="flex gap-3 rounded-2xl border-2 border-[#17233F] bg-white p-3.5 text-sm font-bold leading-6 text-[#35415D]">
                        <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[#FFD166] text-[11px] font-black text-[#17233F]">{index + 1}</span>
                        <p>{observation}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-2xl border-2 border-[#17233F] bg-[#17233F] p-4 text-white">
                    <p className="text-[9px] font-black tracking-[0.13em] text-[#FFD166]">下一颗星点</p>
                    <p className="mt-1.5 text-sm font-bold leading-6">{feedback.nextStep}</p>
                  </div>
                </div>
              </motion.div>
            </section>

            <section className="mt-8">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black tracking-[0.14em] text-[#6558D9]">可解释数据</p>
                  <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-[#17233F]">这次是怎样完成的</h2>
                </div>
                <p className="hidden max-w-sm text-right text-xs font-bold leading-5 text-[#65708A] sm:block">画面完成与亲手练习分开计算，AI 续画不会被记作你的笔触。</p>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <MetricCard icon={Clock3} color="#FFD166" label="首次动笔时延" value={formatSeconds(metrics.firstStrokeLatencySec)} hint="画布就绪 → 首次输入" />
                <MetricCard icon={Brush} color="#69D2C2" label="亲手完成率" value={formatPercent(metrics.manualContributionRate)} hint={`${metrics.userStrokes} 条亲手笔触`} />
                <MetricCard icon={Sparkles} color="#FF8FAB" label="AI 辅助率" value={formatPercent(metrics.aiAssistanceRate)} hint={`${metrics.aiAssistedStrokes} 条自动笔触`} />
                <MetricCard icon={Route} color="#B8ADF3" label="内容覆盖率" value={formatPercent(metrics.completionRate)} hint={`${metrics.accountedStrokes} / ${metrics.totalStrokes || metrics.accountedStrokes} 条星迹`} />
              </div>
            </section>

            <section className="mt-8 grid gap-5 lg:grid-cols-[1fr_1fr]">
              <div className="rounded-[1.7rem] border-2 border-[#17233F] bg-white p-5 shadow-[6px_6px_0_#69D2C2] sm:p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#17233F] bg-[#69D2C2]"><CalendarDays size={20} strokeWidth={2.8} /></span>
                  <div>
                    <p className="text-[10px] font-black tracking-[0.12em] text-[#65708A]">本设备累计</p>
                    <h3 className="text-lg font-black text-[#17233F]">动笔星图</h3>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2">
                  <SmallStat value={String(overview?.totalPracticeStarts ?? 0)} label="实际动笔" />
                  <SmallStat value={`${overview?.activeDaysLast7 ?? 0} 天`} label="近 7 天活跃" />
                  <SmallStat value={String(overview?.totalUserStrokes ?? 0)} label="通过笔触" />
                </div>
                <p className="mt-4 text-xs font-bold leading-5 text-[#65708A]">这里是设备内的纵向记录。正式研究需在知情同意后使用匿名参与者编号，并预先确定“有效练习”的判定标准。</p>
              </div>

              <div className="rounded-[1.7rem] border-2 border-[#17233F] bg-white p-5 shadow-[6px_6px_0_#FF8FAB] sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#17233F] bg-[#FF8FAB]"><Sparkles size={20} strokeWidth={2.8} /></span>
                    <div>
                      <p className="text-[10px] font-black tracking-[0.12em] text-[#65708A]">可选文字说明</p>
                      <h3 className="text-lg font-black text-[#17233F]">月亮伙伴补充</h3>
                    </div>
                  </div>
                  <span className="rounded-full bg-[#F6F7FB] px-3 py-1 text-[9px] font-black text-[#65708A]">
                    {narrativeStatus === 'ready' ? 'AI 已生成' : narrativeStatus === 'loading' ? '整理中' : '本地反馈'}
                  </span>
                </div>
                <p className="mt-5 text-sm font-bold leading-7 text-[#35415D]">
                  {narrative || (narrativeStatus === 'loading'
                    ? '月亮伙伴正在把客观指标整理成更易读的说明。上方反馈已经可以正常使用。'
                    : '当前未连接文字生成服务。上方的本地反馈由客观指标直接生成，功能不受影响。')}
                </p>
              </div>
            </section>

            <details className="mt-8 rounded-[1.7rem] border-2 border-[#17233F] bg-white shadow-[6px_6px_0_#B8ADF3]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 sm:p-6">
                <span className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#17233F] bg-[#B8ADF3]"><Database size={20} strokeWidth={2.8} /></span>
                  <span><span className="block text-[10px] font-black tracking-[0.12em] text-[#6558D9]">THESIS METRICS</span><span className="block text-lg font-black text-[#17233F]">论文研究指标口径</span></span>
                </span>
                <span className="text-xs font-black text-[#65708A]">展开查看</span>
              </summary>
              <div className="grid gap-3 border-t-2 border-[#17233F] p-5 sm:grid-cols-2 sm:p-6">
                {RESEARCH_METRIC_DEFINITIONS.map(item => (
                  <div key={item.key} className="rounded-2xl bg-[#F6F7FB] p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-black text-[#17233F]">{item.label}</h4>
                      <span className="rounded-full bg-white px-2 py-1 text-[9px] font-black text-[#6558D9]">{item.role}</span>
                    </div>
                    <p className="mt-2 text-xs font-bold leading-5 text-[#65708A]">{item.definition}</p>
                  </div>
                ))}
              </div>
            </details>

            <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-[1.5rem] border-2 border-[#17233F] bg-[#FFF7D9] p-5 sm:flex-row">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 flex-none text-[#17233F]" size={22} strokeWidth={2.7} />
                <p className="max-w-2xl text-xs font-bold leading-5 text-[#4D5870]">反馈用于回顾练习过程，不构成绘画能力评分、心理判断或产品有效性的因果结论。论文结论仍需通过对照实验、前后测与统计分析验证。</p>
              </div>
              <button type="button" onClick={() => router.push('/create')} className="flex flex-none items-center gap-2 rounded-full border-2 border-[#17233F] bg-[#17233F] px-5 py-3 text-xs font-black text-white shadow-[3px_3px_0_#FF8FAB]">再画一幅 <ArrowRight size={15} strokeWidth={2.8} /></button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function MetricCard({ icon: Icon, color, label, value, hint }: { icon: typeof Clock3; color: string; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-[1.45rem] border-2 border-[#17233F] bg-white p-4 shadow-[4px_4px_0_#17233F] sm:p-5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[#17233F]" style={{ background: color }}><Icon size={18} strokeWidth={2.8} /></span>
      <p className="mt-4 text-2xl font-black tracking-[-0.04em] text-[#17233F]">{value}</p>
      <p className="mt-1 text-xs font-black text-[#35415D]">{label}</p>
      <p className="mt-1 text-[10px] font-bold text-[#8E98AD]">{hint}</p>
    </div>
  );
}

function SmallStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-[#F6F7FB] p-3 text-center">
      <p className="text-lg font-black tracking-[-0.04em] text-[#17233F]">{value}</p>
      <p className="mt-1 text-[9px] font-black tracking-[0.06em] text-[#65708A]">{label}</p>
    </div>
  );
}

function EmptyReport({ overview, onStart }: { overview: PracticeOverview | null; onStart: () => void }) {
  return (
    <section className="mx-auto mt-8 max-w-2xl rounded-[2rem] border-2 border-[#17233F] bg-[#ECEAFE] p-6 text-center shadow-[8px_8px_0_#FFD166] sm:p-10">
      <div className="mx-auto max-w-sm rounded-[1.4rem] border-2 border-[#17233F] bg-white p-5">
        <MoonCompanion state="idle" message="完成并保存一幅作品后，我会在这里整理你的真实动笔记录。" />
      </div>
      <h2 className="mt-7 text-2xl font-black tracking-[-0.04em] text-[#17233F]">还没有可回顾的练习</h2>
      <p className="mx-auto mt-3 max-w-md text-sm font-bold leading-6 text-[#65708A]">学习反馈会区分亲手笔触与 AI 续画，并记录首次动笔时延。它不评价画得像不像。</p>
      {(overview?.totalSessions ?? 0) > 0 && <p className="mt-3 text-xs font-black text-[#6558D9]">本设备已有 {overview?.totalSessions} 次历史练习，但当前会话没有过程数据。</p>}
      <button type="button" onClick={onStart} className="mt-7 inline-flex items-center gap-2 rounded-full border-2 border-[#17233F] bg-[#17233F] px-6 py-3 text-sm font-black text-white shadow-[4px_4px_0_#FF8FAB]">从一颗星点开始 <ArrowRight size={16} strokeWidth={2.8} /></button>
    </section>
  );
}
