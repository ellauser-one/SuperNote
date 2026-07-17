# app/src/pages/
> L2 | 父级: ../../CLAUDE.md

成员清单
LandingPage.tsx: / 首页营销页面；Header 登录按钮打开 AuthModal；已登录跳转 /app
AppShell.tsx: /app 登录后全局壳；备忘录页用窄图标轨 + 文件树；右侧 Agent 侧栏可开合（不遮挡编辑区）
NotesLayout.tsx: /app 与 /app/notes/:noteId；bootstrap 拉树 + last-opened；左侧 MemoTree 主侧栏 + MemoEditorView 编辑区
AppDashboard.tsx: 历史工作台（已由 AppShell 路由替代；dashboard 重定向 /app/new）
NewMemoPage.tsx: /app/new 新建视图
MemoLibraryPage.tsx: 备忘录库页（可选；主路径现为 NotesLayout）
TrashPage.tsx: /app/trash 回收站
ProfilePage.tsx: /app/profile 个人主页
design-system/: /app/design DEV Design System 画廊

## 约束
- 不在本层新建原子 UI 组件；原子一律放 `shared/ui/`
- 禁止硬编码颜色与像素；只消费 index.css token

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
