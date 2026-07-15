# app/src/pages/
> L2 | 父级: ../../CLAUDE.md

成员清单
LandingPage.tsx: / 首页营销页面；Header 登录按钮打开 AuthModal；已登录跳转 /app
AppDashboard.tsx: /app/dashboard 工作台，固定视口；左/右栏比例消费 --layout-sidebar / --layout-agent；含 profile 视图；DEV 懒加载 design-system
NotesLayout.tsx: /app 与 /app/notes/:noteId 主布局；左侧 MemoTree 文件树 + 中间编辑器 + 右侧 AgentPanel 三栏布局；空树自动创建根级 memo
NewMemoPage.tsx: 新建视图，shared/ui Button + lazy MdxMemoEditor
MemoLibraryPage.tsx: 备忘录视图，紧凑文件树 + 详情，token 化尺寸
TrashPage.tsx: 回收站紧凑列表
ProfilePage.tsx: 个人主页 UI；username 来自 auth profile / user_metadata；保存仍空接
design-system/: DEV 专用 Design System 画廊（文件夹多文件 + 视口懒加载矩阵），见 [design-system/CLAUDE.md](design-system/CLAUDE.md)

## 约束
- 不在本层新建原子 UI 组件；原子一律放 `shared/ui/`
- 禁止硬编码颜色与像素；只消费 index.css token

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
