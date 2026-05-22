'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { StarChar, FlowerChar, BlobChar, MiniStar, MiniCircle } from '@/components/Characters';

const chapters = [
  { id: 'overview',    label: '产品概述',  num: '01', color: '#F9B801' },
  { id: 'mission',     label: '公益使命',  num: '02', color: '#F302C9' },
  { id: 'interaction', label: '核心交互',  num: '03', color: '#7DC353' },
  { id: 'asd-design',  label: 'ASD 专项',  num: '04', color: '#7A51EC' },
  { id: 'workflow',    label: '使用流程',  num: '05', color: '#7BA7CC' },
  { id: 'image-gen',   label: '混元生图',  num: '06', color: '#F9B801' },
  { id: 'llm-report',  label: '混元大模型',num: '07', color: '#F302C9' },
  { id: 'algorithm',   label: '笔触算法',  num: '08', color: '#7DC353' },
  { id: 'partners',    label: '合作落地',  num: '09', color: '#7A51EC' },
];

/* ── Scroll-to helper ─────────────────────────── */
function scrollTo(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const y = el.getBoundingClientRect().top + window.scrollY - 80;
  window.scrollTo({ top: y, behavior: 'smooth' });
}

/* ── Animated stroke demo ─────────────────────── */
function StrokeDemoSVG() {
  return (
    <svg viewBox="0 0 200 80" className="w-full" style={{ maxWidth: 360 }}>
      <motion.path
        d="M10 60 Q40 20 80 45 Q120 68 160 30 Q185 10 195 20"
        stroke="#7A51EC" strokeWidth="4" fill="none" strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 2, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1 }}
      />
      <motion.path
        d="M10 40 Q50 65 90 38 Q130 12 170 50 Q185 62 195 55"
        stroke="#F302C9" strokeWidth="3" fill="none" strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 2.2, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1, delay: 0.4 }}
      />
      <motion.path
        d="M15 70 Q55 45 95 62 Q140 78 180 42"
        stroke="#F9B801" strokeWidth="3.5" fill="none" strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 1.8, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1, delay: 0.8 }}
      />
    </svg>
  );
}

/* ── Multi-layer painting animation ───────────────── */
function MultiLayerSVG() {
  // Simulates coarse-to-fine layers: big strokes first, small strokes later
  const strokes = [
    // Layer 1 - coarse (thick, short)
    { d: 'M20 80 Q50 70 80 75', w: 8, color: '#F9B801', delay: 0 },
    { d: 'M60 30 Q100 20 140 35', w: 7, color: '#7A51EC', delay: 0.2 },
    { d: 'M120 70 Q150 60 180 65', w: 8, color: '#F302C9', delay: 0.4 },
    // Layer 2 - medium
    { d: 'M30 55 Q55 45 75 50', w: 4, color: '#7DC353', delay: 0.8 },
    { d: 'M90 50 Q115 42 135 48', w: 4, color: '#F9B801', delay: 1.0 },
    { d: 'M145 40 Q165 35 180 42', w: 3.5, color: '#7A51EC', delay: 1.2 },
    // Layer 3 - fine (thin, detail)
    { d: 'M40 90 Q55 85 70 88', w: 2, color: '#F302C9', delay: 1.6 },
    { d: 'M100 85 Q115 80 130 83', w: 1.8, color: '#7DC353', delay: 1.8 },
    { d: 'M155 90 Q168 86 180 88', w: 2, color: '#F9B801', delay: 2.0 },
  ];
  return (
    <svg viewBox="0 0 200 110" className="w-full" style={{ maxWidth: 360, background: '#F5F5F5', borderRadius: 12 }}>
      {strokes.map((s, i) => (
        <motion.path key={i} d={s.d} stroke={s.color} strokeWidth={s.w} fill="none" strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: s.delay, duration: 0.6, ease: 'easeOut', repeat: Infinity, repeatDelay: 3 }}
        />
      ))}
      {/* Layer labels */}
      <text x="5" y="12" fontSize="7" fill="#888888" fontWeight="700">粗 → 细</text>
    </svg>
  );
}

/* ── Error-driven region detection animation ─────────────── */
function ErrorRegionSVG() {
  // Shows high-error regions being detected and painted
  const regions = [
    { x: 30, y: 25, w: 35, h: 30, delay: 0, color: '#F9B801' },
    { x: 80, y: 45, w: 40, h: 35, delay: 0.3, color: '#F302C9' },
    { x: 135, y: 20, w: 30, h: 40, delay: 0.6, color: '#7DC353' },
    { x: 50, y: 70, w: 45, h: 25, delay: 0.9, color: '#7A51EC' },
    { x: 130, y: 70, w: 35, h: 30, delay: 1.2, color: '#F9B801' },
  ];
  return (
    <svg viewBox="0 0 200 110" className="w-full" style={{ maxWidth: 360, background: '#F5F5F5', borderRadius: 12 }}>
      {regions.map((r, i) => (
        <motion.rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx="4"
          fill={r.color} fillOpacity="0.2" stroke={r.color} strokeWidth="1.5" strokeDasharray="3 2"
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: r.delay, duration: 0.4, repeat: Infinity, repeatDelay: 3 }}
        />
      ))}
      <text x="10" y="108" fontSize="7" fill="#888888" fontWeight="700">误差检测 → 局部修补</text>
    </svg>
  );
}

/* ── Catmull-Rom curve demo ───────────────────── */
function CatmullRomSVG() {
  return (
    <svg viewBox="0 0 200 110" className="w-full" style={{ maxWidth: 360, background: '#F5F5F5', borderRadius: 12 }}>
      {/* Control points */}
      {[{x:30,y:80},{x:70,y:20},{x:120,y:70},{x:165,y:30}].map((p, i) => (
        <motion.circle key={i} cx={p.x} cy={p.y} r="4" fill="#F302C9" stroke="#1A1A1A" strokeWidth="1"
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ delay: i * 0.15, type: 'spring' }} />
      ))}
      <motion.path
        d="M30 80 C50 80 55 20 70 20 C85 20 100 70 120 70 C140 70 150 30 165 30"
        stroke="#7DC353" strokeWidth="3.5" fill="none" strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 2, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1.5 }}
      />
    </svg>
  );
}

/* ── Therapy heart pulse ─────────────────────── */
function HeartPulseSVG() {
  return (
    <svg viewBox="0 0 200 60" className="w-full" style={{ maxWidth: 360 }}>
      <motion.path
        d="M10 30 L40 30 L55 10 L70 50 L85 20 L100 40 L115 30 L190 30"
        stroke="#F302C9" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 2, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.5 }}
      />
      <motion.circle cx="100" cy="30" r="6" fill="#F302C9"
        animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }} />
    </svg>
  );
}

/* ── 1 笔变 N 笔 演示 ───────────────────────── */
function BrushExpandSVG() {
  // 中心一笔扩散出多笔
  const radial = Array.from({ length: 12 }).map((_, i) => {
    const ang = (i / 12) * Math.PI * 2;
    const r1 = 18, r2 = 55;
    return {
      x1: 100 + Math.cos(ang) * r1,
      y1: 55 + Math.sin(ang) * r1,
      x2: 100 + Math.cos(ang) * r2,
      y2: 55 + Math.sin(ang) * r2,
      color: ['#F9B801', '#F302C9', '#7DC353', '#7A51EC'][i % 4],
      delay: 0.3 + i * 0.06,
    };
  });
  return (
    <svg viewBox="0 0 200 110" className="w-full" style={{ maxWidth: 360, background: '#FAFAFA', borderRadius: 12 }}>
      {/* 用户的一笔（中心） */}
      <motion.circle cx="100" cy="55" r="6" fill="#1A1A1A"
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ duration: 0.4, repeat: Infinity, repeatDelay: 3.5 }} />
      <motion.text x="100" y="100" textAnchor="middle" fontSize="8" fill="#888" fontWeight="800">
        你画 1 笔 → AI 补 50 笔
      </motion.text>
      {/* AI 扩散的多笔 */}
      {radial.map((s, i) => (
        <motion.line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
          stroke={s.color} strokeWidth="3.5" strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: s.delay, duration: 0.6, repeat: Infinity, repeatDelay: 3 }} />
      ))}
    </svg>
  );
}

