'use client';

import Image from 'next/image';
import { useState } from 'react';
import { STROKE_CONFIG, STROKE_PASSES } from '@/lib/stroke-config';
import { PAPERS } from '@/lib/intro-sources';

function Source({ id }: { id: typeof PAPERS[number]['id'] }) {
  const p = PAPERS.find(p => p.id === id)!;
  return <a className="intro-source" href={`#paper-${id}`}>文献：{p.authors.split(',')[0]} · {p.year.split(' · ')[0]} ↗</a>;
}

export function AlgorithmExplanation() {
  return <>
    <div className="intro-callout"><p className="intro-eyebrow">当前版本 · {STROKE_CONFIG.version}</p><h3>先让整幅画站起来，再一遍遍补充细节</h3><p>输入参考图，输出每一笔的端点、宽度、颜色与所在遍次。默认预算为1000次规划尝试；不改善画面的候选会被跳过，实际笔数可能略少。该流程生成供人跟随的顺序，不是记录原作者真实作画的过程。</p></div>
    <h3 className="intro-subheading">01 / 从原理到项目：三代算法改变了什么</h3>
    <div className="intro-grid three">
      <article className="intro-card"><span className="intro-pill">早期 · 多尺度曲线</span><h3>模糊参考 → 找差异 → 沿色彩边界走</h3><p>Hertzmann 方法在大笔刷层忽略细节，再缩小笔刷。沿图像梯度的垂直方向延伸曲线，使路径大致顺着同色区域；同层随机顺序弱化机械排列。</p><Source id="hertzmann" /><p>项目旧实现用高斯模糊、Sobel 梯度与曲线延伸，并随机打乱同层笔触。其网格检测采用最大误差阈值，与原论文的区域平均误差判定有所不同；笔数随图像与层级变化，没有固定1000预算。</p></article>
      <article className="intro-card"><span className="intro-pill">上一版 · 预算误差搜索</span><h3>哪里还不像，就优先到哪里画</h3><p>改为圆端帽线段组成的胶囊笔刷，在整幅图中按残差采样。每轮64个候选与36次局部尝试，用当前底色拟合笔触颜色。</p><p>前约300轮逐步压低最大笔宽，但实际笔宽仍随机变化，局部调整也能增宽。因而“总体趋细”并不保证“下一笔更细”，位置也可能在远处跳跃。</p><p>这一步解决预算控制与覆盖区拟色，仍留下跟画顺序难预测的问题。</p></article>
      <article className="intro-card"><span className="intro-pill">现在 · 方案 A</span><h3>固定五档笔宽，按区域逐遍丰富</h3><p>把宽度与区域顺序变成明确约束；完成一遍后再换小笔刷。每个网格内继续按误差寻找有用的笔触，并重新计算颜色。</p><p>每接受一笔就更新共享画布，再搜索下一笔。宽度不回增，网格顺序可预期；角度和长度仍根据图像优化。</p><p>改进目标是让序列更容易跟随。它未加入物体分割，也未声称还原艺术家的真实作画策略。</p></article>
    </div>
    <ScanExplorer />
    <h3 className="intro-subheading">03 / 一笔怎样计算出来：先定范围，再比较收益</h3>
    <ol className="intro-flow">
      <li><span className="intro-number">01</span><h3>统一目标画面</h3><p>透明图合成白底，用面积采样缩小参考图。预算大于200时分析最长边上限256，否则128；边缘附近的误差权重最高约为平坦区的3倍。</p></li>
      <li><span className="intro-number">02</span><h3>给各区域分预算</h3><p>遍次预算按6%、12%、22%、28%、32%分配；每遍开始，按网格残差总量分配次数，取整后的剩余额度按小数余数补齐。不是每格平分，也不是识别物体的重要性。</p></li>
      <li><span className="intro-number">03</span><h3>搜索64个候选</h3><p>在当前格内按残差概率选择位置，随机试方向与长度。宽度锁定为当前遍次值；在整条笔刷足迹上计算颜色和收益。</p></li>
      <li><span className="intro-number">04</span><h3>微调36次</h3><p>在最佳候选附近移动中心、旋转方向、调整长度；中心不能离开当前格。前18次调整较大，后18次更小；不改本遍笔宽。</p></li>
      <li><span className="intro-number">05</span><h3>接受或跳过</h3><p>覆盖区加权误差下降大于10⁻⁷才接受。同步更新虚拟画布，保存笔触与遍次；否则消耗本次尝试并跳过，保留后续细笔预算。</p></li>
    </ol>
    <div className="intro-grid two">
      <div className="intro-card"><h3>为什么按“整个足迹”拟合颜色？</h3><p>从中心只取一个像素，可能把跨越两种底色的粗笔画错。现在计算圆端帽线段覆盖的每个像素，结合当前画布，求一个总体误差较小的颜色。边缘像素以覆盖率参与，不是整块硬涂。</p><p>体验的笔刷不透明度为0.85，研究笔刷为1；分别按对应混合方式规划。Canvas与分析缓冲的抗锯齿仍可能有细微差别。</p></div>
      <div className="intro-card"><h3>为什么网格不会直接切断笔触？</h3><p>网格限制搜索中心和先后顺序，笔刷足迹可以越过格子边界。所有格子共享一张虚拟画布，后续笔触能看到邻格已经画出的颜色。</p><p>这是对分块不连续问题的工程处理；仍可能出现扫描方向偏好，不能保证所有接缝或细节问题都消失。</p><Source id="hu" /></div>
    </div>
    <details className="intro-details"><summary>展开数学推导：如何找到当前笔触的颜色</summary>
      <p>Tᵢ 是目标颜色，Cᵢ 是已画颜色，wᵢ 是边缘权重，aᵢ 是透明度乘像素覆盖率，c 是待求的笔触颜色。各通道均归一到0–1。</p>
      <div className="intro-formula">E = Σᵢ wᵢ ‖Tᵢ − Cᵢ‖²<br />C′ᵢ = (1 − aᵢ) Cᵢ + aᵢ c</div>
      <p>固定笔刷位置、方向、长度、宽度后，只剩颜色未知。把混合式代入平方误差，对每个颜色通道求导并令其为零，得到：</p>
      <div className="intro-formula">c = clip(Σᵢ wᵢ aᵢ [Tᵢ − (1 − aᵢ) Cᵢ] / Σᵢ wᵢ aᵢ², 0, 1)</div>
      <p>再比较 E − E′。这是当前显式混合模型的最小二乘解；只有固定笔形下的颜色获得解析解，整幅画与笔形搜索仍是近似的贪心优化，不保证全局最优。缩小分析图上的误差下降，也不等于全尺寸画面处处改善。</p>
    </details>
    <OrderMixDemo />
    <ComparisonResults />
    <h3 className="intro-subheading">06 / 优化落到使用体验，也保留可核对的边界</h3>
    <div className="intro-table"><table><thead><tr><th>改动</th><th>解决什么</th><th>代价与限制</th></tr></thead><tbody>
      <tr><td>固定五遍 + 逐行扫描</td><td>减少跨画面跳跃，提示卡能讲清当前是铺色还是补细节。</td><td>限制全局自由搜索，像素误差可能略升；区内仍可跳转，每一笔的长度不保证递减。</td></tr>
      <tr><td>显式预算 + 残差分配</td><td>小预算重算完整过程；给后期细节保留额度。</td><td>1000是交互负担与精细度的项目选择，不是文献证明的最佳笔数。</td></tr>
      <tr><td>顺序内重新拟色</td><td>使新的覆盖关系参与颜色计算。</td><td>只能接受当下有益的笔触，无法先画一笔短期无益但长期有价值的铺垫。</td></tr>
      <tr><td>Worker + 固定随机种子</td><td>规划可取消、重试；同输入参数可重复生成。</td><td>耗时依设备和图像而变；并非深度学习推理，不能理解人物、船只等语义。</td></tr>
      <tr><td>笔触带遍次信息与版本</td><td>加载进度、提示卡和新研究材料对应真实序列。</td><td>历史研究序列保持冻结，使用新算法需要新材料审核，不能直接混成同版本比较。</td></tr>
    </tbody></table></div>
    <p className="intro-caption">分解算法决定“下一笔在哪里、什么颜色”；六种大师风格决定自由绘画时“用户这一笔怎样渲染”。两条管线独立，切换风格不会把1000笔计划变成画家的真实作品。真实动笔、自动帮助、主观满意度也必须分别记录。</p>
  </>;
}

