'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="flex-1 flex flex-col relative overflow-x-hidden">

      {/* ═══════════════════════════════════════
          Hero
      ═══════════════════════════════════════ */}
      <section className="min-h-screen flex items-center px-6 md:px-16 py-24">
        <div className="max-w-7xl mx-auto w-full flex flex-col lg:flex-row items-center gap-16 lg:gap-24">

          {/* 左侧文字 */}
          <motion.div
            initial={{ opacity: 0, x: -36 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex-1 max-w-xl"
          >
            {/* Eyebrow badge */}
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium mb-8"
              style={{
                background: 'rgba(124,58,237,0.15)',
                border: '1px solid rgba(124,58,237,0.3)',
                color: '#A78BFA',
                letterSpacing: '-0.01em',
              }}>
              <span className="w-1.5 h-1.5 rounded-full animate-mint-glow" style={{ background: '#00FFA5' }} />
              2026 Light 创造营 · 星月绘愈社
            </div>

            {/* Main headline — Caveat display font */}
            <h1 className="mb-6" style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(3.5rem, 8vw, 5.5rem)',
              fontWeight: 700,
              lineHeight: '1em',
              letterSpacing: '-0.02em',
              color: '#EDE9FE',
            }}>
              星绘<span style={{ color: '#00FFA5' }}>智愈</span>
            </h1>

            <p className="mb-10 leading-relaxed" style={{
              fontSize: '1.125rem',
              color: 'rgba(237,233,254,0.6)',
              letterSpacing: '-0.01em',
              lineHeight: '1.6em',
            }}>
              AI 辅助油画教育普惠系统<br />
              让每个孩子都能用画笔，将内心的孤岛连接成星海
            </p>

            {/* CTA buttons — Feather pill style */}
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => router.push('/create')}
                className="btn-primary"
                style={{ fontSize: '1rem', paddingLeft: '2rem', paddingRight: '2rem' }}
              >
                开始创作
              </button>
              <a
                href="#features"
                className="btn-secondary"
                style={{ fontSize: '1rem' }}
              >
                了解更多
              </a>
            </div>
          </motion.div>

          {/* 右侧精灵 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.25, ease: [0.175, 0.885, 0.32, 1.275] }}
            className="flex-1 flex justify-center relative"
          >
            <div className="relative w-[300px] h-[300px] md:w-[380px] md:h-[380px]">
              {/* Ambient glow */}
              <div className="absolute inset-0 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)' }} />

              {/* Orbit dots — minimal: just 2 */}
              {[
                { color: '#A78BFA', delay: '0s', size: '10px' },
                { color: '#00FFA5', delay: '-4s', size: '8px' },
              ].map((dot, i) => (
                <div
                  key={i}
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ animation: `spin 10s linear infinite`, animationDelay: dot.delay }}
                >
                  <div
                    className="absolute"
                    style={{
                      width: dot.size,
                      height: dot.size,
                      borderRadius: '50%',
                      background: dot.color,
                      boxShadow: `0 0 10px ${dot.color}`,
                      top: '8%',
                      left: '50%',
                    }}
                  />
                </div>
              ))}

              {/* Sprite SVG */}
              <div className="absolute inset-0 flex items-center justify-center animate-float">
                <svg width="180" height="180" viewBox="0 0 180 180" fill="none">
                  <circle cx="90" cy="90" r="75" fill="url(#hero-glow)" opacity="0.18"/>
                  <path d="M90 20L105 65H152L113 92L128 137L90 110L52 137L67 92L28 65H75L90 20Z"
                    fill="url(#hero-fill)" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5"/>
                  <circle cx="75" cy="85" r="7" fill="#1E1B4B"/>
                  <circle cx="105" cy="85" r="7" fill="#1E1B4B"/>
                  <circle cx="77" cy="83" r="3" fill="white"/>
                  <circle cx="107" cy="83" r="3" fill="white"/>
                  <path d="M78 100 Q90 112 102 100" stroke="#1E1B4B" strokeWidth="3" fill="none" strokeLinecap="round"/>
                  <circle cx="68" cy="98" r="4" fill="#00FFA5" opacity="0.35"/>
                  <circle cx="112" cy="98" r="4" fill="#00FFA5" opacity="0.35"/>
                  {/* Brush in hand */}
                  <rect x="118" y="55" width="5" height="26" rx="2.5" fill="#8B5CF6" transform="rotate(20 121 68)"/>
                  <path d="M124 46 L128 40 L130 47 Z" fill="#00FFA5" transform="rotate(20 127 43)"/>
                  {/* Paint tails */}
                  <path d="M90 140 Q78 155 65 160 Q55 165 50 158" stroke="#A78BFA" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.6"/>
                  <path d="M90 140 Q102 158 115 162 Q125 165 122 155" stroke="#7C3AED" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.4"/>
                  <defs>
                    <radialGradient id="hero-glow"><stop offset="0%" stopColor="#A78BFA"/><stop offset="100%" stopColor="#A78BFA" stopOpacity="0"/></radialGradient>
                    <linearGradient id="hero-fill" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#C4B5FD"/><stop offset="100%" stopColor="#7C3AED"/></linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          Features
      ═══════════════════════════════════════ */}
      <section id="features" className="px-6 md:px-16 py-24">
        <div className="max-w-7xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-14 text-center"
          >
            <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: 'rgba(237,233,254,0.4)', letterSpacing: '0.12em' }}>
              创作模式
            </p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 5vw, 3.25rem)', fontWeight: 700, color: '#EDE9FE' }}>
              三种方式，一次入门
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                icon: '✏️',
                title: '跟画模式',
                desc: 'Starry 精灵引导你逐笔作画，AI 实时判定并给予鼓励反馈',
                accent: '#A78BFA',
              },
              {
                icon: '▶️',
                title: '自动模式',
                desc: '观看 AI 逐笔重建油画的全过程，感受从空白到完成的视觉魔法',
                accent: '#00FFA5',
              },
              {
                icon: '🎨',
                title: '自由模式',
                desc: '自由发挥创意，画笔精灵在旁陪伴鼓励，无压力享受创作乐趣',
                accent: '#7C3AED',
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="relative overflow-hidden p-8 text-center transition-all duration-200 hover:-translate-y-1"
                style={{
                  background: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-card)',
                }}
              >
                {/* Top accent line */}
                <div className="absolute top-0 left-8 right-8 h-px" style={{ background: `linear-gradient(90deg, transparent, ${item.accent}60, transparent)` }} />

                <div className="w-14 h-14 flex items-center justify-center mx-auto mb-5 text-2xl"
                  style={{
                    background: `${item.accent}18`,
                    border: `1px solid ${item.accent}30`,
                    borderRadius: '1rem',
                  }}>
                  {item.icon}
                </div>
                <h3 className="text-base font-semibold mb-2" style={{ letterSpacing: '-0.02em', color: '#EDE9FE' }}>{item.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(237,233,254,0.5)', letterSpacing: '-0.01em' }}>{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          Tech
      ═══════════════════════════════════════ */}
      <section className="px-6 md:px-16 py-24">
        <div className="max-w-7xl mx-auto w-full">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-14 text-center">
            <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: 'rgba(237,233,254,0.4)', letterSpacing: '0.12em' }}>
              核心技术
            </p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 5vw, 3.25rem)', fontWeight: 700, color: '#EDE9FE' }}>
              源自交大实验室
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: '🧠', title: 'ETF 边缘切线流', desc: '基于 Kang 2007 算法，精准计算每像素笔触走向，15次迭代平滑连贯' },
              { icon: '📍', title: '泊松采样 + Lloyd 迭代', desc: '密度自适应笔触锚点生成，暗处/边缘密、亮处/平面疏' },
              { icon: '🖌️', title: '流线追踪路径规划', desc: '沿方向场正反向追踪笔触路径，HSV 颜色约束防止跨越物体边界' },
              { icon: '✨', title: 'Catmull-Rom 曲线绘制', desc: '贝塞尔平滑渲染自然笔触，支持压感宽度变化，模拟真实画笔' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: i % 2 === 0 ? -16 : 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex items-start gap-4 p-6"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: '1.25rem',
                }}
              >
                <div className="w-11 h-11 flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: 'rgba(124,58,237,0.15)', borderRadius: '0.875rem' }}>
                  {item.icon}
                </div>
                <div>
                  <h4 className="font-semibold mb-1 text-sm" style={{ color: '#EDE9FE', letterSpacing: '-0.02em' }}>{item.title}</h4>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(237,233,254,0.45)' }}>{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          Flow
      ═══════════════════════════════════════ */}
      <section className="px-6 md:px-16 py-24">
        <div className="max-w-4xl mx-auto w-full text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-14">
            <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: 'rgba(237,233,254,0.4)', letterSpacing: '0.12em' }}>
              创作流程
            </p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 5vw, 3.25rem)', fontWeight: 700, color: '#EDE9FE' }}>
              四步，从零到作品
            </h2>
          </motion.div>

          <div className="flex items-center justify-center gap-2 md:gap-4 flex-wrap">
            {[
              { icon: '📷', label: '上传图片', desc: '选择想画的照片' },
              { icon: '🧠', label: 'AI 拆解', desc: 'ETF 分析笔触规划' },
              { icon: '✏️', label: '交互作画', desc: '精灵引导逐笔创作' },
              { icon: '🖼️', label: '作品完成', desc: '保存导出分享' },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-2 md:gap-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12, ease: [0.175, 0.885, 0.32, 1.275] }}
                  className="flex flex-col items-center gap-2 w-24 md:w-28"
                >
                  <div className="w-14 h-14 flex items-center justify-center text-2xl"
                    style={{
                      background: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '50%',
                    }}>
                    {step.icon}
                  </div>
                  <span className="text-sm font-semibold" style={{ color: '#EDE9FE', letterSpacing: '-0.02em' }}>{step.label}</span>
                  <span className="text-[10px]" style={{ color: 'rgba(237,233,254,0.35)' }}>{step.desc}</span>
                </motion.div>
                {i < 3 && (
                  <span className="text-lg hidden md:block" style={{ color: 'rgba(255,255,255,0.15)' }}>→</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          Footer
      ═══════════════════════════════════════ */}
      <footer className="px-6 py-14 text-center" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
        <div className="mb-3" style={{
          fontFamily: 'var(--font-display)',
          fontSize: '2rem',
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: '#EDE9FE',
        }}>
          星绘智愈
        </div>
        <p className="text-sm mb-1" style={{ color: 'rgba(237,233,254,0.3)' }}>
          针对孤独症儿童的 AI 辅助油画教育普惠系统
        </p>
        <p className="text-sm mb-5" style={{ color: 'rgba(237,233,254,0.3)' }}>
          上海交通大学 · 星月绘愈社 · 2026 Light 创造营
        </p>
        <div className="flex justify-center gap-2 flex-wrap">
          {['Next.js', '物理仿真引擎', '零依赖算法', 'Canvas 2D', '触屏适配'].map(tag => (
            <span key={tag} className="px-3 py-1 rounded-full text-[11px]"
              style={{ border: '1px solid var(--color-border-subtle)', color: 'rgba(237,233,254,0.3)', letterSpacing: '-0.01em' }}>
              {tag}
            </span>
          ))}
        </div>
      </footer>
    </div>
  );
}
