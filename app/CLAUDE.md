# app/
> L1 | 父级: ../CLAUDE.md

模块定位: 用户端 · Bun + Vite + React + React Router + Tailwind CSS v4 + 自研 Design System + MDXEditor

## 设计系统（强制）
- **Token 真相源头**: `src/index.css`（颜色 / 字号 / 间距 / 圆角 / 阴影 / 控件 / 布局）
- **组件文件夹**: `src/shared/ui/` — 未来所有可复用 UI 原子组件必须写在此目录
- **禁止**: 任何 UI 中像素硬编码、颜色值硬编码；禁止第三方 UI 组件库
- **允许**: pages / widgets 用 token 工具类与 `var(--token)` 做布局编排；业务组合放 widgets

详见 [src/shared/ui/CLAUDE.md](src/shared/ui/CLAUDE.md)

<directory>
src/app/ - 应用装配层，负责前端运行时外壳、路由挂载与全局提供器边界
src/pages/ - 页面层，负责路由页面归属与页面级组合
src/widgets/ - 业务组件层，负责可复用的用户端界面模块
src/shared/ - 共享层；ui/ 为设计系统组件目录
src/index.css - 设计系统唯一真相源头
</directory>

<config>
package.json - 用户端依赖清单，声明 React、React Router、@supabase/supabase-js、Tailwind CSS v4、@mdxeditor/editor 与开发脚本（无第三方 UI 库）
bun.lock - Bun 依赖锁定文件
.env.example - Supabase 浏览器端公开环境变量模板（复制为 .env.local）
index.html - Vite HTML 入口
vite.config.ts - Vite 配置，启用 React 与 Tailwind CSS v4 插件；dev server port 20000
tsconfig.json - TypeScript 编译与编辑器配置
</config>

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