function ScanExplorer() {
  const [pass, setPass] = useState(0), [cellFraction, setCellFraction] = useState(0);
  const p = STROKE_PASSES[pass], cell = Math.round(cellFraction * (p.grid ** 2 - 1));
  const counts = [60, 179, 398, 678, 998];
  return <div className="intro-demo" data-testid="scan-explorer">
    <h3>02 / 切换五遍，查看扫描规则与真实阶段图</h3>
    <div className="intro-pass-tabs" role="group" aria-label="五遍笔触层级">{STROKE_PASSES.map((s, i) => <button key={s.label} className="intro-action" aria-pressed={pass === i} onClick={() => { setPass(i); setCellFraction(0); }}>{s.label}</button>)}</div>
    <div className="intro-grid two mt-6">
      <figure><svg viewBox="0 0 320 270" role="img" aria-label={`${p.grid}乘${p.grid}网格，按从左至右、从上至下访问`} className="w-full">
        {Array.from({ length: p.grid ** 2 }, (_, i) => { const size = 230 / p.grid, x = 45 + i % p.grid * size, y = 10 + Math.floor(i / p.grid) * size; return <g key={i}><rect x={x} y={y} width={size - 3} height={size - 3} rx="5" fill={i === cell ? '#ffd166' : i < cell ? '#cec8ff' : '#f0f1f6'} stroke={i === cell ? '#17233f' : '#d9ddea'} /><text x={x + (size - 3) / 2} y={y + size / 2 + 4} textAnchor="middle" fontSize="12" fill="#17233f">{i + 1}</text></g>; })}
        <text x="160" y="260" textAnchor="middle" fontSize="12" fill="#536079">格内按残差选点 · 换行后回到左侧</text>
      </svg><figcaption>扫描示意 · 格子不是独立裁切的画布</figcaption><label className="block mt-3">扫描区域 {cell + 1} / {p.grid ** 2}<input className="w-full accent-[#6558d9]" aria-label="扫描区域" type="range" min="0" max="100" value={cellFraction * 100} onChange={e => setCellFraction(Number(e.target.value) / 100)} /></label></figure>
      <figure><Image src={`/intro/painting-order/pass-${pass + 1}.png`} alt={`莫奈日出方案A第${pass + 1}遍完成时的真实算法输出`} width={768} height={597} className="intro-result-image" /><figcaption aria-live="polite">真实结果 · 本遍结束累计 {counts[pass]} 笔<br />左侧仅演示扫描位置，右图不会随区域滑块改变</figcaption></figure>
    </div>
    <div className="intro-budget-bars">{STROKE_PASSES.map((s, i) => <div key={s.label}><span>{s.label}</span><div><i style={{ width: `${s.share / 320 * 100}%`, background: i === pass ? '#6558d9' : '#bcb5f2' }} /></div><strong>{s.share} 次</strong></div>)}</div>
    <p>当前：{p.grid} × {p.grid}网格，最多 {p.share} 次尝试；笔宽为分析图短边的 {(p.width / 2).toFixed(1)}%。五档分别为15%、8%、4%、2%、1.1%，映射回输出画布，小画面不小于1像素。</p>
    <p className="intro-caption">五遍比例和网格密度是本项目的工程设定，给后期细化较多预算，尚未证明是最优组合。图为莫奈《日出·印象》的本地试验，白底、0.85不透明度，无原图衬底。小预算按比例分配，极小预算可能不能覆盖所有遍次。</p>
  </div>;
}

