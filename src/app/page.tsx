'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Brush,
  CalendarDays,
  Check,
  CircleDot,
  FlaskConical,
  Image as ImageIcon,
  Layers3,
  Moon,
  Route,
  Sparkles,
  TrendingUp,
  Upload,
} from 'lucide-react';
import DailyWishCard from '@/components/DailyWishCard';

const COLORS = {
  ink: '#17233F',
  inkSoft: '#536079',
  purple: '#6558D9',
  purpleSoft: '#ECEAFE',
  yellow: '#FFD166',
  mint: '#69D2C2',
  pink: '#FF8FAB',
  paper: '#F6F7FB',
  white: '#FFFFFF',
};

const FEATURES = [
  {
    icon: CircleDot,
    eyebrow: '知道从哪开始',
    title: '把复杂画面变成一颗颗星点',
    body: '图片不再是一整块“不会画”。系统先找出结构，再按由大到小的顺序安排每一笔。',
    color: COLORS.yellow,
  },
  {
    icon: Route,
    eyebrow: '看清下一笔',
    title: '沿着星迹完成真实笔触',
    body: '每次只呈现当前路径、方向和颜色，让注意力停留在眼前这一笔，而不是最终成品。',
    color: COLORS.mint,
  },
  {
    icon: TrendingUp,
    eyebrow: '愿意再次动笔',
    title: '让完成感变成练习习惯',
    body: '作品、练习次数和逐渐减少的辅助都会进入星图，帮助你看见自己正在进步。',
    color: COLORS.pink,
  },
];

