'use client';

import { MASTER_STYLES } from '@/lib/style-transfer';
import { STYLE_EVIDENCE } from '@/lib/intro-sources';

export function StyleEvidence({ selected }: { selected: number }) {
  const evidence = STYLE_EVIDENCE[selected], style = MASTER_STYLES[selected];
  const curveNames = { taper: '两端渐细', bulge: '中段鼓起', uniform: '近似等宽', pressure: '压力控制' };
  // Schematic centre line/range from computeWidth; actual engine examples are above.
  const ratio = (t: number) => style.widthCurve === 'taper' ? Math.max(.3, 1 - .7 * Math.abs(2 * t - 1) ** 1.5) : style.widthCurve === 'bulge' ? 1 + style.widthVariation * Math.sin(Math.PI * t) : style.widthCurve === 'pressure' ? .3 + .7 * (.3 + .6 * Math.sin(Math.PI * t)) : 1;
  const upper = Array.from({ length: 61 }, (_, i) => `${20 + i * 4.5},${65 - ratio(i / 60) * 20}`);
  const lower = Array.from({ length: 61 }, (_, i) => `${20 + (60 - i) * 4.5},${65 + ratio((60 - i) / 60) * 20}`);
  return <div className="intro-evidence" data-testid="style-evidence" aria-live="polite">
    <div className="intro-grid two"><div><p className="intro-eyebrow">{style.name} / 资料 → 感受 → 参数</p><h3>艺术依据支持特征，数值来自项目设定</h3><h4>馆藏或研究说了什么</h4><p>{evidence.observation}</p><a className="intro-source" href={evidence.url} target="_blank" rel="noreferrer">{evidence.source} ↗<small>{evidence.url}</small></a><h4>项目的感性转译</h4><p>{evidence.feeling}</p><h4>参数与预期效果如何对应</h4><p>{evidence.rationale}</p></div><div className="intro-card"><h3>{curveNames[style.widthCurve]} · 笔形示意</h3><svg viewBox="0 0 320 130" role="img" aria-label={`${style.name}宽度变化示意`} className="w-full"><path d={`M${upper.join(' L')} L${lower.join(' L')} Z`} fill="#6558d9" opacity=".8" /><path d="M20 65H290" stroke="#17233f" strokeDasharray="4 4" /><text x="20" y="120" fontSize="12" fill="#536079">起笔 t=0</text><text x="240" y="120" fontSize="12" fill="#536079">收笔 t=1</text></svg><p className="intro-caption">只展示宽度包络，不含随机纹理；压感图使用逐渐按下再抬起的示例压力。上方六条笔迹由实际绘画引擎生成。</p><dl className="intro-metrics"><div><dt>基础宽度</dt><dd>{style.widthBase}px</dd></div><div><dt>宽度参数 v</dt><dd>{style.widthVariation}{style.widthCurve === 'taper' ? '（当前渐细公式未使用）' : ''}</dd></div><div><dt>路径扰动上界 / 每轴</dt><dd>约 {style.roughness * 2.5}px</dd></div><div><dt>分段目标</dt><dd>{style.strokeSplit}</dd></div></dl><p>局限：{evidence.limit}</p></div></div>
  </div>;
}

