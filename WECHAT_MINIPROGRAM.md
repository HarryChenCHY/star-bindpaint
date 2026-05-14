# 微信小程序部署可行性分析

## 结论：可行，但需要适配改造

| 维度 | Web (当前) | 微信小程序 | 适配难度 |
|------|-----------|-----------|---------|
| 渲染 | HTML Canvas 2D | wx.Canvas 2D | ⭐ 低 — API 几乎一致 |
| 触控 | PointerEvent | touch 事件 | ⭐ 低 — 映射简单 |
| 算法 | 纯 JS/TS | 纯 JS（小程序支持） | ⭐ 低 — 无 DOM 依赖 |
| 框架 | Next.js + React | Taro / uni-app / 原生 | ⭐⭐ 中 — 需重写 UI 层 |
| 图片上传 | `<input type=file>` | `wx.chooseImage` | ⭐ 低 |
| 存储 | localStorage | wx.setStorage | ⭐ 低 |
| 性能 | V8 引擎 | JavaScriptCore / V8 | ⭐⭐ 中 — 需优化 |
| 包体积 | 无限制 | 主包 2MB / 分包 20MB | ⭐⭐ 中 — 算法代码约 30KB |

---

## 关键适配点

### 1. Canvas API（核心可行性）

微信小程序从基础库 2.9.0 起支持 **Canvas 2D 模式**，API 与 Web 标准 Canvas 2D 几乎一致：

```javascript
// Web
const ctx = canvas.getContext('2d');
ctx.beginPath();
ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
ctx.stroke();

// 小程序（完全一样）
const ctx = canvas.getContext('2d');
ctx.beginPath();
ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
ctx.stroke();
```

**结论**：`stroke-engine.ts` 中的 `drawStroke()` / `drawGuideStroke()` 几乎零改动即可运行。

### 2. 算法部分（完全可移植）

`stroke-engine.ts` 是纯数学计算（Float32Array + 循环），不依赖任何 DOM/Browser API：
- ETF 迭代 ✓
- 泊松采样 ✓
- 流线追踪 ✓
- 贝塞尔绘制 ✓

唯一的 DOM 依赖是 `imageSourceFromImage()`（用 canvas 提取像素），在小程序中改为 `wx.canvasGetImageData()` 即可。

### 3. 性能风险

| 操作 | Web (M1 MacBook) | 小程序 (iPhone 13) | 小程序 (中低端安卓) |
|------|------------------|-------------------|-------------------|
| ETF 15 iter (512px) | ~1.5s | ~2-3s | ~5-8s |
| 泊松+Lloyd 12 iter | ~1s | ~2-4s | ~4-8s |
| 总耗时 | ~3s | ~5-7s | ~10-15s |

**应对方案**：
- roughness 默认设为 2-3（减少笔触总量）
- 可用 Worker（小程序支持 `wx.createWorker`）异步计算
- 加载时显示进度动画，用户体验可接受

### 4. 框架选择

| 方案 | 优势 | 劣势 |
|------|------|------|
| **Taro + React** | 现有代码复用度最高（~70%），组件逻辑直接移植 | 多一层抽象，调试略难 |
| **uni-app + Vue** | 生态大，文档多 | 需要重写全部组件逻辑 |
| **原生小程序** | 性能最好，Canvas 控制最精细 | 开发量大，无组件复用 |

**推荐**：**Taro 3 + React**，最大化复用现有代码。

### 5. 具体改动清单

```
需要改的：
├── UI 组件 → Taro 组件（View/Text/Image 替代 div/span/img）
├── 路由 → Taro 页面路由
├── framer-motion → 小程序 animation API / Taro 动画
├── 图片上传 → wx.chooseImage + wx.canvasGetImageData
├── 存储 → wx.setStorage / wx.getStorage

不需要改的：
├── stroke-engine.ts 核心算法（100% 可移植）
├── guide-system.ts 引导逻辑
├── drawing-engine.ts（改 PointerEvent → touch 即可）
├── gallery-store.ts（改 localStorage → wx.setStorage）
```

---

## 预估工时

| 阶段 | 工时 |
|------|------|
| Taro 项目初始化 + Canvas 适配 | 1 天 |
| 算法移植 + Worker 异步化 | 0.5 天 |
| UI 组件重写（精灵/工具栏/模式选择） | 1.5 天 |
| 触控交互调试（手绘引擎） | 1 天 |
| 性能优化 + 中低端机适配 | 1 天 |
| **总计** | **~5 天** |

---

## 不建议用小程序的场景

- 如果只是比赛 Demo 展示 → **用现有 Web 版足够**，部署到 Vercel 即可
- 如果要面向真实用户长期运营 → 小程序值得做（触达更广）

## 替代方案：H5 内嵌微信

如果时间紧张，可以：
1. 把当前 Next.js 项目部署到服务器
2. 在微信里通过 `<web-view>` 组件直接嵌入 H5
3. 用户体验接近原生，开发成本为 0

**限制**：需要已认证的服务号/小程序才能使用 `<web-view>`，且 H5 无法调用微信支付等原生能力。
