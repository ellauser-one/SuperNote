# app/src/shared/ui/
> L2 | 父级: ../CLAUDE.md

## 定位
SuperNote **设计系统组件目录**（Design System）。所有可复用 UI 原子组件必须写在本文件夹；`pages/` 与 `widgets/` 只做业务编排，禁止再引入第三方 UI 组件库。

## 唯一真相源头
`app/src/index.css` 是颜色、字号、间距、圆角、阴影、控件高度、布局比例的 **唯一设计系统真相源头**。

### 硬性规则
1. **未来所有组件必须写到本目录**（`shared/ui/`）。新增 Button / Input / Dialog 等同级原子，不得散落在 pages、widgets 或其他路径。
2. **禁止在任何 UI 中硬编码像素值**（如 `12px`、`h-[22px]`、`text-[13px]`、`max-w-[760px]`、`28.8px`）。必须使用 `index.css` 暴露的 token 工具类（`text-ui`、`h-row`、`size-icon-xs`、`max-w-content` 等）或 `var(--token)`。
3. **禁止在任何 UI 中硬编码颜色值**（如 `#000`、`rgb()`、`rgba()`）。只允许语义色 token：`bg-ink`、`text-graphite`、`border-vellum`、`text-paper/70` 等；透明度可叠在 token 上。
4. **禁止再引入第三方 UI 组件库**（已移除 Kumo）。交互原子（Button、Input、Card、Dialog…）一律自研并放在本目录。
5. 若视觉需要新尺寸/新颜色：**先改 `index.css` 增加 token**，再在组件中引用。不允许为图方便在 TSX 写死。
6. pages / widgets 通过 `../shared/ui` 或 `../shared/ui/<Component>` 导入；业务布局组件仍归 `widgets/`。
7. **spacing 数字 = 像素**（`--spacing-12: 12px`）。禁止让 Tailwind/第三方默认 rem（如 `3rem`）残留，否则 UI 会被放大数倍。
8. **禁止在全局写 `button { font: inherit }` 这类 unlayered shorthand**——会压过 utilities 字号，把控件字号回退到 16px。base 重置只能进 `@layer base`。
9. **圆角几何**：`border-radius` 只定半径；苹果丝滑 continuous corner 用 `corner-shape: squircle`（≡ `superellipse(2)`，Chrome 139+）。写在 `index.css` 的 `@supports` 渐进增强里。按钮/卡片必须是**圆角矩形**，禁止胶囊（`--radius-full` 仅真圆形）。

## 成员清单
index.ts: 设计系统公共导出入口
cn.ts: className 合并工具
Avatar.tsx: 真圆形头像；size: sm/md/lg/xl；tone: default/on-ink；`src` 图片或 `fallback` 字标（样式 `.ds-avatar*`）
Button.tsx: 微拟物按钮（圆角矩形 · 内外影 · 厚度）；variant: primary/outline/ghost/inverse · sm/md；`flat` 工具型扁平变体（侧栏工具栏等紧凑场景）；`loading` 态含 spinner 转圈 + shimmer 扫光
Input.tsx: 单行输入；`privacy` 变体：右侧眼睛切换明文/密文
Textarea.tsx: 多行输入
Card.tsx: 表面卡片（bone / ink / chalk / paper / warning）
Dialog.tsx: 对话框（Root / Trigger / Content / Title / Description / Close）；Root 支持受控 open/onOpenChange；Trigger/Close 支持 `asChild` 渲染子组件（如 Button）
LogoMark.tsx: 品牌 SVG 标记（ink / paper）

## 扩展流程
1. 在 `index.css` 的 `:root` 与 `@theme` 增加 token  
2. 如需原子样式，在 `index.css` 增加 `.ds-*` 类  
3. 在本目录新增组件文件并写入头部注释  
4. 从 `index.ts` 导出  
5. 更新本 CLAUDE.md 成员清单  

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
