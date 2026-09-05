'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bot,
  BrainCircuit,
  Brush,
  Check,
  CircleDot,
  Clock3,
  Eye,
  FlaskConical,
  Image as ImageIcon,
  Layers3,
  LineChart,
  Moon,
  MousePointer2,
  Palette,
  Play,
  Route,
  Sparkles,
  Target,
  Upload,
  Wand2,
} from 'lucide-react';

const COLORS = {
  ink: '#17233F',
  inkSoft: '#536079',
  purple: '#6558D9',
  purpleSoft: '#ECEAFE',
  yellow: '#FFD166',
  mint: '#69D2C2',
  pink: '#FF8FAB',
  blue: '#8EC5FF',
  paper: '#F6F7FB',
  white: '#FFFFFF',
};

const CHAPTERS = [
  { id: 'overview', label: '产品概述', color: COLORS.yellow },
  { id: 'interaction', label: '核心交互', color: COLORS.mint },
  { id: 'novice', label: '零基础专项', color: COLORS.pink },
  { id: 'workflow', label: '使用流程', color: COLORS.blue },
  { id: 'diffusion', label: 'Diffusion 生图', color: COLORS.yellow },
  { id: 'llm', label: 'LLM 大模型', color: COLORS.pink },
  { id: 'algorithm', label: '笔触算法', color: COLORS.mint },
  { id: 'research', label: '研究框架', color: COLORS.purpleSoft },
];

const FLOW_STEPS = [
  { icon: ImageIcon, title: '选择画面', body: '选择示例作品，或上传一张真正想画的图片。', color: COLORS.yellow },
  { icon: Layers3, title: '生成星迹', body: '系统将图像拆成由粗到细、有顺序的笔触路径。', color: COLORS.mint },
  { icon: CircleDot, title: '找到星点', body: '月亮伙伴提示起点、方向、颜色和辅助强度。', color: COLORS.purpleSoft },
  { icon: Brush, title: '跟随绘制', body: '用户亲手完成每一笔，也能跳过或请求更多帮助。', color: '#FFE3EC' },
  { icon: BarChart3, title: '形成星图', body: '作品与过程数据沉淀为进步反馈和研究指标。', color: '#E5F2FF' },
];

const NOVICE_MAPPINGS = [
  ['不知道从哪里开始', '突出唯一的下一颗星点', '降低首次落笔决策负担'],
  ['画面看起来太复杂', '由大形到细节分层拆解', '把整体任务缩小为单笔任务'],
  ['担心画错而停住', '提供轨迹、颜色与即时反馈', '允许试错，并让进度持续可见'],
  ['完成一次却难以坚持', '记录星图、动笔次数与辅助变化', '把完成感连接到下一次练习'],
];

const ALGORITHM_STEPS = [
  ['01', '图像采样', '读取参考图像的颜色、亮度与局部结构。'],
  ['02', '多尺度规划', '按大、中、小笔刷建立由粗到细的绘制层级。'],
  ['03', '误差区域检测', '比较目标图与虚拟画布，优先处理差异明显的区域。'],
  ['04', '曲线笔触生成', '沿图像梯度的切线方向生成连续、平滑的曲线路径。'],
  ['05', '有序引导输出', '保存起点、路径、颜色和宽度，转化为可交互步骤。'],
];

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function SectionTitle({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-black tracking-[0.18em]" style={{ color: COLORS.purple }}>{eyebrow}</p>
      <h2 className="mt-4 text-[clamp(2.2rem,5vw,4.4rem)] font-black leading-[1.03] tracking-[-0.055em]">{title}</h2>
      <p className="mt-6 max-w-2xl text-base font-bold leading-8" style={{ color: COLORS.inkSoft }}>{body}</p>
    </div>
  );
}

