# 星绘智愈 (star-bindpaint)

> 项目级 Claude 上下文档案。每次新对话开始时，Claude 必须先读取本文件，避免重复解释。

## 项目简介

**星绘智愈 (STAR PAINT)** — 面向孤独症儿童的 AI 辅助油画疗愈应用。
- 主体定位：临摹大师经典 + 自由创作 + 实时风格化 + LLM 疗愈观察报告
- 创作背景：上海交通大学 · 星月绘愈社 · 2026 Light 创造营
- 工作目录：`c:\Users\haoyu.chen02\Desktop\star-bindpaint`

## 技术栈

| 层级 | 技术 | 版本 |
|---|---|---|
| 框架 | Next.js (App Router + Turbopack) | 16.2.6 |
| 语言 | TypeScript | ^5 |
| UI 库 | React | 19.2.4 |
| 样式 | Tailwind CSS v4 + tw-animate-css | ^4 |
| 动画 | framer-motion (主) / motion (辅) | ^12.38.0 / ^12.40.0 |
| 3D | three.js | ^0.167.1 |
| 图标 | lucide-react | ^1.16.0 |
| UI 组件 | @base-ui/react + shadcn | ^1.5.0 / ^4.8.0 |
| 工具 | clsx + tailwind-merge + class-variance-authority | — |

> ⚠️ 注意：项目同时安装了 `framer-motion` 和 `motion`，所有自写代码统一使用 `framer-motion`，不要 import from `motion/react`。

## 代码风格

- **缩进**：2 空格
- **引号**：JS/TS 使用单引号，JSX 属性使用双引号
- **命名**：组件 PascalCase，hooks/工具函数 camelCase，常量 UPPER_SNAKE
- **路径别名**：`@/*` → `./src/*`
- **客户端组件**：在文件顶部声明 `'use client';`（Next.js 16 App Router 默认 server component）
- **样式优先级**：Tailwind utility class 为主；复杂动画和品牌色用 inline `style={{...}}`
- **注释语言**：中文（用户与协作者均为中文母语者）
- **注释原则**：默认不写注释，仅在有"非显而易见的 WHY"时写一行
- **TypeScript**：组件 props 显式标注类型；新文件优先 `.tsx`；保留的少数 `.jsx`（如 Dock、Ballpit）属于第三方移植代码

## 视觉风格规范（Neo-Brutalist Cartoon）

所有 UI 必须遵守以下视觉语言：

- **底色**：`#FFFFFF` 白
- **文字主色**：`#1A1A1A` 黑
- **边框**：所有卡片/按钮/输入框 `2px solid #1A1A1A`
- **硬阴影**：`boxShadow: '4px 4px 0 #1A1A1A'`（不用模糊阴影）
- **圆角**：卡片 `rounded-2xl` 或 `rounded-[1.5rem]`，按钮 `rounded-full`
- **品牌色板**（hover/强调/区分功能）：
  - 黄 `#F9B801` — 主页/学习
  - 品红 `#F302C9` — 创作/CTA
  - 绿 `#7DC353` — 画廊/疗愈
  - 紫 `#7A51EC` — 了解/品牌
  - 蓝灰 `#7BA7CC` — 报告
  - 黑 `#1A1A1A` — 设置/默认
- **字体**：Geist (latin) + 系统中文字体；标题 `font-weight: 900`，正文 600-800
- **字距**：标题 `letter-spacing: -0.03em`，标签/小字 `letter-spacing: 0.04~0.12em`
- **大写处理**：英文标题/分类 tag 一律 `text-transform: uppercase`

## 项目结构

```
star-bindpaint/
├── CLAUDE.md                ← 本文件
├── ASD_IMPROVEMENT_PLAN.md  ← 孤独症儿童适配规划
├── README.md
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── public/                  ← 静态资源（大师作品图等）
└── src/
    ├── app/                 ← Next.js App Router 页面
    │   ├── layout.tsx       ← 根布局（含 GlobalDock）
    │   ├── page.tsx         ← 首页 (HomePage)
    │   ├── globals.css
    │   ├── onboard/         ← 引导/创作入口
    │   ├── paint/           ← 画板（GlobalDock 在此页隐藏）
    │   ├── create/          ← 自由创作
    │   ├── gallery/         ← 我的画廊
    │   ├── intro/           ← 项目介绍
    │   ├── report/          ← 疗愈报告
    │   ├── settings/        ← 设置
    │   └── api/             ← Server routes
    │       ├── analyze/     ← LLM 行为分析
    │       ├── sd-render/   ← 腾讯混元生图渲染
    │       └── upload/      ← 图片上传
    ├── components/
    │   ├── GlobalDock.tsx   ← 全站底部停靠条
    │   ├── Dock.jsx         ← 停靠条交互（framer-motion magnify）
    │   ├── Ballpit.jsx      ← 首页 3D 彩球氛围背景
    │   ├── PaintCanvas.tsx  ← 画板核心
    │   ├── ToolBar.tsx
    │   ├── EmotionPicker.tsx
    │   ├── MasterBubble.tsx ← 大师对话气泡
    │   ├── Characters.tsx   ← StarChar/FlowerChar/BlobChar 卡通角色
    │   ├── MasterQuoteCard.tsx
    │   ├── ProgressRing.tsx
    │   ├── ModeSelector.tsx
    │   ├── ImageUploader.tsx
    │   ├── SDRenderResult.tsx
    │   ├── CalmBreathing.tsx / CaregiverTips.tsx / SocialStory.tsx / VisualSchedule.tsx / SharedAttention.tsx / FreeModeThemes.tsx / WatchDemo.tsx / StarrySprite.tsx
    │   └── ui/              ← shadcn UI 组件
    ├── contexts/
    │   └── AppContext.tsx   ← 全局状态（情绪/作品等）
    └── lib/
        ├── drawing-engine.ts      ← 多层笔触分解算法
        ├── stroke-engine.ts
        ├── style-transfer.ts      ← 6 种大师风格变换
        ├── feedback-engine.ts
        ├── emotion-detector.ts
        ├── painting-tracker.ts
        ├── master-dialogues.ts    ← 大师对话脚本
        ├── masterworks.ts         ← 大师作品库元数据
        ├── gallery-store.ts
        ├── guide-system.ts
        └── utils.ts
```