function OrderMixDemo() {
  const [reversed, setReversed] = useState(false);
  return <div className="intro-demo"><h3>04 / 为什么不能把旧笔触简单排个序？</h3><div className="intro-grid two"><div>
    <svg viewBox="0 0 320 150" className="w-full" role="img" aria-label={reversed ? '蓝色在下，黄色在上' : '黄色在下，蓝色在上'}><rect width="320" height="150" fill="white" />{(reversed ? ['blue', 'yellow'] : ['yellow', 'blue']).map(c => c === 'yellow' ? <path key={c} d="M55 60L255 60" stroke="#ffd166" opacity=".85" strokeWidth="48" strokeLinecap="round" /> : <path key={c} d="M125 115L195 25" stroke="#6558d9" opacity=".85" strokeWidth="48" strokeLinecap="round" />)}</svg>
    <button className="intro-action" aria-pressed={reversed} onClick={() => setReversed(v => !v)}>交换两笔顺序</button><p className="mt-2" aria-live="polite">{reversed ? '先蓝后黄：交叠处偏黄' : '先黄后蓝：交叠处偏蓝'}</p></div><div><p>颜色相同、位置相同，改变先后，重叠部分就会不同。第一笔已成为第二笔的底色；旧序列拟合的颜色是为旧底色计算的。</p><p>方案 A 在确定网格和遍次后重新搜索、拟色，每接受一笔就更新底色，后续候选始终针对这张新画布计算。演示仅解释透明叠色，不是完整算法运行结果。</p></div></div></div>;
}

