<p align="center">
  <img src="./public/banner.svg" alt="星绘智愈 Banner" width="100%" />
</p>

<h1 align="center">星绘智愈 Star BindPaint</h1>

<p align="center">
  <strong>AI 辅助油画教育普惠系统 — 让每个孩子都能用画笔，将内心的孤岛连接成星海</strong>
</p>

<p align="center">
  2026 Light 创造营 · 星月绘愈社 · 上海交通大学
</p>

<p align="center">
  <a href="https://star-bindpaint.vercel.app">在线体验</a> ·
  <a href="https://star-bindpaint.vercel.app/create">开始创作</a> ·
  <a href="#核心技术">核心技术</a> ·
  <a href="#大师作品库">大师作品库</a>
</p>

---

## 项目简介

星绘智愈是一个面向孤独症儿童的 AI 辅助油画教育与艺术疗愈系统。通过 AI 笔触序列规划算法，将大师经典画作拆解为数百笔可临摹的油画笔触序列，由画笔精灵 Starry 引导儿童逐笔完成创作，在临摹过程中与大师进行"心灵对话"，达到艺术教育与疗愈的双重目标。

核心算法源自上海交通大学"智能媒体与创意"实验室的科研成果（AAOP 油画仿真系统），经 TypeScript 重写后实现纯浏览器端运行，零后端依赖。

## 核心功能

### 三种创作模式

| 模式 | 描述 |
|------|------|
| **跟画模式** | 画笔精灵引导逐笔作画，支持"辅助"（AI 修正）和"真实"（保留笔迹）两种子模式 |
| **自动模式** | AI 逐笔自动绘制，观看从空白到完成的全过程 |
| **自由模式** | 自由涂鸦创作，精灵陪伴鼓励 |

### 大师作品库

内置 6 位大师共 30 幅经典作品，覆盖印象派到立体主义：

| 画家 | 风格 | 代表作品 |
|------|------|---------|
| 莫奈 | 印象派 | 日出·印象、睡莲、议会大厦 |
| 梵高 | 后印象派 | 星空、阿尔的卧室、野玫瑰 |
| 高更 | 后印象派 | 塔希提女人、黄色基督 |
| 伦勃朗 | 巴洛克 | 夜巡、自画像、浪子回头 |
| 毕加索 | 立体主义 | 哭泣的女人、梦、三个音乐家 |
| 萨金特 | 写实/水彩 | 威尼斯运河、康乃馨与百合 |

### 大师对话教育

选择画家后，大师以第一人称"活过来"与儿童互动：
- **招呼语** — 进入画家页面时介绍自己
- **创作故事** — 浏览作品时讲述每幅画的创作背景
- **鼓励语** — 开始临摹前给予情感支持
- **打字机效果** — 模拟真实对话节奏

### 情绪色调选择

同一幅画可以选择不同情绪色调（温暖/安静/鲜活/梦幻/原色），让每个孩子画出独一无二的版本。

### AI 绘画观察报告

基于绘画过程数据（犹豫时间、跳过行为、色彩偏好、专注区域、笔触节奏），调用 LLM 生成温和的观察记录，辅助治疗师了解儿童状态。

## 核心技术

- **Next.js 16** — App Router + API Routes
- **Tailwind CSS 4** — 高饱和色彩系统 + 大圆角 UI
- **Framer Motion** — 精灵动画 + 页面过渡
- **Canvas 2D** — 三层叠加画布（参考层 / 用户层 / 引导层）
- **物理仿真引擎** — ETF 方向场 + 泊松采样 + 流线追踪 + Catmull-Rom 绘制
- **阿里云百炼** — 通义千问 VL 多模态分析（绘画观察报告）

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

# 本地开发
npm run dev

# 构建生产版本
npm run build
```

**线上访问**：https://star-bindpaint.vercel.app

## 页面路由

| 路径 | 功能 |
|------|------|
| `/` | 产品封面展示页 |
| `/create` | 创作入口 — 大师作品库 / 上传图片 + 情绪色调 + 笔触密度 |
| `/paint` | 作画页 — 核心交互画布（跟画/自动/自由） |
| `/gallery` | 画廊 — 查看已完成作品 |
| `/report` | 观察报告 — LLM 生成的绘画过程分析 |
| `/intro` | 项目介绍页 |

## 项目结构

```
src/
├── app/
│   ├── page.tsx              # 封面展示首页
│   ├── create/page.tsx       # 大师作品库 + 上传 + 参数选择
│   ├── paint/page.tsx        # 核心作画页
│   ├── gallery/page.tsx      # 画廊
│   ├── report/page.tsx       # AI 观察报告
│   └── api/analyze/route.ts  # LLM 分析 API
├── components/
│   ├── StarrySprite.tsx      # 画笔精灵（SVG + 4 状态动画）
│   ├── MasterBubble.tsx      # 大师对话气泡（打字机效果）
│   ├── Characters.tsx        # 角色 SVG 组件
│   ├── PaintCanvas.tsx       # 三层 Canvas 画布
│   ├── ModeSelector.tsx      # 模式切换
│   ├── ToolBar.tsx           # 工具栏
│   ├── ProgressRing.tsx      # 环形进度
│   └── ImageUploader.tsx     # 图片上传
├── lib/
│   ├── stroke-engine.ts      # 核心算法（ETF + 采样 + 规划 + 绘制）
│   ├── drawing-engine.ts     # 手绘引擎（pointer events + 平滑）
│   ├── guide-system.ts       # 引导系统（队列 + 判定 + 反馈）
│   ├── painting-tracker.ts   # 绘画过程数据采集
│   ├── masterworks.ts        # 大师作品库配置
│   ├── master-dialogues.ts   # 大师对话数据
│   └── gallery-store.ts      # localStorage 存储
└── public/
    ├── masterworks/          # 30 幅大师作品（2048px 高清）
    └── master/               # 6 位大师头像
```

## 部署

### Vercel（推荐）

```bash
npx vercel --prod
```

环境变量：在 Vercel Settings → Environment Variables 添加：
- `DASHSCOPE_API_KEY` — 阿里云百炼 API Key（用于观察报告功能）

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
