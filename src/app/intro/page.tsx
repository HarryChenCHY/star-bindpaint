'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, ChevronLeft, Menu, Moon, Paintbrush, FlaskConical, Layers3, ShieldCheck } from 'lucide-react';
import { BudgetExplorer, ExperimentExplorer, StyleExplorer } from '@/components/IntroVisuals';
import { PROTOCOL, QUESTIONS } from '@/lib/study/protocol';
import { STROKE_CONFIG } from '@/lib/stroke-config';
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
          ['选择参考', '精选临摹，或点击、拖拽上传自己的图片。'], ['准备画面', '校正尺寸，将透明区域放在白底上，统一参考与绘画坐标。'], ['生成笔触', '后台 Worker 规划整幅图的笔触，显示进度，可取消和重试。'], ['逐笔绘画', '从星形起点沿路径画向箭头，参考颜色与笔宽。'], ['保存作品', '完成后保存到星图，回看画面与本次体验记录。'],
        ]} />
        <div className="intro-grid two mt-6"><Card title="图片格式与尺寸"><p>支持小于 20 MB 的 JPG、PNG、WebP、GIF、BMP、AVIF 等浏览器可解码图像；每次一张。GIF 按解码后的静态画面使用。图片会按画布与规划尺寸缩放，规划不等于逐像素复制原始大图。</p></Card><Card title="自由星域"><p>自由创作不要求参考图，提供风格笔刷、颜色、粗细、橡皮擦、撤销等工具。有参考计划时，可从沿星迹切到自由绘画并切回，已有画面保留；无计划时需先选图才能获得引导。</p></Card></div>
      </Section>
      <Section id="companion" number="03" title="帮助放在身边，画面留给你。" subtitle="月亮伙伴承担下一步提示，底栏承担绘画操作。提示的多少、位置与展开状态可以随时调整。">
        <div className="intro-grid three"><Card title="完整 / 适度 / 起点"><p>完整显示起点、轨迹和方向箭头；适度降低轨迹强调；起点只保留短方向提示。切换改变提示显示，不重新计算笔触序列。</p></Card><Card title="可移动的提示卡"><p>点击减号收为方圆图标，再点图标展开。解锁后拖动顶部手柄调整位置，锁定后避免误拖；位置与锁定偏好保存在当前浏览器。</p></Card><Card title="自动续画与手动体验"><p>体验模式可以让伙伴演示剩余笔触，并随时暂停。亲手绘画与自动帮助分别记录；自动推进的进度不代表用户独立完成。</p></Card></div>
        <div className="intro-callout mt-6"><h3>作品反馈与可选 AI 功能</h3><p>星图保存作品与体验记录。文字反馈可调用已配置的语言模型服务，依据本次指标解释过程；自由绘画可请求云端图像风格化并保留原画与生成版本。这些服务依赖服务端配置与可用性，不参与本地笔触规划，也不参与实验的自动代画。没有外部服务时，不能承诺生成反馈或云端风格图。</p></div>
      </Section>
      <Section id="styles" number="04" title="同一条手势，六种笔触性格。" subtitle="自由笔刷保留你画出的路径，通过宽度、色彩扰动、边缘、不透明度和纹理改变落笔质感。点击卡片查看每种风格的实现与用途。">
        <StyleExplorer />
        <Flow items={[[ '路径重采样', '按约 4 像素间隔重新采样，并映射输入压力。'], ['形态与颜色', '计算渐细、鼓起、等宽或压感曲线，调整色相和饱和度。'], ['肌理渲染', '添加轻微路径扰动、双层厚涂、干笔缺口或周期断笔，再用曲线绘制。']]} />
        <p className="intro-caption">大师名称是风格预设的命名。当前实现没有训练六位画家的专属模型，也不会自动理解或复制其构图与艺术语言。</p>
      </Section>
      <Section id="algorithm" number="05" title="每一笔，都要让整幅图更接近目标。" subtitle="当前算法以完整画面的误差为依据，在总预算内反复优化笔刷，而不是把旧算法的前 1000 笔直接截取出来。">
        <div className="intro-callout"><p className="intro-eyebrow">当前实现 · {STROKE_CONFIG.version}</p><h3>参考图 → 误差图 → 候选笔刷 → 最优颜色 → 接受一笔 ↺</h3><p>从白色虚拟画布出发，较大笔刷先建立整体，再逐步允许更细的笔触修补细节。没有强制“先轮廓”的阶段，也不做物体语义分割。</p></div>
        <Flow items={[
          ['目标与误差', '1000 笔模式使用最长边 256 的分析图，比较目标与当前画布的加权 RGB 平方误差。'],
          ['候选搜索', '更容易在误差较大处采样；每轮考察 64 个位置、方向、长度与宽度组合。'],
          ['颜色拟合', '对笔刷覆盖的整片区域拟合颜色，考虑当前画布与混合透明度。'],
          ['局部优化', '再做 36 次局部尝试；只有整片覆盖区误差下降才接受这一笔。'],
          ['反馈与输出', '更新虚拟画布后再计算下一轮，保存有序路径、笔宽与颜色供引导使用。'],
        ]} />
        <div className="intro-grid two mt-6"><Card title="为什么前粗后细？"><p>前约 300 轮逐步收窄最大笔宽，先建立主要色彩和形状，后续以小笔修整。细节档提高细笔候选的倾向；总规划轮数不超过 {STROKE_CONFIG.maxBudget}。</p></Card><Card title="为什么不会简单保证“和原图一致”？"><p>有限笔数、缩小的分析图和胶囊形笔刷都限制表达能力。复杂文字、头发、细线和极小结构可能丢失。像素误差下降可以说明重建更接近，不直接等于精美或用户更满意。</p></Card></div>
        <details className="intro-details"><summary>查看简化公式与笔刷模型</summary><p>误差 E = Σᵢ wᵢ ‖Tᵢ − Cᵢ‖²。T 是目标，C 是当前虚拟画布，w 对局部边缘适度加权。候选笔触的混合为 C′ᵢ = (1 − aᵢ) Cᵢ + aᵢ c。</p><p>固定笔刷覆盖后，每个颜色通道的最小二乘解为 c = clip[Σᵢ wᵢ aᵢ (Tᵢ − (1 − aᵢ) Cᵢ) / Σᵢ wᵢ aᵢ², 0, 1]。比较绘制前后的误差差值，选择收益更大的候选。</p><p>笔刷用带圆形端帽的线段近似，覆盖率由像素到线段的距离决定。体验绘制按 0.85 透明度拟合，研究画布按不透明笔刷拟合。两者的渲染口径分别匹配。</p></details>
        <BudgetExplorer />
      </Section>
      <Section id="references" number="06" title="技术从哪里来，项目实现了什么。" subtitle="将论文中的启发与本项目的实际实现分别说明，便于理解算法演进与论文写作时的归因。">
        <div className="intro-timeline">
          <article><span>1998 · SIGGRAPH</span><h3>Aaron Hertzmann</h3><a href="https://mrl.cs.nyu.edu/publications/painterly98/" target="_blank" rel="noreferrer">Painterly Rendering with Curved Brush Strokes of Multiple Sizes ↗</a><p>多尺度笔刷从粗到细覆盖画面，在与模糊参考图有差异的位置补画，并沿图像梯度的垂直方向构造曲线路径。</p><p><strong>项目关系：</strong>旧版多尺度曲线实现参考这一思路：高斯模糊、误差区域、Sobel 梯度与曲线延伸。旧版仍保留作工程对照，当前默认采用上节的预算误差优化算法。</p></article>
          <article><span>2019 · ICCV</span><h3>Zhewei Huang · Wen Heng · Shuchang Zhou</h3><a href="https://openaccess.thecvf.com/content_ICCV_2019/html/Huang_Learning_to_Paint_With_Model-Based_Deep_Reinforcement_Learning_ICCV_2019_paper.html" target="_blank" rel="noreferrer">Learning to Paint With Model-Based Deep Reinforcement Learning ↗</a><p>使用神经渲染器与基于模型的深度强化学习，学习笔触位置、颜色与长期绘画规划。</p><p><strong>项目关系：</strong>为有限笔触重建整幅图提供研究参照。本项目采用本地候选搜索与显式笔刷，没有训练或部署该强化学习策略。</p></article>
          <article><span>2021 · CVPR</span><h3>Zhengxia Zou · Tianyang Shi · Shuang Qiu · Yi Yuan · Zhenwei Shi</h3><a href="https://arxiv.org/abs/2011.08114" target="_blank" rel="noreferrer">Stylized Neural Painting ↗</a><p>利用可微的绘制过程优化参数化笔触，使笔触组合逼近目标图像，并支持不同笔刷风格。</p><p><strong>项目关系：</strong>参考“优化笔触参数并用渲染结果反馈误差”的方向。当前实现以解析颜色拟合和随机局部搜索完成优化，没有接入其神经渲染器或训练权重。</p></article>
        </div>
        <div className="intro-callout"><h3>本项目的工程组合</h3><p>固定预算、显式胶囊笔刷、加权误差、颜色最小二乘、候选局部搜索、浏览器 Worker 与逐笔交互共同构成当前流程。六种自由笔刷另用程序化风格参数渲染。应将这些表述为本项目实现与参考启发，不把整套算法声称为某篇论文的原样复现。</p></div>
      </Section>
      <Section id="experiment" number="07" title="同一个人，两种绘画方式。" subtitle="核心问题：笔触引导是否有助于零基础用户更愿意画、减少开始与停顿的负担、提高完成度，并增加满足感？">
        <ExperimentExplorer />
        <div className="intro-grid two mt-6"><Card title="顺序 AB"><p className="intro-order">看图绘画 A → 休息 → 笔触引导 B</p><p>先独立尝试，再使用引导。</p></Card><Card title="顺序 BA"><p className="intro-order">笔触引导 B → 休息 → 看图绘画 A</p><p>先体验引导，再独立尝试。</p></Card></div>
        <p className="intro-caption">程序以随机区组分配 AB / BA，研究者不逐人指定顺序。顺序平衡有助于检查练习和疲劳影响，但同图重复仍可能存在学习迁移，解释结果时需要保留这一限制。</p>
        <Flow items={[
          ['进入与同意', '在已开放批次输入唯一研究码，完成成年与零基础筛选、行为记录和作品保存同意。'],
          ['统一练习', '先熟悉共同画布，练习约 90 秒；练习不作为正式两轮结果。'],
          ['第一轮任务', '2 项前测 → 最多 12 分钟绘画 → 4 项后测，保存真实画布。'],
          ['休息与第二轮', '至少休息 2 分钟，切换另一条件，使用同一参考图与相同限时。'],
          ['访谈与评分', '回答 3 个访谈问题；两位评分者独立评分，再形成配对报告。'],
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
