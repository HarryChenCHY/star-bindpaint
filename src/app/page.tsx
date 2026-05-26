'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { StarChar, FlowerChar, BlobChar, MiniStar, MiniCircle } from '@/components/Characters';
import MasterQuoteCard from '@/components/MasterQuoteCard';
import TiltedCard from '@/components/TiltedCard';

const Ballpit = dynamic(() => import('@/components/Ballpit'), { ssr: false });

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="flex-1 flex flex-col bg-white overflow-x-hidden">

      {/* ═══ NAV ══════════════════════════════════════════════ */}
      <nav className="flex items-center justify-between px-4 sm:px-6 md:px-8 py-4 sm:py-5 gap-3" style={{ borderBottom: '2px solid #1A1A1A' }}>
        <span style={{ fontWeight: 900, fontSize: 'clamp(1.1rem, 4vw, 1.4rem)', letterSpacing: '-0.03em', color: '#1A1A1A' }}>
          星绘<span style={{ color: '#7A51EC' }}>智愈</span>
        </span>
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={() => router.push('/gallery')} className="btn-black hidden sm:inline-flex" style={{ padding: '0.55em 1.4em', fontSize: '0.9rem' }}>
            我的画廊
          </button>
          <button onClick={() => router.push('/onboard')} className="btn-purple" style={{ padding: '0.55em 1.1em', fontSize: '0.85rem' }}>
            开始创作
          </button>
        </div>
      </nav>

      {/* ═══ HERO ══════════════════════════════════════════════ */}
      <section className="isolate px-4 sm:px-8 md:px-16 py-10 sm:py-16 md:py-24 max-w-7xl mx-auto w-full relative">
        {/* 卡通彩球氛围背景（白/黄/粉/绿/紫，跟随光标互动） */}
        <div
          className="absolute inset-0 z-0 overflow-hidden rounded-[2rem] sm:rounded-[3rem] mx-2 sm:mx-4 pointer-events-none"
          style={{ opacity: 0.5 }}
        >
          <Ballpit
            count={35}
            colors={[0xffffff, 0xf9b801, 0xff8fb1, 0x6bcb77, 0x7a51ec]}
            gravity={0}
            friction={0.998}
            wallBounce={0.96}
            maxVelocity={0.15}
            minSize={0.4}
            maxSize={1.0}
            ambientIntensity={1.5}
            lightIntensity={280}
            materialParams={{
              metalness: 0,
              roughness: 0.45,
              clearcoat: 1,
              clearcoatRoughness: 0.1,
            }}
            followCursor={true}
          />
        </div>
        <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8 sm:gap-12 lg:gap-20">

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
            <h1 style={{ fontSize: 'clamp(2.6rem, 11vw, 5.5rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 0.95, color: '#1A1A1A', textTransform: 'uppercase' }}>
              STAR<br />
              <span style={{ color: '#7A51EC' }}>PAINT</span><br />
              智愈
            </h1>

            <p className="mt-5 sm:mt-6 mb-8 sm:mb-10" style={{ fontSize: 'clamp(0.95rem, 2.6vw, 1.1rem)', color: '#666666', fontWeight: 600, lineHeight: 1.6, letterSpacing: '-0.01em', maxWidth: '400px' }}>
              临摹大师经典画作，或自由画出你想画的——AI 实时将每一笔变成油画风格，在创作中感受疗愈
            </p>

            <div className="flex gap-3 flex-wrap">
              <button onClick={() => router.push('/onboard')} className="btn-black" style={{ fontSize: 'clamp(0.95rem, 2.4vw, 1.05rem)', paddingLeft: 'clamp(1.4rem, 5vw, 2.2rem)', paddingRight: 'clamp(1.4rem, 5vw, 2.2rem)' }}>
                开始创作
              </button>
              <button onClick={() => router.push('/intro')} className="btn-purple" style={{ fontSize: 'clamp(0.95rem, 2.4vw, 1.05rem)' }}>
                了解更多
              </button>
            </div>
          </motion.div>

          {/* Right — characters */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.175, 0.885, 0.32, 1.275] }}
            className="flex-1 flex items-center justify-center gap-3 sm:gap-6 relative w-full"
          >
            <div className="animate-float" style={{ animationDelay: '0s', width: 'clamp(72px, 16vw, 130px)' }}>
              <StarChar size="100%" />
            </div>
            <div className="animate-float" style={{ animationDelay: '-1.2s', marginTop: '2rem', width: 'clamp(60px, 14vw, 110px)' }}>
              <FlowerChar size="100%" />
            </div>
            <div className="animate-float" style={{ animationDelay: '-2.4s', width: 'clamp(56px, 12vw, 100px)' }}>
              <BlobChar size="100%" />
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
      <section id="features" className="px-4 sm:px-8 md:px-16 py-12 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-12">
            <p style={{ fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.12em', color: '#888888', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              核心体验
            </p>
            <h2 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', color: '#1A1A1A', textTransform: 'uppercase' }}>
              从<span style={{ color: '#F9B801' }}>学</span>到<span style={{ color: '#F302C9' }}>创</span><br />两步体验
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {[
              {
                bg: '#F9B801',
                char: <StarChar size={100} />,
                title: '临摹学习',
                desc: 'GUIDED LEARNING',
                body: '选择6位大师30幅经典画作，你画1笔AI补100笔，跟着引导线轻松完成一幅油画',
                tag: '第一步',
              },
              {
                bg: '#F302C9',
                char: <FlowerChar size={90} />,
                title: '自由创作',
                desc: 'FREE CREATION + STYLE TRANSFER',
                body: '画任何你想画的，每一笔实时变成大师油画风格，还能一键"变成油画"',
                tag: '第二步',
              },
              {
                bg: '#7DC353',
                char: <BlobChar size={85} />,
                title: '疗愈观察',
                desc: 'AI THERAPY REPORT',
                body: '情绪前后测 + AI 分析绘画行为（色彩/节奏/专注区域），生成温暖的观察报告',
                tag: '闭环',
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <TiltedCard
                  containerHeight="auto"
                  containerWidth="100%"
                  imageHeight="auto"
                  imageWidth="100%"
                  rotateAmplitude={9}
                  scaleOnHover={1.03}
                  showTooltip
                  captionText={item.title}
                >
                  <div
                    className="rounded-[1.5rem] overflow-hidden bg-white w-full"
                    style={{ border: '2px solid #1A1A1A', boxShadow: '5px 5px 0 #1A1A1A' }}
                  >
                    {/* Color block top */}
                    <div className="flex items-end justify-center pt-8 pb-0" style={{ background: item.bg, minHeight: '160px', borderBottom: '2px solid #1A1A1A' }}>
                      {item.char}
                    </div>
                    {/* Content */}
                    <div className="p-6 bg-white">
                      <div className="flex items-center justify-between mb-3">
                        <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1A1A1A', letterSpacing: '-0.03em' }}>{item.title}</h3>
                        <span className="rounded-full px-3 py-1" style={{ background: item.bg, fontSize: '0.7rem', fontWeight: 800, color: '#1A1A1A', letterSpacing: '0.04em', border: '1.5px solid #1A1A1A' }}>
                          {item.tag}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#AAAAAA', letterSpacing: '0.1em', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                        {item.desc}
                      </p>
                      <p style={{ fontSize: '0.9rem', color: '#666666', lineHeight: 1.6, fontWeight: 600 }}>{item.body}</p>
                    </div>
                  </div>
                </TiltedCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TECH ══════════════════════════════════════════════ */}
      <section className="px-4 sm:px-8 md:px-16 py-12 sm:py-20" style={{ background: '#1A1A1A' }}>
        <div className="max-w-7xl mx-auto w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-12">
            <p style={{ fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.12em', color: '#888888', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              核心技术
            </p>
            <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', color: '#FFFFFF', textTransform: 'uppercase' }}>
              <span style={{ color: '#F9B801' }}>交大</span>算法 + <span style={{ color: '#7A51EC' }}>混元</span>大模型
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: '🧠', title: '多层笔触分解算法', desc: '多尺度误差驱动 + 梯度追踪弯曲笔触 + 边界感知，将图片智能拆解为有序笔触序列', color: '#F9B801' },
              { icon: '🎨', title: '实时风格化引擎', desc: '6种大师风格（莫奈/梵高/高更/伦勃朗/毕加索/萨金特），逐笔实时变换', color: '#F302C9' },
              { icon: '✨', title: '变成油画 · AI 渲染', desc: '腾讯混元生图 hy-image-v3.0，将简笔画一键渲染为完整的大师级油画', color: '#7DC353' },
              { icon: '📋', title: 'LLM 疗愈报告', desc: '腾讯混元大模型多模态分析绘画行为数据，生成温暖的观察记录', color: '#7A51EC' },
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

      {/* ═══ MASTER QUOTE ═══ */}
      <div className="px-4 sm:px-8 md:px-16 py-6 sm:py-8 max-w-3xl mx-auto w-full">
        <MasterQuoteCard variant="banner" />
      </div>

      {/* ═══ FLOW ══════════════════════════════════════════════ */}
      <section className="px-4 sm:px-8 md:px-16 py-12 sm:py-20 bg-white">
        <div className="max-w-4xl mx-auto w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', color: '#1A1A1A', textTransform: 'uppercase' }}>
              五步<span style={{ color: '#7DC353' }}>完成</span>疗愈
            </h2>
          </motion.div>

          <div
            className="flex items-start justify-start md:justify-center gap-3 md:gap-4 overflow-x-auto md:overflow-visible md:flex-wrap pb-2 -mx-4 px-4 md:mx-0 md:px-0"
            style={{ scrollbarWidth: 'none' }}
          >
            {[
              { num: '01', icon: '😊', label: '选心情', desc: '告诉我今天感觉怎样', color: '#F9B801' },
              { num: '02', icon: '🎨', label: '选大师', desc: '莫奈/梵高/高更...', color: '#F302C9' },
              { num: '03', icon: '✏️', label: '陪画创作', desc: '你画1笔 AI补50笔', color: '#7DC353' },
              { num: '04', icon: '😌', label: '选心情', desc: '画完后感觉变了吗', color: '#7BA7CC' },
              { num: '05', icon: '📋', label: '观察报告', desc: 'AI生成疗愈记录', color: '#7A51EC' },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12 }}
                  className="flex flex-col items-center gap-2 w-24 sm:w-28 md:w-32"
                >
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[1.25rem] flex items-center justify-center text-xl sm:text-2xl"
                    style={{ background: step.color, border: '2px solid #1A1A1A' }}>
                    {step.icon}
                  </div>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: step.color, letterSpacing: '0.08em' }}>{step.num}</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1A1A1A', letterSpacing: '-0.02em' }}>{step.label}</span>
                  <span style={{ fontSize: '0.72rem', color: '#888888', fontWeight: 600, textAlign: 'center' }}>{step.desc}</span>
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
      <footer className="px-4 sm:px-8 py-8 sm:py-10" style={{ background: '#F5F5F5', borderTop: '2px solid #1A1A1A' }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div>
            <div style={{ fontWeight: 900, fontSize: '1.5rem', letterSpacing: '-0.03em', color: '#1A1A1A' }}>
              星绘<span style={{ color: '#7A51EC' }}>智愈</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#888888', fontWeight: 600, marginTop: '0.25rem' }}>
              上海交通大学 · 星月绘愈社 · 2026 Light 创造营
            </p>
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
            {['Next.js', '笔触分解', 'Canvas 2D', '触屏适配', '零依赖算法'].map(tag => (
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
