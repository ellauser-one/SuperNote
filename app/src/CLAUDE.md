# app/src/
> L2 | 父级: ../CLAUDE.md

成员清单
index.css: **设计系统唯一真相源头**。定义颜色、字号、间距、圆角、阴影、控件高度、布局比例与 `.ds-*` 原子样式；禁止在 UI 中绕过本文件硬编码像素/颜色
main.tsx: React 浏览器挂载入口，AuthProvider 包裹 RouterProvider
app/: 应用装配层，负责前端运行时外壳、路由挂载与全局提供器边界
pages/: 页面层，负责路由页面归属与页面级组合；只消费 shared/ui 与 widgets，不自建原子组件
widgets/: 业务组件层，负责可复用的用户端界面模块；可组合 shared/ui，不定义全局视觉 token
shared/: 共享层；shared/ui 为设计系统组件；shared/services 为运行时服务（Supabase / Auth）

## 设计系统法则
1. 一切视觉值围绕 `index.css` 展开  
2. 一切 UI 原子组件写入 `shared/ui/`  
3. 禁止像素硬编码、颜色硬编码、第三方 UI 组件库  

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
