# app/src/shared/lib/
> L3 | 父级: ../CLAUDE.md

成员清单
memo-tree-helpers.ts: 树操作纯函数集
- 查找/增删改：findNode · findSiblings · insertNode · removeNode · replaceNode · updateNode · moveNodeInTree
- 排序：sortNodes · computeSortOrder（稀疏 sort_order）
- 拖拽：isDescendant · canDropTarget · resolveDropPlacement（inside → 目标 folder 首子）
last-opened-memo.ts: 按 user id 隔离的 last-opened memo localStorage 读写
save-with-retry.ts: 失败退避重试（默认 3 次，400/800/1600ms）；MemoEditorView 自动保存消费

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
