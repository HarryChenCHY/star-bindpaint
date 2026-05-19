<p align="center">
  <img src="./public/banner.svg" alt="星绘智愈 Banner" width="100%" />
</p>

<h1 align="center">星绘智愈 Star BindPaint</h1>

<p align="center">
  <strong>AI 辅助油画教育与艺术疗愈系统 — 临摹大师画作，在创作中感受疗愈</strong>
</p>

<p align="center">
  2026 Light 创造营 · 星月绘愈社 · 上海交通大学
</p>

<p align="center">
  <a href="https://star-bindpaint.vercel.app">在线体验</a> ·
  <a href="https://star-bindpaint.vercel.app/onboard">开始创作</a> ·
  <a href="#五步疗愈流程">疗愈流程</a> ·
  <a href="#大师作品库">大师作品库</a>
</p>

---

## 项目简介

星绘智愈是一个面向孤独症儿童的 AI 辅助油画教育与艺术疗愈系统。通过 AI 笔触序列规划算法，将莫奈、梵高、高更等大师经典画作拆解为可临摹的油画笔触序列。儿童在画笔精灵 Starry 的陪伴下，通过"你画1笔，AI补50笔"的陪画模式轻松完成创作，系统同步采集绘画过程数据生成疗愈观察报告。

产品设计融合了 TEACCH 结构化教学法、ABA 应用行为分析、Social Story 社交故事等循证特殊教育方法，并提供安静模式、分层难度、情绪检测等 ASD 适配功能。

## 五步疗愈流程

```
😊 选心情 → 🎨 选大师 → ✏️ 陪画创作 → 😌 再选心情 → 📋 疗愈报告
```

1. **情绪前测** — 选择今天的心情（开心/平静/紧张/难过），系统自动适配难度
2. **选择大师** — 从 6 位大师 30 幅作品中选择，大师以第一人称讲述创作故事
3. **陪画创作** — 你画 1 笔，AI 自动补 50 笔（可调 20-200），轻松完成全图
4. **情绪后测** — 画完后再选一次心情，量化"这次绘画是否帮助了情绪过渡"
5. **疗愈报告** — LLM 基于过程数据生成观察记录，供家长/治疗师参考

## 三种核心模式

| 模式 | 描述 | 适合场景 |
|------|------|---------|
| **陪画模式** | 你画 1 笔，Starry 帮你补 N 笔，跟着大师笔触轻松完成 | 日常疗愈（推荐） |
| **共同注意** | AI 边画边停顿问你问题："这是什么颜色？在哪里？" | 互动学习/社交训练 |
| **自由表达** | 选一个主题（画心情/画天气），用颜色自由表达 | 情绪疏导/非语言表达 |

## 大师作品库

内置 6 位大师共 30 幅经典作品，每幅配有大师第一人称对话：

| 画家 | 风格 | 代表作品 |
|------|------|---------|
| 莫奈 | 印象派 | 日出·印象、睡莲、议会大厦、罂粟花田 |
| 梵高 | 后印象派 | 星空、阿尔的卧室、野玫瑰、蒙马特风车 |
| 高更 | 后印象派 | 布列塔尼村庄、阿尔的洗衣妇、花卉静物 |
| 伦勃朗 | 巴洛克 | 使徒保罗、自画像、书房中的学者 |
| 毕加索 | 立体主义 | 埃布罗河畔的房屋、果盘静物、狂欢节丑角 |
| 萨金特 | 水彩 | 威尼斯乞丐河、柳树下、卢卡别墅喷泉 |

## ASD 适配功能

| 功能 | 原理 |
|------|------|
| **安静模式** | 低刺激界面：去动画、柔和色、大字号（感觉统合理论） |
| **分层难度** | 小小画家(画了就算) / 小画家(宽松) / 小艺术家(标准) |
| **视觉时间表** | TEACCH 垂直步骤条，"还剩 X 笔"（可预测性） |
| **先看后做** | 每笔先演示一遍再让孩子画（ABA 建模学习） |
| **情绪检测** | 被动检测 6 种行为信号，自动触发平静呼吸引导 |
| **社交故事** | 首次使用前 6 页图文引导（Carol Gray 标准） |
| **照护者提示** | 给旁边家长/治疗师的动态指导语 |
| **情绪前后测** | 量化每次绘画的情绪变化 |