function StarTrailVisual() {
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem]" style={{ background: '#FFF9E8', border: `2px solid ${COLORS.ink}` }}>
      <svg viewBox="0 0 600 450" className="h-full w-full" fill="none" role="img" aria-label="星点与笔触路径交互示意">
        <rect width="600" height="450" fill="#FFF9E8" />
        <path d="M0 329C132 287 225 352 345 307C447 269 515 290 600 251V450H0V329Z" fill="#DDF2EA" />
        <path d="M62 120C155 58 270 82 337 145C386 192 435 171 532 107" stroke="#DED9FF" strokeWidth="34" strokeLinecap="round" />
        <path d="M89 315C168 260 249 252 326 277C389 298 457 269 522 218" stroke="#6558D9" strokeWidth="22" strokeLinecap="round" opacity="0.13" />
        <motion.path
          d="M89 315C168 260 249 252 326 277C389 298 457 269 522 218"
          stroke={COLORS.purple}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="12 14"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 0.8, ease: 'easeInOut' }}
        />
        <motion.circle
          cx="89"
          cy="315"
          r="15"
          fill={COLORS.yellow}
          stroke={COLORS.ink}
          strokeWidth="4"
          animate={{ scale: [1, 1.22, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <circle cx="522" cy="218" r="8" fill={COLORS.white} stroke={COLORS.purple} strokeWidth="4" />
        <path d="M310 291C312 242 315 204 320 161" stroke="#4F8C68" strokeWidth="10" strokeLinecap="round" />
        <g transform="translate(320 141)">
          {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
            <ellipse key={angle} cy="-42" rx="15" ry="32" fill={COLORS.yellow} stroke={COLORS.ink} strokeWidth="3" transform={`rotate(${angle})`} />
          ))}
          <circle r="31" fill="#9C6137" stroke={COLORS.ink} strokeWidth="4" />
        </g>
      </svg>
      <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3 rounded-2xl bg-white/95 p-3" style={{ border: `1.5px solid ${COLORS.ink}` }}>
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl" style={{ background: COLORS.yellow }}>
          <Moon size={21} strokeWidth={2.6} />
        </span>
        <div>
          <p className="text-[10px] font-black tracking-[0.1em]" style={{ color: COLORS.purple }}>月亮伙伴 · 下一笔</p>
          <p className="mt-1 text-xs font-extrabold sm:text-sm">从黄色星点出发，沿紫色星迹向右画。</p>
        </div>
      </div>
    </div>
  );
}

function LayerVisual() {
  const strokes = [
    { d: 'M18 92 Q58 62 100 76 T190 60', width: 16, color: '#8EC5FF', delay: 0 },
    { d: 'M25 50 Q62 29 99 44 T181 30', width: 11, color: '#FFD166', delay: 0.35 },
    { d: 'M44 86 Q73 70 104 84 T166 72', width: 7, color: '#69D2C2', delay: 0.7 },
    { d: 'M63 40 Q91 24 124 42 T173 38', width: 4, color: '#6558D9', delay: 1.05 },
  ];
  return (
    <svg viewBox="0 0 210 120" className="w-full" fill="none" aria-label="由粗到细的多层笔触示意">
      {strokes.map(stroke => (
        <motion.path
          key={stroke.d}
          d={stroke.d}
          stroke={stroke.color}
          strokeWidth={stroke.width}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: stroke.delay }}
        />
      ))}
    </svg>
  );
}