## 开发规范

- **分支策略**：直接在 `main` 上提交（小型项目）
- **提交语言**：中文 commit message，前缀使用 `feat:` `fix:` `docs:` `refactor:`
- **测试要求**：当前无自动化测试套件；UI 改动必须本地启动 `npm run dev` 在浏览器实际验证
- **开发端口**：`http://localhost:3001`（3000 常被占用，dev server 自动回退）
- **路由约定**：每页都是 client component（`'use client';` 顶部声明）
- **GlobalDock 隐藏规则**：`pathname?.startsWith('/paint')` 时不渲染，避免遮挡画板
- **API key 管理**：腾讯混元 / 阿里云百炼 等 LLM 凭据放 `.env.local`，绝不提交

## 上下文摘要（截至 2026-05-22）

### 已完成模块
- ✅ 首页 (`/`) — Hero + Ballpit 彩球背景 + 三大特色卡 + 技术栈展示 + 五步流程 + Footer
- ✅ 全站停靠条 `GlobalDock` — 6 个导航项（主页/创作/画廊/了解/报告/设置），鼠标靠近放大并显示标签
- ✅ Dock 视觉适配 — 从原生 macOS 暗色风改为白底+黑边+硬阴影+品牌色 hover
- ✅ 绘画引擎 — 多层笔触分解 + 实时风格化（6 大师风格）
- ✅ LLM 疗愈观察报告 — 接入阿里云百炼
- ✅ 大师对话教育系统（第一人称引导）
- ✅ 大师作品图片库 + 情绪色调选择
- ✅ 腾讯混元 hy-image-v3.0 "变成油画" 一键渲染

### 待办 / 探索方向
- ⏳ 孤独症儿童适配改进（详见 `ASD_IMPROVEMENT_PLAN.md`）
- ⏳ 触屏体验优化
- ⏳ 报告页面排版完善

---

## 工作流规则（项目级强制）

> 以下三条规则在本项目对话中**强制执行**，与 `~/.claude/CLAUDE.md` 全局规则一致，优先级最高。

### 1. 大型任务必须分步沟通

**判断标准**（任一即视为"大型任务"）：
- 预计创建/修改 **5 个以上文件**
- 涉及**多个模块/子系统**联动
- 描述含"整个 / 全部 / 从头 / 完整重构"等词

**执行规则**：
1. 开始前先列出**完整步骤计划**，**等待用户确认后再动手**
2. 每完成一个步骤，**汇报进度并暂停等待确认**，再继续下一步
3. 禁止未经确认连续执行超过一个主步骤
4. 汇报格式：`✅ 步骤 N/M 完成：[做了什么] → 下一步：[要做什么]，是否继续？`

### 2. Compact 失败重试上限

- `/compact` 或上下文压缩失败时，**最多重试 3 次**
- 第 3 次仍失败立即停止，输出：
  > ⛔ Compact 已连续失败 3 次，停止执行。请开启新对话后继续，或手动清理上下文。
- 禁止在 compact 失败后追加内容试图绕过

### 3. 长任务进度汇报（>5 分钟）

预估或实际运行超过 **5 分钟**的任务，必须每完成一个阶段主动汇报：
> 🔄 进度 [N/M]：[当前完成内容] | 耗时约 Xmin | 下一步：[计划]

禁止静默长时间运行。用户可随时输入 `stop` / `暂停` 中断。

---

## 新对话启动 Checklist

每次新对话，Claude 第一步：
1. 读取本 `CLAUDE.md`
2. 若任务涉及绘画引擎/笔触算法 → 同时读 `src/lib/drawing-engine.ts`
3. 若任务涉及孤独症适配 → 同时读 `ASD_IMPROVEMENT_PLAN.md`
4. 不要重新探索目录结构（本文件已列出）
