'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="flex-1 flex flex-col relative overflow-x-hidden">
      {/* ===== Hero ===== */}
      <section className="min-h-screen flex items-center px-6 md:px-16 py-20">
        <div className="max-w-7xl mx-auto w-full flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          {/* 左侧文字 */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="flex-1 max-w-xl"
          >
            <div className="inline-flex items-center gap-2 bg-[#7C3AED]/20 border border-[#7C3AED]/40 rounded-full px-4 py-1.5 text-sm text-[#A78BFA] mb-6">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              2026 Light 创造营 · 星月绘愈社
            </div>

            <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mb-5 bg-gradient-to-r from-[#FCD34D] via-[#A78BFA] to-[#67E8F9] bg-clip-text text-transparent">
              星绘智愈
            </h1>

            <p className="text-xl text-white/70 leading-relaxed mb-8">
              AI 辅助油画教育普惠系统<br />
              让每个孩子都能用画笔，将内心的孤岛连接成星海
            </p>

            <div className="flex gap-4 flex-wrap">
              <button
                onClick={() => router.push('/create')}
                className="px-8 py-3.5 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] text-white font-bold text-lg shadow-lg shadow-[#7C3AED]/30 hover:scale-105 transition-transform"
              >
                开始创作
              </button>
              <a
                href="#features"
                className="px-7 py-3.5 rounded-full border border-white/20 bg-white/5 text-white/80 font-medium hover:bg-white/10 transition-colors"
              >
                了解更多
              </a>
            </div>
          </motion.div>

          {/* 右侧精灵 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex-1 flex justify-center relative"
          >
            <div className="relative w-[320px] h-[320px] md:w-[400px] md:h-[400px]">
              {/* 发光底 */}
              <div className="absolute inset-0 rounded-full bg-gradient-radial from-[#F59E0B]/15 to-transparent animate-pulse" />

              {/* 环绕色点 */}
              {[
                { color: '#F59E0B', delay: '0s' },
                { color: '#A78BFA', delay: '-2s' },
                { color: '#06B6D4', delay: '-4s' },
                { color: '#F472B6', delay: '-6s' },
              ].map((dot, i) => (
                <div
                  key={i}
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ animation: `spin 8s linear infinite`, animationDelay: dot.delay }}
                >
                  <div
                    className="w-4 h-4 rounded-full absolute"
                    style={{
                      background: dot.color,
                      boxShadow: `0 0 12px ${dot.color}`,
                      top: '10%',
                      left: '50%',
                    }}
                  />
                </div>
              ))}

              {/* 精灵 SVG */}
              <div className="absolute inset-0 flex items-center justify-center animate-float">
                <svg width="180" height="180" viewBox="0 0 180 180" fill="none">
                  <circle cx="90" cy="90" r="75" fill="url(#glow)" opacity="0.2"/>
                  <path d="M90 20L105 65H152L113 92L128 137L90 110L52 137L67 92L28 65H75L90 20Z"
                    fill="url(#fill)" stroke="white" strokeWidth="2"/>
                  <circle cx="75" cy="85" r="7" fill="#1E1B4B"/>
                  <circle cx="105" cy="85" r="7" fill="#1E1B4B"/>
                  <circle cx="77" cy="83" r="3" fill="white"/>
                  <circle cx="107" cy="83" r="3" fill="white"/>
                  <path d="M78 100 Q90 112 102 100" stroke="#1E1B4B" strokeWidth="3" fill="none" strokeLinecap="round"/>
                  <circle cx="68" cy="98" r="5" fill="#F472B6" opacity="0.4"/>
                  <circle cx="112" cy="98" r="5" fill="#F472B6" opacity="0.4"/>
                  <path d="M90 140 Q78 155 65 160 Q55 165 50 158" stroke="#FCD34D" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.7"/>
                  <path d="M90 140 Q102 158 115 162 Q125 165 122 155" stroke="#A78BFA" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.5"/>
                  <rect x="118" y="55" width="6" height="28" rx="3" fill="#8B5CF6" transform="rotate(20 121 69)"/>
                  <path d="M124 46 L128 40 L130 48 Z" fill="#FCD34D" transform="rotate(20 127 44)"/>
                  <defs>
                    <radialGradient id="glow"><stop offset="0%" stopColor="#FCD34D"/><stop offset="100%" stopColor="#FCD34D" stopOpacity="0"/></radialGradient>
                    <linearGradient id="fill" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#FCD34D"/><stop offset="100%" stopColor="#F59E0B"/></linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== Features ===== */}
      <section id="features" className="px-6 md:px-16 py-20 max-w-7xl mx-auto w-full">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-3">三种创作模式</h2>
          <p className="text-center text-white/50 mb-12">适配不同年龄、不同需求的创作体验</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: '✏️', title: '跟画模式', desc: '画笔精灵 Starry 引导你逐笔作画，AI 实时判定并给予反馈鼓励', color: '#F59E0B' },
            { icon: '▶️', title: '自动模式', desc: '观看 AI 逐笔重建油画的全过程，感受从空白到完成的视觉魔法', color: '#7C3AED' },
            { icon: '🎨', title: '自由模式', desc: '自由发挥创意，画笔精灵在旁陪伴鼓励，无压力享受创作乐趣', color: '#06B6D4' },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="bg-white/[0.04] border border-white/[0.08] rounded-3xl p-8 text-center hover:bg-white/[0.08] hover:-translate-y-1 transition-all relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl" style={{ background: `linear-gradient(90deg, ${item.color}, ${item.color}88)` }} />
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 text-3xl" style={{ background: `${item.color}20` }}>
                {item.icon}
              </div>
              <h3 className="text-xl font-bold mb-2">{item.title}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ===== Tech ===== */}
      <section className="px-6 md:px-16 py-20 max-w-7xl mx-auto w-full">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-3">核心技术</h2>
          <p className="text-center text-white/50 mb-12">源自上海交通大学实验室的科研成果转化</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-5">
          {[
            { icon: '🧠', title: 'ETF 边缘切线流', desc: '基于 Kang 2007 算法，精准计算每像素笔触走向，15次迭代平滑连贯' },
            { icon: '📍', title: '泊松采样 + Lloyd 迭代', desc: '密度自适应笔触锚点生成，暗处/边缘密、亮处/平面疏' },
            { icon: '🖌️', title: '流线追踪路径规划', desc: '沿方向场正反向追踪笔触路径，HSV 颜色约束防止跨越物体边界' },
            { icon: '✨', title: 'Catmull-Rom 曲线绘制', desc: '贝塞尔平滑渲染自然笔触，支持压感宽度变化，模拟真实画笔' },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex items-start gap-4 bg-gradient-to-br from-white/[0.03] to-white/[0.06] border border-white/[0.08] rounded-2xl p-6"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 bg-white/[0.06]">
                {item.icon}
              </div>
              <div>
                <h4 className="font-semibold mb-1">{item.title}</h4>
                <p className="text-sm text-white/50 leading-relaxed">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ===== Flow ===== */}
      <section className="px-6 md:px-16 py-20 max-w-5xl mx-auto w-full text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-3xl md:text-4xl font-bold mb-3">创作流程</h2>
          <p className="text-white/50 mb-12">从上传到完成，全程 AI 陪伴</p>
        </motion.div>

        <div className="flex items-center justify-center gap-3 md:gap-6 flex-wrap">
          {[
            { icon: '📷', label: '上传图片', desc: '选择想画的照片' },
            { icon: '🧠', label: 'AI 拆解', desc: 'ETF分析+笔触规划' },
            { icon: '✏️', label: '交互作画', desc: '精灵引导逐笔创作' },
            { icon: '🖼️', label: '作品完成', desc: '保存/导出/分享' },
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-3 md:gap-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="flex flex-col items-center gap-2 w-24 md:w-32"
              >
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-full border-2 border-white/10 bg-white/[0.04] flex items-center justify-center text-2xl md:text-3xl">
                  {step.icon}
                </div>
                <span className="text-sm font-semibold">{step.label}</span>
                <span className="text-[10px] text-white/40">{step.desc}</span>
              </motion.div>
              {i < 3 && <span className="text-white/20 text-xl hidden md:block">→</span>}
            </div>
          ))}
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="px-6 py-12 border-t border-white/[0.06] text-center">
        <div className="text-2xl font-bold mb-2 bg-gradient-to-r from-[#FCD34D] to-[#A78BFA] bg-clip-text text-transparent inline-block">
          星绘智愈
        </div>
        <p className="text-sm text-white/30 mb-1">针对孤独症儿童的 AI 辅助油画教育普惠系统</p>
        <p className="text-sm text-white/30">上海交通大学 · 星月绘愈社 · 2026 Light 创造营</p>
        <div className="flex justify-center gap-3 mt-4 flex-wrap">
          {['Next.js', '物理仿真引擎', '零依赖算法', 'Canvas 2D', '触屏适配'].map(tag => (
            <span key={tag} className="px-3 py-1 rounded-full text-[11px] border border-white/10 text-white/50">
              {tag}
            </span>
          ))}
        </div>
      </footer>
    </div>
  );
}
