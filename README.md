<p align="center">
  <img src="./public/banner.svg" alt="星绘智愈 Banner" width="100%" />
</p>

<h1 align="center">星绘智愈 Star BindPaint</h1>

<p align="center">
  <strong>AI 辅助油画教育与艺术疗愈系统 — 从学到创，在艺术中感受疗愈</strong>
</p>

<p align="center">
  2026 Light 创造营 · 星月绘愈社 · 上海交通大学
</p>

<p align="center">
  <a href="https://star-bindpaint.vercel.app">在线体验</a> ·
  <a href="https://star-bindpaint.vercel.app/onboard">开始创作</a> ·
  <a href="#两步递进体验">两步体验</a> ·
  <a href="#五步疗愈流程">疗愈流程</a>
</p>

---

## 项目简介

星绘智愈是一个面向孤独症儿童的 AI 辅助油画教育与艺术疗愈系统，通过"**从学到创**"的递进式体验帮助儿童建立创作自信：

- **第一步 · 临摹学习**：AI 将莫奈、梵高等大师经典画作拆解为笔触序列，你画1笔系统自动补100笔，跟着引导线轻松完成一幅油画
- **第二步 · 自由创作**：画任何你想画的内容，每一笔实时变成大师的油画风格，还能一键"✨变成油画"让 AI 将简笔画渲染为完整油画

系统同步采集绘画过程数据（情绪变化、色彩偏好、笔触节奏、专注区域），由通义千问 VL 生成疗愈观察报告。产品设计融合 TEACCH 结构化教学法、ABA 应用行为分析、Social Story 社交故事等循证特殊教育方法。

## 两步递进体验

| 步骤 | 模式 | 描述 | 适合场景 |
|------|------|------|---------|
| 第一步 | **临摹学习** | 选择大师画作→你画1笔AI补100笔→跟着引导线完成 | 建立信心、学习笔触 |
| 第二步 | **自由创作** | 自由画+6种大师风格实时转换+主题引导+一键变成油画 | 自由表达、疗愈观察 |

**附加能力**（贯穿两步）：

| 功能 | 描述 |
|------|------|
| 共同注意 | 每画几笔 AI 暂停提问："这是什么颜色？在哪里？" |
| 主题引导 | 5个低门槛主题（画天气/画心情/安全的地方/慢线条/小星球），分步提示 |
| ✨ 变成油画 | 一键将简笔画通过 AI 渲染为完整大师级油画（DashScope doodle 模式） |

## 五步疗愈流程

```
😊 选心情 → 🎨 选大师/自由创作 → ✏️ 陪画/自由画 → 😌 再选心情 → 📋 疗愈报告
```

1. **情绪前测** — 选择今天的心情（开心/平静/紧张/难过），系统自动适配难度
2. **选择体验** — 临摹大师画作（6位大师30幅）或自由创作（选风格+选主题）
3. **创作过程** — 临摹模式跟着引导线画，自由模式随意画+实时风格化
4. **情绪后测** — 画完后再选一次心情，量化"这次绘画是否帮助了情绪过渡"
5. **疗愈报告** — LLM 基于过程数据生成观察记录，供家长/治疗师参考

## 大师作品库 & 风格

内置 6 位大师，提供 30 幅临摹作品 + 6 种实时风格化：

| 画家 | 风格 | 临摹作品 | 实时风格特点 |
|------|------|---------|------------|
| 莫奈 | 印象派 | 日出·印象、睡莲等5幅 | 柔和渐细短笔触、光影跳跃 |
| 梵高 | 后印象派 | 星空、野玫瑰等5幅 | 旋转厚涂、大胆饱和色彩 |
| 高更 | 后印象派 | 布列塔尼村庄等5幅 | 大色块平涂、原始力量 |
| 伦勃朗 | 巴洛克 | 使徒保罗、自画像等5幅 | 明暗对比、干笔飞白 |
| 毕加索 | 立体主义 | 果盘静物、丑角等5幅 | 几何断笔、大胆变色 |
| 萨金特 | 水彩 | 威尼斯、柳树下等5幅 | 流畅渐细、轻盈透明 |

## ASD 适配功能

| 功能 | 原理 |
|------|------|
| **安静模式** | 低刺激界面：去动画、柔和色、大字号（感觉统合理论） |
| **分层难度** | 小小画家 / 小画家 / 小艺术家 |
| **视觉时间表** | TEACCH 垂直步骤条，实时进度显示 |
| **先看后做** | 每笔先演示一遍再让孩子画（ABA 建模学习） |
| **情绪检测** | 连续失败/空闲时自动触发平静呼吸引导（2分钟冷却） |
| **社交故事** | 首次使用前6页图文引导（Carol Gray 标准） |
| **照护者提示** | 给旁边家长/治疗师的动态指导语 |
| **情绪前后测** | 量化每次绘画的情绪变化 |
| **主题引导** | 天气/心情/安全地点/慢线条/星球 5 种低门槛引导 |
| **共同注意问答** | 每画几笔暂停问颜色/位置/情感联想，带大师知识反馈 |
| **童趣图标按钮** | 所有操作按钮图标化，降低文字阅读门槛 |

