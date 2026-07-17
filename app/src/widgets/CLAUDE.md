# app/src/widgets/
> L2 | 父级: ../../CLAUDE.md

成员清单
AppSidebar.tsx: /app 左侧导航；顶栏 Logo 与「首页」项回 Landing；底部账户区委托 UserMenu；DEV Design System 入口
MdxMemoEditor.tsx: MDX 所见即所得适配边界；props/onChange 只暴露干净 content_mdx；内部 inflate/deflate + trim=false + pre-wrap + insertText 粘贴
mdx-whitespace-adapter.ts: 空行/行首尾空格的 inflate·deflate（ZWSP/NBSP/哨兵只活在编辑器内）；mdx-whitespace-adapter.test.ts 验收 round-trip
MemoEditorView.tsx: 备忘录主编辑区；标题重命名 + 无感知自动保存；只消费干净 markdown，不感知 adapter 标记
MemoWorkspace.tsx: 历史 Dashboard 主工作区，已迁移至 shared/ui
AgentPanel/: 右侧备忘录助手 SSE 面板（useChat + DefaultChatTransport）；开合状态见 agent-panel.storeAuthModal/: 登录/注册模态；组合 Dialog/Button/Input + AuthProvider
UserMenu/: 侧栏账户区；username 展示 + 个人主页 + 退出
MemoTree/: 左侧文件树侧栏；含 MemoTree 主组件、右键菜单、创建对话框、FLIP 动画 hook。详见 [MemoTree/CLAUDE.md](MemoTree/CLAUDE.md)

## 约束
- 业务组合层，可导入 `shared/ui`，不得再引第三方 UI 库
- 禁止硬编码颜色与像素；新视觉值先改 index.css
- 不把原子组件写在本目录；原子组件只属于 `shared/ui/`

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
