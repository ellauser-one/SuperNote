# app/src/widgets/MemoTree/
> L2 | 父级: ../../CLAUDE.md

成员清单
MemoTree.tsx: 主组件；递归渲染树节点行，管理拖拽（HTML5 DnD）/重命名/右键菜单/创建/选中态；FLIP 动画集成
MemoTreeContextMenu.tsx: 右键弹出菜单；新建文件夹/备忘录入口；fixed 定位 + 外部点击关闭
CreateNodeDialog.tsx: 新建节点对话框（文件夹/备忘录共用）；组合 shared/ui Dialog + store 乐观创建
useFlipAnimation.ts: FLIP 动画 hook；capture → DOM 变更 → animate；Web Animations API + cubic-bezier

## 约束
- 消费 `shared/stores/memo-tree.store` 作为唯一数据源
- 消费 `shared/lib/memo-tree-helpers` 作为纯函数工具
- 禁止组件直接 fetch / 直连 Supabase
- 禁止硬编码像素与颜色值；样式来自 index.css 的 `.ds-tree-*` 类
- 拖拽落点三段分区：folder 上 24% before / 下 24% after / 中间 inside；memo 仅 before/after

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
