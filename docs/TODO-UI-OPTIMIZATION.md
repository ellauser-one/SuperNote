# SuperNote UI 待优化清单

> 来源：2026-07-22 UI 审计与修复（备忘录 + AI 对话框）
> 状态：已修复主体问题，以下为后续打磨项

---

## 1. 暗色模式

**现状**：当前设计系统只有亮色 token，无 `prefers-color-scheme: dark` 或手动切换暗色主题。

**待办**：
- 在 `index.css` 中补充 `@media (prefers-color-scheme: dark)` 或 `.dark` 类的暗色 token 覆盖
- 验证所有 `.ds-*` 组件在暗色下可读性（文字对比度、边框可见性）
- 备忘录编辑器、Agent 对话面板的背景/文字色对需逐一验证

**优先级**：高

---

## 2. Skeleton 替代纯文字 Loading

**现状**：所有 loading 状态目前使用 "加载中… + spinner" 文字形式。

**待办**：
- `shared/ui` 新增 `Skeleton` 组件（`.ds-skeleton` 带 shimmer 动画）
- 备忘录树加载态 → 树节点骨架
- 编辑器加载态 → 编辑区骨架
- Agent 对话历史加载态 → 消息气泡骨架
- 会话列表加载态 → 列表行骨架

**优先级**：中

---

## 3. MemoTreeContextMenu 升级为 Popover

**现状**：右键菜单是自定义实现，已修复视口边缘溢出但非标准组件。

**待办**：
- `shared/ui` 新增 `Popover` 组件（支持 trigger + content + 翻转定位）
- 将 `MemoTreeContextMenu` 从自定义定位迁移到 Popover
- 统一其他可能出现的浮层需求

**优先级**：低

---

## 4. Tooltip 反馈

**现状**：图标按钮仅依赖 `aria-label` 和 `title`，缺少统一 Tooltip 组件。

**待办**：
- `shared/ui` 新增 `Tooltip` 组件
- 为以下图标按钮添加 Tooltip：
  - MemoTree toolbar：新建文件夹、新建备忘录
  - SessionList：删除会话、新建会话
  - AgentPanel header：折叠/展开
  - ToolConfirmCard：确认/拒绝工具调用
- 确保 Tooltip 支持键盘焦点显示

**优先级**：中

---

## 5. NewMemoPage 标题输入框统一

**现状**：`NewMemoPage.tsx` 的标题输入框使用自定义内联 Tailwind 样式，未使用 `shared/ui/Input` 组件。

**待办**：
- 检查 `NewMemoPage.tsx` 中标题输入的实现
- 替换为 `<Input>` 组件 + 设计系统样式
- 确认 placeholder 与其他输入框风格一致

**优先级**：低

---

## 6. 备忘录搜索功能

**现状**：备忘录树当前无搜索入口，缺少 "搜索无结果" 空态。

**待办**：
- 在 MemoTree toolbar 添加搜索输入框（使用 `shared/ui/Input`）
- 实现按标题/内容的实时搜索过滤
- 添加 "搜索无结果" 空态：
  ```
  <状态> 搜索无结果
  <文案> 没有匹配的备忘录，试试其他关键词。
  ```
- 确保搜索态与正常态切换时无跳动

**优先级**：中

---

## 附：已完成的修复项（供参考）

| 类别 | 完成内容 |
|---|---|
| 设计系统 | Dialog 新增 `asChild`；Button 新增 `flat` 属性；新增 2 个 layout token |
| 删除重复 | 移除 `.ds-tree-toolbar__btn`、`.ds-memo-save-toast__retry` 自定义 CSS 类 |
| 组件统一 | 11 个文件中的自定义按钮/输入/弹层替换为 shared/ui 组件 |
| 文案统一 | "Memo Tree"→"备忘录"；"Memo Agent" 移除冗余英文标签 |
| 状态补充 | 所有 loading 态添加 spinner；空态/错误态文案优化 |
| 交互修复 | 右键菜单视口边缘翻转；flat 按钮 icon-only 最小宽度保护 |
| 验收 | vite build 通过；grep 无残留 hex/inline style/arbitrary px |