/* ── 草图变油画 演示 ──────────────────────── */
function SketchToOilSVG() {
  return (
    <svg viewBox="0 0 320 110" className="w-full" style={{ maxWidth: 420 }}>
      {/* 左：简笔画框 */}
      <rect x="10" y="15" width="90" height="80" rx="8" fill="white" stroke="#1A1A1A" strokeWidth="2" />
      <motion.path d="M30 70 Q40 45 55 50 Q70 55 80 35"
        stroke="#1A1A1A" strokeWidth="2" fill="none" strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 2.5 }} />
      <motion.circle cx="40" cy="40" r="4" fill="#F9B801" stroke="#1A1A1A" strokeWidth="1.5"
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ delay: 1.3, duration: 0.3, repeat: Infinity, repeatDelay: 2.4 }} />
      <text x="55" y="108" textAnchor="middle" fontSize="7" fill="#888888" fontWeight="800">简笔画</text>

      {/* 中间箭头 + AI 标签 */}
      <motion.g
        animate={{ x: [0, 6, 0] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}>
        <path d="M115 55 L155 55" stroke="#7A51EC" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M148 48 L155 55 L148 62" stroke="#7A51EC" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </motion.g>
      <rect x="118" y="35" width="36" height="14" rx="7" fill="#7A51EC" stroke="#1A1A1A" strokeWidth="1.5" />
      <text x="136" y="45" textAnchor="middle" fontSize="6.5" fill="white" fontWeight="900">混元 AI</text>

      {/* 右：油画框（彩色色块涌入） */}
      <rect x="170" y="15" width="140" height="80" rx="8" fill="#FAFAFA" stroke="#1A1A1A" strokeWidth="2" />
      {[
        { x: 178, y: 25, w: 30, h: 22, c: '#F9B801', d: 0.2 },
        { x: 215, y: 22, w: 38, h: 28, c: '#7A51EC', d: 0.4 },
        { x: 260, y: 25, w: 42, h: 24, c: '#F302C9', d: 0.6 },
        { x: 178, y: 55, w: 50, h: 32, c: '#7DC353', d: 0.8 },
        { x: 235, y: 58, w: 32, h: 28, c: '#F9B801', d: 1.0 },
        { x: 275, y: 55, w: 28, h: 32, c: '#7A51EC', d: 1.2 },
      ].map((b, i) => (
        <motion.rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx="3" fill={b.c}
          initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 0.85, scale: 1 }}
          transition={{ delay: b.d, duration: 0.4, repeat: Infinity, repeatDelay: 3 }} />
      ))}
      <text x="240" y="108" textAnchor="middle" fontSize="7" fill="#888888" fontWeight="800">大师级油画</text>
    </svg>
  );
}

/* ── 数据 → LLM → 报告 流程图 ────────────── */
function DataFlowSVG() {
  const items = [
    { x: 15, y: 20, label: '犹豫', color: '#F9B801' },
    { x: 15, y: 45, label: '节奏', color: '#F302C9' },
    { x: 15, y: 70, label: '色彩', color: '#7DC353' },
    { x: 15, y: 95, label: '区域', color: '#7A51EC' },
  ];
  return (
    <svg viewBox="0 0 320 130" className="w-full" style={{ maxWidth: 460, background: '#FAFAFA', borderRadius: 12 }}>
      {/* 左侧：数据点 */}
      {items.map((it, i) => (
        <motion.g key={i}
          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.15, duration: 0.4, repeat: Infinity, repeatDelay: 4 }}>
          <rect x={it.x} y={it.y} width="55" height="18" rx="9" fill={it.color} stroke="#1A1A1A" strokeWidth="1.5" />
          <text x={it.x + 27} y={it.y + 12} textAnchor="middle" fontSize="8" fill="#1A1A1A" fontWeight="800">{it.label}</text>
        </motion.g>
      ))}

      {/* 数据流箭头 */}
      {items.map((it, i) => (
        <motion.line key={`l-${i}`} x1={75} y1={it.y + 9} x2={140} y2={65}
          stroke={it.color} strokeWidth="1.5" strokeDasharray="3 3"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ delay: 0.6 + i * 0.1, duration: 0.5, repeat: Infinity, repeatDelay: 3.8 }} />
      ))}

      {/* 中间：LLM 引擎 */}
      <motion.rect x="140" y="48" width="60" height="34" rx="10" fill="#1A1A1A"
        animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 1.6, repeat: Infinity }} />
      <text x="170" y="62" textAnchor="middle" fontSize="8" fill="#F9B801" fontWeight="900">混元 LLM</text>
      <text x="170" y="74" textAnchor="middle" fontSize="6" fill="#888" fontWeight="700">语义分析</text>

      {/* 出箭头 */}
      <motion.path d="M205 65 L240 65" stroke="#7A51EC" strokeWidth="2" strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ delay: 1.4, duration: 0.5, repeat: Infinity, repeatDelay: 3.5 }} />
      <path d="M234 60 L240 65 L234 70" stroke="#7A51EC" strokeWidth="2" fill="none" strokeLinejoin="round" />

      {/* 右侧：报告卡片 */}
      <motion.g
        initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.7, duration: 0.5, repeat: Infinity, repeatDelay: 3.3 }}>
        <rect x="245" y="30" width="65" height="70" rx="6" fill="white" stroke="#1A1A1A" strokeWidth="2" />
        <rect x="252" y="38" width="50" height="3" fill="#7A51EC" rx="1" />
        <rect x="252" y="46" width="40" height="2" fill="#CCC" rx="1" />
        <rect x="252" y="52" width="45" height="2" fill="#CCC" rx="1" />
        <rect x="252" y="58" width="38" height="2" fill="#CCC" rx="1" />
        <rect x="252" y="68" width="30" height="3" fill="#F302C9" rx="1" />
        <rect x="252" y="76" width="42" height="2" fill="#CCC" rx="1" />
        <rect x="252" y="82" width="36" height="2" fill="#CCC" rx="1" />
        <rect x="252" y="88" width="44" height="2" fill="#CCC" rx="1" />
        <text x="277" y="118" textAnchor="middle" fontSize="7" fill="#888" fontWeight="800">观察报告</text>
      </motion.g>
    </svg>
  );
}