function ComparisonResults() {
  const cases = [
    { key: 'baseline', title: '上一版：全局残差', count: 1000, jump: 592, width: 436, mae: '6.54' },
    { key: 'sorted', title: '对照：只重排旧笔触', count: 1000, jump: 46, width: 327, mae: '6.94' },
    { key: 'raster', title: '当前：方案 A 重算', count: 998, jump: 27, width: 0, mae: '6.59' },
  ];
  return <div className="intro-demo"><h3>05 / 同图对照：顺序更稳定，重建误差并非最低</h3><div className="intro-grid three">{cases.map(c => <figure key={c.key}><Image src={`/intro/painting-order/${c.key}.png`} alt={c.title + '的莫奈日出重建结果'} width={768} height={597} className="intro-result-image" /><figcaption>{c.title}</figcaption><dl className="intro-metrics"><div><dt>实际笔数</dt><dd>{c.count}</dd></div><div><dt>跨画面大跳跃</dt><dd>{c.jump} 次</dd></div><div><dt>笔宽明显回增</dt><dd>{c.width} 次</dd></div><div><dt>像素 MAE ↓</dt><dd>{c.mae}</dd></div></dl></figure>)}</div><p className="mt-5">方案 A 的价值在于把大笔到小笔、逐区域推进变成明确规则。这张图上，大跳跃明显减少；相对上一版，平均像素误差略升，体现了顺序约束与拟合自由度的取舍。</p><p className="intro-caption">2026-09-16，本地单图工程对照：输入最长边512，分析最长边256，输出768×597，预算1000，白底，透明度0.85。大跳跃指相邻笔触端点中点的距离大于画布对角线30%；明显回增指后一笔宽度超过前一笔的110%；MAE是0–255 RGB平均绝对误差。不能外推为所有图片的提升，也不能证明学习效果、美感或满意度提高。<a className="intro-source" href="/intro/painting-order/metrics.json" download>下载原始工程指标 JSON ↗</a></p></div>;
}

export function PaperReferences() {
  return <><div className="intro-callout"><h3>文献给出方法方向，项目实现需要单独说明</h3><p>以下列出原始论文、可访问原文与项目关系。当前核心是“有顺序约束的显式笔触贪心优化”，无需预训练权重。下面的神经绘画论文用于方法比较与启发，不能据此把本项目称为其模型复现。</p></div><div className="intro-timeline mt-6">{PAPERS.map((p, i) => <article id={`paper-${p.id}`} key={p.id} className="intro-citation"><span>[{i + 1}] {p.year}</span><h3>{p.title}</h3><p>{p.authors}</p><h4>原方法</h4><p>{p.principle}</p><h4>项目采用或借鉴了什么</h4><p>{p.relation}</p><h4>没有实现的部分</h4><p>{p.boundary}</p><div className="intro-reference-links"><a href={p.url} target="_blank" rel="noreferrer">论文来源 ↗<small>{p.url}</small></a><a href={p.pdf} target="_blank" rel="noreferrer">原文 / 开放版本 ↗<small>{p.pdf}</small></a><a href={`https://doi.org/${p.doi}`} target="_blank" rel="noreferrer">DOI：{p.doi} ↗</a></div></article>)}</div><div className="intro-card"><h3>论文中如何准确描述项目贡献</h3><p>可表述为：面向零基础绘画引导，将多尺度笔触表达与预算误差优化结合，加入固定五遍、逐行区域顺序、顺序内颜色重估与阶段提示，并把序列用于可记录的对比实验。</p><p>五档宽度、预算比例、网格密度和六种风格预设均属于工程设计。当前证据是代码与单图试验；有效性需要更多材料与真人数据。六种风格的艺术史资料、参数映射与局限见上一章节，馆藏解读与同行评审算法论文分开列示。</p><p className="intro-caption">文献与馆藏资料核对日期：2026-09-16。图示由项目绘制；阶段图来自本项目真实规划器，不以论文图片冒充运行结果。</p></div></>;
}
