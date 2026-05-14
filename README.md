# 星绘智愈 Star bindPaint

> AI 辅助油画教育普惠系统 — 让每个孩子都能用画笔，将内心的孤岛连接成星海

**2026 Light 创造营 · 星月绘愈社**

---

## 项目简介

星绘智愈是一个基于 AI 笔触序列规划的交互式油画创作 Web 应用。用户上传一张图片后，系统通过边缘切线流（ETF）算法将其拆解为数百笔油画笔触序列，再由画笔精灵 Starry 引导用户逐笔完成一幅油画创作。

核心算法源自上海交通大学"智能媒体与创意"实验室的科研成果（AAOP 油画仿真系统），经 TypeScript 重写后实现纯浏览器端运行，零后端依赖。

## 核心体验

| 模式 | 描述 |
|------|------|
| **跟画模式** | 画笔精灵引导逐笔作画，支持"辅助"（AI 修正）和"真实"（保留笔迹）两种子模式 |
| **自动模式** | AI 逐笔自动绘制，观看从空白到完成的全过程 |
| **自由模式** | 自由涂鸦创作，精灵陪伴鼓励 |

## 技术栈

- **Next.js 16** — App Router + 静态页面
- **Tailwind CSS 4** — 高饱和色彩系统 + 大圆角 UI
- **Framer Motion** — 精灵动画 + 页面过渡
- **Canvas 2D** — 三层叠加画布（参考层 / 用户层 / 引导层）
- **零依赖算法** — ETF 方向场 + 泊松采样 + 流线追踪 + Catmull-Rom 绘制

## 算法原理

```
输入图片 → ETF 边缘切线流 → 密度图 → 泊松采样 → 流线追踪 → 笔触序列 → Canvas 绘制
```

1. **ETF（Edge Tangent Flow）**：Sobel 5×5 梯度 → 旋转 90° 得切线 → Ws/Wm/Wd 三权重迭代 15 次 → 平滑方向场
2. **泊松采样 + Lloyd 迭代**：按密度图拒绝采样 → 12 次 Lloyd 均匀化 → 笔触锚点
3. **流线追踪**：每个锚点沿 ETF 方向正反延伸，HSV 颜色阈值约束边界
4. **Catmull-Rom 平滑**：路径点转贝塞尔曲线 → Canvas 2D 绘制

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

打开 http://localhost:3000 即可使用。

## 页面路由

| 路径 | 功能 |
|------|------|
| `/` | 首页 — 上传图片 + 选择笔触密度 |
| `/paint` | 作画页 — 核心交互画布 |
| `/gallery` | 画廊 — 查看已完成作品 |
| `/cover` | 产品展示封面页 |

## 项目结构

```
src/
├── app/
│   ├── page.tsx              # 首页
│   ├── paint/page.tsx        # 核心作画页
│   ├── gallery/page.tsx      # 画廊
│   └── cover/page.tsx        # 展示封面
├── components/
│   ├── StarrySprite.tsx      # 画笔精灵（SVG + 4 状态动画）
│   ├── PaintCanvas.tsx       # 三层 Canvas 画布
│   ├── ModeSelector.tsx      # 模式切换
│   ├── ToolBar.tsx           # 工具栏
│   ├── ProgressRing.tsx      # 环形进度
│   └── ImageUploader.tsx     # 图片上传
└── lib/
    ├── stroke-engine.ts      # 核心算法（ETF + 采样 + 规划 + 绘制）
    ├── drawing-engine.ts     # 手绘引擎（pointer events + 平滑）
    ├── guide-system.ts       # 引导系统（队列 + 判定 + 反馈）
    └── gallery-store.ts      # localStorage 存储
```

## 部署

### Vercel（推荐）

```bash
npx vercel --prod
```

或连接 GitHub 仓库后自动部署。

### 微信小程序

详见 [WECHAT_MINIPROGRAM.md](./WECHAT_MINIPROGRAM.md) — 核心算法可直接移植，推荐 Taro 3 + React 方案。

## 技术溯源

本项目算法源自 Unity C# 油画仿真系统（AAOP 4.10），参考论文：

- Kang et al. 2007 — *Coherent Line Drawing*（ETF 算法）
- Teng Hu et al. 2023 — *Stroke-based Neural Painting with Dynamically Predicted Painting Region*

## 团队

上海交通大学 · 星月绘愈社

---

MIT License