/* ── 呼吸圈 ────────────────────────────── */
function BreathingCircleSVG() {
  return (
    <svg viewBox="0 0 200 100" className="w-full" style={{ maxWidth: 320 }}>
      <motion.circle cx="100" cy="50" r="20" fill="#7DC353" fillOpacity="0.25" stroke="#7DC353" strokeWidth="2"
        animate={{ r: [20, 38, 20], opacity: [0.25, 0.55, 0.25] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.circle cx="100" cy="50" r="10" fill="#7DC353"
        animate={{ r: [10, 16, 10] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.text x="100" y="54" textAnchor="middle" fontSize="9" fill="white" fontWeight="900"
        animate={{ opacity: [1, 0.7, 1] }} transition={{ duration: 4, repeat: Infinity }}>
        吸 · 呼
      </motion.text>
      <text x="100" y="90" textAnchor="middle" fontSize="8" fill="#888" fontWeight="700">绘画过急自动触发</text>
    </svg>
  );
}

/* ── Section wrapper ─────────────────────────── */
function Section({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ scrollMarginTop: 80 }} className="py-10 sm:py-16 px-4 sm:px-8 md:px-12 border-b-2 border-[#E5E5E5]">
      {children}
    </section>
  );
}

function ChapterLabel({ num, label, color }: { num: string; label: string; color: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <span style={{ background: color, color: '#1A1A1A', fontWeight: 900, fontSize: '0.75rem', letterSpacing: '0.08em', padding: '0.25em 0.75em', borderRadius: '99px', border: '1.5px solid #1A1A1A' }}>
        {num}
      </span>
      <span style={{ fontWeight: 800, fontSize: '0.75rem', color: '#888888', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        {label}
      </span>
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════ */
export default function IntroPage() {
  const router = useRouter();
  const [activeId, setActiveId] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const setByWidth = () => setSidebarOpen(window.innerWidth >= 1024);
    setByWidth();
    window.addEventListener('resize', setByWidth);
    return () => window.removeEventListener('resize', setByWidth);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting);
        if (visible.length > 0) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-15% 0px -70% 0px', threshold: 0 }
    );
    chapters.forEach(c => {
      const el = document.getElementById(c.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-white">

      {/* ── Top nav ───────────────────────────────── */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 bg-white gap-3"
        style={{ borderBottom: '2px solid #1A1A1A' }}>
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button onClick={() => router.push('/')}
            className="flex items-center gap-1.5 font-bold text-xs sm:text-sm transition-opacity hover:opacity-60 flex-shrink-0"
            style={{ color: '#1A1A1A' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <span className="hidden sm:inline">返回首页</span>
            <span className="sm:hidden">返回</span>
          </button>
          <span style={{ color: '#E5E5E5' }} className="hidden sm:inline">|</span>
          <span className="truncate" style={{ fontWeight: 900, fontSize: 'clamp(0.95rem, 3.2vw, 1.1rem)', letterSpacing: '-0.03em', color: '#1A1A1A' }}>
            星绘<span style={{ color: '#7A51EC' }}>智愈</span>
            <span className="hidden sm:inline" style={{ fontWeight: 700, fontSize: '0.8rem', color: '#888888', marginLeft: '0.5rem' }}>产品介绍</span>
          </span>
        </div>
        <button onClick={() => router.push('/create')} className="btn-purple flex-shrink-0"
          style={{ padding: '0.5em 1em', fontSize: '0.8rem' }}>
          开始创作
        </button>
      </nav>

      <div className="flex flex-1 relative">

        {/* ── Sidebar spacer (reserves layout width for fixed aside) ── */}
        <div
          className="hidden sm:block flex-shrink-0"
          aria-hidden="true"
          style={{
            width: sidebarOpen ? 224 : 52,
            transition: 'width 0.25s ease',
          }}
        />

        {/* ── Sidebar (fixed — pinned regardless of scroll/flex context) ── */}
        <aside className="fixed top-[62px] left-0 z-40 h-[calc(100vh-62px)] overflow-y-auto hidden sm:block"
          style={{
            width: sidebarOpen ? 224 : 52,
            transition: 'width 0.25s ease',
            borderRight: '2px solid #1A1A1A',
            background: '#FAFAFA',
          }}>

          {/* Toggle button */}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="flex items-center justify-center w-full py-3 font-bold text-xs transition-colors hover:bg-[#F0F0F0]"
            style={{ borderBottom: '1.5px solid #E5E5E5', color: '#888888' }}>
            {sidebarOpen ? (
              <span className="flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
                收起目录
              </span>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            )}
          </button>

          {/* Chapter list */}
          <nav className="py-4">
            {chapters.map(c => {
              const isActive = activeId === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => scrollTo(c.id)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[#F0F0F0] text-left"
                  style={{ borderLeft: isActive ? `3px solid ${c.color}` : '3px solid transparent' }}
                >
                  <span style={{
                    background: isActive ? c.color : '#E5E5E5',
                    color: isActive ? '#1A1A1A' : '#AAAAAA',
                    fontWeight: 900,
                    fontSize: '0.65rem',
                    padding: '0.2em 0.55em',
                    borderRadius: '99px',
                    flexShrink: 0,
                    transition: 'all 0.2s',
                    letterSpacing: '0.04em',
                  }}>
                    {c.num}
                  </span>
                  {sidebarOpen && (
                    <span style={{
                      fontWeight: isActive ? 800 : 600,
                      fontSize: '0.85rem',
                      color: isActive ? '#1A1A1A' : '#888888',
                      transition: 'color 0.2s',
                      whiteSpace: 'nowrap',
                    }}>
                      {c.label}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {sidebarOpen && (
            <div className="px-4 pb-6 pt-2">
              <div style={{ height: 1, background: '#E5E5E5', marginBottom: '0.75rem' }} />
              <p style={{ fontSize: '0.7rem', color: '#BBBBBB', fontWeight: 600, lineHeight: 1.6 }}>
                点击章节快速跳转
              </p>
            </div>
          )}
        </aside>

        {/* ── Main content ────────────────────────── */}
        <main className="flex-1 overflow-x-hidden" style={{ minWidth: 0 }}>

          {/* ════ 01 产品概述 ════════════════════════ */}
          <Section id="overview">
            <ChapterLabel num="01" label="产品概述" color="#F9B801" />
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, color: '#1A1A1A', letterSpacing: '-0.04em', lineHeight: 0.95, textTransform: 'uppercase' }}>
                  STAR<br/><span style={{ color: '#7A51EC' }}>PAINT</span><br/>智愈
                </h2>
                <p className="mt-5" style={{ fontSize: '1rem', color: '#555555', fontWeight: 600, lineHeight: 1.75 }}>
                  星绘智愈是一套面向孤独症儿童的 <strong style={{ color: '#1A1A1A' }}>AI 辅助油画教育与艺术疗愈系统</strong>，
                  通过"<strong style={{ color: '#7A51EC' }}>从学到创</strong>"的递进式体验，
                  让每个孩子都能在画笔精灵 Starry 的陪伴下完成创作，在艺术中感受疗愈。
                </p>
                <p className="mt-4" style={{ fontSize: '1rem', color: '#555555', fontWeight: 600, lineHeight: 1.75 }}>
                  <strong style={{ color: '#F9B801' }}>第一步 · 临摹学习</strong>：AI 将大师画作拆解为笔触序列，你画1笔系统补50笔，轻松完成。<br/>
                  <strong style={{ color: '#F302C9' }}>第二步 · 自由创作</strong>：随意画任何内容，一键"变成油画"由腾讯混元 AI 渲染为大师级油画。<br/>
                  系统全程采集绘画行为数据，由混元大模型生成 <strong style={{ color: '#7A51EC' }}>AI 疗愈观察报告</strong>，供监护人参考。
                </p>
                <div className="flex gap-2 flex-wrap mt-6">
                  {['公益项目', 'ASD 专项', 'AI 陪画', '认知训练', '混元生图', '混元 LLM', '观察报告', '线下落地'].map(tag => (
                    <span key={tag} style={{ background: '#F5F5F5', border: '1.5px solid #1A1A1A', borderRadius: 99, padding: '0.25em 0.75em', fontSize: '0.75rem', fontWeight: 700, color: '#1A1A1A' }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 160 }}
                className="flex items-center justify-center gap-4 relative py-6"
              >
                <div className="absolute inset-0 rounded-[2rem]" style={{ background: '#F9B801', opacity: 0.08 }} />
                <div className="animate-float" style={{ animationDelay: '0s' }}><StarChar size={100} /></div>
                <div className="animate-float" style={{ animationDelay: '-1.2s', marginTop: '1.5rem' }}><FlowerChar size={85} /></div>
                <div className="animate-float" style={{ animationDelay: '-2.4s' }}><BlobChar size={80} /></div>
              </motion.div>
            </div>

            {/* Stroke animation demo */}
            <motion.div className="mt-12" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#888888', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                AI 笔触生成预览
              </p>
              <div className="p-6 rounded-[1.5rem]" style={{ background: '#FAFAFA', border: '2px solid #E5E5E5' }}>
                <StrokeDemoSVG />
                <p style={{ fontSize: '0.8rem', color: '#AAAAAA', fontWeight: 600, marginTop: '0.75rem' }}>
                  三色笔触流依据方向场自动生成 · 循环演示
                </p>
              </div>
            </motion.div>
          </Section>

          {/* ════ 02 公益使命 ════════════════════════ */}
          <Section id="mission">
            <ChapterLabel num="02" label="公益使命" color="#F302C9" />
            <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.5rem)', fontWeight: 900, color: '#1A1A1A', letterSpacing: '-0.04em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
              为<span style={{ color: '#F302C9' }}>孤独岛</span>上的小画家点亮星光
            </motion.h2>
            <p style={{ fontSize: '1rem', color: '#666666', fontWeight: 600, lineHeight: 1.75, maxWidth: 680, marginBottom: '2.5rem' }}>
              孤独症儿童常常活在自己的世界，言语沟通对他们来说是一道高墙。
              然而越来越多研究表明，<strong style={{ color: '#1A1A1A' }}>许多 ASD 儿童在视觉、色彩、图形识别上展现出过人天赋</strong>。
              星绘智愈不是一款工具，而是一座<strong style={{ color: '#F302C9' }}>由公益力量推动的小桥</strong>，
              希望让每一个被外界忽略的小画家，都能用画笔为自己发声。
            </p>

            {/* 三大使命卡 */}
            <div className="grid md:grid-cols-3 gap-5 mb-10">
              {[
                { color: '#F9B801', icon: '🧠', title: '认知训练', sub: 'COGNITIVE TRAINING',
                  body: '通过 1 笔变 N 笔的可视化笔触示范，帮助儿童逐步构建"绘画结构感"与"色彩关系"认知，在游戏中完成感统训练。' },
                { color: '#F302C9', icon: '🎨', title: '艺术启蒙', sub: 'ART ENLIGHTENMENT',
                  body: '降低绘画门槛，让原本"画不出来"的孩子也能完成莫奈、梵高级别的画面，培养艺术兴趣，发现潜在天赋。' },
                { color: '#7A51EC', icon: '📋', title: '监护人参考', sub: 'GUARDIAN INSIGHT',
                  body: '全程记录绘画行为数据，由 AI 生成观察报告，给家长、特教老师提供可量化的行为参考依据，辅助评估认知与创造力。' },
              ].map((item, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-[1.5rem] overflow-hidden"
                  style={{ border: '2px solid #1A1A1A', boxShadow: '4px 4px 0 #1A1A1A' }}>
                  <div className="flex items-center justify-center" style={{ background: item.color, minHeight: 90, fontSize: '2.5rem' }}>
                    {item.icon}
                  </div>
                  <div className="p-5 bg-white">
                    <h3 style={{ fontWeight: 900, fontSize: '1.15rem', color: '#1A1A1A', letterSpacing: '-0.03em', marginBottom: '0.25rem' }}>{item.title}</h3>
                    <p style={{ fontSize: '0.7rem', color: '#AAAAAA', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>{item.sub}</p>
                    <p style={{ fontSize: '0.88rem', color: '#555555', fontWeight: 600, lineHeight: 1.7 }}>{item.body}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="rounded-[1.5rem] p-6" style={{ background: '#F5F5F5', border: '2px solid #1A1A1A' }}>
                <p style={{ fontWeight: 800, fontSize: '0.75rem', color: '#888888', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1.25rem' }}>研究数据支撑</p>
                {[
                  { val: '~30%', desc: 'ASD 儿童在视觉空间任务中表现优于平均水平', color: '#F302C9' },
                  { val: '78%', desc: '参与艺术疗愈的 ASD 儿童情绪调节能力改善', color: '#7A51EC' },
                  { val: '92%', desc: '家长反馈孩子绘画后情绪更稳定', color: '#7DC353' },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-4 mb-4">
                    <span style={{ fontWeight: 900, fontSize: '1.8rem', color: s.color, letterSpacing: '-0.04em', flexShrink: 0, minWidth: '4rem' }}>{s.val}</span>
                    <span style={{ fontSize: '0.82rem', color: '#555555', fontWeight: 600, lineHeight: 1.5 }}>{s.desc}</span>
                  </div>
                ))}
                <HeartPulseSVG />
              </motion.div>

              <motion.blockquote initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
                className="p-6 rounded-[1.5rem] flex flex-col justify-center"
                style={{ background: '#7A51EC', border: '2px solid #1A1A1A', boxShadow: '4px 4px 0 #1A1A1A' }}>
                <p style={{ fontSize: '1.05rem', color: '#FFFFFF', fontWeight: 700, lineHeight: 1.75, fontStyle: 'italic' }}>
                  &ldquo;每个孤独症孩子都是一颗住在岛上的小星星。
                  我们做的不是把他们带出岛，而是让他们的光被外界看见——
                  用画笔，作为他们和世界对话的语言。&rdquo;
                </p>
                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)', fontWeight: 700, marginTop: '0.75rem' }}>
                  — 星绘智愈 · 项目使命
                </p>
              </motion.blockquote>
            </div>
          </Section>

          {/* ════ 03 核心交互 ════════════════════════ */}
          <Section id="interaction">
            <ChapterLabel num="03" label="核心交互" color="#7DC353" />
            <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.5rem)', fontWeight: 900, color: '#1A1A1A', letterSpacing: '-0.04em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
              一笔变<span style={{ color: '#7DC353' }}>百笔</span>·降维难度，认知升级
            </motion.h2>
            <p style={{ fontSize: '1rem', color: '#666666', fontWeight: 600, lineHeight: 1.75, maxWidth: 700, marginBottom: '2.5rem' }}>
              这是星绘智愈最核心的设计：<strong style={{ color: '#1A1A1A' }}>儿童只需要画下一笔意图，AI 立刻补出 20-200 笔的连续示范</strong>。
              在这个过程中，孩子不用承担"我画不好"的挫败感，而是<strong style={{ color: '#7DC353' }}>在观察 AI 接续中学习绘画结构与色彩关系</strong>——
              这正是 ASD 儿童认知训练所需要的"可视化、可重复、低压力"的学习场景。
            </p>

            {/* Big illustration */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="mb-8 p-6 rounded-[1.5rem]" style={{ background: '#FAFAFA', border: '2px solid #1A1A1A' }}>
              <BrushExpandSVG />
            </motion.div>

            {/* 4 cognitive points */}
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              {[
                { icon: '🪜', color: '#F9B801', title: '降低绘画门槛',
                  body: '研究表明 ASD 儿童常因"做不到"而抗拒尝试。1 笔变 N 笔将"完成一幅画"的难度从 100 笔骤降到 1-5 笔，每个孩子都能轻松收获完整作品。' },
                { icon: '👁️', color: '#F302C9', title: '可视化结构认知',
                  body: 'AI 接续的笔触是按"形状轮廓 → 主体填色 → 细节修补"的顺序绘制的。孩子在观察过程中潜移默化建立对画面结构的理解。' },
                { icon: '🌈', color: '#7DC353', title: '色彩关系示范',
                  body: '系统按情绪色调（暖/冷/梦幻/原色）配色，每一笔颜色都来自原画分析。孩子通过看 AI 用什么颜色，自然学习到颜色之间的搭配。' },
                { icon: '🔁', color: '#7A51EC', title: '低压力反复练习',
                  body: '不满意可以撤销重画，没有"对错"判断。系统给出鼓励而非纠正，让孩子敢于尝试、愿意重复——这正是认知训练的核心条件。' },
              ].map((p, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-start gap-4 p-5 rounded-[1.25rem]"
                  style={{ background: 'white', border: '2px solid #1A1A1A' }}>
                  <div className="w-11 h-11 rounded-[0.875rem] flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: p.color, border: '1.5px solid #1A1A1A' }}>
                    {p.icon}
                  </div>
                  <div>
                    <h4 style={{ fontWeight: 900, fontSize: '1rem', color: '#1A1A1A', letterSpacing: '-0.02em', marginBottom: '0.4rem' }}>{p.title}</h4>
                    <p style={{ fontSize: '0.86rem', color: '#666666', fontWeight: 600, lineHeight: 1.7 }}>{p.body}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Two-mode banner */}
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
              <p style={{ fontWeight: 800, fontSize: '0.75rem', color: '#888888', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>两种交互模式</p>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { color: '#F9B801', char: <StarChar size={56} />, title: '临摹学习', sub: 'GUIDED LEARNING',
                    points: ['6 位大师 · 30 幅经典画作', '原图 + 引导线双视图', 'AI 按 Hertzmann 算法逐笔示范', '看见画家如何思考'] },
                  { color: '#F302C9', char: <FlowerChar size={50} />, title: '自由创作', sub: 'FREE CREATION',
                    points: ['画任何想画的内容', '5 种主题引导（天气/心情/安全地点/慢线条/小星球）', '一键"变成油画" 由腾讯混元 AI 渲染', '完成即收藏到画廊'] },
                ].map((m, i) => (
                  <div key={i} className="rounded-[1.5rem] overflow-hidden" style={{ border: '2px solid #1A1A1A' }}>
                    <div className="flex items-center justify-center pt-5 pb-2" style={{ background: m.color, minHeight: 90 }}>{m.char}</div>
                    <div className="p-5 bg-white">
                      <div className="flex items-center justify-between mb-1">
                        <h3 style={{ fontWeight: 900, fontSize: '1.1rem', color: '#1A1A1A', letterSpacing: '-0.03em' }}>{m.title}</h3>
                      </div>
                      <p style={{ fontSize: '0.68rem', color: '#AAAAAA', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '0.6rem' }}>{m.sub}</p>
                      <ul className="space-y-1">
                        {m.points.map((pt, j) => (
                          <li key={j} className="flex items-start gap-2">
                            <span style={{ color: m.color, fontWeight: 900 }}>·</span>
                            <span style={{ fontSize: '0.82rem', color: '#555555', fontWeight: 600 }}>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </Section>

          {/* ════ 04 ASD 专项设计 ════════════════════════ */}
          <Section id="asd-design">
            <ChapterLabel num="04" label="ASD 专项设计" color="#7A51EC" />
            <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.5rem)', fontWeight: 900, color: '#1A1A1A', letterSpacing: '-0.04em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
              处处为<span style={{ color: '#7A51EC' }}>孩子</span>着想
            </motion.h2>
            <p style={{ fontSize: '1rem', color: '#666666', fontWeight: 600, lineHeight: 1.75, maxWidth: 700, marginBottom: '2.5rem' }}>
              我们参考了 TEACCH 视觉化结构教学法、ABA 应用行为分析、社交故事干预等专业 ASD 教育理念，
              在产品的每一个细节中加入<strong style={{ color: '#1A1A1A' }}>专项适配设计</strong>。
              ASD 儿童精力容易不集中、对突变敏感、需要可预测的环境——这些都是我们设计时最先考虑的。
            </p>

            {/* 呼吸引导 highlight */}
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="grid md:grid-cols-2 gap-6 items-center mb-10 p-6 rounded-[1.5rem]"
              style={{ background: '#7DC353', border: '2px solid #1A1A1A', boxShadow: '4px 4px 0 #1A1A1A' }}>
              <div>
                <span style={{ background: '#1A1A1A', color: '#7DC353', fontWeight: 900, fontSize: '0.7rem', padding: '0.3em 0.7em', borderRadius: 99, letterSpacing: '0.06em' }}>核心专项</span>
                <h3 style={{ fontWeight: 900, fontSize: '1.5rem', color: '#FFFFFF', letterSpacing: '-0.03em', marginTop: '0.6rem', marginBottom: '0.5rem' }}>平静呼吸引导</h3>
                <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.92)', fontWeight: 600, lineHeight: 1.7 }}>
                  系统检测到孩子绘画过急、连续多笔失败或情绪波动时，自动暂停画布，弹出呼吸圈引导（4 秒吸气、4 秒呼气）。
                  ASD 儿童注意力切换困难，我们用<strong style={{ color: '#1A1A1A' }}>视觉化的呼吸节奏</strong>帮助孩子重新进入平静状态，再继续创作。
                </p>
              </div>
              <div className="flex justify-center">
                <BreathingCircleSVG />
              </div>
            </motion.div>

            {/* 8 ASD 专项 grid */}
            <p style={{ fontWeight: 800, fontSize: '0.75rem', color: '#888888', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>八大专项设计</p>
            <div className="grid md:grid-cols-2 gap-4 mb-10">
              {[
                { icon: '🌙', label: '安静模式', color: '#7BA7CC',
                  desc: '一键切换冷色低饱和界面，关闭动画与音效，避免感官过载——为感官敏感儿童设计。' },
                { icon: '👀', label: '共同注意问答', color: '#F9B801',
                  desc: '每隔几笔弹出 1 个简短问题（如"这是什么颜色？"），训练共同注意力，记录回答正确率。' },
                { icon: '💨', label: '平静呼吸引导', color: '#7DC353',
                  desc: '过急或情绪波动时自动触发可视化呼吸圈，帮助回到平静节奏。' },
                { icon: '📋', label: '疗愈观察报告', color: '#7A51EC',
                  desc: 'AI 整合所有行为数据生成温暖的观察报告，给监护人作为认知评估参考。' },
                { icon: '👤', label: '照护者提示', color: '#F302C9',
                  desc: '画布旁实时显示给家长/老师的引导建议（如"鼓励孩子多用红色"）。' },
                { icon: '😊', label: '情绪前后测', color: '#F59E0B',
                  desc: '画前画后各做一次心情选择，量化"这次绘画是否帮助了情绪过渡"。' },
                { icon: '👁️', label: '先看后做演示', color: '#8B6914',
                  desc: '每幅画前播放 AI 演示视频，让孩子先观察整体过程再开始——降低未知带来的焦虑。' },
                { icon: '📖', label: '社交故事引导', color: '#94A3B8',
                  desc: '首次使用时用"社交故事"叙述形式介绍每一步，帮助 ASD 儿童预知接下来会发生什么。' },
              ].map((f, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-4 p-5 rounded-[1.25rem]"
                  style={{ background: '#FAFAFA', border: '1.5px solid #1A1A1A' }}>
                  <div className="w-11 h-11 rounded-[0.875rem] flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: f.color, border: '1.5px solid #1A1A1A' }}>
                    {f.icon}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 900, color: '#1A1A1A', marginBottom: '0.3rem', letterSpacing: '-0.02em' }}>{f.label}</h4>
                    <p style={{ fontSize: '0.83rem', color: '#666666', fontWeight: 600, lineHeight: 1.65 }}>{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* 4 疗愈机制 */}
            <p style={{ fontWeight: 800, fontSize: '0.75rem', color: '#888888', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>艺术疗愈底层机制</p>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { icon: '🎨', color: '#F9B801', title: '感知统合训练',
                  desc: '笔触跟随练习需要手眼协调，视觉追踪和运动控制的反复练习有助于感统发展。' },
                { icon: '⭐', color: '#F302C9', title: '即时正向反馈',
                  desc: 'Starry 精灵每笔都给予鼓励，低门槛的成就感帮助儿童建立自信与专注持续时间。' },
                { icon: '🌊', color: '#7DC353', title: '心流沉浸体验',
                  desc: '逐笔节奏创作能引导进入专注心流状态，有效缓解焦虑，改善情绪状态。' },
                { icon: '🤝', color: '#7A51EC', title: '社交桥梁建构',
                  desc: '完成的画作成为与家长、治疗师交流的媒介，拓展社交话题与情感表达通道。' },
              ].map((item, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-4 p-4 rounded-[1.25rem]"
                  style={{ background: 'white', border: '2px solid #1A1A1A' }}>
                  <div className="w-9 h-9 rounded-[0.75rem] flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: item.color, border: '1.5px solid #1A1A1A' }}>
                    {item.icon}
                  </div>
                  <div>
                    <h4 style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1A1A1A', marginBottom: '0.25rem' }}>{item.title}</h4>
                    <p style={{ fontSize: '0.82rem', color: '#666666', fontWeight: 600, lineHeight: 1.6 }}>{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </Section>

          {/* ════ 05 使用流程 ════════════════════════ */}
          <Section id="workflow">
            <ChapterLabel num="05" label="使用流程" color="#7BA7CC" />
            <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.5rem)', fontWeight: 900, color: '#1A1A1A', letterSpacing: '-0.04em', textTransform: 'uppercase', marginBottom: '2.5rem' }}>
              五步<span style={{ color: '#7DC353' }}>完成</span>疗愈
            </motion.h2>

            <div className="space-y-6">
              {[
                {
                  num: '01', icon: '😊', color: '#F9B801',
                  title: '情绪前测 — 选心情',
                  detail: '进入时选择今天的心情（开心/平静/紧张/难过）和能量等级，系统自动适配难度和笔触数量。首次使用会有社交故事引导。',
                },
                {
                  num: '02', icon: '🎨', color: '#F302C9',
                  title: '选择大师 / 自由创作',
                  detail: '从6位大师30幅经典画作中选择临摹目标，大师以第一人称讲述创作故事。或选择"自由创作"，用大师风格画出自己想画的内容。',
                },
                {
                  num: '03', icon: '✏️', color: '#7DC353',
                  title: '陪画创作',
                  detail: '你画1笔，AI自动补50笔（可调20-200），跟着引导线轻松完成全图。画布旁有视觉时间表、共同注意问答、照护者提示。连续失败时自动触发平静呼吸引导。',
                },
                {
                  num: '04', icon: '😌', color: '#7BA7CC',
                  title: '情绪后测 — 再选心情',
                  detail: '画完后再选一次心情，量化"这次绘画是否帮助了情绪过渡"。系统对比画前画后的情绪变化。',
                },
                {
                  num: '05', icon: '📋', color: '#7A51EC',
                  title: 'AI 疗愈观察报告',
                  detail: 'LLM 基于绘画过程数据（犹豫时间、色彩偏好、专注区域、笔触节奏、情绪变化）生成温暖的观察记录，供家长/治疗师参考。',
                },
              ].map((step, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex gap-5 rounded-[1.5rem] overflow-hidden"
                  style={{ border: '2px solid #1A1A1A' }}>
                  <div className="flex-shrink-0 w-16 flex flex-col items-center justify-start pt-5 gap-2"
                    style={{ background: step.color }}>
                    <span style={{ fontSize: '1.5rem' }}>{step.icon}</span>
                    <span style={{ fontWeight: 900, fontSize: '0.65rem', color: '#1A1A1A', letterSpacing: '0.06em' }}>{step.num}</span>
                  </div>
                  <div className="flex-1 p-5">
                    <h3 style={{ fontWeight: 900, fontSize: '1.1rem', color: '#1A1A1A', letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>{step.title}</h3>
                    <p style={{ fontSize: '0.875rem', color: '#666666', fontWeight: 600, lineHeight: 1.7 }}>{step.detail}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </Section>

          {/* ════ 06 混元生图 ════════════════════════ */}
          <Section id="image-gen">
            <ChapterLabel num="06" label="混元生图" color="#F9B801" />
            <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.5rem)', fontWeight: 900, color: '#1A1A1A', letterSpacing: '-0.04em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
              草图变<span style={{ color: '#F9B801' }}>油画</span>·腾讯混元生图 v3
            </motion.h2>
            <p style={{ fontSize: '1rem', color: '#666666', fontWeight: 600, lineHeight: 1.75, maxWidth: 700, marginBottom: '2rem' }}>
              在自由创作模式中，孩子用简单笔触画出心中所想，点击"<strong style={{ color: '#F9B801' }}>✨ 变成油画</strong>"按钮，
              系统调用<strong style={{ color: '#1A1A1A' }}>腾讯混元生图大模型 hy-image-v3.0</strong> 接口，
              将简笔画在数秒内渲染为完整的大师级油画。
            </p>

            {/* Sketch → Oil 演示 */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="mb-8 p-6 rounded-[1.5rem]" style={{ background: '#FAFAFA', border: '2px solid #1A1A1A' }}>
              <SketchToOilSVG />
              <p style={{ fontSize: '0.78rem', color: '#888', fontWeight: 600, marginTop: '0.75rem', textAlign: 'center' }}>
                简笔画 + 风格提示词 + 大师标签 → 混元 AI 渲染 → 完整油画
              </p>
            </motion.div>

            {/* 4 价值点 */}
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              {[
                { icon: '🌟', color: '#F9B801', title: '巨大的心理鼓舞',
                  body: '看到自己潦草的简笔画被变成"真油画"，孩子会获得巨大的认可感与成就感——这种"被看见"的体验对 ASD 儿童尤其珍贵。' },
                { icon: '🎭', color: '#F302C9', title: '六种大师风格',
                  body: '可指定莫奈、梵高、高更、伦勃朗、毕加索、萨金特任一种风格 prompt，让孩子的简笔画"穿上"不同时代的艺术外衣。' },
                { icon: '⚡', color: '#7DC353', title: '秒级响应',
                  body: '混元 v3 模型在云端 GPU 上几秒内完成渲染，比传统训练 + 推理流程快 10 倍以上，孩子不会失去耐心。' },
                { icon: '🔒', color: '#7A51EC', title: '内容安全保障',
                  body: '腾讯混元 API 内置儿童内容安全审核，确保生成图像适合未成年人观看，监护人可放心使用。' },
              ].map((p, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-start gap-3 p-5 rounded-[1.25rem]"
                  style={{ background: 'white', border: '2px solid #1A1A1A' }}>
                  <div className="w-10 h-10 rounded-[0.875rem] flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: p.color, border: '1.5px solid #1A1A1A' }}>
                    {p.icon}
                  </div>
                  <div>
                    <h4 style={{ fontWeight: 900, fontSize: '0.95rem', color: '#1A1A1A', marginBottom: '0.3rem' }}>{p.title}</h4>
                    <p style={{ fontSize: '0.83rem', color: '#666', fontWeight: 600, lineHeight: 1.65 }}>{p.body}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* API code-style box */}
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="p-5 rounded-[1.25rem] font-mono text-sm" style={{ background: '#1A1A1A', color: '#F9B801', border: '2px solid #1A1A1A' }}>
              <p style={{ fontSize: '0.7rem', color: '#888', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '0.75rem' }}>API 调用示意</p>
              <div>POST <span style={{ color: '#7DC353' }}>/api/sd-render</span></div>
              <div style={{ paddingLeft: '1rem', color: '#F302C9' }}>{`{ sketch: base64, masterStyle: "monet", prompt: "印象派油画" }`}</div>
              <div style={{ marginTop: '0.4rem' }}>→ 混元 hy-image-v3.0 渲染</div>
              <div style={{ marginTop: '0.4rem', color: '#7A51EC' }}>← 返回完整油画 (1024×1024)</div>
            </motion.div>
          </Section>

          {/* ════ 07 混元大模型 · 报告生成 ════════════════ */}
          <Section id="llm-report">
            <ChapterLabel num="07" label="混元大模型" color="#F302C9" />
            <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.5rem)', fontWeight: 900, color: '#1A1A1A', letterSpacing: '-0.04em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
              数据→<span style={{ color: '#F302C9' }}>报告</span>·让监护人读懂孩子的画
            </motion.h2>
            <p style={{ fontSize: '1rem', color: '#666666', fontWeight: 600, lineHeight: 1.75, maxWidth: 700, marginBottom: '2rem' }}>
              整个绘画过程中，系统在后台静默采集每一笔的<strong style={{ color: '#1A1A1A' }}>时间、节奏、颜色、区域、匹配分数</strong>等行为数据。
              结束时由<strong style={{ color: '#F302C9' }}>腾讯混元大语言模型</strong>处理这些原始数字，生成一份温暖、可读、有针对性的观察报告。
            </p>

            {/* DataFlow SVG */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="mb-8 p-6 rounded-[1.5rem]" style={{ background: '#FAFAFA', border: '2px solid #1A1A1A' }}>
              <DataFlowSVG />
              <p style={{ fontSize: '0.78rem', color: '#888', fontWeight: 600, marginTop: '0.75rem', textAlign: 'center' }}>
                多维行为数据 → 混元 LLM 语义分析 → 监护人可读报告
              </p>
            </motion.div>

            {/* 数据采集表 */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                className="p-5 rounded-[1.25rem]" style={{ background: '#FFF', border: '2px solid #1A1A1A' }}>
                <p style={{ fontWeight: 800, fontSize: '0.7rem', color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>采集的行为数据</p>
                <ul className="space-y-2">
                  {[
                    ['总用时 / 完成度', '反映持续注意力'],
                    ['每笔等待时间', '反映犹豫 / 思考程度'],
                    ['绘制时长 / 节奏', '反映流畅度与冲动性'],
                    ['色彩偏好分布', '反映情绪倾向'],
                    ['专注区域热力图', '反映视觉关注模式'],
                    ['平静协议触发次数', '反映情绪自调节能力'],
                    ['共同注意问答正确率', '反映认知响应'],
                    ['情绪前后测对比', '量化疗愈效果'],
                  ].map((row, i) => (
                    <li key={i} className="flex items-start gap-2" style={{ borderBottom: '1px dashed #E5E5E5', paddingBottom: '0.4rem' }}>
                      <span style={{ color: '#F302C9', fontWeight: 900 }}>·</span>
                      <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#1A1A1A', minWidth: '8.5rem' }}>{row[0]}</span>
                      <span style={{ fontSize: '0.78rem', color: '#888', fontWeight: 600 }}>{row[1]}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>

              <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                className="p-5 rounded-[1.25rem]" style={{ background: '#F302C9', border: '2px solid #1A1A1A' }}>
                <p style={{ fontWeight: 800, fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>报告样例片段</p>
                <p style={{ fontSize: '0.88rem', color: 'white', fontWeight: 600, lineHeight: 1.75 }}>
                  &ldquo;今天小宇用了 18 分钟完成了梵高《星空》临摹。
                  画面以蓝紫色调为主，与画前选择的<strong>&lsquo;平静&rsquo;</strong>情绪一致。
                  小宇在 13 笔之后出现明显犹豫（平均等待时间 4.2 秒），
                  共同注意问答正确率 4/5，呈现良好的认知响应。<br/><br/>
                  建议：可以鼓励他在下一次创作中尝试暖色调，
                  增加色彩多样性的探索。&rdquo;
                </p>
                <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.65)', fontWeight: 700, marginTop: '0.75rem' }}>
                  — 由腾讯混元大模型生成
                </p>
              </motion.div>
            </div>

            {/* 报告价值 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: '👨‍👩‍👧', label: '家长', desc: '了解孩子情绪与认知状态' },
                { icon: '👩‍🏫', label: '特教老师', desc: '追踪干预进展' },
                { icon: '🩺', label: '治疗师', desc: '辅助 ABA / TEACCH 评估' },
                { icon: '🎒', label: '机构', desc: '量化训练课程效果' },
              ].map((u, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex flex-col items-center text-center gap-2 p-4 rounded-[1.25rem]"
                  style={{ background: '#FAFAFA', border: '1.5px solid #1A1A1A' }}>
                  <span style={{ fontSize: '1.6rem' }}>{u.icon}</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#1A1A1A' }}>{u.label}</span>
                  <span style={{ fontSize: '0.72rem', color: '#888', fontWeight: 600, lineHeight: 1.5 }}>{u.desc}</span>
                </motion.div>
              ))}
            </div>
          </Section>

          {/* ════ 08 笔触算法 ══════════════ */}
          <Section id="algorithm">
            <ChapterLabel num="08" label="笔触算法" color="#7DC353" />
            <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.5rem)', fontWeight: 900, color: '#1A1A1A', letterSpacing: '-0.04em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
              全新 <span style={{ color: '#7DC353' }}>Hertzmann</span> 多层笔触算法
            </motion.h2>
            <p style={{ fontSize: '1rem', color: '#666666', fontWeight: 600, lineHeight: 1.75, maxWidth: 720, marginBottom: '1rem' }}>
              我们已经<strong style={{ color: '#1A1A1A' }}>替换了原有简单笔触拆解算法</strong>，
              新版本基于 SIGGRAPH 1998 经典论文
              <em style={{ color: '#7DC353' }}> "Painterly Rendering with Curved Brush Strokes of Multiple Sizes" </em>
              重新实现，由 <strong>交大背景算法团队</strong>纯 JavaScript 移植，浏览器内 1-3 秒完成全图笔触规划，无需服务端 GPU。
            </p>
            <div className="flex gap-2 flex-wrap mb-8">
              {['Hertzmann 1998', '多层从粗到细', '误差驱动', '梯度追踪', '边界感知', 'Catmull-Rom', '纯前端 JS', '~1-3s 完成'].map(tag => (
                <span key={tag} style={{ background: '#FAFAFA', border: '1.5px solid #1A1A1A', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700, padding: '0.25em 0.7em', color: '#1A1A1A' }}>
                  {tag}
                </span>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-5 mb-12">
              {[
                {
                  icon: '🧠', color: '#F9B801',
                  title: '多层误差驱动分解',
                  badge: '笔触规划',
                  desc: '从粗到细多层扫描：先用大笔触铺底色，再逐层用更细的笔触修补高误差区域。每层只在"画得不够像"的地方补笔，逐步逼近原画。',
                  tags: ['从粗到细', '误差驱动', '逐层修补'],
                },
                {
                  icon: '🖌️', color: '#F302C9',
                  title: '梯度追踪弯曲笔触',
                  badge: '路径生成',
                  desc: '每一笔沿图像梯度的垂直方向延伸——自动贴合物体边缘和纹理走向，形成自然弯曲的笔触路径，仿佛画笔跟着画面的光影在游走。',
                  tags: ['梯度垂直', '自然弯曲', '纹理对齐'],
                },
                {
                  icon: '🚧', color: '#7DC353',
                  title: '颜色边界感知',
                  badge: '智能截断',
                  desc: '笔触延伸过程中实时检测颜色变化：当笔尖即将"画到另一个物体上"时自动停笔，保护物体边缘清晰度，不会涂出轮廓外。',
                  tags: ['边界检测', '自动停笔', '轮廓保护'],
                },
                {
                  icon: '✨', color: '#7A51EC',
                  title: 'Catmull-Rom 曲线渲染',
                  badge: '绘制引擎',
                  desc: '将离散路径点用 Catmull-Rom 样条曲线平滑连接，支持压感宽度动态变化，在 Canvas 2D 中模拟真实画笔笔触质感。',
                  tags: ['样条平滑', '压感模拟', 'Canvas 2D'],
                },
              ].map((item, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="p-5 rounded-[1.5rem]"
                  style={{ background: '#FAFAFA', border: '2px solid #1A1A1A' }}>
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-[0.875rem] flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background: item.color, border: '1.5px solid #1A1A1A' }}>
                      {item.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 style={{ fontWeight: 900, fontSize: '0.95rem', color: '#1A1A1A', letterSpacing: '-0.02em' }}>{item.title}</h3>
                        <span style={{ background: item.color, border: '1px solid #1A1A1A', borderRadius: 99, fontSize: '0.6rem', fontWeight: 800, padding: '0.15em 0.55em', color: '#1A1A1A' }}>{item.badge}</span>
                      </div>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#555555', fontWeight: 600, lineHeight: 1.7, marginBottom: '0.75rem' }}>{item.desc}</p>
                  <div className="flex gap-2 flex-wrap">
                    {item.tags.map(t => (
                      <span key={t} style={{ background: 'white', border: '1.5px solid #E5E5E5', borderRadius: 99, fontSize: '0.7rem', fontWeight: 700, padding: '0.2em 0.6em', color: '#888888' }}>{t}</span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Pipeline visualization */}
            <motion.div className="mt-8" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}>
              <p style={{ fontWeight: 800, fontSize: '0.75rem', color: '#888888', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>算法管线</p>
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { label: '输入图像', color: '#F5F5F5', text: '#1A1A1A' },
                  { label: '→', color: 'transparent', text: '#CCCCCC' },
                  { label: '高斯模糊', color: '#F9B801', text: '#1A1A1A' },
                  { label: '→', color: 'transparent', text: '#CCCCCC' },
                  { label: '误差检测', color: '#F302C9', text: '#1A1A1A' },
                  { label: '→', color: 'transparent', text: '#CCCCCC' },
                  { label: '梯度追踪', color: '#7DC353', text: '#1A1A1A' },
                  { label: '→', color: 'transparent', text: '#CCCCCC' },
                  { label: 'Catmull-Rom', color: '#7A51EC', text: '#FFFFFF' },
                  { label: '→', color: 'transparent', text: '#CCCCCC' },
                  { label: '笔触序列', color: '#1A1A1A', text: '#FFFFFF' },
                ].map((item, i) => (
                  <motion.span key={i}
                    initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                    transition={{ delay: i * 0.06 }}
                    style={{
                      background: item.color,
                      color: item.text,
                      border: item.color !== 'transparent' ? '1.5px solid #1A1A1A' : 'none',
                      borderRadius: 99,
                      fontSize: item.label === '→' ? '1.1rem' : '0.75rem',
                      fontWeight: item.label === '→' ? 400 : 800,
                      padding: item.label === '→' ? '0' : '0.3em 0.75em',
                    }}>
                    {item.label}
                  </motion.span>
                ))}
              </div>
            </motion.div>

            {/* ── 深入图解 ───────────────────────────── */}
            <p style={{ fontWeight: 800, fontSize: '0.75rem', color: '#888888', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '3rem', marginBottom: '1rem' }}>三步深入图解</p>

            {/* Multi-layer section */}
            <div className="grid md:grid-cols-2 gap-8 mb-10">
              <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                <h3 style={{ fontWeight: 900, fontSize: '1.1rem', color: '#1A1A1A', letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
                  <span style={{ color: '#F9B801' }}>①</span> 多层从粗到细
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#666666', fontWeight: 600, lineHeight: 1.8, marginBottom: '1rem' }}>
                  像真正的画家一样，先用<strong style={{ color: '#1A1A1A' }}>大笔刷</strong>铺出整体色调和构图，
                  再逐层换小笔刷补充细节。每一层都对参考图做高斯模糊（模糊程度与笔刷大小成正比），
                  只在"当前画布和参考图差距较大"的区域补新笔触。
                </p>
                <div className="p-3 rounded-[0.75rem] font-mono text-sm" style={{ background: '#1A1A1A', color: '#F9B801', border: '1.5px solid #1A1A1A' }}>
                  <div>for layer in [大, 中, 小]:</div>
                  <div style={{ paddingLeft: '1rem' }}>ref = blur(原图, σ=layer.size)</div>
                  <div style={{ paddingLeft: '1rem' }}>diff = |canvas - ref|</div>
                  <div style={{ paddingLeft: '1rem' }}>paint where diff {'>'} threshold</div>
                </div>
                <p style={{ fontSize: '0.82rem', color: '#888888', fontWeight: 600, marginTop: '0.75rem', lineHeight: 1.7 }}>
                  这样每层新增的笔触数量自然递减，最终形成疏密有致、有呼吸感的画面。
                </p>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
                className="flex flex-col gap-2">
                <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#888888', letterSpacing: '0.1em', textTransform: 'uppercase' }}>动态演示：多层叠加绘制</p>
                <MultiLayerSVG />
                <p style={{ fontSize: '0.72rem', color: '#AAAAAA', fontWeight: 600 }}>粗笔触先铺底，细笔触逐层补充细节</p>
              </motion.div>
            </div>

            {/* Error-driven section */}
            <div className="grid md:grid-cols-2 gap-8 mb-10">
              <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.05 }}
                className="flex flex-col gap-2">
                <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#888888', letterSpacing: '0.1em', textTransform: 'uppercase' }}>动态演示：误差区域检测</p>
                <ErrorRegionSVG />
                <p style={{ fontSize: '0.72rem', color: '#AAAAAA', fontWeight: 600 }}>虚线框标出高误差区域，算法只在这些区域补新笔触</p>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
                <h3 style={{ fontWeight: 900, fontSize: '1.1rem', color: '#1A1A1A', letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
                  <span style={{ color: '#F302C9' }}>②</span> 梯度追踪弯曲笔触
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#666666', fontWeight: 600, lineHeight: 1.8, marginBottom: '1rem' }}>
                  确定"在哪画"之后，下一步是决定<strong style={{ color: '#1A1A1A' }}>"往哪方向画"</strong>。
                  算法用 Sobel 算子计算每个像素的亮度梯度，笔触沿梯度的<strong style={{ color: '#F302C9' }}>垂直方向</strong>延伸——
                  这意味着笔触自动贴合纹理走向，而非穿越边缘：
                </p>
                <div className="p-3 rounded-[0.75rem] font-mono text-sm" style={{ background: '#1A1A1A', color: '#F302C9', border: '1.5px solid #1A1A1A' }}>
                  <div>gradient = sobel(image, x, y)</div>
                  <div>direction = perpendicular(gradient)</div>
                  <div>stroke.extend(direction, step)</div>
                </div>
                <p style={{ fontSize: '0.82rem', color: '#888888', fontWeight: 600, marginTop: '0.75rem', lineHeight: 1.7 }}>
                  同时施加曲率过滤：如果笔触弯得太急就自动截短，保证视觉美观。
                </p>
              </motion.div>
            </div>

            {/* Catmull-Rom section */}
            <div className="grid md:grid-cols-2 gap-8">
              <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                <h3 style={{ fontWeight: 900, fontSize: '1.1rem', color: '#1A1A1A', letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
                  <span style={{ color: '#7A51EC' }}>③</span> 边界感知 + 曲线渲染
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#666666', fontWeight: 600, lineHeight: 1.8, marginBottom: '1rem' }}>
                  笔触延伸过程中实时对比起点颜色与当前位置颜色——一旦色差超过阈值，说明笔触即将"跨越物体边界"，
                  自动停笔。最终路径用 Catmull-Rom 样条平滑，模拟<strong style={{ color: '#1A1A1A' }}>真实画笔</strong>的压感效果。
                </p>
                <div className="p-3 rounded-[0.75rem] font-mono text-sm" style={{ background: '#1A1A1A', color: '#7A51EC', border: '1.5px solid #1A1A1A' }}>
                  <div>if |color(current) - color(start)| {'>'} T:</div>
                  <div style={{ paddingLeft: '1rem' }}>break  // 停笔，保护边缘</div>
                  <div style={{ marginTop: '0.5rem' }}>render: Catmull-Rom spline + 压感宽度</div>
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
                className="flex flex-col gap-2">
                <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#888888', letterSpacing: '0.1em', textTransform: 'uppercase' }}>动态演示：曲线插值</p>
                <CatmullRomSVG />
                <p style={{ fontSize: '0.72rem', color: '#AAAAAA', fontWeight: 600 }}>粉色点为控制点，绿色曲线为 Catmull-Rom 插值结果</p>
              </motion.div>
            </div>

          </Section>

          {/* ──────────────── 09 合作落地 ─────────────── */}
          <Section id="partners">
            <ChapterLabel num="09" label="合作落地" color="#7A51EC" />
            <h2 style={{ fontSize: 'clamp(2rem, 4.5vw, 3.4rem)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.03em', color: '#1A1A1A', marginBottom: '1rem' }}>
              不只是一个 App，<br />
              <span style={{ color: '#7A51EC' }}>更是走到孩子身边的公益力量</span>
            </h2>
            <p style={{ fontSize: '1.1rem', color: '#555', fontWeight: 600, marginBottom: '3rem', maxWidth: '60ch' }}>
              我们与公益机构和爱心企业合作，将艺术疗愈带到孤独症儿童身边——线上 App、线下工作坊、家庭支持，三位一体。
            </p>

            {/* 合作伙伴卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="p-7 rounded-[1.5rem]"
                style={{ background: '#FFFFFF', border: '2px solid #1A1A1A', boxShadow: '6px 6px 0 #F9B801' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div style={{ width: 56, height: 56, borderRadius: '1rem', background: '#F9B801', border: '2px solid #1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', fontWeight: 900 }}>天</div>
                  <div>
                    <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#888', letterSpacing: '0.1em', textTransform: 'uppercase' }}>公益合作机构</p>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#1A1A1A', letterSpacing: '-0.02em' }}>天真者公益发展中心</h3>
                  </div>
                </div>
                <p style={{ fontSize: '0.95rem', color: '#333', fontWeight: 600, lineHeight: 1.7, marginBottom: '1rem' }}>
                  长期专注于孤独症人群艺术教育与社会融合的公益机构。星绘智愈与天真者联合开展线下油画疗愈工作坊，让孩子在专业导师陪伴下完成创作，并把 App 的认知报告反哺到机构干预流程中。
                </p>
                <div className="flex flex-wrap gap-2">
                  {['线下工作坊', '艺术导师', '社会融合'].map(t => (
                    <span key={t} style={{ background: '#FFF8E1', border: '1.5px solid #1A1A1A', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700, padding: '0.25em 0.7em', color: '#1A1A1A' }}>{t}</span>
                  ))}
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
                className="p-7 rounded-[1.5rem]"
                style={{ background: '#FFFFFF', border: '2px solid #1A1A1A', boxShadow: '6px 6px 0 #F302C9' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div style={{ width: 56, height: 56, borderRadius: '1rem', background: '#F302C9', color: '#FFF', border: '2px solid #1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', fontWeight: 900 }}>♥</div>
                  <div>
                    <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#888', letterSpacing: '0.1em', textTransform: 'uppercase' }}>爱心企业资助</p>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#1A1A1A', letterSpacing: '-0.02em' }}>爱心人寿</h3>
                  </div>
                </div>
                <p style={{ fontSize: '0.95rem', color: '#333', fontWeight: 600, lineHeight: 1.7, marginBottom: '1rem' }}>
                  长期支持儿童健康公益事业的保险企业。爱心人寿为本项目提供资源支持，使更多孤独症家庭可免费使用 AI 疗愈工具与参与线下活动。
                </p>
                <div className="flex flex-wrap gap-2">
                  {['公益资助', '家庭支持', '健康关怀'].map(t => (
                    <span key={t} style={{ background: '#FCE4F5', border: '1.5px solid #1A1A1A', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700, padding: '0.25em 0.7em', color: '#1A1A1A' }}>{t}</span>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* 线下落地图谱 */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="p-8 rounded-[1.5rem] mb-12"
              style={{ background: '#1A1A1A', color: '#FFF', border: '2px solid #1A1A1A' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#7A51EC', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>线下落地</p>
              <h3 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: '2rem', letterSpacing: '-0.02em' }}>App + 工作坊 + 家庭：三位一体的疗愈闭环</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                  { icon: '🎨', title: '线下油画疗愈工作坊', desc: '联合天真者公益发展中心，定期在社区与特教学校举办工作坊，孤独症孩子在导师陪伴下完成 App 推荐的临摹任务。', color: '#F9B801' },
                  { icon: '🏫', title: '特殊教育机构合作', desc: '将 App 引入特教学校与康复中心，作为认知训练和艺术启蒙课程的辅助工具。', color: '#7DC353' },
                  { icon: '👨‍👩‍👧', title: '孤独症家庭支持', desc: '通过爱心人寿资助，为低收入孤独症家庭免费提供 App 使用与线下活动名额。', color: '#F302C9' },
                ].map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 * i }}
                    className="p-5 rounded-[1rem]"
                    style={{ background: 'rgba(255,255,255,0.06)', border: `1.5px solid ${item.color}` }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{item.icon}</div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: '0.5rem', color: item.color }}>{item.title}</h4>
                    <p style={{ fontSize: '0.85rem', color: '#CCC', fontWeight: 500, lineHeight: 1.6 }}>{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* 公益价值条 */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
              {[
                { num: '∞', label: '永久免费', sub: '核心功能向公益对象 0 门槛开放', color: '#F9B801' },
                { num: '24/7', label: '随时陪伴', sub: 'App 在家、在路上都能用', color: '#F302C9' },
                { num: '1对1', label: '专属报告', sub: '每个孩子的认知画像独立生成', color: '#7DC353' },
                { num: '0', label: '隐私上传', sub: '本地优先、监护人授权后才上传', color: '#7A51EC' },
              ].map((item, i) => (
                <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.05 * i }}
                  className="p-4 rounded-[1rem] text-center"
                  style={{ background: '#FFF', border: '2px solid #1A1A1A', boxShadow: `4px 4px 0 ${item.color}` }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: item.color, lineHeight: 1, marginBottom: '0.25rem' }}>{item.num}</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#1A1A1A' }}>{item.label}</div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#888', marginTop: '0.25rem', lineHeight: 1.4 }}>{item.sub}</div>
                </motion.div>
              ))}
            </motion.div>

            {/* CTA */}
            <motion.div className="mt-4 flex flex-col sm:flex-row items-center gap-4"
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
              <div className="p-5 flex-1 rounded-[1.5rem]" style={{ background: '#F5F5F5', border: '2px solid #1A1A1A' }}>
                <p style={{ fontWeight: 900, fontSize: '1rem', color: '#1A1A1A', marginBottom: '0.25rem' }}>陪一个孩子，画下他的世界</p>
                <p style={{ fontSize: '0.85rem', color: '#888888', fontWeight: 600 }}>上传一张图片，AI 帮孩子分解成可临摹的笔触，让创作从此没有门槛</p>
              </div>
              <button onClick={() => router.push('/create')} className="btn-black"
                style={{ fontSize: '1rem', paddingLeft: '2.5rem', paddingRight: '2.5rem', paddingTop: '1em', paddingBottom: '1em', flexShrink: 0 }}>
                立即开始创作
              </button>
            </motion.div>
          </Section>

          {/* ── Footer ──────────────────────────────── */}
          <footer className="px-8 py-8" style={{ background: '#F5F5F5', borderTop: '2px solid #1A1A1A' }}>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div style={{ fontWeight: 900, fontSize: '1.2rem', letterSpacing: '-0.03em', color: '#1A1A1A' }}>
                星绘<span style={{ color: '#7A51EC' }}>智愈</span>
                <span style={{ fontWeight: 600, fontSize: '0.8rem', color: '#888888', marginLeft: '0.75rem' }}>交大算法 × 星月绘愈社 · 公益项目</span>
              </div>
              <div className="flex gap-2 flex-wrap justify-center">
                {['Hertzmann 算法', '混元生图', '混元 LLM', 'ASD 专项', 'Canvas 2D', '公益落地'].map(t => (
                  <span key={t} style={{ background: 'white', border: '1.5px solid #1A1A1A', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700, padding: '0.25em 0.7em', color: '#1A1A1A' }}>{t}</span>
                ))}
              </div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#888' }}>
                合作：天真者公益发展中心 · 爱心人寿
              </div>
            </div>
          </footer>

        </main>
      </div>
    </div>
  );
}
