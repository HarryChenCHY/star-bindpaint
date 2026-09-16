'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, ChevronLeft, Menu, Moon, Paintbrush, FlaskConical, Layers3, ShieldCheck } from 'lucide-react';
import { BudgetExplorer, ExperimentExplorer, StyleExplorer } from '@/components/IntroVisuals';
import { PROTOCOL, QUESTIONS } from '@/lib/study/protocol';
import { AlgorithmExplanation, PaperReferences } from '@/components/AlgorithmExplanation';
import { StyleParameterGuide } from '@/components/StyleExplanation';
import './intro.css';

const CHAPTERS = [
  ['overview', '产品全景'], ['painting', '从图片到绘画'], ['companion', '月亮伙伴与画板'],
  ['styles', '六种大师笔触'], ['algorithm', '1000 笔算法'], ['references', '技术溯源与论文'],
  ['experiment', '对比实验流程'], ['measurement', '测量与分析'], ['researcher', '研究工作台'], ['data', '数据保存与边界'],
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
    <header className="intro-top"><Link href="/" className="flex items-center gap-2 font-black"><ArrowLeft size={18} /><span>返回首页</span></Link><span className="flex items-center gap-2 font-black"><Moon size={20} className="text-[#6558D9]" />星迹智绘 · 产品介绍</span><span className="hidden text-xs font-bold text-[#536079] sm:block">从第一笔，到一幅自己的画</span></header>
    {!navOpen && <button className="intro-menu" aria-expanded={false} aria-controls="intro-toc" aria-label="展开介绍目录" onClick={() => setNavOpen(true)}><Menu size={20} /><span>目录</span></button>}
    {navOpen && <><button className="intro-scrim" aria-label="关闭介绍目录" onClick={() => setNavOpen(false)} /><aside className="intro-sidebar" id="intro-toc" aria-label="产品介绍目录"><div className="mb-5 flex items-center justify-between"><span className="flex items-center gap-2 font-black"><BookOpen size={18} />内容目录</span><button className="intro-icon" aria-label="收起介绍目录" aria-expanded={true} onClick={() => setNavOpen(false)}><ChevronLeft size={20} /></button></div><nav>{CHAPTERS.map(([id, label], i) => <a key={id} href={`#${id}`} aria-current={active === id ? 'location' : undefined} onClick={() => { setActive(id); if (window.innerWidth < 1100) setNavOpen(false); }}><span>{String(i + 1).padStart(2, '0')}</span>{label}</a>)}</nav><p className="mt-6 text-xs leading-6 text-[#536079]">目录可随时收起。每个章节都对应当前程序的功能或明确的实现边界。</p></aside></>}
    <main className="intro-main">
      <Section id="overview" number="01" title="把一幅画，变成眼前的下一笔。" subtitle="为零基础绘画者提供起点、路径与反馈，让不会画、不想开始、担心画不好的人，有机会完成一次属于自己的绘画。">
        <div className="intro-grid two"><div className="intro-feature yellow"><Paintbrush size={32} /><h3>绘画体验</h3><p>从图片开始沿星迹绘画，也可以进入自由星域。完整提示帮助找到第一笔，提示卡可以收起、移动和锁定，作品保存到自己的星图。</p><div className="mt-5 flex flex-wrap gap-2"><span className="intro-pill">本地上传</span><span className="intro-pill">逐笔引导</span><span className="intro-pill">六种笔刷</span></div></div><div className="intro-feature mint"><FlaskConical size={32} /><h3>研究测试</h3><p>同一个人、同一张参考图，分别完成看图绘画和笔触引导绘画。程序贯通练习、问卷、计时、事件记录、作品评分与配对分析。</p><div className="mt-5 flex flex-wrap gap-2"><span className="intro-pill">AB / BA 顺序</span><span className="intro-pill">真实作品</span><span className="intro-pill">配对报告</span></div></div></div>
        <div className="intro-grid three mt-5"><Card title="降低开始的负担"><p>突出下一笔的起点与方向，将一整幅画拆成可执行的小动作。</p></Card><Card title="让过程可见"><p>显示当前笔触、进度和反馈，允许在体验中调整提示和求助。</p></Card><Card title="保留完成的满足"><p>保存亲手绘制的作品，区分人工与自动帮助，回看自己的尝试。</p></Card></div>
        <p className="intro-caption">这些是设计目标。对意愿、速度、完成度与满足感是否有效，需要真实参与者的对比数据验证。</p>
      </Section>
      <Section id="painting" number="02" title="选一张想画的图，直接开始。" subtitle="入口不再要求选择引导强度或颗粒度。默认完整引导、细节更多，约 1000 笔预算，按实际规划顺序绘制。">
        <Flow items={[
          ['选择参考', '精选临摹，或点击、拖拽上传自己的图片。'], ['准备画面', '校正尺寸，将透明区域放在白底上，统一参考与绘画坐标。'], ['生成笔触', '后台 Worker 规划整幅图的笔触，显示进度，可取消和重试。'], ['逐笔绘画', '从圆形起点 1 顺着箭头画向 2，完整提示含紫色半透明区域和虚线边框。'], ['保存作品', '完成后保存到星图，回看画面与本次体验记录。'],
        ]} />
        <div className="intro-grid two mt-6"><Card title="图片格式与尺寸"><p>支持小于 20 MB 的 JPG、PNG、WebP、GIF、BMP、AVIF 等浏览器可解码图像；每次一张。GIF 按解码后的静态画面使用。图片会按画布与规划尺寸缩放，规划不等于逐像素复制原始大图。</p></Card><Card title="自由星域"><p>自由创作不要求参考图，提供风格笔刷、颜色、粗细、橡皮擦、撤销等工具。有参考计划时，可从沿星迹切到自由绘画并切回，已有画面保留；无计划时需先选图才能获得引导。</p></Card></div>
      </Section>
      <Section id="companion" number="03" title="帮助放在身边，画面留给你。" subtitle="月亮伙伴承担下一步提示，底栏承担绘画操作。提示的多少、位置与展开状态可以随时调整。">
        <div className="intro-grid three"><Card title="完整 / 适度 / 起点"><p>完整显示起点、轨迹和方向箭头；适度降低轨迹强调；起点只显示起点标记。切换改变提示显示，不重新计算笔触序列。</p></Card><Card title="可移动的提示卡"><p>点击减号收为方圆图标，再点图标展开。解锁后拖动顶部手柄调整位置，锁定后避免误拖；位置与锁定偏好保存在当前浏览器。</p></Card><Card title="自动续画与手动体验"><p>体验模式可以让伙伴演示剩余笔触，并随时暂停。亲手绘画与自动帮助分别记录；自动推进的进度不代表用户独立完成。</p></Card></div>
        <div className="intro-callout mt-6"><h3>作品保存与文字反馈</h3><p>星图保存亲手绘制的作品与体验记录。文字反馈可调用已配置的语言模型服务，依据本次指标解释过程；它依赖服务端配置与可用性，不参与本地笔触规划。自由笔刷在本地实时渲染，完成后直接保存原画。</p></div>
      </Section>
      <Section id="styles" number="04" title="同一条手势，六种笔触性格。" subtitle="自由笔刷保留你画出的路径，通过宽度、色彩扰动、边缘、不透明度和纹理改变落笔质感。点击卡片查看每种风格的实现与用途。">
        <div className="intro-callout mb-6"><h3>艺术资料提供特征参照，画笔参数由项目人工设定</h3><p>六位画家的名字指向不同的视觉启发。当前没有六位大师的笔触测量数据库，也没有训练专属模型。点击一种风格，可以查看真实引擎示例、馆藏来源、感性解释、参数作用与证据边界。</p></div>
        <StyleExplorer />
        <Flow items={[[ '路径重采样', '按约 4 像素间隔重新采样，并映射输入压力。'], ['形态与颜色', '计算渐细、鼓起、等宽或压感曲线，在用户选定颜色上加入微小色相扰动。'], ['肌理渲染', '添加轻微路径扰动、双层厚涂、干笔缺口或周期断笔，再用曲线绘制。']]} />
        <StyleParameterGuide />
      </Section>
      <Section id="algorithm" number="05" title="每一笔，都要让整幅图更接近目标。" subtitle="从多尺度曲线，到预算误差搜索，再到五遍由粗到细的区域扫描：看清算法的原理、项目的改动与取舍。">
        <AlgorithmExplanation />
        <BudgetExplorer />
      </Section>
      <Section id="references" number="06" title="技术从哪里来，项目实现了什么。" subtitle="将论文中的启发与本项目的实际实现分别说明，便于理解算法演进与论文写作时的归因。">
        <PaperReferences />
      </Section>
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
        <p className="intro-caption">本文对应当前软件功能。算法示例、六种笔刷样例与条件示意都不是用户实验结果；没有在介绍页填入模拟的效果提升百分比。</p>
      </Section>
      <footer className="intro-footer">星迹智绘 · 从第一笔开始理解自己的绘画过程。<Link href="/">返回首页 ↑</Link></footer>
    </main>
  </div>;
}