const STEPS = [
  { num: '01', icon: ImageIcon, title: '选择画面', body: '从示例作品开始，或上传一张你真正想画的图片。' },
  { num: '02', icon: Layers3, title: '拆解笔触', body: '系统分析画面层次，生成由粗到细的有序笔触。' },
  { num: '03', icon: CircleDot, title: '找到星点', body: '月亮伙伴指出落笔位置、方向和这一笔的颜色。' },
  { num: '04', icon: Brush, title: '跟随星迹', body: '一笔一笔完成，也可以随时调整提示与辅助强度。' },
  { num: '05', icon: Sparkles, title: '点亮星图', body: '保存作品和练习记录，下一次从更少的提示开始。' },
];

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: COLORS.paper, color: COLORS.ink }}>
      <nav
        className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10"
        aria-label="主导航"
      >
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-3 text-left"
          aria-label="返回星迹智绘首页"
        >
          <span
            className="flex h-10 w-10 items-center justify-center rounded-2xl"
            style={{ background: COLORS.yellow, border: `2px solid ${COLORS.ink}`, boxShadow: `3px 3px 0 ${COLORS.ink}` }}
          >
            <Moon size={21} strokeWidth={2.6} />
          </span>
          <span>
            <span className="block text-base font-black leading-none tracking-[-0.03em] sm:text-lg">星迹智绘</span>
            <span className="mt-1 block text-[10px] font-extrabold tracking-[0.18em]" style={{ color: COLORS.inkSoft }}>
              STARTRACE
            </span>
          </span>
        </button>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => router.push('/intro')}
            className="hidden rounded-full px-4 py-2.5 text-sm font-extrabold md:inline-flex"
            style={{ background: COLORS.purpleSoft, border: `2px solid ${COLORS.ink}`, color: COLORS.purple }}
          >
            产品研究
          </button>
          <button
            onClick={() => router.push('/gallery')}
            className="hidden rounded-full px-4 py-2.5 text-sm font-extrabold sm:inline-flex"
            style={{ background: COLORS.white, border: `2px solid ${COLORS.ink}` }}
          >
            我的星图
          </button>
          <button
            onClick={() => router.push('/create')}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-black text-white sm:px-5"
            style={{ background: COLORS.ink, boxShadow: `3px 3px 0 ${COLORS.yellow}` }}
          >
            开始第一幅
            <ArrowRight size={16} strokeWidth={2.8} />
          </button>
        </div>
      </nav>

      <main>
        <section className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-5 pb-20 pt-10 sm:px-8 sm:pt-16 lg:grid-cols-[1.02fr_0.98fr] lg:px-10 lg:pb-28 lg:pt-20">
          <div className="pointer-events-none absolute left-[8%] top-8 h-2 w-2 rounded-full" style={{ background: COLORS.yellow }} />
          <div className="pointer-events-none absolute left-[46%] top-20 h-1.5 w-1.5 rounded-full" style={{ background: COLORS.mint }} />
          <div className="pointer-events-none absolute right-[7%] top-10 h-2.5 w-2.5 rounded-full" style={{ background: COLORS.pink }} />

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative z-10"
          >
            <div
              className="mb-7 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black tracking-[0.08em]"
              style={{ background: COLORS.purpleSoft, color: COLORS.purple, border: `1.5px solid ${COLORS.purple}` }}
            >
              <Sparkles size={15} strokeWidth={2.6} />
              为零基础绘画者设计
            </div>

            <h1 className="max-w-2xl text-[clamp(3rem,7vw,5.7rem)] font-black leading-[0.94] tracking-[-0.065em]">
              <span className="block">不会画，</span>
              <span className="block">也可以从</span>
              <span className="relative inline-block" style={{ color: COLORS.purple }}>
                第一笔开始。
                <svg className="absolute -bottom-3 left-0 h-4 w-full" viewBox="0 0 360 18" fill="none" aria-hidden="true">
                  <path d="M4 11C90 2 229 19 356 6" stroke={COLORS.yellow} strokeWidth="8" strokeLinecap="round" />
                </svg>
              </span>
            </h1>

            <p className="mt-9 max-w-xl text-base font-bold leading-8 sm:text-lg" style={{ color: COLORS.inkSoft }}>
              上传一张想画的图片，智能笔触引擎会把它拆成清晰、有顺序的绘画路径。月亮伙伴陪你找到第一笔，再沿着星迹一笔一笔完成。
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <motion.button
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => router.push('/create')}
                className="inline-flex items-center gap-2 rounded-full px-6 py-4 text-base font-black text-white"
                style={{ background: COLORS.ink, boxShadow: `5px 5px 0 ${COLORS.yellow}` }}
              >
                <Upload size={19} strokeWidth={2.7} />
                开始我的第一幅画
              </motion.button>
              <button
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center gap-2 rounded-full px-6 py-4 text-base font-black"
                style={{ background: COLORS.white, border: `2px solid ${COLORS.ink}` }}
              >
                看看怎么画
                <ArrowRight size={18} strokeWidth={2.7} />
              </button>
            </div>

            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm font-extrabold" style={{ color: COLORS.inkSoft }}>
              {['不用先学理论', '每次只画一笔', '提示可以逐渐减少'].map(item => (
                <span key={item} className="inline-flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background: COLORS.mint }}>
                    <Check size={13} color={COLORS.ink} strokeWidth={3} />
                  </span>
                  {item}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.94, rotate: 1.5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.7, delay: 0.12 }}
            className="relative mx-auto w-full max-w-[590px]"
          >
            <div
              className="absolute -left-4 top-12 z-10 flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-black sm:-left-8"
              style={{ background: COLORS.yellow, border: `2px solid ${COLORS.ink}`, boxShadow: `3px 3px 0 ${COLORS.ink}` }}
            >
              <CircleDot size={16} />
              星点 08 / 24
            </div>

            <div
              className="relative overflow-hidden rounded-[2rem] p-3 sm:p-4"
              style={{ background: COLORS.white, border: `2px solid ${COLORS.ink}`, boxShadow: `10px 10px 0 ${COLORS.purple}` }}
            >
              <div className="flex items-center justify-between px-2 pb-3 pt-1">
                <div>
                  <p className="text-xs font-black tracking-[0.12em]" style={{ color: COLORS.purple }}>正在探索</p>
                  <p className="mt-1 text-sm font-black">窗边的向日葵</p>
                </div>
                <div className="flex items-center gap-2 rounded-full px-3 py-2 text-xs font-extrabold" style={{ background: COLORS.purpleSoft, color: COLORS.purple }}>
                  <Moon size={15} />
                  月亮伙伴
                </div>
              </div>

              <div className="relative aspect-[4/3] overflow-hidden rounded-[1.35rem]" style={{ background: '#FFF9E8', border: `2px solid ${COLORS.ink}` }}>
                <svg className="h-full w-full" viewBox="0 0 560 420" fill="none" role="img" aria-label="笔触拆解示意图">
                  <rect width="560" height="420" fill="#FFF9E8" />
                  <path d="M0 302C118 277 196 329 309 295C399 268 470 274 560 247V420H0V302Z" fill="#D7EEE6" />
                  <path d="M42 85C125 40 223 63 279 119C320 160 348 164 413 124C469 90 521 106 550 130" stroke="#DED9FF" strokeWidth="32" strokeLinecap="round" />
                  <path d="M96 286C169 236 242 225 305 248C352 265 411 250 467 211" stroke="#6558D9" strokeWidth="18" strokeLinecap="round" opacity="0.16" />
                  <path d="M104 280C178 231 242 224 306 246C355 263 410 246 466 207" stroke="#6558D9" strokeWidth="5" strokeLinecap="round" strokeDasharray="10 12" />
                  <circle cx="104" cy="280" r="13" fill="#FFD166" stroke="#17233F" strokeWidth="4" />
                  <circle cx="466" cy="207" r="7" fill="#FFFFFF" stroke="#6558D9" strokeWidth="4" />
                  <path d="M297 272C298 235 301 201 305 169" stroke="#4F8C68" strokeWidth="9" strokeLinecap="round" />
                  <path d="M305 221C273 208 255 192 245 170" stroke="#4F8C68" strokeWidth="7" strokeLinecap="round" />
                  <path d="M305 205C337 190 360 168 370 143" stroke="#4F8C68" strokeWidth="7" strokeLinecap="round" />
                  <g transform="translate(305 143)">
                    {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
                      <ellipse key={angle} cx="0" cy="-40" rx="15" ry="31" fill="#FFD166" stroke="#17233F" strokeWidth="3" transform={`rotate(${angle})`} />
                    ))}
                    <circle r="31" fill="#9C6137" stroke="#17233F" strokeWidth="4" />
                    <circle r="18" fill="#6C3F27" opacity="0.7" />
                  </g>
                  <circle cx="503" cy="63" r="29" fill="#FFD166" opacity="0.75" />
                  <circle cx="491" cy="54" r="28" fill="#FFF9E8" />
                </svg>

                <div
                  className="absolute bottom-4 left-4 right-4 flex items-center gap-3 rounded-2xl p-3"
                  style={{ background: 'rgba(255,255,255,0.92)', border: `1.5px solid ${COLORS.ink}` }}
                >
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl" style={{ background: COLORS.yellow }}>
                    <Moon size={21} strokeWidth={2.5} />
                  </span>
                  <div>
                    <p className="text-xs font-black" style={{ color: COLORS.purple }}>下一笔</p>
                    <p className="mt-0.5 text-sm font-extrabold">从黄色星点出发，顺着紫色轨迹向右画。</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-3">
                {[
                  ['大形', '已完成', COLORS.mint],
                  ['结构', '进行中', COLORS.yellow],
                  ['细节', '稍后', COLORS.purpleSoft],
                ].map(([label, state, color]) => (
                  <div key={label} className="rounded-xl px-3 py-2.5" style={{ background: color }}>
                    <p className="text-[10px] font-black tracking-[0.08em]" style={{ color: COLORS.inkSoft }}>{label}</p>
                    <p className="mt-0.5 text-xs font-black">{state}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </section>

        <section className="border-y-2" style={{ borderColor: COLORS.ink, background: COLORS.ink }}>
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-px sm:grid-cols-3">
            {[
              ['0基础', '不需要先掌握素描和色彩理论'],
              ['1笔', '把复杂画面缩小成眼前一步'],
              ['持续画', '用可见进度建立动笔习惯'],
            ].map(([value, label], index) => (
              <div key={value} className="px-6 py-7 text-center" style={{ background: index === 1 ? '#222F4E' : COLORS.ink }}>
                <p className="text-2xl font-black" style={{ color: index === 0 ? COLORS.yellow : index === 1 ? COLORS.mint : COLORS.pink }}>{value}</p>
                <p className="mt-2 text-sm font-bold text-white/70">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-5 pb-4 sm:px-8 lg:px-10">
          <div className="grid items-stretch gap-5 lg:grid-cols-[1.35fr_0.65fr]">
            <DailyWishCard onStart={() => router.push('/create')} onOpenStarMap={() => router.push('/gallery')} />
            <div className="rounded-[1.7rem] p-5 sm:p-6" style={{ background: COLORS.white, border: `2px solid ${COLORS.ink}`, boxShadow: `6px 6px 0 ${COLORS.mint}` }}>
              <p className="text-[10px] font-black tracking-[0.14em]" style={{ color: COLORS.purple }}>你的练习会留下什么</p>
              <h2 className="mt-3 text-2xl font-black tracking-[-0.045em]">不是打卡压力，是看得见的动笔轨迹。</h2>
              <p className="mt-3 text-sm font-bold leading-6" style={{ color: COLORS.inkSoft }}>每次完成都会进入星图，并记录日期、亲手完成笔数和所用引导，为后续观察绘画入门变化提供依据。</p>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
          <div className="max-w-3xl">
            <p className="text-xs font-black tracking-[0.18em]" style={{ color: COLORS.purple }}>为什么更容易开始</p>
            <h2 className="mt-4 text-[clamp(2.2rem,5vw,4.3rem)] font-black leading-[1.02] tracking-[-0.055em]">
              难的往往不是画不好，
              <br />而是不知道第一笔落在哪里。
            </h2>
            <p className="mt-6 max-w-2xl text-base font-bold leading-8" style={{ color: COLORS.inkSoft }}>
              星迹智绘不替你跳过绘画过程。它把复杂任务拆小、把下一步说清，再把画笔交回给你。
            </p>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.article
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ delay: index * 0.08 }}
                  className="rounded-[1.75rem] p-6 sm:p-7"
                  style={{ background: COLORS.white, border: `2px solid ${COLORS.ink}`, boxShadow: `6px 6px 0 ${feature.color}` }}
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: feature.color }}>
                    <Icon size={24} strokeWidth={2.6} />
                  </span>
                  <p className="mt-7 text-xs font-black tracking-[0.12em]" style={{ color: COLORS.purple }}>{feature.eyebrow}</p>
                  <h3 className="mt-2 text-2xl font-black leading-tight tracking-[-0.04em]">{feature.title}</h3>
                  <p className="mt-4 text-sm font-bold leading-7" style={{ color: COLORS.inkSoft }}>{feature.body}</p>
                </motion.article>
              );
            })}
          </div>
        </section>

        <section id="product-research" className="scroll-mt-6 px-5 py-20 sm:px-8 lg:px-10 lg:py-28" style={{ background: COLORS.ink }}>
          <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <div
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black tracking-[0.12em]"
                style={{ background: COLORS.yellow, color: COLORS.ink }}
              >
                <FlaskConical size={16} strokeWidth={2.6} />
                RESEARCH PROTOTYPE
              </div>
              <h2 className="mt-6 max-w-xl text-[clamp(2.35rem,5vw,4.6rem)] font-black leading-[1.02] tracking-[-0.055em] text-white">
                不只完成一幅画，
                <br />也验证一种新的入门方式。
              </h2>
              <p className="mt-6 max-w-xl text-base font-bold leading-8 text-white/68">
                星迹智绘将笔触拆解算法转化为可交互的绘画引导，研究它能否降低零基础用户的首次动笔阻力，并提高持续练习频次。
              </p>
              <button
                onClick={() => router.push('/intro')}
                className="mt-8 inline-flex items-center gap-2 rounded-full px-6 py-4 text-base font-black"
                style={{ background: COLORS.white, color: COLORS.ink, boxShadow: `5px 5px 0 ${COLORS.purple}` }}
              >
                <BookOpen size={19} strokeWidth={2.6} />
                查看完整产品与技术介绍
                <ArrowRight size={18} strokeWidth={2.8} />
              </button>
            </div>

            <div
              className="rounded-[2rem] p-5 sm:p-7"
              style={{ background: '#222F4E', border: '2px solid rgba(255,255,255,0.24)' }}
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black tracking-[0.14em]" style={{ color: COLORS.mint }}>研究路径</p>
                  <p className="mt-1 text-lg font-black text-white">从技术能力到可测量的学习行为</p>
                </div>
                <BrainCircuit size={28} color={COLORS.yellow} strokeWidth={2.2} />
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                {[
                  ['01', '参考图像', '选择真正想画的内容'],
                  ['02', '笔触拆解', '生成由粗到细的路径'],
                  ['03', '渐进引导', '每次只解决下一笔'],
                  ['04', '行为验证', '记录动笔与完成变化'],
                ].map(([num, title, body], index) => (
                  <div key={num} className="relative rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <p className="text-xs font-black" style={{ color: [COLORS.yellow, COLORS.mint, '#B8AEFF', COLORS.pink][index] }}>{num}</p>
                    <p className="mt-7 text-sm font-black text-white">{title}</p>
                    <p className="mt-2 text-xs font-bold leading-5 text-white/55">{body}</p>
                    {index < 3 && (
                      <ArrowRight className="absolute -right-2.5 top-7 z-10 hidden sm:block" size={18} color={COLORS.yellow} strokeWidth={3} />
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  ['首次落笔时间', '启动阻力'],
                  ['完成与独立笔触', '入门帮助'],
                  ['练习启动频次', '持续动笔'],
                ].map(([metric, meaning]) => (
                  <div key={metric} className="rounded-xl px-3 py-3" style={{ background: COLORS.white }}>
                    <p className="text-xs font-black" style={{ color: COLORS.ink }}>{metric}</p>
                    <p className="mt-1 text-[10px] font-extrabold" style={{ color: COLORS.inkSoft }}>{meaning}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 py-20 sm:px-8 lg:px-10 lg:py-28" style={{ background: COLORS.white }}>
          <div className="mx-auto w-full max-w-7xl">
            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
              <div>
                <p className="text-xs font-black tracking-[0.18em]" style={{ color: COLORS.purple }}>一次完整练习</p>
                <h2 className="mt-4 text-[clamp(2.2rem,5vw,4.3rem)] font-black leading-none tracking-[-0.055em]">
                  五步完成一幅画
                </h2>
              </div>
              <p className="max-w-md text-sm font-bold leading-7" style={{ color: COLORS.inkSoft }}>
                从“想画”到“真的画完”，每一步都有明确结果，也始终保留你自己动笔的空间。
              </p>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-5">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                const accents = [COLORS.yellow, COLORS.mint, COLORS.purpleSoft, '#FFE5ED', '#E6F3FF'];
                return (
                  <motion.article
                    key={step.num}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.06 }}
                    className="relative rounded-[1.5rem] p-5"
                    style={{ background: accents[index], border: `2px solid ${COLORS.ink}` }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black tracking-[0.12em]" style={{ color: COLORS.purple }}>{step.num}</span>
                      <Icon size={22} strokeWidth={2.6} />
                    </div>
                    <h3 className="mt-8 text-lg font-black tracking-[-0.03em]">{step.title}</h3>
                    <p className="mt-3 text-sm font-bold leading-6" style={{ color: COLORS.inkSoft }}>{step.body}</p>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
          <div
            className="relative overflow-hidden rounded-[2.25rem] px-6 py-12 sm:px-10 lg:grid lg:grid-cols-[1fr_auto] lg:items-center lg:gap-12 lg:px-14 lg:py-16"
            style={{ background: COLORS.purple, color: COLORS.white, border: `2px solid ${COLORS.ink}`, boxShadow: `9px 9px 0 ${COLORS.yellow}` }}
          >
            <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full border-[34px] border-white/10" aria-hidden="true" />
            <div className="relative z-10">
              <div className="mb-5 flex items-center gap-2 text-xs font-black tracking-[0.16em] text-white/75">
                <CalendarDays size={17} />
                今天就留下第一条星迹
              </div>
              <h2 className="max-w-3xl text-[clamp(2.3rem,5vw,4.5rem)] font-black leading-[1.02] tracking-[-0.055em]">
                你不需要先成为会画画的人。
              </h2>
              <p className="mt-5 max-w-2xl text-base font-bold leading-8 text-white/75">
                先完成第一笔，再完成第一幅。月亮伙伴会在下一颗星点等你。
              </p>
            </div>
            <motion.button
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push('/create')}
              className="relative z-10 mt-8 inline-flex items-center justify-center gap-2 rounded-full px-7 py-4 text-base font-black lg:mt-0"
              style={{ background: COLORS.yellow, color: COLORS.ink, border: `2px solid ${COLORS.ink}` }}
            >
              开始画第一笔
              <ArrowRight size={19} strokeWidth={2.8} />
            </motion.button>
          </div>
        </section>
      </main>

      <footer className="border-t-2 px-5 py-8 sm:px-8 lg:px-10" style={{ borderColor: COLORS.ink, background: COLORS.white }}>
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: COLORS.yellow }}>
              <Moon size={19} strokeWidth={2.5} />
            </span>
            <div>
              <p className="font-black tracking-[-0.03em]">星迹智绘 StarTrace</p>
              <p className="mt-0.5 text-xs font-bold" style={{ color: COLORS.inkSoft }}>沿着星迹，一笔一笔画出自己的世界。</p>
            </div>
          </div>
          <p className="text-xs font-bold" style={{ color: COLORS.inkSoft }}>智能笔触拆解 · 渐进式绘画引导 · 作品成长记录</p>
        </div>
      </footer>
    </div>
  );
}
