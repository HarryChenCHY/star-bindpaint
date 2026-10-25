'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, ChevronLeft, Menu, Sparkles, Paintbrush, Layers3, ShieldCheck } from 'lucide-react';
import { BudgetExplorer, ExperimentExplorer } from '@/components/IntroVisuals';
import { PROTOCOL, QUESTIONS } from '@/lib/study/protocol';
import { AlgorithmExplanation, PaperReferences } from '@/components/AlgorithmExplanation';
import './intro.css';

const CHAPTERS = [
  ['overview', '产品全景'], ['painting', '从图片到绘画'], ['companion', '画布与工具'],
  ['algorithm', '1000 笔算法'], ['references', '技术溯源与论文'],
  ['user-testing', '用户测试与工作台'], ['history', '原研究流程说明'],
];
function Section({ id, number, title, subtitle, children }: { id: string; number: string; title: string; subtitle: string; children: ReactNode }) {
  const Heading = number === '01' ? 'h1' : 'h2';
  return <section id={id} className="intro-section"><header className="mb-8"><p className="intro-eyebrow">{number} / STARTRACE</p><Heading>{title}</Heading><p className="intro-lead">{subtitle}</p></header>{children}</section>;
}
function Flow({ items }: { items: Array<[string, string]> }) {
  return <ol className="intro-flow">{items.map(([title, body], i) => <li key={title}><span className="intro-number">{String(i + 1).padStart(2, '0')}</span><h3>{title}</h3><p>{body}</p>{i < items.length - 1 && <ArrowRight className="intro-flow-arrow" size={20} />}</li>)}</ol>;
}
function Card({ title, children }: { title: string; children: ReactNode }) {
  return <div className="intro-card"><h3>{title}</h3>{children}</div>;
}
export default function IntroPage() {
  const [navOpen, setNavOpen] = useState(false), [active, setActive] = useState('overview');
  useEffect(() => {
    let pending = 0;
    const update = () => {
      pending = 0;
      const current = CHAPTERS.filter(([id]) => (document.getElementById(id)?.getBoundingClientRect().top ?? Infinity) <= 180).at(-1);
      setActive(current?.[0] ?? 'overview');
    };
    const onScroll = () => { if (!pending) pending = requestAnimationFrame(update); };
    const frame = requestAnimationFrame(() => { setNavOpen(window.innerWidth >= 1100); update(); });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { cancelAnimationFrame(frame); cancelAnimationFrame(pending); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, []);
  return <div className={`intro-page ${navOpen ? 'nav-open' : ''}`}>
    <header className="intro-top"><Link href="/" className="flex items-center gap-2 font-black"><ArrowLeft size={18} /><span>返回首页</span></Link><span className="flex items-center gap-2 font-black"><Sparkles size={20} className="text-[var(--st-primary)]" />星迹智绘 · 产品介绍</span><span className="hidden text-xs font-bold text-[#536079] sm:block">从第一笔，到一幅自己的画</span></header>
    {!navOpen && <button className="intro-menu" aria-expanded={false} aria-controls="intro-toc" aria-label="展开介绍目录" onClick={() => setNavOpen(true)}><Menu size={20} /><span>目录</span></button>}
    {navOpen && <><button className="intro-scrim" aria-label="关闭介绍目录" onClick={() => setNavOpen(false)} /><aside className="intro-sidebar" id="intro-toc" aria-label="产品介绍目录"><div className="mb-5 flex items-center justify-between"><span className="flex items-center gap-2 font-black"><BookOpen size={18} />内容目录</span><button className="intro-icon" aria-label="收起介绍目录" aria-expanded={true} onClick={() => setNavOpen(false)}><ChevronLeft size={20} /></button></div><nav>{CHAPTERS.map(([id, label], i) => <a key={id} href={`#${id}`} aria-current={active === id ? 'location' : undefined} onClick={() => { setActive(id); if (window.innerWidth < 1100) setNavOpen(false); }}><span>{String(i + 1).padStart(2, '0')}</span>{label}</a>)}</nav><p className="mt-6 text-xs leading-6 text-[#536079]">目录可随时收起。每个章节都对应当前程序的功能或明确的实现边界。</p></aside></>}
    <main className="intro-main">
      <Section id="overview" number="01" title="把你的想法，放进画面的下一笔。" subtitle="保留绘画发生的过程，让内容选择、构图与亲手表达都有自己的空间。">
        <div className="intro-grid two"><div className="intro-feature yellow"><Paintbrush size={32} /><h3>AI 共创</h3><p>从上传的照片开始。系统自动绘制，你可以随时暂停，加入花朵、云朵或太阳，安排素材的位置和大小。</p><div className="mt-5 flex flex-wrap gap-2"><span className="intro-pill">本地上传</span><span className="intro-pill">过程共创</span><span className="intro-pill">逐笔续绘</span></div></div><div className="intro-feature mint"><Paintbrush size={32} /><h3>自由画布</h3><p>保留普通画笔、HSV 调色、大小、喷枪、橡皮擦与撤销。画面由你的实际手势形成，完成后保存到自己的星图。</p><div className="mt-5 flex flex-wrap gap-2"><span className="intro-pill">普通画笔</span><span className="intro-pill">精细调色</span><span className="intro-pill">亲手表达</span></div></div></div>
        <div className="intro-grid three mt-5"><Card title="选择内容"><p>搭配花朵、云朵和太阳，确认前可以变换形态、协调配色，安排属于自己的画面。</p></Card><Card title="看见过程"><p>确认后素材预览消失，实际画布由新的曲线笔触逐渐绘出。</p></Card><Card title="留下作品"><p>收藏或下载当前已画出的内容。自动绘制不计作亲手笔触。</p></Card></div>
        <details className="intro-details"><summary>星与月，各自带来什么？</summary><p>你是星星：照片、素材和布局承载你的经历与表达。系统如月光：将这些选择逐步转化为笔触。素材确认时的一次星芒回应你的决定，绘制状态旁的月牙标记系统的辅助。</p><p>你决定画面的方向，也可以停下来继续发展想法。月亮是协作角色的比喻；当前系统使用本地绘制算法，不理解照片的故事，也不替你作出表达决定。</p></details>
      </Section>
      <Section id="painting" number="02" title="画面正在形成，你也可以加入。" subtitle="每轮约 2000 笔的预算，在概括与细节之间保留空间。确认素材后，从当前实际画布重新规划后续笔触。">
        <Flow items={[
          ['选择起点', '上传想记录的照片，手机也可拍照上传。'], ['逐笔绘制', '由粗到细绘出主要色彩与形状。'], ['安排素材', '选择素材后暂停，调整位置与大小。'], ['确认续绘', '预览消失，素材进入目标图，由新的笔触画出。'], ['保存作品', '收藏到星图或下载当前画面。'],
        ]} />
        <div className="intro-grid two mt-6"><Card title="图片格式与尺寸"><p>支持小于 20 MB 的 JPG、PNG、WebP、GIF、BMP、AVIF 等浏览器可解码图像；每次一张。图片在本机缩放与处理，笔触重绘不等于逐像素复制原始大图。</p></Card><Card title="确认的边界"><p>确认前可以调整或取消预览；确认后素材不可移动、删除或撤销。系统依据目标图与当前画面的差异计算笔触，不推断物体关系，不自动补阴影或改透视。</p></Card></div>
        <div className="intro-grid three mt-6"><Card title="色块概括"><p>保留主要形体，将细碎颜色组织为较统一的色块；概括程度由你调节。</p></Card><Card title="配色气氛"><p>保留原有色彩，或选择暖阳、暮色。点击应用后，照片与素材会一起逐步调整。</p></Card><Card title="素材变化"><p>「换个样子」改变花瓣、云朵轮廓或太阳光芒；「协调周围配色」让素材轻轻呼应附近颜色。预览满意后再确认。</p></Card></div>
      </Section>
      <Section id="companion" number="03" title="工具放在身边，画面留给你。" subtitle="全屏画布与按需打开的工具面板，保持创作过程清晰可见。">
        <div className="intro-grid three"><Card title="自己的节奏"><p>自动绘制可暂停、继续和调速。选择素材时暂停，确认后接着画。</p></Card><Card title="随时打开工具"><p>侧边图标打开素材、编排和节奏面板。素材可以连续加入、移动、缩放和旋转，确认后由笔触绘出。</p></Card><Card title="参考原图"><p>右上角独立打开参考图面板。原图与当前绘画分别展示，方便观察自己的改变。</p></Card></div>
        <div className="intro-callout mt-6"><h3>作品保存</h3><p>当前创作在浏览器内计算。保存和下载的内容来自实际画布，不包含未确认的素材预览。自由画布保留亲手绘画，AI 共创保存自动笔触形成的画面。</p></div>
      </Section>
      <Section id="algorithm" number="05" title="从图像重建，到有取舍的笔触表达。" subtitle="当前共创使用本地曲线笔触与图像配色；下面同时保留旧版五遍算法的演示，说明项目的技术演进。">
        <div className="intro-callout mb-6"><h3>当前共创：轻量曲线绘制</h3><p>在浏览器 Worker 中进行边缘保留的色彩简化、共享调色板与顺应图像方向的曲线追踪，再根据当前画布分配笔触。每轮最多尝试约 2000 笔，允许跳过无收益的笔触。素材变化来自确定性的几何规则，不调用图像生成模型或外部 API。下方五遍扫描、固定笔宽与历史演示属于原笔触引导版本；研究协议仍保留该版本。</p></div>
        <AlgorithmExplanation />
        <BudgetExplorer />
      </Section>
      <Section id="references" number="06" title="技术从哪里来，项目实现了什么。" subtitle="将论文中的启发与本项目的实际实现分别说明，便于理解算法演进与论文写作时的归因。">
        <PaperReferences />
      </Section>
      <section className="intro-section" id="user-testing"><p className="intro-eyebrow">用户测试</p><h2>原有测试与研究工作台继续保留。</h2><p className="intro-lead">研究码、知情同意、两轮绘画、IMI 与 SUS 问卷、评分和报告仍在原有研究流程中。该流程当前比较普通绘画与笔触引导，共创条件尚未接入。</p><div className="mt-6 flex flex-wrap gap-3"><Link className="intro-action" href="/study">参与用户测试</Link><Link className="intro-action" href="/admin/studies">打开研究者工作台</Link></div></section>
      <details id="history" className="intro-details"><summary>历史研究流程与测量说明</summary><p className="intro-caption">以下保留原项目的笔触引导研究说明与研究工具背景，属于历史版本。当前 AI 共创没有沿用这些实验条件或效果结论；新的研究方案需要另行设计。</p>
      <Section id="experiment" number="07" title="同一个人，两种绘画方式。" subtitle="核心问题：笔触引导是否有助于零基础用户更愿意画、减少开始与停顿的负担、提高完成度，并增加满足感？">
        <ExperimentExplorer />
        <div className="intro-grid two mt-6"><Card title="顺序 AB"><p className="intro-order">看图绘画 A → 休息 → 笔触引导 B</p><p>先独立尝试，再使用引导。</p></Card><Card title="顺序 BA"><p className="intro-order">笔触引导 B → 休息 → 看图绘画 A</p><p>先体验引导，再独立尝试。</p></Card></div>
        <p className="intro-caption">程序以随机区组分配 AB / BA，研究者不逐人指定顺序。顺序平衡有助于检查练习和疲劳影响，但同图重复仍可能存在学习迁移，解释结果时需要保留这一限制。</p>
        <Flow items={[
          ['进入与同意', '研究者预设批次，输入唯一研究码，完成成年与零基础筛选、行为记录和作品保存同意。'],
          ['统一练习', '先熟悉共同画布，练习约 90 秒；练习不作为正式两轮结果。'],
          ['第一轮任务', '2 项前测 → 最多 12 分钟绘画 → 4 项后测，保存真实画布。'],
          ['休息与第二轮', '至少休息 2 分钟，切换另一条件，使用同一参考图与相同限时。'],
          ['完成与访谈', '直接查看作品与过程对比；3个问题由研究者口头询问并录入，两位评分者后续独立评分。'],
        ]} />
        <div className="intro-callout mt-6"><p>全程通常约 40 分钟。参与者可提前结束或撤回。预试容量 6 人；正式阶段目标为 {PROTOCOL.targetPairs} 对有效配对，最多 {PROTOCOL.maxParticipants} 人。正式发布前仍需完成真实预试、材料复核与阻断问题处理。</p></div>
      </Section>
      <Section id="measurement" number="08" title="记录过程，也认真定义“完成”。" subtitle="两种条件使用相同的计时与事件口径。用主观问卷、行为数据和独立评分互相补充，不从单个进度条推断效果。">
        <div className="intro-table"><table><thead><tr><th>想了解什么</th><th>程序如何记录</th><th>解释时的边界</th></tr></thead><tbody>
          <tr><td>是否愿意继续画</td><td>每轮前后意愿与担忧，后测再记录满足和信心；1–7 分，可拒答。</td><td>主观自报，拒答保存为空值，不填零。</td></tr>
          <tr><td>开始与任务用时</td><td>任务开始、首次落笔、结束时间和超时状态。</td><td>用时更短可能是提前放弃；需结合完成度，不能单独当作速度提升。</td></tr>
          <tr><td>停顿与操作负担</td><td>超过 5 秒的停留、暂停、页面隐藏、撤销、有效落笔与取消。</td><td>停留不等于“不想画”，也可能是在看图或思考。</td></tr>
          <tr><td>作品完成度</td><td>10 项评分，每项 0 / 1 / 2，两位评分者独立评分后汇总。</td><td>评分清单需适配材料；指导推进不等于作品完成。</td></tr>
          <tr><td>达标提交时间</td><td>完成度达到 80 分且关键项满足时，结合提交时间计算。</td><td>未达标或不符合提交条件时为空，不能当作零秒。</td></tr>
          <tr><td>引导怎样被使用</td><td>推进、跳过、返回与匹配等事件单独记录。</td><td>仅 B 条件有引导，不将这一指标直接与 A 做同义比较。</td></tr>
        </tbody></table></div>
        <details className="intro-details"><summary>查看程序中的 4 项简短问卷</summary><ol className="list-decimal space-y-3 pl-5">{QUESTIONS.map(q => <li key={q.id}>{q.text}</li>)}</ol><p>每轮前测使用前两题；后测包含全部四题。访谈补充“哪种方式更容易开始”“最想停下的时刻”和“哪幅更像自己画的”。</p></details>
        <div className="intro-grid two"><Card title="个人报告"><p>并排展示 A / B 的真实作品、用时、停留、评分与问卷。显示缺轮、排除、技术故障等状态，支持追溯原始尝试。</p></Card><Card title="配对汇总"><p>完成度与意愿采用预设双侧精确符号检验，并对两项检验进行 Holm 校正；均值差等用于描述。预试复盘展示中位数、有效样本数、超时和顺序分布，不能代替正式效果验证。</p></Card></div>
      </Section>
      <Section id="researcher" number="09" title="研究者能看到每一份测试。" subtitle="研究码是一份两轮测试的名称。工作台汇总所有批次中的已有记录，包括尚未开始绘画、未完成、已完成和已撤回的记录。">
        <Flow items={[[ '准备材料', '生成并检查参考图、完整笔触计划、10 项评分规则与关键项。'], ['审核发布', '审核后开放批次；有人入组后，材料和协议不能原地改写。'], ['查看测试', '按研究码查看配对作品与状态，管理质量标记、评分和纳入原因。'], ['预试复盘', '核对六人完成与双人评分、设备负担、问题处理及材料哈希绑定的复核。'], ['导出交接', '输出个人 JSON、汇总 JSON / CSV、可视化报告与材料协议交接包。']]} />
        <div className="intro-grid two mt-6"><Card title="研究码如何工作"><p>参与者自定义 1–64 个文字、数字、下划线或短横线。规范全半角、去首尾空白并忽略大小写判重；重复就提示更换。一个码关联同一参与者的两轮记录，旧记录保留原匿名编号。</p></Card><Card title="评分与技术重测"><p>两位评分者使用独立入口，查看打乱顺序的匿名作品，不显示实验条件。评分修改保留修订原因；技术故障重测关联原尝试，原记录不会被覆盖成“成功结果”。</p></Card></div>
        <div className="intro-callout mt-6"><h3>版本交接包保存什么？</h3><p>共同材料、完整笔触计划、问卷、访谈、评分规则和协议参数。包内区分草稿、已发布预试与正式配置，记录实际材料算法版本和哈希。导出交接包不会自动发布研究，也不包含参与者作品与口令。</p></div>
      </Section>
      <Section id="data" number="10" title="每份结果，都有来处。" subtitle="研究记录保存在服务端，实际画作与操作摘要分开管理。软件提供可靠的流程，研究结论仍来自真实参与者。">
        <div className="intro-grid three"><Card title="测量与保存"><Layers3 size={26} className="mb-3 text-[#6558D9]" /><p>行为事件按序号增量保存，去重重放；绘画期间定期保存检查点，结束时保存真实 PNG 和哈希。研究操作摘要不包含完整触点轨迹。</p></Card><Card title="离线与恢复"><ShieldCheck size={26} className="mb-3 text-[#6558D9]" /><p>浏览器本地缓存未上传内容，网络恢复后补传；提供保存失败重试。活动页面保护降低多标签误操作风险，技术故障保留原尝试和恢复记录。</p></Card><Card title="导出与备份"><BookOpen size={26} className="mb-3 text-[#6558D9]" /><p>每轮文件按“研究码-时间-条件.json”命名，保留配对文件与汇总清单。服务端备份涵盖数据库、作品、原始记录和交接包，支持完整性校验。</p></Card></div>
        <div className="intro-callout mt-6"><h3>同意、撤回与保存期限</h3><p>研究参与需明确同意行为摘要与作品保存；界面说明默认保留 {PROTOCOL.retentionDays} 天，实际清理由研究者落实。参与者可凭当前浏览器研究凭证申请撤回；后台清理在线记录和报告，已有离线副本由研究者处理。体验中的可选云端功能与本地绘画具有不同的数据流。</p></div>
        <p className="intro-caption">本文对应当前软件功能。算法示例与条件示意都不是用户实验结果；没有在介绍页填入模拟的效果提升百分比。</p>
      </Section>
      </details>
      <footer className="intro-footer">星迹智绘 · 从第一笔开始理解自己的绘画过程。<Link href="/">返回首页 ↑</Link></footer>
    </main>
  </div>;
}
