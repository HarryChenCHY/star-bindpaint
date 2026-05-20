# SD 实时渲染功能 — 需求与实现步骤

## 分歧分析

**Harry（合作者）的观点：**
- 草图转成图和孤独症儿童关系不大
- 外界更欣赏孤独症儿童自己的创作 + 教学引导
- 对 AI 画出来的优化成果不一定看重
- 这个功能业内很常见（ComfyUI + PS 已有）
- 不算王炸

**你的观点：**
- 评委不是孤独症儿童，只能从视觉效果出发
- 后者（SD 渲染）一眼震撼评委，2万和10万的差别
- 前者故事已经讲得很好了，但缺王炸视觉效果

**Harry 态度：**
- "做是可以做"
- "接 API 不难的"
- "调用一次按次付费，也可以购买积分调用便宜的图像模型"

## 我的判断

**两人都对，但解决方案不是二选一。**

Harry 的担心是合理的：单纯的"草图变油画"确实不是针对 ASD 的创新，ComfyUI 早就有了。
但你的判断也对：评委是普通人，视觉冲击力决定第一印象。

**关键洞察：把 SD 渲染包装成"疗愈成果展示"而非"技术炫技"。**

叙事话术：
- ❌ "我们接了个 SD 把画变好看了"（这确实没创新）
- ✅ "孩子的每一笔都被珍视——系统将 ta 的自由表达升华为大师级作品，建立成就感与自信"

这样 SD 渲染不是功能本身，而是**疗愈闭环的最后一环**：
```
孩子画简笔画（自由表达情绪）
    → AI 理解并升华为油画（被看见、被珍视）
    → 孩子看到自己的画变成了"大师作品"（成就感、自信心）
    → 疗愈效果量化记录在报告中
```

## 结论：做，但要包装对

- 技术实现上用 API（Harry 同意，且不难）
- 产品定位上强调"孩子的创作被 AI 升华"而非"AI 帮你画得更好"
- 前端展示做成"🌟 你的画太棒了！看 Starry 把它变成了什么→" 的惊喜时刻
- 和现有的情绪前后测 + 疗愈报告形成闭环

---

## 实现方案

### 架构（三层降级）

```
优先级 1: 本地 SD（localhost:7860）→ 0.3s 延迟（答辩用）
优先级 2: 云端 GPU（SD API）→ 1-2s 延迟（有预算时）
优先级 3: 通义万相 API（DashScope）→ 3-5s 延迟（零成本兜底）
```

前端代码完全一样，只通过环境变量切换后端：
```env
# .env.local（答辩时）
SD_ENDPOINT=http://localhost:7860/sdapi/v1/img2img

# Vercel 环境变量（线上）
SD_ENDPOINT=https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis
```

### 实现步骤

#### Step 1: 新建 API Route `/api/sd-render`

```typescript
// src/app/api/sd-render/route.ts
POST body: { imageBase64, style: 'monet'|'vangogh'|..., prompt?: string }
Response: { imageBase64: string, model: string }

逻辑：
1. 检测 SD_ENDPOINT 环境变量
2. 如果是本地 SD → 调用 A1111/ComfyUI img2img API
3. 如果是 DashScope → 调用通义万相 image2image
4. 返回渲染后的图片
```

#### Step 2: 前端 — "✨ 变成油画" 按钮

位置：自由创作模式的画布页面侧边栏

```
用户画完若干笔 → 点击"✨ 变成油画"
→ Canvas 截图 → 发送到 /api/sd-render
→ Loading 动画："Starry 正在施魔法..."
→ 返回后显示 before/after 对比
→ 可选"保存这个版本"或"继续画"
```

#### Step 3: 对比展示 UI

```
┌─────────────────────────────────────┐
│  你的画          ✨ Starry 的魔法   │
│ ┌──────────┐    ┌──────────┐        │
│ │  简笔画  │ →  │  油画版  │        │
│ └──────────┘    └──────────┘        │
│                                      │
│  [继续画]    [放进画廊]              │
└─────────────────────────────────────┘
```

#### Step 4: 本地 SD 服务器配置（答辩用）

**推荐配置：**
- stable-diffusion-webui (A1111) + API 模式
- 模型：SDXL-Turbo 或 RealVisXL + LCM-LoRA
- ControlNet：scribble 或 lineart（保持简笔画结构）
- 启动命令：`./webui.sh --api --xformers --opt-sdp-attention`

**img2img 参数：**
```json
{
  "init_images": ["base64..."],
  "prompt": "oil painting in the style of Monet, impressionism, soft light",
  "negative_prompt": "ugly, blurry, text",
  "steps": 4,
  "cfg_scale": 1.5,
  "denoising_strength": 0.65,
  "width": 512,
  "height": 512,
  "sampler_name": "LCM"
}
```

#### Step 5: 通义万相 API 兜底（线上用）

使用已有的 DashScope API Key，调用图像生成接口：
```
POST https://dashscope.aliyuncs.com/api/v1/services/aigc/image2image/image-synthesis
model: wanx-style-repaint-v1（风格重绘）
```

---

## 文件清单

```
新建：
  src/app/api/sd-render/route.ts    — SD 渲染 API（多后端适配）
  src/components/SDRenderResult.tsx  — Before/After 对比展示
  docs/sd-render.md                 — 本文件

修改：
  src/app/paint/page.tsx            — 添加"变成油画"按钮 + 触发逻辑
  .env.local                        — 添加 SD_ENDPOINT 变量
```

## 时间估算

| 步骤 | 工时 |
|------|------|
| API Route + 通义万相对接 | 2h |
| 前端按钮 + Loading + 对比 UI | 2h |
| 本地 SD 调试（答辩前）| 1-2h |
| **总计** | **半天** |

## 风险

1. 通义万相 image2image 接口可能和预期效果有差距 → 备选：Replicate API (SDXL-Lightning)
2. 本地 SD 需要队友有 GPU 电脑 → 答辩时谁的电脑跑？
3. 延迟 3-5s 用户体验一般 → 用精美 Loading 动画 + 精灵对话缓解
