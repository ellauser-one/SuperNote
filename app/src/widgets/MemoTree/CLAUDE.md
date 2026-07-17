# app/src/widgets/MemoTree/
> L2 | 父级: ../../CLAUDE.md

成员清单
MemoTree.tsx: 主组件；侧栏头工具栏（新建文件夹/备忘录）；递归层级列表 + DropLine；拖拽 before/inside/after/root-end；重命名/右键；乐观 move + FLIP
MemoTreeContextMenu.tsx: 右键弹出菜单；新建文件夹/备忘录入口
CreateNodeDialog.tsx: 新建节点对话框；组合 shared/ui Dialog + store
useFlipAnimation.ts: FLIP 动画 hook（capture 在数据变更前，animate 在 DOM 提交后）

## 约束
- 消费 `shared/stores/memo-tree.store` 作为唯一数据源
- 消费 `shared/lib/memo-tree-helpers`（canDropTarget / resolveDropPlacement）
- 禁止组件直接 fetch / 直连 Supabase
- 禁止硬编码像素与颜色；样式来自 index.css 的 `.ds-tree-*`
- folder/memo 同树；每一层有开头/末尾落点
- folder after 落点在整个子树之后
- folder 中间区 inside = 作为该 folder 第一个子节点
- 根空白区 root-end = parent_id null 末尾
- 拖拽乐观更新：本地 moveNodeInTree → PATCH move；成功不 refetch；失败回滚 + toast
- 树数据由 NotesLayout bootstrap 拉取，MemoTree 不主动 fetchTree

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