export default function IntroPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: COLORS.paper, color: COLORS.ink }}>
      <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur" style={{ borderColor: '#D9DDEA' }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-8 lg:px-10">
          <button onClick={() => router.push('/')} className="flex items-center gap-3 text-left" aria-label="返回首页">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: COLORS.yellow, border: `2px solid ${COLORS.ink}` }}>
              <Moon size={21} strokeWidth={2.6} />
            </span>
            <span className="hidden sm:block">
              <span className="block text-sm font-black">星迹智绘</span>
              <span className="block text-[9px] font-extrabold tracking-[0.16em]" style={{ color: COLORS.inkSoft }}>PRODUCT RESEARCH</span>
            </span>
          </button>
          <nav className="hidden items-center gap-1 xl:flex" aria-label="产品介绍章节">
            {CHAPTERS.map(chapter => (
              <button
                key={chapter.id}
                onClick={() => scrollToSection(chapter.id)}
                className="rounded-full px-3 py-2 text-xs font-extrabold transition-colors hover:bg-slate-100"
              >
                {chapter.label}
              </button>
            ))}
          </nav>
          <button
            onClick={() => router.push('/create')}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-black text-white"
            style={{ background: COLORS.ink }}
          >
            进入应用 <ArrowRight size={16} strokeWidth={2.8} />
          </button>
        </div>
      </header>

      <main>
        <section className="relative mx-auto grid min-h-[82vh] w-full max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_0.92fr] lg:px-10 lg:py-24">
          <div className="pointer-events-none absolute left-[4%] top-[12%] h-2 w-2 rounded-full" style={{ background: COLORS.yellow }} />
          <div className="pointer-events-none absolute right-[5%] top-[18%] h-3 w-3 rounded-full" style={{ background: COLORS.pink }} />
          <motion.div initial={false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black tracking-[0.12em]" style={{ background: COLORS.purpleSoft, color: COLORS.purple, border: `1.5px solid ${COLORS.purple}` }}>
              <FlaskConical size={16} strokeWidth={2.5} /> 研究型交互原型
            </div>
            <h1 className="mt-7 max-w-3xl text-[clamp(3.2rem,7vw,6.4rem)] font-black leading-[0.94] tracking-[-0.067em]">
              把复杂画面，
              <br />翻译成
              <span className="block" style={{ color: COLORS.purple }}>下一笔。</span>
            </h1>
            <p className="mt-8 max-w-2xl text-base font-bold leading-8 sm:text-lg" style={{ color: COLORS.inkSoft }}>
              星迹智绘把图像笔触拆解算法转化为可理解、可跟随、可逐渐退出的绘画引导，服务于没有系统绘画经验、却想开始动笔的人。
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <button onClick={() => scrollToSection('overview')} className="inline-flex items-center gap-2 rounded-full px-6 py-4 text-base font-black text-white" style={{ background: COLORS.ink, boxShadow: `5px 5px 0 ${COLORS.yellow}` }}>
                浏览产品全貌 <ArrowRight size={18} strokeWidth={2.8} />
              </button>
              <button onClick={() => scrollToSection('research')} className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-4 text-base font-black" style={{ border: `2px solid ${COLORS.ink}` }}>
                <LineChart size={18} /> 查看研究框架
              </button>
            </div>
          </motion.div>

          <motion.div initial={false} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.1 }} className="relative">
            <div className="rounded-[2rem] bg-white p-5 sm:p-7" style={{ border: `2px solid ${COLORS.ink}`, boxShadow: `9px 9px 0 ${COLORS.purple}` }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black tracking-[0.14em]" style={{ color: COLORS.purple }}>核心研究问题</p>
                  <h2 className="mt-3 text-2xl font-black leading-tight tracking-[-0.04em]">拆成“下一笔”以后，<br />人会更愿意开始画吗？</h2>
                </div>
                <Target size={30} color={COLORS.purple} strokeWidth={2.4} />
              </div>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {[
                  [Clock3, '首次落笔时间', '启动阻力'],
                  [Brush, '独立完成笔触', '入门帮助'],
                  [BarChart3, '练习启动频次', '持续动笔'],
                ].map(([Icon, metric, meaning]) => {
                  const MetricIcon = Icon as typeof Clock3;
                  return (
                    <div key={metric as string} className="rounded-2xl p-4" style={{ background: COLORS.paper }}>
                      <MetricIcon size={21} color={COLORS.purple} strokeWidth={2.5} />
                      <p className="mt-5 text-sm font-black">{metric as string}</p>
                      <p className="mt-1 text-xs font-bold" style={{ color: COLORS.inkSoft }}>{meaning as string}</p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 rounded-2xl px-4 py-3 text-xs font-bold leading-6" style={{ background: '#FFF5D8', color: COLORS.inkSoft }}>
                这些是待研究验证的观察指标，不是预设的产品效果结论。
              </div>
            </div>
          </motion.div>
        </section>

        <section id="overview" className="scroll-mt-20 border-y-2 px-5 py-20 sm:px-8 lg:px-10 lg:py-28" style={{ borderColor: COLORS.ink, background: COLORS.white }}>
          <div className="mx-auto w-full max-w-7xl">
            <SectionTitle eyebrow="01 · 产品概述" title="一套围绕“亲手画”设计的 AI 绘画系统" body="它不以一键生成成品代替绘画，而是把 AI 放在理解画面、组织步骤和反馈过程的位置，让用户始终是实际动笔的人。" />
            <div className="mt-12 grid gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-stretch">
              {[
                [Upload, '输入', '想画的图片', '示例作品或个人上传'],
                [BrainCircuit, '处理', '智能笔触拆解', '结构、颜色、顺序与路径'],
                [Route, '输出', '渐进式绘画引导', '星点、星迹与月亮伙伴'],
              ].map(([Icon, tag, title, body], index) => {
                const CardIcon = Icon as typeof Upload;
                return (
                  <div key={title as string} className="contents">
                    <motion.article whileInView={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 16 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }} className="rounded-[1.75rem] p-6" style={{ background: [COLORS.yellow, COLORS.mint, COLORS.purpleSoft][index], border: `2px solid ${COLORS.ink}` }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black tracking-[0.14em]" style={{ color: COLORS.purple }}>{tag as string}</span>
                        <CardIcon size={25} strokeWidth={2.4} />
                      </div>
                      <h3 className="mt-14 text-2xl font-black tracking-[-0.04em]">{title as string}</h3>
                      <p className="mt-3 text-sm font-bold leading-6" style={{ color: COLORS.inkSoft }}>{body as string}</p>
                    </motion.article>
                    {index < 2 && <ArrowRight className="mx-auto self-center" size={26} color={COLORS.purple} strokeWidth={3} />}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="interaction" className="scroll-mt-20 mx-auto grid w-full max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-10 lg:py-28">
          <StarTrailVisual />
          <div>
            <SectionTitle eyebrow="02 · 核心交互" title="一次只回答：下一笔怎么画？" body="系统将复杂的全局判断转化为局部行动提示。用户可以跟随，也可以跳过、降低辅助或切换到自主绘制。" />
            <div className="mt-8 space-y-3">
              {[
                [CircleDot, '星点', '明确在哪里落笔'],
                [Route, '星迹', '显示方向、长度与弧度'],
                [Palette, '颜色提示', '减少寻找颜色的认知负担'],
                [Moon, '月亮伙伴', '用自然语言解释当前动作'],
              ].map(([Icon, title, body], index) => {
                const ItemIcon = Icon as typeof CircleDot;
                return (
                  <div key={title as string} className="flex items-center gap-4 rounded-2xl bg-white p-4" style={{ border: '1.5px solid #D9DDEA' }}>
                    <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl" style={{ background: [COLORS.yellow, COLORS.mint, '#FFE3EC', COLORS.purpleSoft][index] }}>
                      <ItemIcon size={21} strokeWidth={2.5} />
                    </span>
                    <div>
                      <p className="text-sm font-black">{title as string}</p>
                      <p className="mt-1 text-xs font-bold" style={{ color: COLORS.inkSoft }}>{body as string}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="novice" className="scroll-mt-20 px-5 py-20 sm:px-8 lg:px-10 lg:py-28" style={{ background: '#FFF1F5' }}>
          <div className="mx-auto w-full max-w-7xl">
            <SectionTitle eyebrow="03 · 零基础绘画人群专项" title="围绕真实的“动不了笔”设计" body="这里的零基础不是年龄标签，而是尚未建立绘画方法、判断标准与稳定练习习惯的状态。产品机制对应四类常见入门阻力。" />
            <div className="mt-12 overflow-hidden rounded-[1.75rem] bg-white" style={{ border: `2px solid ${COLORS.ink}` }}>
              <div className="hidden grid-cols-[1fr_1fr_1fr] bg-slate-100 px-6 py-4 text-xs font-black tracking-[0.12em] md:grid">
                <span>入门阻力</span><span>产品机制</span><span>预期作用</span>
              </div>
              {NOVICE_MAPPINGS.map((row, index) => (
                <motion.div key={row[0]} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: index * 0.08 }} className="grid gap-3 border-t px-5 py-5 first:border-t-0 md:grid-cols-[1fr_1fr_1fr] md:px-6" style={{ borderColor: '#D9DDEA' }}>
                  <div className="flex items-center gap-3 font-black"><span className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs" style={{ background: COLORS.pink }}>{index + 1}</span>{row[0]}</div>
                  <div className="text-sm font-bold" style={{ color: COLORS.purple }}>{row[1]}</div>
                  <div className="text-sm font-bold" style={{ color: COLORS.inkSoft }}>{row[2]}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" className="scroll-mt-20 px-5 py-20 sm:px-8 lg:px-10 lg:py-28" style={{ background: COLORS.white }}>
          <div className="mx-auto w-full max-w-7xl">
            <SectionTitle eyebrow="04 · 使用流程" title="五步 AI 辅助完成绘画" body="从内容选择到作品记录，每一步都提供明确目标；AI 的辅助强度可以随熟悉程度逐渐减少。" />
            <div className="mt-12 grid gap-4 md:grid-cols-5">
              {FLOW_STEPS.map((step, index) => {
                const StepIcon = step.icon;
                return (
                  <motion.article key={step.title} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.07 }} className="relative rounded-[1.5rem] p-5" style={{ background: step.color, border: `2px solid ${COLORS.ink}` }}>
                    <div className="flex items-center justify-between"><span className="text-xs font-black" style={{ color: COLORS.purple }}>0{index + 1}</span><StepIcon size={23} strokeWidth={2.5} /></div>
                    <h3 className="mt-9 text-lg font-black">{step.title}</h3>
                    <p className="mt-3 text-sm font-bold leading-6" style={{ color: COLORS.inkSoft }}>{step.body}</p>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="px-5 py-20 text-white sm:px-8 lg:px-10 lg:py-28" style={{ background: COLORS.ink }}>
          <div className="mx-auto w-full max-w-7xl">
            <p className="text-xs font-black tracking-[0.18em]" style={{ color: COLORS.mint }}>05—07 · 技术协同</p>
            <h2 className="mt-4 max-w-4xl text-[clamp(2.3rem,5vw,4.7rem)] font-black leading-[1.03] tracking-[-0.055em]">三种 AI 能力，各自解决不同问题</h2>
            <p className="mt-6 max-w-3xl text-base font-bold leading-8 text-white/65">笔触算法是研究的核心交互变量；Diffusion 和 LLM 提供结果表现与语言反馈，不与笔触拆解混为同一个技术概念。</p>

            <article id="diffusion" className="scroll-mt-24 mt-14 grid gap-8 rounded-[2rem] p-6 sm:p-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center" style={{ background: '#222F4E', border: '1.5px solid rgba(255,255,255,0.2)' }}>
              <div>
                <div className="flex items-center gap-2 text-xs font-black tracking-[0.14em]" style={{ color: COLORS.yellow }}><Wand2 size={17} /> DIFFUSION 生图</div>
                <h3 className="mt-4 text-3xl font-black tracking-[-0.04em]">把绘画结果转化为风格化图像</h3>
                <p className="mt-5 text-sm font-bold leading-7 text-white/65">以用户画布和风格描述为条件生成结果图，用于完成后的视觉反馈与创作延展。它不生成星迹，也不替代用户完成核心练习过程。</p>
                <div className="mt-6 inline-flex rounded-full px-4 py-2 text-xs font-black" style={{ background: COLORS.yellow, color: COLORS.ink }}>辅助输出模块</div>
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div className="rounded-2xl bg-white p-3 text-slate-900"><div className="flex aspect-square items-center justify-center rounded-xl bg-[#F1F3F7]"><Brush size={46} color={COLORS.purple} /></div><p className="mt-3 text-xs font-black">用户画布</p></div>
                <ArrowRight color={COLORS.yellow} strokeWidth={3} />
                <div className="rounded-2xl bg-white p-3 text-slate-900"><div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl" style={{ background: 'linear-gradient(135deg,#FFD166,#FF8FAB 48%,#6558D9)' }}><Sparkles size={48} color="white" /></div><p className="mt-3 text-xs font-black">风格化结果</p></div>
              </div>
            </article>

            <article id="llm" className="scroll-mt-24 mt-5 grid gap-8 rounded-[2rem] p-6 sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center" style={{ background: '#222F4E', border: '1.5px solid rgba(255,255,255,0.2)' }}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.08)' }}><p className="text-xs font-black" style={{ color: COLORS.mint }}>过程输入</p><div className="mt-5 space-y-2 text-xs font-bold text-white/65"><p>完成 / 跳过笔触</p><p>停顿与绘画节奏</p><p>辅助使用情况</p><p>作品结果快照</p></div></div>
                <div className="rounded-2xl bg-white p-4 text-slate-900"><p className="text-xs font-black" style={{ color: COLORS.purple }}>语言输出</p><div className="mt-5 space-y-2 text-xs font-bold" style={{ color: COLORS.inkSoft }}><p>下一步解释</p><p>过程性鼓励</p><p>学习总结</p><p>练习建议</p></div></div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs font-black tracking-[0.14em]" style={{ color: COLORS.pink }}><Bot size={18} /> LLM 大模型</div>
                <h3 className="mt-4 text-3xl font-black tracking-[-0.04em]">把过程数据组织成可读反馈</h3>
                <p className="mt-5 text-sm font-bold leading-7 text-white/65">LLM 接收结构化绘画过程与作品信息，生成自然语言引导和学习总结。行为指标本身由系统记录，模型负责解释与表达。</p>
                <div className="mt-6 inline-flex rounded-full px-4 py-2 text-xs font-black" style={{ background: COLORS.pink, color: COLORS.ink }}>语言交互模块</div>
              </div>
            </article>

            <article id="algorithm" className="scroll-mt-24 mt-5 rounded-[2rem] p-6 sm:p-8" style={{ background: COLORS.white, color: COLORS.ink }}>
              <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
                <div>
                  <div className="flex items-center gap-2 text-xs font-black tracking-[0.14em]" style={{ color: COLORS.purple }}><BrainCircuit size={18} /> 笔触拆解算法</div>
                  <h3 className="mt-4 text-3xl font-black tracking-[-0.04em]">从图像近似，转化为教学顺序</h3>
                  <p className="mt-5 text-sm font-bold leading-7" style={{ color: COLORS.inkSoft }}>核心实现参考 Hertzmann 的曲线笔触绘制思想：从粗到细迭代，在高误差区域生成沿图像结构方向延伸的曲线笔触，再输出为可跟随序列。</p>
                  <div className="mt-7 rounded-2xl p-4" style={{ background: COLORS.paper }}><LayerVisual /><p className="mt-2 text-center text-xs font-black" style={{ color: COLORS.inkSoft }}>大笔触建立结构 → 小笔触补充细节</p></div>
                </div>
                <div className="space-y-3">
                  {ALGORITHM_STEPS.map((step, index) => (
                    <motion.div key={step[0]} initial={{ opacity: 0, x: 14 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.07 }} className="grid grid-cols-[auto_1fr] gap-4 rounded-2xl p-4" style={{ background: [COLORS.yellow, '#E5F5F1', COLORS.purpleSoft, '#FFE3EC', '#E5F2FF'][index] }}>
                      <span className="text-xs font-black" style={{ color: COLORS.purple }}>{step[0]}</span>
                      <div><p className="text-sm font-black">{step[1]}</p><p className="mt-1 text-xs font-bold leading-5" style={{ color: COLORS.inkSoft }}>{step[2]}</p></div>
                    </motion.div>
                  ))}
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-2 text-xs font-extrabold">
                {['多尺度笔刷', '局部误差检测', '梯度方向', 'Catmull–Rom 平滑', '颜色采样', '有序笔触队列'].map(tag => <span key={tag} className="rounded-full px-3 py-2" style={{ background: COLORS.paper }}>{tag}</span>)}
              </div>
            </article>
          </div>
        </section>

        <section id="research" className="scroll-mt-20 px-5 py-20 sm:px-8 lg:px-10 lg:py-28" style={{ background: COLORS.purpleSoft }}>
          <div className="mx-auto w-full max-w-7xl">
            <SectionTitle eyebrow="08 · 研究框架" title="产品功能最终服务于可验证的问题" body="论文关注的不是“AI 能不能生成好看的画”，而是笔触拆解被产品化以后，是否能改善零基础用户的绘画启动与持续练习行为。" />
            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {[
                [FlaskConical, '核心自变量', '绘画引导方式', ['笔触拆解 + 分步星迹引导', '对照：仅提供完整参考图']],
                [MousePointer2, '过程指标', '如何开始与完成', ['首次落笔时间、停顿时长', '完成率、跳过率、辅助使用率']],
                [LineChart, '结果指标', '是否更愿意继续画', ['单位周期练习启动次数', '活跃天数、作品数、自我效能']],
              ].map(([Icon, eyebrow, title, items], index) => {
                const ResearchIcon = Icon as typeof FlaskConical;
                return (
                  <article key={title as string} className="rounded-[1.75rem] bg-white p-6" style={{ border: `2px solid ${COLORS.ink}`, boxShadow: `6px 6px 0 ${[COLORS.yellow, COLORS.mint, COLORS.pink][index]}` }}>
                    <div className="flex items-center justify-between"><p className="text-xs font-black tracking-[0.12em]" style={{ color: COLORS.purple }}>{eyebrow as string}</p><ResearchIcon size={24} strokeWidth={2.5} /></div>
                    <h3 className="mt-8 text-2xl font-black">{title as string}</h3>
                    <div className="mt-5 space-y-3">{(items as string[]).map(item => <p key={item} className="flex gap-2 text-sm font-bold leading-6" style={{ color: COLORS.inkSoft }}><Check className="mt-0.5 flex-none" size={16} color={COLORS.purple} strokeWidth={3} />{item}</p>)}</div>
                  </article>
                );
              })}
            </div>
            <div className="mt-8 grid gap-4 rounded-[1.75rem] p-6 sm:p-8 lg:grid-cols-[auto_1fr_auto] lg:items-center" style={{ background: COLORS.ink, color: COLORS.white }}>
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: COLORS.yellow, color: COLORS.ink }}><Eye size={27} /></span>
              <div><p className="text-xs font-black tracking-[0.12em]" style={{ color: COLORS.mint }}>研究边界</p><p className="mt-2 text-base font-bold leading-7 text-white/70">系统记录可观察的交互与练习行为；关于“有效”的判断需由后续用户研究、量表和统计分析得出。</p></div>
              <span className="rounded-full px-4 py-2 text-xs font-black" style={{ background: 'rgba(255,255,255,0.1)' }}>不预设结论</span>
            </div>
          </div>
        </section>

        <section className="px-5 py-20 sm:px-8 lg:px-10">
          <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-8 rounded-[2.25rem] p-7 sm:p-10 lg:flex-row lg:items-center" style={{ background: COLORS.yellow, border: `2px solid ${COLORS.ink}`, boxShadow: `9px 9px 0 ${COLORS.purple}` }}>
            <div><p className="text-xs font-black tracking-[0.14em]" style={{ color: COLORS.purple }}>STARTRACE</p><h2 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">沿着星迹，亲手画出第一幅作品。</h2></div>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => router.push('/')} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3.5 text-sm font-black" style={{ border: `2px solid ${COLORS.ink}` }}><ArrowLeft size={17} /> 返回首页</button>
              <button onClick={() => router.push('/create')} className="inline-flex items-center gap-2 rounded-full px-5 py-3.5 text-sm font-black text-white" style={{ background: COLORS.ink }}><Play size={17} fill="currentColor" /> 进入绘画应用</button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t-2 bg-white px-5 py-8 sm:px-8 lg:px-10" style={{ borderColor: COLORS.ink }}>
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-black">星迹智绘 StarTrace · 产品与研究介绍</p>
          <p className="text-xs font-bold" style={{ color: COLORS.inkSoft }}>智能笔触拆解 · 渐进式绘画引导 · 行为研究原型</p>
        </div>
      </footer>
    </div>
  );
}