## 技术栈

- **Next.js 16** — App Router + API Routes
- **Tailwind CSS 4** — 色彩系统 + 安静模式 CSS 变量
- **Framer Motion** — 动画（安静模式下自动禁用）
- **Canvas 2D** — 三层叠加画布 + 引导线 + 先看后做演示
- **物理仿真引擎** — ETF 方向场 + 泊松采样 + 流线追踪
- **阿里云百炼** — 通义千问 VL 多模态分析（疗愈报告）

## 快速开始

```bash
npm install
npm run dev
```

**线上访问**：https://star-bindpaint.vercel.app

## 页面路由

| 路径 | 功能 |
|------|------|
| `/` | 产品封面展示页 |
| `/onboard` | 情绪前测 + 能量选择（状态入口） |
| `/create` | 大师作品库 / 上传图片 + 情绪色调 |
| `/paint` | 核心画布（陪画/共同注意/自由表达） |
| `/report` | AI 疗愈观察报告 |
| `/gallery` | 我的画廊 |
| `/settings` | 家长/治疗师设置（密码保护） |
| `/intro` | 项目介绍 |

## 项目结构

```
src/
├── app/
│   ├── page.tsx              # 封面首页
│   ├── onboard/page.tsx      # 情绪前测 + 能量 + 社交故事
│   ├── create/page.tsx       # 大师作品库（头像+底图卡片）
│   ├── paint/page.tsx        # 核心画布（陪画/共同注意/自由）
│   ├── report/page.tsx       # AI 疗愈报告（儿童版+照护者版）
│   ├── gallery/page.tsx      # 画廊
│   ├── settings/page.tsx     # 家长设置
│   └── api/analyze/route.ts  # LLM 分析 API
├── contexts/
│   └── AppContext.tsx         # 全局设置（安静模式/难度/先看后做）
├── components/
│   ├── MasterBubble.tsx       # 大师对话气泡（打字机效果）
│   ├── EmotionPicker.tsx      # 情绪前后测选择器
│   ├── SocialStory.tsx        # 社交故事引导（6页）
│   ├── VisualSchedule.tsx     # 视觉时间表
│   ├── WatchDemo.tsx          # 先看后做演示动画
│   ├── CalmBreathing.tsx      # 呼吸引导（4s膨胀6s收缩）
│   ├── SharedAttention.tsx    # 共同注意问答
│   ├── FreeModeThemes.tsx     # 自由模式主题脚手架
│   ├── CaregiverTips.tsx      # 照护者陪伴提示
│   ├── PaintCanvas.tsx        # 三层 Canvas 画布
│   └── StarrySprite.tsx       # 画笔精灵
├── lib/
│   ├── stroke-engine.ts       # ETF + 采样 + 规划 + 色调偏移
│   ├── painting-tracker.ts    # 绘画过程数据采集
│   ├── emotion-detector.ts    # 情绪被动检测（6种信号）
│   ├── feedback-engine.ts     # 具象化反馈 + 共同注意问答
│   ├── guide-system.ts        # 引导系统（难度适配）
│   ├── masterworks.ts         # 大师作品库配置
│   ├── master-dialogues.ts    # 大师对话数据
│   └── gallery-store.ts       # localStorage 存储
└── public/
    ├── masterworks/            # 30 幅大师作品（2048px）
    └── master/                 # 6 位大师头像
```

## 部署

```bash
npx vercel --prod
```

环境变量（Vercel Settings → Environment Variables）：
- `DASHSCOPE_API_KEY` — 阿里云百炼 API Key

## 技术溯源

核心算法源自 Unity C# 油画仿真系统（AAOP 4.10），参考论文：

- Kang et al. 2007 — *Coherent Line Drawing*（ETF 算法）
- Teng Hu et al. 2023 — *Stroke-based Neural Painting with Dynamically Predicted Painting Region*

ASD 适配设计基于：
- TEACCH 结构化教学法（视觉时间表）
- ABA 应用行为分析（先看后做/建模学习）
- Carol Gray 社交故事方法论
- 感觉统合理论（安静模式/感官分级）

## 团队

上海交通大学 · 星月绘愈社

---

MIT License