export function StyleParameterGuide() {
  return <>
    <h3 className="intro-subheading">参数的数据来源：当前是人工设计值，不是大师笔迹测量库</h3>
    <p className="mb-6">本次补充的是现有预设与公开资料的对照说明。仓库没有最初选定各数值的设计记录，因此下面解释的是参数实际产生的效果和可讨论的设计取舍，不把后来找到的资料写成当初选值的证据。</p>
    <div className="intro-grid three"><div className="intro-card"><h3>1. 艺术史与技术资料</h3><p>馆藏作品解读和修复技术研究支持“可见厚笔、平坦色域、松散笔迹”等定性观察。它们通常讨论某一作品或时期，不提供本程序可直接使用的像素参数。</p></div><div className="intro-card"><h3>2. 项目的设计解释</h3><p>把“轻盈、饱满、稳定、粗粝、断续、流畅”映射为渐细、鼓起、等宽、压感与纹理。这里的感受词是设计意图，未做感性工学量表或观众感知实验验证。</p></div><div className="intro-card"><h3>3. 代码中的预设</h3><p>6、8、10px，0.1、0.3等都是人工设定。仓库没有对应的作品采样清单、笔迹分割标注、拟合过程或画家压感轨迹，因此不将这些值称为测量结果。</p></div></div>
    <div className="intro-table mt-6"><table><caption>当前运行参数（直接读取程序预设）</caption><thead><tr><th>风格</th><th>宽度曲线 / 基础值</th><th>变化 v</th><th>路径扰动</th><th>分段目标</th><th>纹理</th></tr></thead><tbody>{MASTER_STYLES.map(s => <tr key={s.id}><td>{s.name}</td><td>{s.widthCurve} / {s.widthBase}px</td><td>{s.widthVariation}{s.widthCurve === 'taper' ? '（未参与）' : ''}</td><td>{s.roughness} → ≤{s.roughness * 2.5}px/轴</td><td>{s.strokeSplit}</td><td>{s.texture}</td></tr>)}</tbody></table></div>
    <p className="intro-caption">基础宽度是未传入用户笔宽时的回退值。自由画板通常传入工具栏笔宽，所以切换风格并不强制切到此表的5–10px；上方六个预览统一用15px比较形态。分段值是目标，短路径可能不分段，重采样与取整也可能造成额外尾段。</p>
    <details className="intro-details"><summary>展开逐项解释：一个参数到底怎样影响笔迹？</summary>
      <h4>路径：约每4px重采样，再绘制连续曲线</h4><p>手势路径重采样后，按需要切成几段；每个小段用 Catmull–Rom 到 Bézier 的转换连接。粗糙参数 r 加入正弦组合扰动，每轴偏移幅度不超过约2.5r像素。它不是画布纹理的物理粗糙度，也不是笔触宽度的百分比。</p>
      <h4>宽度：同一个 v 并非在所有模式中都生效</h4><div className="intro-formula">渐细：w(t) = b × max(0.3, 1 − 0.7 |2t − 1|¹·⁵)<br />鼓起：w(t) = b × [1 + v sin(πt)]<br />等宽：w = b × [1 + (u − 0.5) v × 0.3]<br />压感：w = b × (0.3 + 0.7p) × [1 + (u − 0.5) v × 0.2]</div><p>b为用户笔宽或基础宽度，t为段内进度，u为0–1随机数，p为输入压力。渐细的0.7与指数1.5是固定设计常数，莫奈和萨金特的 widthVariation 字段目前不参与这条公式；不能用0.5与0.6来解释二者的渐细差异。鼠标或缺失压力会使用基础压力，当前代码还会将0压力回退为0.5。</p>
      <h4>纹理：用二维描画表达可辨识的差异</h4><p>smooth正常绘制。thick绘两层：第二层半宽、透明度乘0.6、坐标最多约±1px偏移。dry随机略过15%的小线段。broken在每7个小线段中跳过索引模7等于5的一段；这些缺口不等于每7个屏幕像素。</p>
      <h4>颜色：以用户预览的一致性为先</h4><p>六种预设都使用0.96基础不透明度，色相扰动限制为±2°，额外饱和度增强为0。用户饱和度、明度先经统一HSV调色，再加入微小色相扰动。多层或重复覆盖会改变局部有效不透明度，所以0.96不是最终每个像素都固定为96%。</p><p>0.96、±2°是针对预览色与实画色差过大的产品修订，未取自画家的颜料分析。图标代表色只用于界面识别，不是自动替用户选色的“大师调色板”。</p>
    </details>
    <div className="intro-callout"><h3>若要把“风格启发”进一步写成“数据驱动”，还缺哪些证据？</h3><p>需先限定画家、时期与媒介，建立有来源和尺度记录的样本；标注代表性笔迹，再测量归一化宽长比、宽度曲线、方向变化与间断比例。最后对参数做拟合，并用未参与拟合的作品和盲评检查风格辨识度。</p><p>这是后续可做的验证路径，尚未实施。画作照片本身也不能可靠恢复原始压感、作画速度或完整先后顺序；这些量需要额外过程资料。当前准确定位是“有艺术资料参照的程序化风格预设”。</p></div>
  </>;
}
