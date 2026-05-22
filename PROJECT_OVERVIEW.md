# 星绘智愈 Star BindPaint · 完整项目介绍

> **AI 辅助油画教育与艺术疗愈系统**
> 上海交通大学 · 星月绘愈社 · 2026 Light 创造营
> 项目代号：`star-bindpaint`

---

## 目录

1. [一、项目概述](#一项目概述)
2. [二、社会与公益价值](#二社会与公益价值)
3. [三、目标用户与使用场景](#三目标用户与使用场景)
4. [四、产品思路与设计哲学](#四产品思路与设计哲学)
5. [五、技术栈](#五技术栈)
6. [六、整体架构](#六整体架构)
7. [七、功能架构总览](#七功能架构总览)
8. [八、页面与路由](#八页面与路由)
9. [九、核心算法详解](#九核心算法详解)
10. [十、功能模块详解](#十功能模块详解)
11. [十一、ASD 适配设计](#十一asd-适配设计)
12. [十二、完整使用流程](#十二完整使用流程)
13. [十三、API 接口与数据流](#十三api-接口与数据流)
14. [十四、数据持久化策略](#十四数据持久化策略)
15. [十五、视觉与交互语言](#十五视觉与交互语言)
16. [十六、部署与环境变量](#十六部署与环境变量)

---

## 一、项目概述

**星绘智愈（STAR PAINT）** 是面向 **孤独症（ASD）儿童** 的 AI 辅助油画创作与艺术疗愈系统，通过「**从学到创**」的两步递进体验，帮助儿童在艺术创作中获得：

- 🎨 **学习能力的建立** — 临摹大师经典，跟着引导线轻松完成一幅油画
- ✨ **自由表达的勇气** — 自由绘画，每一笔被实时渲染为大师风格
- 💫 **情绪状态的疗愈** — 量化情绪前后变化，由 LLM 生成温暖的观察记录

### 核心价值主张

> 让每个孩子都能用画笔将内心的孤岛连接成星海 —— 艺术不是特权，而是每颗星星与世界沟通的语言。

### 一句话定位

**临摹大师经典画作，或自由画出你想画的 —— AI 实时将每一笔变成油画风格，在创作中感受疗愈。**

---

## 二、社会与公益价值

### 2.1 服务的特殊群体：孤独症谱系儿童

孤独症（自闭症 / ASD）儿童面临的核心困难：

- **社交沟通障碍** — 很难用语言表达内心感受
- **感官过载敏感** — 强烈的色彩、声音、动效易引发焦虑
- **抽象表达困难** — 需要具象、可视化、可预测的引导
- **挫败感低耐受** — 一次画错就可能放弃

艺术疗愈是国际公认的非语言情绪表达通道，但传统艺术疗愈面临两个壁垒：

1. **门槛高** — 真正的油画材料昂贵、需要场地和监护
2. **专业稀缺** — 合格的艺术治疗师极少，覆盖率低

### 2.2 项目的公益贡献

| 维度 | 贡献 |
|---|---|
| **可及性** | 浏览器即开即用，无需下载客户端，零材料成本，让一线城市的优质艺术疗愈方法学到偏远地区 |
| **专业性** | 内置 TEACCH 结构化教学法、ABA 应用行为分析、Carol Gray 社交故事、感觉统合理论的循证设计 |
| **科技平权** | 用 LLM、笔触分解算法替代昂贵的人工治疗师，单次报告成本约 ¥0.05 |
| **数据隐私** | 所有数据本地存储（localStorage），云端可选，绘画记录不被商业化 |
| **开放生态** | MIT 协议开源，特殊教育学校、公益机构可自由部署 |

### 2.3 价值闭环

```
情绪前测  →  创作过程  →  情绪后测  →  AI 观察报告  →  家长/治疗师参考
   ↓            ↓             ↓            ↓
  量化         具象化         量化       温暖、非诊断性
```

---

## 三、目标用户与使用场景

### 3.1 主要用户

- **孤独症谱系（ASD）儿童**（4-12 岁）—— 直接使用者
- **家长 / 监护人** —— 陪同与照护，查看观察报告
- **特殊教育教师 / 艺术治疗师** —— 工具型使用，记录孩子绘画行为
- **社区公益志愿者** —— 在融合教育、暑期营等场景使用

### 3.2 使用场景

- 🏠 家庭中：晚间陪伴亲子时光
- 🏫 特殊教育课堂：作为艺术课、情绪课工具
- 🏥 康复机构：辅助一对一干预
- 🎪 公益夏令营：融合活动中的轻量创作

---

## 四、产品思路与设计哲学

### 4.1 两步递进体验：从学到创

| 阶段 | 模式 | 描述 | 心理学目标 |
|:---:|------|------|------|
| 1️⃣ | **临摹学习** | 选择 6 位大师 30 幅经典画作，AI 把图片拆解为有序笔触序列。"你画 1 笔，AI 补 100 笔"，跟着发光的引导线完成一幅油画 | 建立自信、降低挫败感、提供"成功体验" |
| 2️⃣ | **自由创作** | 选择大师风格，自由画任何想画的内容；每一笔被实时风格化；可一键"变成油画"由 AI 渲染为完整大师级作品 | 自由表达、降低评价焦虑、放大儿童创意 |

### 4.2 五步疗愈流程

```
😊 选心情  →  🎨 选大师/自由  →  ✏️ 陪画/自由画  →  😌 再选心情  →  📋 疗愈报告
```

每一步都对应一个心理学锚点：
- **情绪前测** = 基线量化
- **创作过程** = 数据采集 + 即时反馈
- **情绪后测** = 变化量化
- **观察报告** = 非诊断性记录

### 4.3 三大设计原则

1. **可预测** — 一切动作、声音、视觉变化都有提示，避免突然变化
2. **可逆** — 任何错误都可以"再试一次"或"跳过"，永不卡住
3. **温柔反馈** — 不评判画得"像不像"，只描述行为本身（"你用了蓝色"）

---

## 五、技术栈

### 5.1 前端层

| 层 | 技术 | 版本 | 用途 |
|---|---|---|---|
| 框架 | **Next.js** | 16.2.6 | App Router + 内置 API Routes + Turbopack |
| 渲染 | **React** | 19.2.4 | 客户端组件渲染 |
| 语言 | **TypeScript** | ^5 | 全量类型安全 |
| 样式 | **Tailwind CSS v4** + tw-animate-css | ^4 | 原子化样式 + 安静模式动画切换 |
| 动画 | **framer-motion** | ^12.38.0 | 全站动画主库（Spring/Tween/AnimatePresence） |
| 3D | **three.js** | ^0.167.1 | 首页 Ballpit 彩球氛围背景 |
| 图标 | **lucide-react** | ^1.16.0 | 统一图标系统 |
| UI 套件 | **@base-ui/react** + shadcn | ^1.5 / ^4.8 | Tooltip/Popover/Dialog 等基础组件 |
| 工具 | clsx + tailwind-merge + cva | — | 类名合并 |

### 5.2 后端层（Next.js API Routes，运行于 Vercel Functions）

- `/api/analyze` —— 多模态 LLM 分析（文本 + 图片）
- `/api/sd-render` —— AI 图像生成（变成油画）
- `/api/upload` —— 图片上传（OSS 签名 + 降级 base64）

### 5.3 AI / 大模型

| 服务 | 模型 | 用途 |
|---|---|---|
| **腾讯混元 TokenHub**（主） | hunyuan-vision / hy3-preview | 多模态分析（疗愈观察报告） |
| **腾讯混元生图**（主） | hy-image-v3.0 | "变成油画"图像生成 |
| **阿里云百炼 DashScope**（备） | qwen-vl-plus / qwen-turbo / wanx2.1-imageedit | 降级备份 |

### 5.4 自研算法（纯前端 JavaScript / 零依赖）

| 算法 | 文件 | 来源 |
|---|---|---|
| **多层笔触分解** | `lib/stroke-engine.ts` | Hertzmann 1998《Painterly Rendering with Curved Brush Strokes of Multiple Sizes》(SIGGRAPH) |
| **实时风格化** | `lib/style-transfer.ts` | 自创 6 风格预设系统 |
| **Catmull-Rom 平滑笔迹** | `lib/drawing-engine.ts` | 标准计算几何 |
| **简化 Hausdorff 匹配** | `lib/drawing-engine.ts` | `matchScore()` |
| **情绪状态被动检测** | `lib/emotion-detector.ts` | 行为信号融合 |
| **共同注意问答生成** | `lib/feedback-engine.ts` | ABA 干预 + 颜色心理学 |

### 5.5 存储层

- **localStorage** — 设置、画廊元数据、社交故事已读标记
- **sessionStorage** — 当前 session 状态（情绪/能量/作品/笔触参数）
- **阿里云 OSS**（可选） — 画作图片云端存储（REST API + HMAC-SHA1 签名）

---

## 六、整体架构

```
┌───────────────────────────────────────────────────────────────┐
│                        浏览器（用户终端）                       │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              Next.js App Router (Client)                │  │
│  │  ┌────────────────────────────────────────────────────┐ │  │
│  │  │   /  → /onboard → /create → /paint → /report      │ │  │
│  │  │      ↓                                              │ │  │
│  │  │   AppContext (全局状态)                             │ │  │
│  │  │      ↓                                              │ │  │
│  │  │   核心库 (lib/)                                     │ │  │
│  │  │   ├─ stroke-engine    多层笔触分解                  │ │  │
│  │  │   ├─ drawing-engine   pointer→Canvas 笔迹          │ │  │
│  │  │   ├─ style-transfer   6 风格实时变换               │ │  │
│  │  │   ├─ guide-system     引导状态机                   │ │  │
│  │  │   ├─ painting-tracker 行为数据采集                 │ │  │
│  │  │   ├─ emotion-detector 情绪被动检测                 │ │  │
│  │  │   └─ feedback-engine  反馈/共同注意生成            │ │  │
│  │  └────────────────────────────────────────────────────┘ │  │
│  └────────────────────────┬────────────────────────────────┘  │
└────────────────────────────│────────────────────────────────────┘
                             │  (HTTPS)
                             ▼
┌───────────────────────────────────────────────────────────────┐
│                Next.js API Routes (Vercel Functions)           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐    │
│  │ /api/analyze │  │/api/sd-render│  │  /api/upload     │    │
│  │  (LLM 报告)  │  │ (变成油画)   │  │  (OSS 上传)      │    │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘    │
└─────────┼──────────────────┼──────────────────┼───────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
   ┌──────────────┐    ┌──────────────┐   ┌──────────────┐
   │ 腾讯混元 LLM  │    │腾讯混元生图  │   │ 阿里云 OSS   │
   │ DashScope(备)│    │DashScope(备) │   │  (画作图片)  │
   └──────────────┘    └──────────────┘   └──────────────┘
```

### 关键设计决策

1. **客户端为主** — 所有重计算（笔触分解、风格化、绘画判定）都在浏览器，零后端成本
2. **LLM 仅在闭环点使用** — 只在生成观察报告 + 变成油画时调用，单次成本极低
3. **三层降级链** —
   - LLM：腾讯混元 → 阿里云百炼 → 错误提示
   - 图片：OSS → base64 → localStorage
   - 离线：localStorage 永久缓存最近 50 幅画

---

## 七、功能架构总览

```
星绘智愈
├── 🏠 首页（/）— Hero + 3D 彩球 + 五步流程展示
│
├── 🌟 入门引导（/onboard）— 三步引导
│   ├── 欢迎页（角色介绍）
│   ├── 情绪前测（4 选 1）
│   └── 能量选择（小/中/大 → 决定笔触数量与粗糙度）
│   └── 首次进入：6 页社交故事
│
├── 🎨 创作选择（/create）— 三种来源
│   ├── 大师作品库（6 位 × 5 幅 = 30 幅）
│   ├── 上传图片（自有照片 / 简笔画）
│   └── 自由创作（选风格直接画）
│   ├── 情绪色调选择（5 种）
│   └── 笔画大小调节（4 档）
│
├── ✏️ 画板（/paint）— 三层 Canvas 核心
│   ├── 模式切换：跟画 / 自动观看 / 自由
│   ├── 引导线 + 笔迹判定（assist/real）
│   ├── 实时风格化（6 大师风格）
│   ├── 共同注意问答
│   ├── 平静呼吸触发（情绪检测）
│   ├── 自由模式 5 主题分步引导
│   ├── "变成油画"一键 AI 渲染
│   └── 完成 → 情绪后测
│
├── 📋 报告（/report）— LLM 观察记录
│   ├── 画作预览
│   ├── 情绪变化卡片（前→后）
│   ├── Starry 的观察（LLM 生成）
│   └── 数据摘要（完成度/笔触数）
│
├── 🖼️ 画廊（/gallery）— 历史作品
│   ├── 网格展示（最多 50 幅）
│   ├── 点击查看大图
│   ├── 下载 / 删除 / 清空
│   └── OSS URL（如配置）/ base64 降级
│
├── ⚙️ 设置（/settings）— 家长/治疗师面板
│   ├── 安静模式开关
│   ├── 难度档位（1/2/3）
│   ├── 先看后做开关
│   └── 孩子昵称
│
└── 📖 介绍（/intro）— 项目说明页
```

---

## 八、页面与路由

| 路径 | 页面名 | 主要职责 | 关键状态/存储 |
|---|---|---|---|
| `/` | HomePage | 营销首页：3D 彩球 + 三大特色 + 五步流程 + Footer | — |
| `/onboard` | OnboardPage | 三步引导：欢迎 → 情绪前测 → 能量选择 | `sessionStorage`：emotion-before, roughness, max-strokes |
| `/create` | CreatePage | 选画家/作品 / 上传 / 自由创作 + 情绪色调 + 笔画粗细 | `sessionStorage`：source, master, mood, free-style |
| `/paint` | PaintPage | 核心画板：临摹 / 自由 + 风格化 + 变成油画 + 完成 | `sessionStorage`：prompt, session, emotion-after |
| `/report` | ReportPage | LLM 观察报告 + 情绪变化可视化 + 数据摘要 | 读取 prompt + session |
| `/gallery` | GalleryPage | 画廊（最多 50 幅）+ 下载/删除 | `localStorage`：gallery |
| `/settings` | SettingsPage | 安静模式 / 难度 / 先看后做 / 孩子昵称 | `localStorage`：settings |
| `/intro` | IntroPage | 项目介绍页 | — |

### 全站 Dock（GlobalDock）

底部停靠条 6 项：主页 / 创作 / 画廊 / 了解 / 报告 / 设置
- framer-motion 鼠标靠近放大动效
- `pathname?.startsWith('/paint')` 时自动隐藏（避免遮挡画板）

---

## 九、核心算法详解

### 9.1 多层笔触分解（Hertzmann 1998）

文件：`src/lib/stroke-engine.ts`

**输入**：原图 ImageData + 风格参数（roughness 1-4, maxStrokes, brushSizes）
**输出**：`Stroke[]` — 一组从粗到细的有序笔触

#### 步骤拆解

```
┌─────────────────────────────────────────────┐
│ 1. 多尺度循环（粗 → 细）                     │
│    for size in [Rmax, Rmax/2, Rmax/4, ...] │
│       └─ 每个尺度单独绘制一层                │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 2. 高斯模糊参考图                           │
│    σ = brushSize × blurFactor               │
│    可分离卷积（先 X 后 Y），降低复杂度      │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 3. 网格采样找最大误差点                     │
│    grid = brushSize / 2                     │
│    每个网格单元里找：                       │
│      |当前画布 - 参考图| 最大的像素         │
│    若误差 > threshold 则在此处下笔          │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 4. Sobel 梯度 → 沿等值线延伸                │
│    Gx, Gy = Sobel(参考图)                   │
│    法向 (Gx, Gy) → 旋转 90° 得切向          │
│    沿切向逐步延伸控制点（最多 maxLen 步）  │
│    停止条件：颜色偏离原参考色 > colorBudget│
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 5. Catmull-Rom 平滑控制点                   │
│    生成连续曲线笔触                         │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 6. 应用情绪色调                             │
│    warm   → R+10 G+5  B-10                  │
│    calm   → R-15 G-5  B+5                   │
│    vivid  → 饱和度 ×1.4                     │
│    dreamy → 提亮 + 蓝色滤镜                 │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 7. 输出 Stroke[]，按顺序传给画板            │
└─────────────────────────────────────────────┘
```

#### roughness 档位映射

| roughness | 层数 | 起始 brushSize | maxStrokes 默认 | 适合人群 |
|---|---|---|---|---|
| 4 | 2 层 | 32px | 25 | 小幼儿 / 安静模式 |
| 3 | 3 层 | 24px | 50 | 大多数儿童 |
| 2 | 4 层 | 16px | 80 | 进阶 |
| 1 | 5 层 | 8px | 200 | 老用户 / 高难度 |

**核心创新**：传统 Hertzmann 输出像素级油画，本项目改为输出**有序笔触序列**（控制点 + 参考色）传给前端引导系统，使儿童可以"跟画"而非"看图"。

### 9.2 实时风格化（6 大师风格）

文件：`src/lib/style-transfer.ts`

#### 风格参数表（核心字段）

| 风格 | widthCurve | widthBase | colorJitter | strokeSplit | texture |
|---|---|---|---|---|---|
| **monet** | taper（两端细） | 6px | 8 | 1 | smooth |
| **vangogh** | bulge（中间粗） | 8px | 15 | 1 | thick |
| **gauguin** | uniform（均匀粗） | 10px | 5 | 1 | smooth |
| **rembrandt** | pressure（压感） | 5px | 3 | 1 | dry |
| **picasso** | uniform | 5px | 20 | 2（拆两笔） | broken |
| **sargent** | taper（轻盈） | 7px | 6 | 1 | smooth |

#### `stylizeStroke()` 流程

```
原始 Stroke (控制点)
  ↓
路径重采样（间距 ~3-5px）
  ↓
笔触分割（picasso 拆 2 笔）
  ↓
逐点宽度计算（widthCurve）
  ↓
颜色 HSV 抖动（colorJitter）
  ↓
边缘粗糙度（roughness 抖动控制点 ±N）
  ↓
绘制到 Canvas（globalCompositeOperation = 'source-over'）
```

### 9.3 笔迹匹配（matchScore）

文件：`src/lib/drawing-engine.ts`

简化版 Hausdorff 距离：

```ts
matchScore(userPath, referencePath) {
  let totalDist = 0;
  for (point of userPath) {
    minDist = min over referencePath of |point - rp|;
    totalDist += min(minDist, 80);  // 80px 截断
  }
  avgDist = totalDist / userPath.length;
  return 1 - (avgDist / 80);  // 0-1，越大越准
}
```

- 阈值：`score > 0.3` 通过引导
- assist 模式：用户画完后笔迹被替换成引导线
- real 模式：保留用户原笔迹

### 9.4 防飞线策略

```ts
// 单帧跳跃 > 80px → 视为异常（手指离开屏幕）
if (dist > 80) return;
// 连续两点距离 < 0.5px → 同一像素重复
if (dist < 0.5) return;
// 仅响应主指针（多指触屏）
if (!event.isPrimary) return;
// 启用 setPointerCapture 锁定笔迹
canvas.setPointerCapture(pointerId);
```

### 9.5 情绪状态被动检测

文件：`src/lib/emotion-detector.ts`

**信号融合**：

| 信号 | 阈值 | 触发等级 |
|---|---|---|
| 连续笔触失败 | ≥ 3 / ≥ 6 | mild / moderate |
| 连续跳过 | ≥ 5 | moderate |
| 平均压力 | > 0.8 | mild |
| 绘制速度 | > 200 点/秒（乱划） | moderate |
| 拍打行为 | ≥ 5 次/2 秒 | moderate |
| 长时间不动 | > 5 分钟 | moderate |
| 不动 + 连续失败 | > 6 分钟 | severe |

**冷却**：触发后 5 分钟内不再升级，避免反复打断。

### 9.6 共同注意问答生成

文件：`src/lib/feedback-engine.ts`

随机从三类生成：
- **颜色识别**："这里用了什么颜色？" → 选项=主色板
- **位置判断**："这一笔在画的哪一边？" → 上/下/左/右/中
- **情感联想**："这个颜色让你想到什么心情？" → 4 种情绪

每完成 3-5 笔触发 1 次，用于 ABA 干预 + 注意力锚定。

---

## 十、功能模块详解

### 10.1 PaintCanvas（画板核心）

文件：`src/components/PaintCanvas.tsx`

**三层 Canvas 架构**：

```
┌──────────────────────────────┐
│ 顶层：用户笔迹（pointer 实时） │  ← drawing-engine.ts 控制
├──────────────────────────────┤
│ 中层：引导线（紫色虚线）       │  ← stroke-engine 输出渲染
├──────────────────────────────┤
│ 底层：已完成笔触              │  ← style-transfer 风格化结果
└──────────────────────────────┘
```

**职责**：
- 接收 pointer 事件 → drawingEngine
- 订阅 guideSystem 状态变化（current stroke / phase）
- 渲染当前引导线 + 起点终点标记
- 完成判定 → painting-tracker 记录

### 10.2 GuideSystem（引导状态机）

文件：`src/lib/guide-system.ts`

**状态**：
- `assist`（辅助）— 用户画完匹配通过后，自动替换为引导线，画面更"标准"
- `real`（真实）— 保留用户原笔迹，画面更"个性"

**转换流程**：

```
笔触 i → 等待用户绘制
     ↓ user draws
     ↓ matchScore 计算
     ├─ score > 0.3：通过 → 800ms 延迟（看动画） → 进入 i+1
     └─ score ≤ 0.3：reportFailure → 弹出鼓励 → 重画
```

支持 `subscribe(callback)` 模式让 UI 响应状态变化。

### 10.3 PaintingTracker（行为数据采集）

文件：`src/lib/painting-tracker.ts`

**StrokeRecord 字段**：
- `index` 第几笔
- `skipped` 是否跳过
- `waitTimeMs` 进入此笔到落笔的等待时间
- `drawDurationMs` 绘制持续时间
- `color` 笔触颜色
- `region` 画面九宫格位置
- `matchScore` 0-1

**PaintingSession 字段**：
- `masterwork` / `mood` / `mode`
- `emotionBefore` / `emotionAfter`
- `calmTriggered` 是否触发过呼吸
- `sharedAttentionResponses` 共同注意问答记录
- `strokes` StrokeRecord[]
- `finalImageBase64` 最终画作

**派生分析**：
- `getCompletionRate()` 完成率
- `getAverageWaitTime()` / `getAverageMatchScore()`
- `getColorDistribution()` 颜色使用分布
- `getSkippedRegionAnalysis()` 跳过的区域分析
- `getFocusRegion()` 注意力聚焦区域
- `getStrokeRhythm()` 笔触节奏（快/稳/慢）
- `buildAnalysisPrompt()` 拼装给 LLM 的完整 prompt

### 10.4 FreeModeThemes（自由模式 5 主题）

文件：`src/components/FreeModeThemes.tsx`

| 主题 | 步数 | SD prompt（变成油画时使用） |
|---|---|---|
| 🌤️ 画出今天的天气 | 4 | sun, clouds, sky, children style |
| 🎨 用颜色画出心情 | 4 | abstract emotional artwork |
| 🏠 画一个安全的地方 | 4 | cozy safe house with garden |
| 〰️ 画一条慢慢走的线 | 3 | winding path through meadow |
| 🪐 画一个保护你的小星球 | 4 | small magical planet, little prince style |

每步显示一个图标 + 中文 hint，点"下一步"递进，最后一步变绿"画好了 ✓" → 触发 handleExport。
**ThemeStepGuide** 卡片支持鼠标悬停 3D 倾斜（rotateX/rotateY ±10°，spring 缓动）。

### 10.5 SharedAttention（共同注意）

文件：`src/components/SharedAttention.tsx`

每完成 N 笔弹出一次问答 → 记录答案到 PaintingTracker → 用于 LLM 报告分析专注力与情感参与。

### 10.6 CalmBreathing（平静呼吸）

文件：`src/components/CalmBreathing.tsx`

情绪检测触发 moderate/severe 时自动弹出：
- 4-7-8 呼吸法（吸 4s / 屏 7s / 呼 8s）
- 圆形脉动动画
- 关闭后冷却 5 分钟

### 10.7 SocialStory（社交故事）

文件：`src/components/SocialStory.tsx`

首次进入时展示 6 页社交故事（Carol Gray 方法），向儿童解释"画画时会发生什么 / 我可以怎么做 / 不喜欢可以暂停"。已读标记存 localStorage。

### 10.8 WatchDemo（先看后做）

文件：`src/components/WatchDemo.tsx`

设置开启时：每个新笔触先自动播放一遍引导线动画（Visual Modeling 干预策略），再让儿童跟画。

### 10.9 CaregiverTips（照护者提示）

文件：`src/components/CaregiverTips.tsx`

侧边小卡片，给陪伴的家长/治疗师提示当前状态：
- "孩子已专注 5 分钟，可以鼓励"
- "刚才有挫折信号，建议靠近"
- "这一段画得很好"

### 10.10 SDRenderResult（变成油画结果）

文件：`src/components/SDRenderResult.tsx`

调用 `/api/sd-render`：
- 输入：当前画作 base64 + 风格 ID
- 输出：AI 渲染油画 + 下载/重试/保存按钮
- 加载态：进度条 + 风趣文案（"星宝在调色…"）

### 10.11 EmotionPicker（情绪选择器）

文件：`src/components/EmotionPicker.tsx`

4 选 1：😊 开心 / 😌 平静 / 😢 难过 / 😣 焦虑
- 大按钮 + 表情大字 + 文字标签
- 选中后下边框高亮品牌色

### 10.12 MasterBubble & MasterQuoteCard（大师对话）

文件：`src/components/MasterBubble.tsx` / `MasterQuoteCard.tsx`

对应 `lib/master-dialogues.ts` 数据：
- 进入画家页：随机 greetings
- hover 作品：work_id 对应的 workStories
- 完成画作：encouragements
- 报告页底部：quote 名言

第一人称语气（"我是莫奈，今天我想和你一起画…"），增强情感联结。

### 10.13 GlobalDock（全站停靠条）

文件：`src/components/GlobalDock.tsx` / `Dock.jsx`

- 6 项：主页 / 创作 / 画廊 / 了解 / 报告 / 设置
- framer-motion `useMotionValue` + `useTransform` 鼠标距离 → scale
- 鼠标靠近放大并显示中文标签
- 视觉：白底 + 2px 黑边 + 4px 硬阴影 + 品牌色 hover
- `pathname?.startsWith('/paint')` 时不渲染

### 10.14 TiltedCard（首页特色卡）

首页三大特色卡片支持鼠标位置 3D 倾斜，提升营销页质感。

---

## 十一、ASD 适配设计（11 项）

| # | 适配项 | 实现位置 | 干预理论 |
|---|---|---|---|
| 1 | **安静模式** | `AppSettings.calmMode` | 感觉统合（去除背景音/动效） |
| 2 | **分层难度（1/2/3）** | `roughness` + `maxStrokes` 映射 | 最近发展区（ZPD） |
| 3 | **视觉时间表** | `/onboard` 三步 stepper | TEACCH 结构化教学 |
| 4 | **先看后做** | `WatchDemo` 组件 | Visual Modeling |
| 5 | **情绪被动检测** | `EmotionDetector` | 行为信号融合 |
| 6 | **社交故事** | `SocialStory` 6 页 | Carol Gray 1991 |
| 7 | **照护者提示** | `CaregiverTips` 侧栏 | Co-regulation |
| 8 | **情绪前后测** | `EmotionPicker` × 2 | 简易疗效自评 |
| 9 | **主题引导（自由模式）** | `FreeModeThemes` 5 主题 | 降低开放任务焦虑 |
| 10 | **共同注意问答** | `SharedAttention` | ABA 离散试验 |
| 11 | **童趣按钮 + 表情** | 全站 Neo-Brutalist 视觉 | 视觉清晰度 + 触觉反馈 |

详情见 `ASD_IMPROVEMENT_PLAN.md`。

---

## 十二、完整使用流程

### 12.1 首次用户路径

```
打开网站
  ↓
[/]  首页 — Hero + 3D 彩球
  ↓ 点击"开始体验"
  ↓
[/onboard]  欢迎页（社交故事 6 页可选）
  ↓
情绪前测（4 选 1）
  ↓
能量选择（小🌱 / 中🌿 / 大🌳）
  ↓
[/create]  选择创作来源
  ├─ 大师作品（30 幅）→ 选画家 → 选作品 → 情绪色调 → 笔画大小
  ├─ 上传图片 → 处理 → 情绪色调 → 笔画大小
  └─ 自由创作 → 选大师风格
  ↓
[/paint]  画板
  ├─ （可选）观看示范
  ├─ 跟画引导线（assist/real 切换）
  ├─ 每 3-5 笔触 共同注意问答
  ├─ （触发）平静呼吸
  ├─ （自由模式）5 主题分步
  ├─ "变成油画" — 一键 AI 渲染
  └─ 完成 → 情绪后测
  ↓
[/report]  Starry 的观察
  ├─ 画作预览 + 情绪变化
  ├─ LLM 生成观察文字
  └─ 数据摘要 + 免责声明
  ↓
[/gallery]  自动入库
```

### 12.2 老用户路径

直接 `/create` → `/paint` → `/report`（跳过引导）

### 12.3 异常路径

- **情绪检测触发** → 自动弹出 CalmBreathing → 关闭后继续
- **连续失败** → MasterBubble 鼓励气泡
- **网络断开** → /api/sd-render 失败 → 仍可保存原始画作到画廊
- **OSS 未配置** → /api/upload 降级返回 base64 → 画廊正常显示

---

## 十三、API 接口与数据流

### 13.1 POST `/api/analyze` — LLM 观察报告

```
Request:
{
  imageBase64: "data:image/png;base64,...",
  prompt: "完整的 PaintingTracker buildAnalysisPrompt 输出"
}

主流程：腾讯混元
  → POST https://api.hunyuan.cloud.tencent.com/v1/chat/completions
  → model: "hunyuan-vision" 或 "hy3-preview"
  → OpenAI 兼容多模态 messages

降级：阿里云百炼
  → POST https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
  → model: "qwen-vl-plus" → 失败再降 "qwen-turbo"

Response:
{
  observation: "Starry 观察到孩子今天用了很多温暖的黄色...",
  source: "hunyuan" | "dashscope"
}
```

### 13.2 POST `/api/sd-render` — 变成油画

```
Request:
{
  imageBase64: "...",
  styleId: "monet" | "vangogh" | ...
}

主流程：腾讯混元生图（异步）
  → POST .../image_generation
  → model: "hy-image-v3.0"
  → 返回 task_id
  → 轮询 task status（最多 60s，间隔 2s）
  → completed → 返回图片 URL

降级：DashScope wanx2.1-imageedit
  → function: "stylization_all" 或 "doodle"
  → 返回 OSS 临时 URL

Response:
{
  imageUrl: "https://...",
  source: "hunyuan" | "dashscope"
}
```

### 13.3 POST `/api/upload` — 画廊图片上传

```
Request:
{
  imageBase64: "...",
  fileName: "uuid.png"
}

主流程：阿里云 OSS REST API
  → 路径：gallery/YYYY-MM-DD/{id}.{ext}
  → HMAC-SHA1 签名（OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET）
  → PUT object → 返回签名 URL（1 年有效期）

降级：未配置 OSS → 直接返回原 base64

Response:
{
  url: "https://oss.../...?...signature=...",
  type: "oss" | "base64"
}
```

---

## 十四、数据持久化策略

### 14.1 localStorage（跨会话持久）

| 键 | 内容 | 写入时机 |
|---|---|---|
| `app-settings` | calmMode / difficulty / watchBeforeDo / childName | 设置页修改 |
| `gallery-items` | GalleryItem[]（最多 50 条 LRU） | 每次完成画作 |
| `social-story-read` | true/false | 首次社交故事关闭 |

### 14.2 sessionStorage（当前会话）

| 键 | 内容 | 写入时机 |
|---|---|---|
| `emotion-before` | "happy"/"calm"/"sad"/"anxious" | onboard 情绪前测 |
| `emotion-after` | 同上 | paint 完成 |
| `roughness` | 1-4 | onboard 能量选择 |
| `max-strokes` | 25/80/200 | onboard 能量选择 |
| `source-mode` | "masters"/"upload"/"free" | create 选择 |
| `selected-master` | masterId | create 选画家 |
| `selected-work` | workId | create 选作品 |
| `selected-mood` | "warm"/... | create 情绪色调 |
| `brush-size` | "tiny"/"small"/"medium"/"large" | create 笔画大小 |
| `painting-session` | PaintingSession JSON | paint 完成 |

### 14.3 阿里云 OSS（云端可选）

```
oss-bucket/
└── gallery/
    └── 2026-05-22/
        ├── uuid1.png
        ├── uuid2.png
        └── ...
```

未配置环境变量则全部降级 base64 存 localStorage。

---

## 十五、视觉与交互语言（Neo-Brutalist Cartoon）

### 15.1 颜色系统

| 角色 | 色值 | 用途 |
|---|---|---|
| 黄 | `#F9B801` | 主页 / 学习 / 跟画模式 |
| 品红 | `#F302C9` | 创作 / CTA / 自动模式 |
| 绿 | `#7DC353` | 画廊 / 疗愈 / 自由模式 |
| 紫 | `#7A51EC` | 了解 / 品牌 / 引导线 |
| 蓝灰 | `#7BA7CC` | 报告 |
| 黑 | `#1A1A1A` | 文字 / 边框 / 默认 |
| 白 | `#FFFFFF` | 底色 |

### 15.2 边框 & 阴影规则

- 所有卡片/按钮/输入框：`border: 2px solid #1A1A1A`
- 硬阴影：`box-shadow: 4px 4px 0 #1A1A1A`（不使用模糊阴影）
- hover：偏移阴影抬升 + 缩放 1.02-1.05
- active：缩放 0.95-0.98

### 15.3 圆角 & 形状

- 卡片：`rounded-2xl` 或 `rounded-[1.5rem]`
- 按钮：`rounded-full`
- 输入框：`rounded-xl`

### 15.4 字体规范

- 字体族：Geist（latin） + 系统中文
- 标题 `font-weight: 900` + `letter-spacing: -0.03em`
- 正文 `font-weight: 600-800`
- 标签/小字 `letter-spacing: 0.04~0.12em` + `text-transform: uppercase`（英文）

### 15.5 动画规范

- 入场：`opacity 0 → 1`, `y +16 → 0`，spring 缓动
- 悬停：scale 1.02-1.05，spring stiffness 280, damping 24
- 倾斜（重要卡片）：rotateX/rotateY ±10°，使用 useSpring
- 转场：framer-motion AnimatePresence，timing 220-280ms

---

## 十六、部署与环境变量

### 16.1 部署平台

- **Vercel**（推荐）— Next.js 16 原生支持 + Edge Functions
- 构建命令：`npm run build`
- 启动命令：`npm start`
- Node：20+ 推荐

### 16.2 环境变量（`.env.local` / Vercel Settings）

```env
# ── LLM 主链路：腾讯混元 ──
HUNYUAN_API_KEY=sk-xxx
HUNYUAN_API_BASE=https://api.hunyuan.cloud.tencent.com/v1

# ── LLM 降级：阿里云百炼 (DashScope) ──
DASHSCOPE_API_KEY=sk-xxx
DASHSCOPE_API_BASE=https://dashscope.aliyuncs.com/compatible-mode/v1

# ── 阿里云 OSS（画廊云端存储，可选） ──
OSS_REGION=oss-cn-hangzhou
OSS_BUCKET=star-bindpaint
OSS_ACCESS_KEY_ID=LTAIxxx
OSS_ACCESS_KEY_SECRET=xxx
```

### 16.3 本地开发

```bash
npm install
npm run dev
# → http://localhost:3001
```

### 16.4 数据安全

- 画作不上传至 LLM 时不出域（仅 base64 在浏览器内）
- 所有 API key 仅服务端使用，前端永远不接触
- localStorage / sessionStorage 仅当前域名，无跨域风险
- OSS 签名 URL 有效期 1 年，超期需重新生成

---

## 后记

**星绘智愈** 是上海交通大学 · 星月绘愈社 在 **2026 Light 创造营** 的开源公益项目。
我们相信：**艺术不是要画得像，而是要被看见**。

每一笔，都是孩子在跟世界打招呼；
每一幅画，都是 Starry 和孩子的一次合作。

如果你愿意一起把这件事做下去，欢迎 issue / PR / 合作。

— 星月绘愈社 · 2026
