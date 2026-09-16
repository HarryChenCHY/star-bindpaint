'use client';

import { useEffect, useRef, useState, type ComponentType } from 'react';
import { BookOpen, X, Wand2, Play, Sparkles, Lock, Unlock, Minus, RotateCcw, ArrowLeft, Check, Palette, Layers, Music2, ChevronsRight, Undo2, Eraser, SprayCan, ChevronDown, Maximize2, type LucideIcon } from 'lucide-react';
import { drawGuideStroke, GuidanceLevel } from '@/lib/stroke-engine';
import { brushColorCss, BrushColor } from '@/lib/brush-color';
import HsvColorPicker from './HsvColorPicker';

type Topic = 'overview' | 'follow' | 'auto' | 'free' | 'companion' | 'finish';
const topics: [Topic, string][] = [['overview', '界面总览'], ['follow', '沿星迹'], ['auto', '自动续画'], ['free', '自由星域'], ['companion', '月亮伙伴'], ['finish', '完成与保存']];
const tools: Record<Topic, [LucideIcon, string, string][]> = {
  overview: [[ArrowLeft, '返回', '返回选图页。有未保存的绘画时会询问是否离开，取消即可继续画。'], [Check, '完成', '打开作品完成弹窗，查看记录并保存作品。'], [Wand2, '沿星迹', '根据同一幅参考图，一次跟随一笔。'], [Play, '自动续画', '月亮伙伴从当前进度接着画，需要已有参考图和笔触序列。'], [Sparkles, '自由星域', '自由选择颜色、大小和风格，直接绘画。切换回来会保留已画内容。'], [RotateCcw, '重新开始', '确认后清空当前画布并重置进度，请先保存需要保留的作品。'], [ChevronDown, '收起工具栏', '把底部工具栏缩成一个图标；点击调色盘图标重新展开。'], [BookOpen, '教程', '打开本教程。自动续画会先暂停；返回画板后可手动继续。']],
  follow: [[Undo2, '撤销', '回到上一次操作前的画面与星迹进度。亲手绘画、换一笔、伙伴补笔都可撤销；一起画的一笔及其补笔作为一次操作撤回。自动续画暂停后也可撤回这一段。最多保留最近 30 次操作。'], [Wand2, '星光画笔', '调节笔宽，数字显示四舍五入后的大小；你主动选定的大小会保留。'], [Layers, '笔迹方式', '“AI 修正”把通过判定的手绘轨迹替换成规划笔触；“保留原笔”保留你亲手画出的形状。'], [Music2, '节奏', '“自己画”由你逐笔绘画；“一起画”让你完成一笔后，伙伴继续补若干笔，比例可调。'], [Sparkles, '月亮伙伴帮画', '可以补 5、10、20 笔或全部画完。伙伴补笔单独记录，不等同于亲手绘画。'], [ChevronsRight, '换一笔', '跳过当前引导，寻找下一笔；不是完成当前笔，也不会把跳过的笔自动涂上。']],
  auto: [[Play, '自动续画 / 暂停', '播放时图标变为暂停，再点暂停并保留自动模式工具栏；再次播放从当前进度继续。'], [ChevronsRight, '快慢', '设置相邻笔触的播放间隔，范围200ms–1s，默认每笔1s，数值越小越快。'], [Wand2, '返回沿星迹', '停止自动续画，由你接着当前星迹画。'], [Sparkles, '切换自由星域', '停止续画后进入自由绘画，已完成的笔触保留。']],
  free: [[Wand2, '星光画笔', '切回普通画笔并调节大小。画笔大小不会在画完一笔或更换风格后自动重置。'], [Palette, '颜色', '可选预设色；彩色色环 + 按钮打开自定义 HSV，拖动色环选择色相，方框左右改变饱和度、上下改变明度。H/S/V 可直接输入。'], [Layers, '风格', '莫奈：松散短笔；梵高：鼓起厚涂；高更：平涂色块；伦勃朗：干笔肌理；毕加索：断续节奏；萨金特：渐细收笔。它们是可解释笔刷预设，不是大师训练模型。'], [Undo2, '撤销', '撤回最近的自由绘画操作；没有可撤销操作时按钮为灰色。'], [Eraser, '橡皮擦', '点击启用，再点关闭。用于擦除画布中的笔迹，误擦可撤销。'], [SprayCan, '喷枪', '点击切换喷绘，拖动喷出散点颜色；与橡皮互斥。稀疏边缘会透出底色。']],
  companion: [[Lock, '锁定 / 解锁', '默认锁定。解锁后拖动顶部点状手柄移动提示卡，也可聚焦手柄用方向键微调。再次锁定防止误拖。'], [Minus, '收起 / 展开', '减号把提示卡缩成方圆月亮图标，点图标展开。位置和锁定状态会被记住。'], [Maximize2, '参考原图', '有参考图片时显示在卡片顶部。点击全屏放大，再点击图片、关闭或按 Esc 返回。'], [Sparkles, '完成剩余笔触', '让月亮伙伴从当前位置自动完成余下笔触；播放时这里变为暂停按钮。'], [Layers, '完整 / 适度 / 起点', '完整：30% 紫色填充、虚线外框、1/2 标记和箭头。适度：起终点与方向线。起点：只显示圆形 1。短小笔触的数字圆圈、文字和箭头会同比缩小，让路线保持可见。']],
  finish: [[Check, '完成作品', '可以中途点击完成。弹窗展示你实际完成的记录；自动补笔不会被计作亲手画出的笔触。'], [Palette, '保存到我的星图', '按弹窗的保存选项保存作品；需要云保存时按授权提示操作，保存成功后再离开。'], [Maximize2, '作品预览', '完成弹窗会展示当前作品和星迹进度、亲手完成笔数、引导方式，方便保存前确认。'], [ArrowLeft, '继续绘画 / 返回', '点击“继续调整”回到画布完善作品；离开画板前确认已保存。']],
};

