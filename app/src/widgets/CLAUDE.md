# app/src/widgets/
> L2 | 父级: ../../CLAUDE.md

成员清单
AppSidebar.tsx: /app 左侧导航；顶栏 Logo 与「首页」项回 Landing；底部账户区委托 UserMenu；DEV Design System 入口
MdxMemoEditor.tsx: MDX 编辑器适配；外观由 index.css .supernote-mdx-editor 控制
MemoWorkspace.tsx: 历史 Dashboard 主工作区，已迁移至 shared/ui
AgentPanel.tsx: 右侧 Agent 面板，使用 shared/ui Button/Input/Card/Dialog
AuthModal/: 登录/注册模态；组合 Dialog/Button/Input + AuthProvider
UserMenu/: 侧栏账户区；username 展示 + 个人主页 + 退出
MemoTree/: 左侧文件树侧栏；含 MemoTree 主组件、右键菜单、创建对话框、FLIP 动画 hook。详见 [MemoTree/CLAUDE.md](MemoTree/CLAUDE.md)

## 约束
- 业务组合层，可导入 `shared/ui`，不得再引第三方 UI 库
- 禁止硬编码颜色与像素；新视觉值先改 index.css
- 不把原子组件写在本目录；原子组件只属于 `shared/ui/`

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