## 技术栈

- **Next.js 16** — App Router + API Routes
- **Tailwind CSS 4** — 色彩系统 + 安静模式 CSS 变量
- **Framer Motion** — 动画（安静模式下自动禁用）
- **Canvas 2D** — 三层叠加画布 + 引导线 + 先看后做演示
- **物理仿真引擎** — ETF 方向场 + 泊松采样 + 流线追踪
- **实时风格化引擎** — 6种大师风格（宽度曲线+颜色抖动+纹理）纯前端实时运行
- **DashScope wanx2.1-imageedit** — "变成油画" doodle 模式深度渲染
- **阿里云百炼 · 通义千问 VL** — 多模态分析生成疗愈观察报告
- **阿里云 OSS** — 画廊图片云端存储

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
| `/create` | 大师作品库 / 自由创作（选风格+主题）/ 上传图片 |
| `/paint` | 核心画布（临摹模式 / 自由模式 + 实时风格化 + 变成油画） |
| `/report` | AI 疗愈观察报告（情绪变化 + LLM 分析） |
| `/gallery` | 我的画廊（OSS 云端存储） |
| `/settings` | 家长/治疗师设置（密码保护） |
| `/intro` | 产品介绍 |

## 项目结构

```
src/
├── app/
│   ├── page.tsx              # 封面首页
│   ├── onboard/page.tsx      # 情绪前测 + 能量 + 社交故事
│   ├── create/page.tsx       # 大师作品库 / 自由创作 / 上传图片
│   ├── paint/page.tsx        # 核心画布（临摹+自由+风格化+变成油画）
│   ├── report/page.tsx       # AI 疗愈报告（情绪变化+LLM观察）
│   ├── gallery/page.tsx      # 画廊（OSS 云端存储）
│   ├── settings/page.tsx     # 家长设置
│   ├── intro/page.tsx        # 产品介绍
│   └── api/
│       ├── analyze/route.ts  # 通义千问 VL 疗愈分析
│       ├── sd-render/route.ts # "变成油画" DashScope 渲染
│       └── upload/route.ts   # OSS 图片上传
├── contexts/
│   └── AppContext.tsx         # 全局设置（安静模式/难度/先看后做）
├── components/
│   ├── PaintCanvas.tsx        # 三层 Canvas 画布 + 风格化集成
│   ├── MasterBubble.tsx       # 大师对话气泡（打字机效果）
│   ├── EmotionPicker.tsx      # 情绪前后测选择器
│   ├── SocialStory.tsx        # 社交故事引导（6页）
│   ├── VisualSchedule.tsx     # 视觉时间表
│   ├── WatchDemo.tsx          # 先看后做演示动画
│   ├── CalmBreathing.tsx      # 呼吸引导（4s膨胀6s收缩）
│   ├── SharedAttention.tsx    # 共同注意问答
│   ├── FreeModeThemes.tsx     # 自由模式主题引导（5主题+分步提示）
│   ├── CaregiverTips.tsx      # 照护者陪伴提示
│   ├── SDRenderResult.tsx     # "变成油画" 前后对比展示
│   ├── StarrySprite.tsx       # 画笔精灵
│   └── ToolBar.tsx            # 工具栏（图标化按钮）
├── lib/
│   ├── stroke-engine.ts       # ETF + 采样 + 规划 + 色调偏移
│   ├── style-transfer.ts     # 6种大师风格实时转换引擎
│   ├── painting-tracker.ts    # 绘画过程数据采集
│   ├── emotion-detector.ts    # 情绪被动检测（行为信号）
│   ├── feedback-engine.ts     # 具象化反馈 + 共同注意问答生成
│   ├── drawing-engine.ts      # Canvas 手绘引擎（pointer管理）
│   ├── guide-system.ts        # 引导系统（难度适配）
│   ├── masterworks.ts         # 大师作品库配置
│   ├── master-dialogues.ts    # 大师对话数据
│   └── gallery-store.ts       # 画廊存储（OSS + localStorage 降级）
└── public/
    ├── masterworks/            # 30 幅大师作品（2048px）
    └── master/                 # 6 位大师头像
```

## 部署

```bash
npx vercel --prod
```

环境变量（Vercel Settings → Environment Variables）：
- `DASHSCOPE_API_KEY` — 阿里云百炼 API Key（通义千问 VL + 通义万相）
- `OSS_BUCKET` — OSS Bucket 名称
- `OSS_REGION` — OSS 地域（如 oss-cn-shenzhen）
- `OSS_ACCESS_KEY_ID` — OSS AccessKey ID
- `OSS_ACCESS_KEY_SECRET` — OSS AccessKey Secret

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