function GuideDemo() {
  const [level, setLevel] = useState<GuidanceLevel>('full');
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 340, 150);
    drawGuideStroke(ctx, { points: [{ x: 45, y: 70 }, { x: 140, y: 70 }, { x: 285, y: 100 }], width: 34, color: [.4, .3, .8] }, level);
  }, [level]);
  return <><canvas ref={canvas} width={340} height={150} className="w-full" aria-label="三档笔触引导示例" /><div className="flex gap-2">{([['full', '完整'], ['balanced', '适度'], ['light', '起点']] as const).map(([id, label]) => <button key={id} aria-pressed={level === id} onClick={() => setLevel(id)} className={`flex-1 rounded-xl border p-2 font-bold ${level === id ? 'bg-[#FFD166]' : 'bg-white'}`}>{label}</button>)}</div><p className="mt-3 text-sm">从圆圈 1 出发，顺着箭头走向 2。无需一次描得完全一致。</p></>;
}

function PlaybackDemo() {
  const [running, setRunning] = useState(false), [step, setStep] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setStep(s => (s + 1) % 13), 400);
    return () => clearInterval(id);
  }, [running]);
  return <><svg viewBox="0 0 340 160" className="w-full" aria-label="自动续画示例">{Array.from({ length: step }, (_, i) => <path key={i} d={`M${30 + i * 24} 120L${40 + i * 24} ${40 + i % 3 * 15}`} stroke={['#69D2C2', '#FFD166', '#6558D9'][i % 3]} strokeWidth="18" strokeLinecap="round" />)}</svg><button className="rounded-xl border-2 bg-[#FFD166] px-4 py-2 font-bold" onClick={() => setRunning(r => !r)}>{running ? '暂停示例' : '播放示例'}</button><span className="ml-3">{step} / 12 笔</span></>;
}

function CardDemo() {
  const [locked, setLocked] = useState(true), [collapsed, setCollapsed] = useState(false);
  const [position, setPosition] = useState(0);
  return <div><div className="mb-3 flex gap-2"><button className="rounded-xl border bg-white p-2" onClick={() => setLocked(v => !v)}>{locked ? <Lock size={18} /> : <Unlock size={18} />}<span className="text-xs">{locked ? '解锁示例卡' : '锁定示例卡'}</span></button><button className="rounded-xl border bg-white p-2" onClick={() => setCollapsed(v => !v)}>{collapsed ? '展开示例卡' : '收起示例卡'}</button></div><div className="rounded-2xl border-2 bg-white p-4 shadow-[4px_4px_0_#6558D9]" style={{ marginLeft: position, width: collapsed ? 64 : '75%' }}>{collapsed ? '☾' : '☾ 月亮伙伴 · 从圆圈 1 开始'}</div><label className="mt-5 block text-xs">试试移动（先解锁）<input aria-label="移动示例卡" type="range" min={0} max={50} value={position} disabled={locked} onChange={e => setPosition(Number(e.target.value))} className="mt-2 w-full" /></label></div>;
}

