'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { StarChar, FlowerChar, BlobChar, MiniStar, MiniCircle } from '@/components/Characters';

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="flex-1 flex flex-col bg-white overflow-x-hidden">

      {/* ═══ NAV ══════════════════════════════════════════════ */}
      <nav className="flex items-center justify-between px-8 py-5" style={{ borderBottom: '2px solid #1A1A1A' }}>
        <span style={{ fontWeight: 900, fontSize: '1.4rem', letterSpacing: '-0.03em', color: '#1A1A1A' }}>
          星绘<span style={{ color: '#7A51EC' }}>智愈</span>
        </span>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/gallery')} className="btn-black" style={{ padding: '0.55em 1.4em', fontSize: '0.9rem' }}>
            我的画廊
          </button>
          <button onClick={() => router.push('/onboard')} className="btn-purple" style={{ padding: '0.55em 1.4em', fontSize: '0.9rem' }}>
            开始创作
          </button>
        </div>
      </nav>

      {/* ═══ HERO ══════════════════════════════════════════════ */}
      <section className="px-8 md:px-16 py-16 md:py-24 max-w-7xl mx-auto w-full relative">
        {/* 微妙的艺术背景 */}
        <div className="absolute inset-0 -z-10 overflow-hidden rounded-[3rem] mx-4 opacity-[0.06]">
          <img src="/masterworks/monet/water_lilies_1918.jpg" alt="" className="w-full h-full object-cover" />
        </div>
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

          {/* Left — text */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex-1 max-w-xl"
          >
            {/* Tag */}
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-7"
              style={{ background: '#F9B801', color: '#1A1A1A' }}>
              <MiniStar color="#1A1A1A" size={14} />
              <span style={{ fontWeight: 800, fontSize: '0.8rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                2026 LIGHT 创造营
              </span>
            </div>

            {/* Headline */}
            <h1 style={{ fontSize: 'clamp(3rem, 8vw, 5.5rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 0.95, color: '#1A1A1A', textTransform: 'uppercase' }}>
              STAR<br />
              <span style={{ color: '#7A51EC' }}>PAINT</span><br />
              智愈
            </h1>

            <p className="mt-6 mb-10" style={{ fontSize: '1.1rem', color: '#666666', fontWeight: 600, lineHeight: 1.6, letterSpacing: '-0.01em', maxWidth: '400px' }}>
              临摹莫奈、梵高、高更等大师经典画作，AI 陪你一笔一笔完成创作，在艺术中感受疗愈
            </p>

            <div className="flex gap-3 flex-wrap">
              <button onClick={() => router.push('/onboard')} className="btn-black" style={{ fontSize: '1.05rem', paddingLeft: '2.2rem', paddingRight: '2.2rem' }}>
                开始创作
              </button>
              <button onClick={() => router.push('/intro')} className="btn-purple" style={{ fontSize: '1.05rem' }}>
                了解更多
              </button>
            </div>
          </motion.div>

          {/* Right — characters */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.175, 0.885, 0.32, 1.275] }}
            className="flex-1 flex items-center justify-center gap-6 relative"
          >
            {/* Yellow block bg */}
            <div className="absolute inset-0 -z-10 rounded-[2.5rem]" style={{ background: '#F9B801', opacity: 0.08 }} />

            <div className="animate-float" style={{ animationDelay: '0s' }}>
              <StarChar size={130} />
            </div>
            <div className="animate-float" style={{ animationDelay: '-1.2s', marginTop: '2rem' }}>
              <FlowerChar size={110} />
            </div>
            <div className="animate-float" style={{ animationDelay: '-2.4s' }}>
              <BlobChar size={100} />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══ COLOR BLOCKS DIVIDER ══════════════════════════════ */}
      <div className="flex h-6 overflow-hidden">
        {['#F9B801', '#F302C9', '#7DC353', '#7A51EC', '#F9B801', '#F302C9', '#7DC353', '#7A51EC'].map((c, i) => (
          <div key={i} className="flex-1" style={{ background: c }} />
        ))}
      </div>

      {/* ═══ FEATURES ══════════════════════════════════════════ */}
      <section id="features" className="px-8 md:px-16 py-20 bg-white">
        <div className="max-w-7xl mx-auto w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-12">
            <p style={{ fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.12em', color: '#888888', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              核心体验
            </p>
            <h2 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', color: '#1A1A1A', textTransform: 'uppercase' }}>
              三种<span style={{ color: '#F302C9' }}>疗愈</span><br />模式
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                bg: '#F9B801',
                char: <StarChar size={100} />,
                title: '陪画模式',
                desc: 'COMPANION MODE',
                body: '你画1笔，Starry帮你补50笔。跟着大师的笔触，轻松完成一幅油画',
                tag: '推荐',
              },
              {
                bg: '#F302C9',
                char: <FlowerChar size={90} />,
                title: '共同注意',
                desc: 'SHARED ATTENTION',
                body: 'AI 边画边问你问题："这是什么颜色？" 一起观察、一起学习',
                tag: '互动学习',
              },
              {
                bg: '#7DC353',
                char: <BlobChar size={85} />,
                title: '自由表达',
                desc: 'FREE EXPRESSION',
                body: '选一个主题，用颜色画出心情。没有对错，画笔精灵在旁温暖陪伴',
                tag: '情绪表达',
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-[1.5rem] overflow-hidden"
                style={{ border: '2px solid #1A1A1A' }}
              >
                {/* Color block top */}
                <div className="flex items-end justify-center pt-8 pb-0" style={{ background: item.bg, minHeight: '160px' }}>
                  {item.char}
                </div>
                {/* Content */}
                <div className="p-6 bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1A1A1A', letterSpacing: '-0.03em' }}>{item.title}</h3>
                    <span className="rounded-full px-3 py-1" style={{ background: item.bg, fontSize: '0.7rem', fontWeight: 800, color: '#1A1A1A', letterSpacing: '0.04em' }}>
                      {item.tag}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#AAAAAA', letterSpacing: '0.1em', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                    {item.desc}
                  </p>
                  <p style={{ fontSize: '0.9rem', color: '#666666', lineHeight: 1.6, fontWeight: 600 }}>{item.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TECH ══════════════════════════════════════════════ */}
      <section className="px-8 md:px-16 py-20" style={{ background: '#1A1A1A' }}>
        <div className="max-w-7xl mx-auto w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-12">
            <p style={{ fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.12em', color: '#888888', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              核心技术
            </p>
            <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', color: '#FFFFFF', textTransform: 'uppercase' }}>
              源自<span style={{ color: '#F9B801' }}>交大</span>实验室
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: '🧠', title: 'ETF 边缘切线流', desc: '基于 Kang 2007 算法，精准计算每像素笔触走向，15次迭代平滑连贯', color: '#F9B801' },
              { icon: '📍', title: '泊松采样 + Lloyd 迭代', desc: '密度自适应笔触锚点生成，暗处边缘密、亮处平面疏', color: '#F302C9' },
              { icon: '🖌️', title: '流线追踪路径规划', desc: '沿方向场正反向追踪笔触路径，HSV 颜色约束防止跨越物体边界', color: '#7DC353' },
              { icon: '✨', title: 'Catmull-Rom 曲线绘制', desc: '贝塞尔平滑渲染自然笔触，支持压感宽度变化，模拟真实画笔', color: '#7A51EC' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex items-start gap-4 p-5 rounded-[1.25rem]"
                style={{ background: '#2A2A2A' }}
              >
                <div className="w-11 h-11 rounded-[0.875rem] flex items-center justify-center text-xl flex-shrink-0" style={{ background: item.color }}>
                  {item.icon}
                </div>
                <div>
                  <h4 style={{ fontWeight: 800, color: '#FFFFFF', fontSize: '0.95rem', letterSpacing: '-0.02em', marginBottom: '0.3rem' }}>{item.title}</h4>
                  <p style={{ fontSize: '0.85rem', color: '#888888', lineHeight: 1.6 }}>{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FLOW ══════════════════════════════════════════════ */}
      <section className="px-8 md:px-16 py-20 bg-white">
        <div className="max-w-4xl mx-auto w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', color: '#1A1A1A', textTransform: 'uppercase' }}>
              五步<span style={{ color: '#7DC353' }}>完成</span>疗愈
            </h2>
          </motion.div>

          <div className="flex items-start justify-center gap-2 md:gap-4 flex-wrap">
            {[
              { num: '01', icon: '😊', label: '选心情', desc: '告诉我今天感觉怎样', color: '#F9B801' },
              { num: '02', icon: '🎨', label: '选大师', desc: '莫奈/梵高/高更...', color: '#F302C9' },
              { num: '03', icon: '✏️', label: '陪画创作', desc: '你画1笔 AI补50笔', color: '#7DC353' },
              { num: '04', icon: '😌', label: '选心情', desc: '画完后感觉变了吗', color: '#7BA7CC' },
              { num: '05', icon: '📋', label: '观察报告', desc: 'AI生成疗愈记录', color: '#7A51EC' },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-2 md:gap-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12 }}
                  className="flex flex-col items-center gap-2 w-28 md:w-32"
                >
                  <div className="w-16 h-16 rounded-[1.25rem] flex items-center justify-center text-2xl"
                    style={{ background: step.color, border: '2px solid #1A1A1A' }}>
                    {step.icon}
                  </div>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: step.color, letterSpacing: '0.08em' }}>{step.num}</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1A1A1A', letterSpacing: '-0.02em' }}>{step.label}</span>
                  <span style={{ fontSize: '0.75rem', color: '#888888', fontWeight: 600, textAlign: 'center' }}>{step.desc}</span>
                </motion.div>
                {i < 4 && <span style={{ color: '#DDDDDD', fontSize: '1.5rem', fontWeight: 900, marginBottom: '2.5rem' }} className="hidden md:block">→</span>}
              </div>
            ))}
          </div>

          <div className="flex justify-center mt-12">
            <button onClick={() => router.push('/onboard')} className="btn-black" style={{ fontSize: '1.05rem', paddingLeft: '3rem', paddingRight: '3rem', paddingTop: '1em', paddingBottom: '1em' }}>
              立即体验
            </button>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ════════════════════════════════════════════ */}
      <footer className="px-8 py-10" style={{ background: '#F5F5F5', borderTop: '2px solid #1A1A1A' }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div style={{ fontWeight: 900, fontSize: '1.5rem', letterSpacing: '-0.03em', color: '#1A1A1A' }}>
              星绘<span style={{ color: '#7A51EC' }}>智愈</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#888888', fontWeight: 600, marginTop: '0.25rem' }}>
              上海交通大学 · 星月绘愈社 · 2026 Light 创造营
            </p>
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
            {['Next.js', '物理仿真', 'Canvas 2D', '触屏适配', '零依赖算法'].map(tag => (
              <span key={tag} className="px-3 py-1 rounded-full"
                style={{ background: 'white', border: '1.5px solid #1A1A1A', fontSize: '0.75rem', fontWeight: 700, color: '#1A1A1A' }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
