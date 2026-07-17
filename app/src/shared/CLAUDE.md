# app/src/shared/
> L2 | 父级: ../../CLAUDE.md

成员清单
ui/: **设计系统组件目录**。所有可复用 UI 原子必须写于此；视觉 token 唯一来源为 `src/index.css`。禁止在 pages/widgets 硬编码颜色与像素，禁止第三方 UI 库。详见 [ui/CLAUDE.md](ui/CLAUDE.md)
services/: 共享服务层（Supabase client、Auth 领域操作、业务 API client），无 UI。详见 [services/CLAUDE.md](services/CLAUDE.md)
types/: 共享领域类型（memo.ts: MemoTreeNode / MemoContent / API 输入类型）
stores/: Zustand 全局 store（memo-tree.store；agent-panel.store 仅面板开/关）lib/: 共享纯函数库（memo-tree-helpers 树操作；last-opened-memo 按 user 持久化）

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
