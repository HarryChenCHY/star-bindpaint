'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { StarChar, FlowerChar, BlobChar, MiniStar, MiniCircle } from '@/components/Characters';

const chapters = [
  { id: 'overview',   label: '产品概述',  num: '01', color: '#F9B801' },
  { id: 'features',   label: '功能介绍',  num: '02', color: '#F302C9' },
  { id: 'workflow',   label: '使用流程',  num: '03', color: '#7DC353' },
  { id: 'therapy',    label: '艺术疗愈',  num: '04', color: '#7A51EC' },
  { id: 'ai-tech',    label: 'AI 技术',   num: '05', color: '#F9B801' },
  { id: 'algorithm',  label: '算法原理',  num: '06', color: '#F302C9' },
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

/* ── ETF direction field animation ───────────────── */
function ETFFieldSVG() {
  const arrows = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 8; col++) {
      const x = 20 + col * 22;
      const y = 18 + row * 18;
      const angle = Math.sin(row * 0.8 + col * 0.6) * 45 + Math.cos(row * 0.5) * 20;
      arrows.push({ x, y, angle, key: `${row}-${col}` });
    }
  }
  return (
    <svg viewBox="0 0 200 110" className="w-full" style={{ maxWidth: 360, background: '#F5F5F5', borderRadius: 12 }}>
      {arrows.map(({ x, y, angle, key }, i) => (
        <motion.g key={key} transform={`translate(${x},${y}) rotate(${angle})`}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: i * 0.015, duration: 0.3 }}>
          <line x1="-6" y1="0" x2="6" y2="0" stroke="#7A51EC" strokeWidth="1.2" strokeLinecap="round" />
          <polygon points="6,0 3,-2 3,2" fill="#7A51EC" />
        </motion.g>
      ))}
      <motion.path
        d="M18 90 Q40 50 75 65 Q110 80 145 45 Q170 25 185 35"
        stroke="#F302C9" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeDasharray="4 3"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 3, ease: 'easeInOut', repeat: Infinity, repeatDelay: 2 }}
      />
    </svg>
  );
}

/* ── Poisson sampling dot animation ─────────────── */
function PoissonDotsSVG() {
  const dots = [
    { x: 30,  y: 25,  r: 2.5, delay: 0 },
    { x: 62,  y: 18,  r: 3,   delay: 0.1 },
    { x: 100, y: 30,  r: 2,   delay: 0.2 },
    { x: 140, y: 15,  r: 3.5, delay: 0.05 },
    { x: 170, y: 28,  r: 2,   delay: 0.15 },
    { x: 45,  y: 55,  r: 2,   delay: 0.25 },
    { x: 80,  y: 70,  r: 2.5, delay: 0.08 },
    { x: 115, y: 60,  r: 3,   delay: 0.18 },
    { x: 155, y: 72,  r: 2,   delay: 0.3 },
    { x: 25,  y: 85,  r: 3.5, delay: 0.12 },
    { x: 60,  y: 92,  r: 2,   delay: 0.22 },
    { x: 95,  y: 88,  r: 2.5, delay: 0.07 },
    { x: 130, y: 95,  r: 3,   delay: 0.17 },
    { x: 165, y: 85,  r: 2,   delay: 0.27 },
    { x: 185, y: 55,  r: 3.5, delay: 0.03 },
  ];
  return (
    <svg viewBox="0 0 200 110" className="w-full" style={{ maxWidth: 360, background: '#F5F5F5', borderRadius: 12 }}>
      {dots.map((d, i) => (
        <motion.circle key={i} cx={d.x} cy={d.y} r={d.r} fill="#F9B801" stroke="#1A1A1A" strokeWidth="1"
          initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: d.delay + i * 0.06, type: 'spring', stiffness: 260 }} />
      ))}
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

