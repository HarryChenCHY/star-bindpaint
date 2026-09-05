# 星迹智绘 StarTrace

> 项目级协作上下文。每次新对话先读取本文件。

## 项目定位

星迹智绘是面向零基础绘画者的研究型 AI 辅助绘画应用。已有笔触拆解算法把参考图转化为有序“星迹笔触”，产品通过绘画星点、月亮伙伴、每日星愿和作品星图降低第一笔门槛，并记录真实动笔与持续练习。

- 一句话：沿着星迹，一笔一笔画出自己的世界。
- 目标：研究有序笔触拆解与渐进提示对首次动笔、单次完成和 7—14 天练习频次的影响。
- 边界：面向一般零基础绘画者，不按疾病、年龄或教育阶段限定；不提供医疗、心理、人格或天赋结论；不在产品界面展示活动、院校、供应商或团队背书。
- 工作目录：`E:\star-bindpaint`

## 技术栈与关键模块

- Next.js 16 App Router、React 19、TypeScript、Tailwind CSS 4、framer-motion。
- `src/lib/stroke-engine.ts`：图像笔触拆解和顺序规划。
- `src/lib/guide-system.ts`：星迹进度、判定和提示状态。
- `src/components/PaintCanvas.tsx`：画布、亲手笔迹和自动笔触。
- `src/app/paint/page.tsx`：画板主流程。
- `src/lib/painting-tracker.ts`：本地会话指标。
- `src/lib/learning-feedback.ts`：确定性学习反馈。
- `src/lib/practice-store.ts`：本地练习频次。
- `src/lib/privacy-settings.ts`：研究同意、匿名编号与删除。
- `src/app/api/analytics/*`：白名单研究数据与受保护后台。

项目同时安装 `framer-motion` 与 `motion`；自写代码统一使用 `framer-motion`。

## 视觉语言

- Neo-Brutalist Cartoon：白/浅灰底、深蓝黑 `#17233F` 描边、硬阴影、较大圆角。
- 主色：星光黄 `#FFD166`、星迹紫 `#6558D9`、薄荷绿 `#69D2C2`、星云粉 `#FF8FAB`、浅紫 `#ECEAFE`。
- 所有主流程视觉围绕星点、星迹、月亮伙伴、星愿、星图与点亮星星。
- 移动端必须保持 390px 视口无横向溢出；底部 Dock 不得遮住页面最后一项内容。

## 数据与研究边界

- 匿名研究数据和作品云保存默认关闭并分别授权。
- 默认研究记录不得包含姓名、原图、作品图片、云路径、逐笔坐标或颜色。
- 内容覆盖率不等于学习效果；自动笔触不等于真实动笔；匹配分数不作为能力评分。
- 正式研究条件由研究者分配；自然使用数据保持 `studyCondition: unassigned`。
- 研究后台必须配置 `ANALYTICS_ADMIN_TOKEN`，不得在客户端、日志或文档中写入真实口令。
- 所有凭据只来自本地或部署平台环境变量，绝不提交到 Git。

## 代码风格

- 2 空格缩进；TS/JS 单引号，JSX 属性双引号。
- 路径别名 `@/*` 指向 `./src/*`。
- App Router 客户端组件在文件顶部声明 `'use client';`。
- 优先使用 Tailwind utility；复杂品牌样式可用 inline style。
- 只为不明显的设计原因写简短中文注释。
- 搜索优先使用 `rg`；本地文件修改使用 `apply_patch`。
- 保留用户已有改动和 `conversation-export.json`，不要清理无关文件。

## 本地预览与发布

- 本地地址：`http://localhost:3001`。
- 验收顺序：TypeScript → ESLint → production build → 桌面/390px 浏览器检查 → 用户确认。
- 未经用户查看并确认本地版本，不提交、不推送、不覆盖云端。
- 云环境 ID：`startrace-d5gbndi213c162cc5`。
- Cloud Run 服务：`startrace`，容器端口 `3000`。
- 公网地址：`https://startrace-306119-11-1416317231.sh.run.tcloudbase.com/`。
- 保留 `next.config.ts` 的 `output: 'standalone'` 和根目录 `Dockerfile`。
- Git 身份：陈皓宇 `<HarryChenCHY@users.noreply.github.com>`；远端 `git@github.com:HarryChenCHY/star-bindpaint.git`。
- 部署上下文来源：根目录 `conversation-export.json`，该文件属于用户，不提交或改写。

## 六阶段重构状态

- ✅ 阶段 1：首页、导航、元信息和研究型产品介绍。
- ✅ 阶段 2：精选临摹、上传图片、自由画布与三档引导入口。
- ✅ 阶段 3：星点/星迹画板、月亮伙伴、完整原始笔触、可暂停自动续画和星星魔法棒。
- ✅ 阶段 4：每日星愿、七天动笔、连续天数、练习次数和作品星图。
- ✅ 阶段 5：可解释学习反馈、人工/AI/覆盖口径、首次动笔和匿名研究数据后台。
- ✅ 阶段 6：旧定位清理、隐私授权、匿名删除、接口白名单、后台保护、安全响应头、文档与双端验收。

## 大型任务工作流

满足任一条件即视为大型任务：修改 5 个以上文件、涉及多个模块联动，或要求整体/完整重构。

1. 开始前给出完整阶段计划并等待确认。
2. 每次只执行一个主阶段，完成后汇报并等待继续。
3. 汇报格式：`✅ 步骤 N/M 完成：[完成内容] → 下一步：[下一阶段]，是否继续？`
4. 超过 5 分钟的任务持续提供简短进度更新。

如果上下文压缩连续失败 3 次，停止并提示用户开启新对话，不继续追加内容。