export default function PaintTutorial({ onOpen, Trigger }: { onOpen: () => void; Trigger: ComponentType<{ onClick: () => void }> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [topic, setTopic] = useState<Topic>('overview');
  const [color, setColor] = useState<BrushColor>([.4, .3, .8]);
  return <>
    <Trigger onClick={() => { onOpen(); dialog.current?.showModal(); }} />
    <dialog ref={dialog} aria-label="绘画界面完整教程" className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-[#F6F7FB] p-0 text-[#17233F] backdrop:bg-black/50">
      <div className="flex h-full flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b-2 bg-white p-4 sm:px-8"><div><h2 className="text-xl font-black">绘画教程</h2><p className="mt-1 text-xs text-[#536079]">点击目录和示例，认识每一个工具。</p></div><button autoFocus onClick={() => dialog.current?.close()} aria-label="关闭教程返回画板" className="flex items-center gap-2 rounded-full border-2 px-3 py-2 text-sm font-bold"><X size={18} />返回画板</button></header>
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <nav aria-label="教程目录" className="flex shrink-0 gap-2 overflow-x-auto border-b bg-white p-3 md:w-44 md:flex-col md:border-r">{topics.map(([id, title]) => <button key={id} aria-current={topic === id ? 'page' : undefined} onClick={() => setTopic(id)} className={`shrink-0 rounded-xl px-3 py-3 text-left text-sm font-bold ${topic === id ? 'bg-[#FFD166]' : 'bg-[#F6F7FB]'}`}>{title}</button>)}</nav>
          <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-8" key={topic}>
            <div className="mx-auto max-w-4xl"><p className="text-xs font-bold text-[#6558D9]">{topics.findIndex(([id]) => id === topic) + 1} / 6</p><h3 className="mb-5 mt-2 text-3xl font-black">{topics.find(([id]) => id === topic)?.[1]}</h3>
              <div className="mb-6 rounded-2xl border-2 bg-white p-4 sm:p-6">
                {topic === 'follow' && <GuideDemo />}
                {topic === 'auto' && <PlaybackDemo />}
                {topic === 'free' && <div className="mx-auto max-w-xs"><div className="h-8 rounded-full border-2" style={{ background: brushColorCss(color) }} /><HsvColorPicker color={color} onChange={setColor} /></div>}
                {topic === 'companion' && <CardDemo />}
                {topic === 'overview' && <div className="grid gap-3 text-center"><div className="flex justify-between rounded-lg bg-[#ECEAFE] p-3"><span>← 返回</span><span>模式名称</span><span>完成 ✓</span></div><div className="grid grid-cols-[1fr_100px] gap-3"><div className="flex min-h-28 items-center justify-center rounded-xl bg-[#FFF4CF] font-bold">绘画画布<br />左侧：星迹进度</div><button className="rounded-xl border-2 bg-[#ECEAFE] p-2 text-sm" onClick={() => setTopic('companion')}>☾<br />月亮伙伴<br />点击了解</button></div><div className="flex flex-wrap justify-center gap-3 rounded-full border-2 p-3">{([[Wand2, 'follow'], [Play, 'auto'], [Sparkles, 'free']] as const).map(([Icon, id]) => <button key={id} aria-label={`了解${topics.find(([key]) => key === id)?.[1]}`} onClick={() => setTopic(id)} className="rounded-full bg-[#FFD166] p-3"><Icon size={22} /></button>)}</div></div>}
                {topic === 'finish' && <div className="flex flex-wrap items-center justify-center gap-3 text-sm font-bold"><span className="rounded-xl bg-[#FFD166] p-4">完成</span>→<span className="rounded-xl bg-[#ECEAFE] p-4">查看绘画记录</span>→<span className="rounded-xl bg-[#69D2C2] p-4">保存到星图</span></div>}
                <p className="mt-4 text-xs text-[#536079]">这里的示例不会修改你的作品。按 Esc 或“返回画板”继续。</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">{tools[topic].map(([Icon, title, body]) => <article key={title} className="rounded-2xl border border-[#D9DDEA] bg-white p-4"><span className="mb-3 inline-flex rounded-xl bg-[#ECEAFE] p-3"><Icon size={22} /></span><h4 className="font-black">{title}</h4><p className="mt-2 text-sm leading-7 text-[#536079]">{body}</p></article>)}</div>
              {topic === 'companion' && <p className="mt-4 rounded-xl bg-[#FFF4CF] p-4 text-sm leading-7">卡片中的色点代表当前笔触颜色；数字为当前笔触序号 / 总数；进度环为序列进度，包含自动补笔。自由模式显示亲手落笔次数。左侧星点栏也显示序列进度。</p>}
            </div>
          </main>
        </div>
      </div>
    </dialog>
  </>;
}
