# SuperNote - AI 自动归档的备忘录软件
SuperNote 是面向高频记录者的 AI 备忘录，解决随手写导致后期难分类、难检索、文件树混乱的问题。

## 本质
SuperNote 的核心不是多一个输入框，而是让备忘录在保存瞬间进入正确位置。用户只负责记录想法，系统负责把零散内容沉淀为可持续演化的文件树。

## 商业模式
订阅制 SaaS，按能力与使用强度分层收费：
- $5/月：基础 AI 归档与个人备忘录管理
- $20/月：更高额度、更强组织能力与进阶检索
- $100/月：重度用户或团队级知识整理能力

## AI 角色
AI 是保存时的智能文件管理员。每次用户保存备忘录时，AI 判断主题、上下文与已有目录结构，将备忘录分配到合适文件夹；如果没有合适文件夹，AI 有权根据主题创建新文件夹，并保持文件树长期可读、可查、可扩展。

## 技术栈
全栈 TypeScript，使用 Bun 作为运行与包管理基础，项目由 app、chat、api 三个 L1 组成。

## 用户端设计系统（强制）
app 使用自研 Design System，不依赖第三方 UI 组件库：
- **Token 真相源头**: [app/src/index.css](app/src/index.css) — 颜色、字号、间距、圆角、阴影、控件与布局比例只在此定义
- **组件文件夹**: [app/src/shared/ui/](app/src/shared/ui/) — 未来所有可复用 UI 原子组件必须写在此目录
- **禁止**: 在任何 UI（pages / widgets / 组件内）硬编码像素值或颜色值；禁止引入第三方 UI 组件库
- **流程**: 需要新视觉值 → 先改 index.css → 再写/改 shared/ui 组件 → pages/widgets 只做编排

详见 [app/src/shared/ui/CLAUDE.md](app/src/shared/ui/CLAUDE.md)

<directory>
app/ - 用户端，承载浏览器交互界面与前端路由
chat/ - AI 能力服务，承载 Mastra Agent、Workflow、Tool 与对话接口
api/ - 业务接口服务，承载业务 HTTP API、数据访问与 Supabase 集成
</directory>

## 模块地图
| L1 | 职责 | 地图 |
| --- | --- | --- |
| app | 用户端，负责备忘录记录、浏览、文件树交互与前端路由界面 | [app/CLAUDE.md](app/CLAUDE.md) |
| chat | AI 能力服务，负责保存时分类、目录推荐、自动建夹与 AI 编排 | [chat/CLAUDE.md](chat/CLAUDE.md) |
| api | 业务接口服务，负责备忘录、文件夹、订阅与数据访问边界 | [api/CLAUDE.md](api/CLAUDE.md) |

<config>
SYSTEM.md - 全项目开发 Agent 系统提示词（人格、四象限、SOLID/熵减、GEB 分形文档协议）
.git/ - Git 版本库元数据
app/package.json - 用户端依赖清单与 Bun 包元数据，声明 React 路由、MDXEditor、Tailwind 与自研设计系统
app/bun.lock - 用户端 Bun 依赖锁定文件
app/tsconfig.json - 用户端 TypeScript 编辑器配置
app/.gitignore - 用户端 Git 忽略规则
chat/package.json - AI 能力服务依赖清单与 Bun 包元数据
chat/bun.lock - AI 能力服务 Bun 依赖锁定文件
chat/tsconfig.json - AI 能力服务 TypeScript 编辑器配置
chat/.gitignore - AI 能力服务 Git 忽略规则
api/package.json - 业务接口服务依赖清单与 Bun 包元数据
api/bun.lock - 业务接口服务 Bun 依赖锁定文件
api/tsconfig.json - 业务接口服务 TypeScript 编辑器配置
api/.gitignore - 业务接口服务 Git 忽略规则
</config>

法则: 极简·稳定·导航·版本精确