/* ── Section wrapper ─────────────────────────── */
function Section({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ scrollMarginTop: 80 }} className="py-16 px-8 md:px-12 border-b-2 border-[#E5E5E5]">
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
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-white"
        style={{ borderBottom: '2px solid #1A1A1A' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/')}
            className="flex items-center gap-1.5 font-bold text-sm transition-opacity hover:opacity-60"
            style={{ color: '#1A1A1A' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            返回首页
          </button>
          <span style={{ color: '#E5E5E5' }}>|</span>
          <span style={{ fontWeight: 900, fontSize: '1.1rem', letterSpacing: '-0.03em', color: '#1A1A1A' }}>
            星绘<span style={{ color: '#7A51EC' }}>智愈</span>
            <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#888888', marginLeft: '0.5rem' }}>产品介绍</span>
          </span>
        </div>
        <button onClick={() => router.push('/create')} className="btn-purple"
          style={{ padding: '0.5em 1.4em', fontSize: '0.9rem' }}>
          开始创作
        </button>
      </nav>

      <div className="flex flex-1 relative">

        {/* ── Sidebar ─────────────────────────────── */}
        <aside className="sticky top-[61px] h-[calc(100vh-61px)] flex-shrink-0 overflow-y-auto"
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
                  星绘智愈是一套基于 AI 算法的<strong style={{ color: '#1A1A1A' }}>交互式油画教育普惠系统</strong>，
                  将计算机视觉与艺术疗愈深度融合，让每个孩子——尤其是孤独症谱系儿童——
                  都能通过画笔与世界建立连接。
                </p>
                <p className="mt-4" style={{ fontSize: '1rem', color: '#555555', fontWeight: 600, lineHeight: 1.75 }}>
                  系统采用<strong style={{ color: '#7A51EC' }}>ETF 边缘切线流</strong>、
                  <strong style={{ color: '#F302C9' }}>泊松自适应采样</strong>、
                  <strong style={{ color: '#7DC353' }}>流线路径规划</strong>等前沿算法，
                  实时将任意照片拆解为有序笔触序列，引导用户逐笔完成一幅油画。
                </p>
                <div className="flex gap-2 flex-wrap mt-6">
                  {['AI 驱动', '艺术疗愈', '零门槛', '交大实验室', '开源算法'].map(tag => (
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

          {/* ════ 02 功能介绍 ════════════════════════ */}
          <Section id="features">
            <ChapterLabel num="02" label="功能介绍" color="#F302C9" />
            <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.5rem)', fontWeight: 900, color: '#1A1A1A', letterSpacing: '-0.04em', textTransform: 'uppercase', marginBottom: '2rem' }}>
              三种<span style={{ color: '#F302C9' }}>创作</span>模式
            </motion.h2>

            <div className="grid md:grid-cols-3 gap-5 mb-10">
              {[
                {
                  color: '#F9B801',
                  title: '跟画模式',
                  sub: 'Follow Mode',
                  char: <StarChar size={72} />,
                  tag: '推荐新手',
                  points: ['AI 实时生成金色引导线', '精灵逐笔打分鼓励', '辅助/真实双子模式', '超出偏差自动矫正'],
                },
                {
                  color: '#F302C9',
                  title: '自动模式',
                  sub: 'Auto Mode',
                  char: <FlowerChar size={65} />,
                  tag: '观看欣赏',
                  points: ['逐笔动态重建油画', '可调节播放速度', '实时进度环显示', '支持导出成品'],
                },
                {
                  color: '#7DC353',
                  title: '自由模式',
                  sub: 'Free Mode',
                  char: <BlobChar size={60} />,
                  tag: '随心创作',
                  points: ['无引导无压力', '精灵陪伴随机鼓励', '保留所有原始笔迹', '适合情绪表达'],
                },
              ].map((item, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-[1.5rem] overflow-hidden"
                  style={{ border: '2px solid #1A1A1A' }}>
                  <div className="flex items-end justify-center pt-6 pb-0" style={{ background: item.color, minHeight: 120 }}>
                    {item.char}
                  </div>
                  <div className="p-5 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <h3 style={{ fontWeight: 900, fontSize: '1.2rem', color: '#1A1A1A', letterSpacing: '-0.03em' }}>{item.title}</h3>
                      <span style={{ background: item.color, border: '1.5px solid #1A1A1A', borderRadius: 99, fontSize: '0.65rem', fontWeight: 800, padding: '0.2em 0.6em', color: '#1A1A1A' }}>{item.tag}</span>
                    </div>
                    <p style={{ fontSize: '0.7rem', color: '#AAAAAA', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>{item.sub}</p>
                    <ul className="space-y-1.5">
                      {item.points.map((pt, j) => (
                        <li key={j} className="flex items-start gap-2">
                          <span style={{ color: item.color, fontWeight: 900, flexShrink: 0 }}>·</span>
                          <span style={{ fontSize: '0.85rem', color: '#555555', fontWeight: 600 }}>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Additional features */}
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
              <p style={{ fontWeight: 800, fontSize: '0.75rem', color: '#888888', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>辅助功能</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { icon: '🖌️', label: '笔刷宽度调节', color: '#F9B801' },
                  { icon: '⏩', label: 'AI 批量代画', color: '#F302C9' },
                  { icon: '🖼️', label: '画廊保存导出', color: '#7DC353' },
                  { icon: '🔁', label: '一键重置画布', color: '#7A51EC' },
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 rounded-[1.25rem]"
                    style={{ background: '#FAFAFA', border: '1.5px solid #E5E5E5' }}>
                    <div className="w-9 h-9 rounded-[0.75rem] flex items-center justify-center text-lg flex-shrink-0"
                      style={{ background: f.color, border: '1.5px solid #1A1A1A' }}>
                      {f.icon}
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1A1A1A' }}>{f.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </Section>

          {/* ════ 03 使用流程 ════════════════════════ */}
          <Section id="workflow">
            <ChapterLabel num="03" label="使用流程" color="#7DC353" />
            <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.5rem)', fontWeight: 900, color: '#1A1A1A', letterSpacing: '-0.04em', textTransform: 'uppercase', marginBottom: '2.5rem' }}>
              四步<span style={{ color: '#7DC353' }}>完成</span>一幅画
            </motion.h2>

            <div className="space-y-6">
              {[
                {
                  num: '01', icon: '📷', color: '#F9B801',
                  title: '上传参考图片',
                  detail: '支持任意照片或图像，JPG/PNG 均可。系统会自动识别图像内容、色彩分布和边缘结构，为后续算法拆解做准备。',
                  demo: (
                    <div className="flex items-center justify-center gap-3 py-4">
                      <div className="w-16 h-16 rounded-[1rem] flex items-center justify-center text-3xl"
                        style={{ background: '#F9B801', border: '2px solid #1A1A1A' }}>📷</div>
                      <motion.div animate={{ x: [0, 6, 0] }} transition={{ duration: 1.2, repeat: Infinity }}>
                        <span style={{ fontSize: '1.5rem', color: '#CCCCCC' }}>→</span>
                      </motion.div>
                      <div className="w-16 h-16 rounded-[1rem]" style={{ background: '#E5E5E5', border: '2px solid #1A1A1A', overflow: 'hidden' }}>
                        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #F9B801 0%, #F302C9 100%)', opacity: 0.5 }} />
                      </div>
                    </div>
                  ),
                },
                {
                  num: '02', icon: '🧠', color: '#F302C9',
                  title: 'AI 拆解为笔触序列',
                  detail: 'ETF 算法计算每像素笔触方向，泊松采样生成锚点，流线追踪规划完整路径，最终生成数百条有序笔触数据。',
                  demo: <ETFFieldSVG />,
                },
                {
                  num: '03', icon: '✏️', color: '#7DC353',
                  title: '精灵引导交互作画',
                  detail: 'Starry 精灵在画布旁实时引导，金色虚线指示当前笔触路径，你每画完一笔就会得到评分和鼓励，一步步完成整幅作品。',
                  demo: (
                    <div className="flex items-center justify-center py-4 gap-6">
                      <div className="animate-bounce-gentle">
                        <StarChar size={60} />
                      </div>
                      <div className="flex flex-col gap-1">
                        {['太棒了！继续加油 ⭐', '笔触路径正确 +10分', '再画3笔就完成啦~'].map((msg, i) => (
                          <motion.div key={i}
                            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.4 + 0.2 }}
                            style={{ background: '#FFFFFF', border: '1.5px solid #1A1A1A', borderRadius: 99, padding: '0.3em 0.9em', fontSize: '0.75rem', fontWeight: 700, color: '#1A1A1A', whiteSpace: 'nowrap' }}>
                            {msg}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ),
                },
                {
                  num: '04', icon: '🖼️', color: '#7A51EC',
                  title: '保存作品到画廊',
                  detail: '完成后一键导出高清 PNG，自动保存到本地画廊，可随时回顾历史作品，每件作品都记录了你的创作日期与笔触数量。',
                  demo: (
                    <div className="flex items-center justify-center py-4 gap-4">
                      {['#F9B801', '#F302C9', '#7DC353', '#7A51EC'].map((c, i) => (
                        <motion.div key={i}
                          initial={{ rotate: -5, scale: 0.9 }}
                          animate={{ rotate: i % 2 === 0 ? 2 : -2, scale: 1 }}
                          transition={{ delay: i * 0.1, type: 'spring' }}
                          className="w-14 h-14 rounded-[0.75rem]"
                          style={{ background: c, border: '2px solid #1A1A1A', opacity: 0.9 }} />
                      ))}
                    </div>
                  ),
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
                    <p style={{ fontSize: '0.875rem', color: '#666666', fontWeight: 600, lineHeight: 1.7, marginBottom: '0.75rem' }}>{step.detail}</p>
                    <div className="rounded-[1rem]" style={{ background: '#FAFAFA', border: '1.5px solid #E5E5E5' }}>
                      {step.demo}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </Section>

          {/* ════ 04 艺术疗愈 ════════════════════════ */}
          <Section id="therapy">
            <ChapterLabel num="04" label="艺术疗愈" color="#7A51EC" />
            <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.5rem)', fontWeight: 900, color: '#1A1A1A', letterSpacing: '-0.04em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
              画笔<span style={{ color: '#7A51EC' }}>连接</span>孤岛
            </motion.h2>
            <p style={{ fontSize: '1rem', color: '#666666', fontWeight: 600, lineHeight: 1.75, maxWidth: 600, marginBottom: '2.5rem' }}>
              孤独症谱系障碍（ASD）儿童在语言交流方面面临挑战，而<strong style={{ color: '#1A1A1A' }}>艺术疗愈</strong>
              已被大量研究证明能有效促进情绪调节、社交能力和感知统合。
              星绘智愈将 AI 辅助与专业疗愈理念融合，为孩子们创造安全、无压力的表达空间。
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-8">

              {/* Stats */}
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="rounded-[1.5rem] p-6" style={{ background: '#F5F5F5', border: '2px solid #1A1A1A' }}>
                <p style={{ fontWeight: 800, fontSize: '0.75rem', color: '#888888', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1.25rem' }}>研究数据支撑</p>
                {[
                  { val: '78%', desc: '参与艺术疗愈的 ASD 儿童情绪调节能力改善', color: '#7A51EC' },
                  { val: '3×',  desc: '视觉 + 触觉双通道学习比纯语言学习效果提升', color: '#F302C9' },
                  { val: '92%', desc: '家长反馈孩子绘画后情绪更稳定', color: '#7DC353' },
                ].map((s, i) => (
                  <motion.div key={i}
                    initial={{ width: 0 }} whileInView={{ width: '100%' }} viewport={{ once: true }}
                    transition={{ delay: i * 0.15 + 0.3 }}
                    className="flex items-center gap-4 mb-4">
                    <span style={{ fontWeight: 900, fontSize: '1.8rem', color: s.color, letterSpacing: '-0.04em', flexShrink: 0, minWidth: '3.5rem' }}>{s.val}</span>
                    <span style={{ fontSize: '0.82rem', color: '#555555', fontWeight: 600, lineHeight: 1.5 }}>{s.desc}</span>
                  </motion.div>
                ))}
                <HeartPulseSVG />
              </motion.div>

              {/* How it helps */}
              <div className="flex flex-col gap-4">
                {[
                  {
                    icon: '🎨', color: '#F9B801',
                    title: '感知统合训练',
                    desc: '笔触跟随练习需要手眼协调，视觉追踪和运动控制的反复练习有助于感统发展。',
                  },
                  {
                    icon: '⭐', color: '#F302C9',
                    title: '即时正向反馈',
                    desc: 'Starry 精灵每笔都给予鼓励，低门槛的成就感帮助儿童建立自信与专注持续时间。',
                  },
                  {
                    icon: '🌊', color: '#7DC353',
                    title: '心流沉浸体验',
                    desc: '逐笔节奏创作能引导进入专注心流状态，有效缓解焦虑，改善情绪状态。',
                  },
                  {
                    icon: '🤝', color: '#7A51EC',
                    title: '社交桥梁建构',
                    desc: '完成的画作成为与家长、治疗师交流的媒介，拓展社交话题与情感表达通道。',
                  },
                ].map((item, i) => (
                  <motion.div key={i}
                    initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-4 p-4 rounded-[1.25rem]"
                    style={{ background: '#FAFAFA', border: '1.5px solid #E5E5E5' }}>
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
            </div>

            {/* Quote */}
            <motion.blockquote initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
              className="p-6 rounded-[1.5rem]"
              style={{ background: '#7A51EC', border: '2px solid #1A1A1A' }}>
              <p style={{ fontSize: '1.05rem', color: '#FFFFFF', fontWeight: 700, lineHeight: 1.75, fontStyle: 'italic' }}>
                "让每个孩子都能用画笔将内心的孤岛连接成星海——艺术不是特权，而是每颗星星与世界沟通的语言。"
              </p>
              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)', fontWeight: 700, marginTop: '0.75rem' }}>
                — 星绘智愈 · 上海交通大学星月绘愈社
              </p>
            </motion.blockquote>
          </Section>

          {/* ════ 05 AI 技术 ════════════════════════ */}
          <Section id="ai-tech">
            <ChapterLabel num="05" label="AI 技术" color="#F9B801" />
            <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.5rem)', fontWeight: 900, color: '#1A1A1A', letterSpacing: '-0.04em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
              源自<span style={{ color: '#F9B801' }}>交大</span>实验室
            </motion.h2>
            <p style={{ fontSize: '1rem', color: '#666666', fontWeight: 600, lineHeight: 1.75, maxWidth: 600, marginBottom: '2.5rem' }}>
              整套算法在<strong style={{ color: '#1A1A1A' }}>纯前端 JavaScript</strong> 中实现，无需服务端，无需 GPU，
              基于经典计算机视觉研究（Kang 2007, Bridson 2007）在浏览器中实时运行。
            </p>

            <div className="grid md:grid-cols-2 gap-5">
              {[
                {
                  icon: '🧠', color: '#F9B801',
                  title: 'ETF 边缘切线流',
                  badge: 'Kang 2007',
                  desc: '基于图像梯度计算每个像素点的笔触主方向，经过多轮迭代平滑得到连贯的方向场。这决定了每一笔"应该往哪个方向画"。',
                  tags: ['梯度计算', '迭代平滑', '方向场'],
                },
                {
                  icon: '📍', color: '#F302C9',
                  title: '泊松盘采样 + Lloyd 迭代',
                  badge: 'Bridson 2007',
                  desc: '在图像上生成密度自适应的笔触锚点：边缘与暗部密集、亮部平坦处稀疏，确保笔触覆盖合理且自然。',
                  tags: ['密度自适应', '泊松盘', 'Lloyd 松弛'],
                },
                {
                  icon: '🖌️', color: '#7DC353',
                  title: '流线追踪路径规划',
                  badge: '路径算法',
                  desc: '从锚点出发，沿 ETF 方向场正反向延伸追踪，加入 HSV 色彩约束防止跨越物体边界，最终生成完整笔触路径。',
                  tags: ['双向追踪', 'HSV 约束', '边界感知'],
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
                  { label: 'ETF 方向场', color: '#F9B801', text: '#1A1A1A' },
                  { label: '→', color: 'transparent', text: '#CCCCCC' },
                  { label: '泊松采样', color: '#F302C9', text: '#1A1A1A' },
                  { label: '→', color: 'transparent', text: '#CCCCCC' },
                  { label: '流线追踪', color: '#7DC353', text: '#1A1A1A' },
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
          </Section>

          {/* ════ 06 算法原理 ════════════════════════ */}
          <Section id="algorithm">
            <ChapterLabel num="06" label="算法原理" color="#F302C9" />
            <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.5rem)', fontWeight: 900, color: '#1A1A1A', letterSpacing: '-0.04em', textTransform: 'uppercase', marginBottom: '2.5rem' }}>
              深入<span style={{ color: '#F302C9' }}>原理</span>解析
            </motion.h2>

            {/* ETF section */}
            <div className="grid md:grid-cols-2 gap-8 mb-10">
              <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                <h3 style={{ fontWeight: 900, fontSize: '1.1rem', color: '#1A1A1A', letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
                  <span style={{ color: '#F9B801' }}>①</span> ETF 边缘切线流
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#666666', fontWeight: 600, lineHeight: 1.8, marginBottom: '1rem' }}>
                  每个像素的笔触方向由图像梯度的<strong style={{ color: '#1A1A1A' }}>垂直方向</strong>决定——沿边缘切线方向，而非穿越边缘。
                  迭代公式：
                </p>
                <div className="p-3 rounded-[0.75rem] font-mono text-sm" style={{ background: '#1A1A1A', color: '#F9B801', border: '1.5px solid #1A1A1A' }}>
                  <div>t'(x) = Σ t(y) · φ(x,y)</div>
                  <div style={{ color: '#888888', fontSize: '0.75rem', marginTop: '0.25rem' }}>φ(x,y) = sign(t(x)·t(y)) · w_s · w_m · w_d</div>
                </div>
                <p style={{ fontSize: '0.82rem', color: '#888888', fontWeight: 600, marginTop: '0.75rem', lineHeight: 1.7 }}>
                  经过 15 次迭代后，方向场趋于平滑，笔触走向自然流畅，与图像结构完美对齐。
                </p>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
                className="flex flex-col gap-2">
                <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#888888', letterSpacing: '0.1em', textTransform: 'uppercase' }}>动态演示：ETF 方向场</p>
                <ETFFieldSVG />
                <p style={{ fontSize: '0.72rem', color: '#AAAAAA', fontWeight: 600 }}>紫色箭头为方向场，粉色虚线为沿方向场追踪的笔触路径</p>
              </motion.div>
            </div>

            {/* Poisson section */}
            <div className="grid md:grid-cols-2 gap-8 mb-10">
              <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.05 }}
                className="flex flex-col gap-2">
                <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#888888', letterSpacing: '0.1em', textTransform: 'uppercase' }}>动态演示：泊松锚点生成</p>
                <PoissonDotsSVG />
                <p style={{ fontSize: '0.72rem', color: '#AAAAAA', fontWeight: 600 }}>锚点按亮度密度自适应分布，边缘处密集，平坦处稀疏</p>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
                <h3 style={{ fontWeight: 900, fontSize: '1.1rem', color: '#1A1A1A', letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
                  <span style={{ color: '#F302C9' }}>②</span> 泊松盘采样
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#666666', fontWeight: 600, lineHeight: 1.8, marginBottom: '1rem' }}>
                  基于 Bridson 2007 快速泊松盘采样，在图像上生成<strong style={{ color: '#1A1A1A' }}>互相排斥的锚点</strong>，
                  密度由局部亮度控制：
                </p>
                <div className="p-3 rounded-[0.75rem] font-mono text-sm" style={{ background: '#1A1A1A', color: '#F302C9', border: '1.5px solid #1A1A1A' }}>
                  <div>r(x) = r_min + (1 - L(x)) · r_range</div>
                  <div style={{ color: '#888888', fontSize: '0.75rem', marginTop: '0.25rem' }}>L(x) = 像素亮度 ∈ [0,1]</div>
                </div>
                <p style={{ fontSize: '0.82rem', color: '#888888', fontWeight: 600, marginTop: '0.75rem', lineHeight: 1.7 }}>
                  再经过 Lloyd 质心迭代将锚点移至各自 Voronoi 格的亮度重心，确保视觉均匀感。
                </p>
              </motion.div>
            </div>

            {/* Catmull-Rom section */}
            <div className="grid md:grid-cols-2 gap-8">
              <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                <h3 style={{ fontWeight: 900, fontSize: '1.1rem', color: '#1A1A1A', letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
                  <span style={{ color: '#7A51EC' }}>③</span> Catmull-Rom 笔触渲染
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#666666', fontWeight: 600, lineHeight: 1.8, marginBottom: '1rem' }}>
                  将流线路径上的离散点用 Catmull-Rom 样条平滑，每段由相邻 4 个控制点决定，
                  笔触宽度按路径长度变化实现<strong style={{ color: '#1A1A1A' }}>压感效果</strong>。
                </p>
                <div className="p-3 rounded-[0.75rem] font-mono text-sm" style={{ background: '#1A1A1A', color: '#7A51EC', border: '1.5px solid #1A1A1A' }}>
                  <div>P(t) = 0.5 · [1,t,t²,t³] · M · [P0,P1,P2,P3]ᵀ</div>
                  <div style={{ color: '#888888', fontSize: '0.75rem', marginTop: '0.25rem' }}>M: Catmull-Rom 系数矩阵</div>
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
                className="flex flex-col gap-2">
                <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#888888', letterSpacing: '0.1em', textTransform: 'uppercase' }}>动态演示：曲线插值</p>
                <CatmullRomSVG />
                <p style={{ fontSize: '0.72rem', color: '#AAAAAA', fontWeight: 600 }}>粉色点为控制点，绿色曲线为 Catmull-Rom 插值结果</p>
              </motion.div>
            </div>

            {/* CTA */}
            <motion.div className="mt-12 flex flex-col sm:flex-row items-center gap-4"
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
              <div className="p-5 flex-1 rounded-[1.5rem]" style={{ background: '#F5F5F5', border: '2px solid #1A1A1A' }}>
                <p style={{ fontWeight: 900, fontSize: '1rem', color: '#1A1A1A', marginBottom: '0.25rem' }}>准备好了吗？</p>
                <p style={{ fontSize: '0.85rem', color: '#888888', fontWeight: 600 }}>上传一张图片，让 AI 把它变成你的第一幅油画</p>
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
                <span style={{ fontWeight: 600, fontSize: '0.8rem', color: '#888888', marginLeft: '0.75rem' }}>上海交通大学 · 星月绘愈社</span>
              </div>
              <div className="flex gap-2 flex-wrap justify-center">
                {['ETF 算法', 'Catmull-Rom', '泊松采样', '艺术疗愈', 'Canvas 2D', 'Framer Motion'].map(t => (
                  <span key={t} style={{ background: 'white', border: '1.5px solid #1A1A1A', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700, padding: '0.25em 0.7em', color: '#1A1A1A' }}>{t}</span>
                ))}
              </div>
            </div>
          </footer>

        </main>
      </div>
    </div>
  );
}
