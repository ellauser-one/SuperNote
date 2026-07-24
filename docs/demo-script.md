# SuperNote 发布演示脚本

核心路径演示。本地环境：app `:20000`，api `:20001`（Docker），chat `:20002`。
演示目标：验证「发布冻结」后的 7 步核心路径与最小反馈闭环全部跑通。

## 0. 前置
- 按 `docs/launch-checklist.md` 启动三服务（app / chat 本机 `bun run dev`，api `docker compose up`）。
- 浏览器打开 `http://localhost:20000`。
- 用测试账号登录（Landing 页「登录」→ `AuthModal`：邮箱 + 密码）。

## 1. 手动创建备忘录
1. 登录后进入 `AppShell`。
2. 左侧 `MemoTree` 工具栏点「新建备忘录」；或侧栏「新建」进入 `/app/new`。
3. 输入标题与正文，点「保存」。
4. 自动跳转到 `/app/notes/:id`，左侧树出现该备忘录；刷新页面数据仍正确（Supabase session 持久化 + 重拉树）。

## 2. AI 创建备忘录
1. 打开右侧 `AgentPanel`，输入「帮我记一条：周五和设计师评审首页改版」。
2. Agent 调用 `create_memo` 工具（客户端工具壳），前端弹出确认卡，点「确认」。
3. 备忘录写入（`POST /memos`），树中新增节点，编辑区打开该备忘录。

## 3. AI 自动分类
1. 打开某条备忘录（编辑区）。
2. 点编辑区头部「AI 自动分类」按钮。
3. 链路：`POST /agent/memos/classify` → api 读取 memo（owner 校验）→ 转发用户 JWT 给 `chat /v1/classify` → 模型返回 category → 落库 `memos.category`。
4. Toast 显示分类结果（如 `工作/设计`），树刷新。

## 4. 搜索和筛选
1. 在 `MemoTree` 顶部搜索框输入关键词。
2. 对已加载的树节点按标题/正文做**客户端过滤**，命中节点及其子树保留、其余淡出。
3. 清空搜索恢复全树。

## 5. 反馈入口
1. 点 `AppShell` 右下角常驻「反馈」浮动按钮。
2. 弹出 `FeedbackDialog`：`page` 默认当前路由（可改）、`message` 必填、`screenshot_url` 可选。
3. 提交 → `POST /api/feedback`（带 `Authorization`）→ Toast「已收到反馈」。
4. 数据写入 `public.feedback`。

## 核心路径验收口径
打开 app → 登录 → 手动创建 → AI 创建 → AI 自动分类 → 搜索筛选 → **刷新页面数据仍正确**（Supabase session 持久化 + 重拉树）。
异常：登录过期（401）触发全局 401 收敛 → 注销并回登录页，不静默卡死。
