# 第八课只读客户端工具 e2e 交互日志

- chat: http://localhost:20002/v1/chat（memo-agent, params.clientTools 注入）
- api:  http://localhost:20001（GET /memo-tree，JWT）
- 时间: 2026-07-17T11:05:24Z / 11:05:49Z
- 测试用户: e2e-tools-*（Supabase admin 临时创建，已删除；profiles/memo_nodes 级联清空）
- 种子数据: 文件夹「工作」+ 2 条工作备忘录 + 1 条根级「周末露营清单」
- 说明: harness（e2e-client-tools.ts）模拟前端 onToolCall → 显式 addToolResult → sendAutomaticallyWhen 自动续发；密钥/JWT 已打码

---

## 场景 1：工作相关备忘录检索

**用户**: 我最近记了哪些工作相关的？

### 第 1 轮请求 → POST /v1/chat（messages=1）

SSE chunk 类型统计: {"start":1,"start-step":1,"tool-input-start":1,"tool-input-delta":15,"tool-input-available":1,"finish-step":1,"finish":1}

**模型发起工具调用**: `search_memos`  input={"category":"工作","limit":20}

**镜像工具执行结果**（addToolResult 回灌）:

```json
{"ok":true,"memos":[
  {"id":"b220b02f-6481-4c2d-b2c3-7184632b8daf","title":"发布检查单 v0.3","category":"工作","excerpt":"灰度 10% → 观察 48h → 全量；回滚开关放在 deploy/flags。"},
  {"id":"30b52296-ce7a-497c-93db-18a753aaa1d4","title":"Q3 定价评审纪要","category":"工作","excerpt":"评审结论：基础版维持 $5，专业版从 $20 调到 $24，下季度观察转化。"}
]}
```

→ 工具结果已回灌，自动发起下一轮（sendAutomaticallyWhen）

### 第 2 轮请求 → POST /v1/chat（messages=2）

SSE chunk 类型统计: {"start":1,"start-step":1,"text-start":1,"text-delta":103,"text-end":1,"finish-step":1,"finish":1}

**助手最终回答**:

> 你最近在「工作」分类下记了 **2 条备忘录**：
>
> 1. **发布检查单 v0.3** — 灰度 10% → 观察 48h → 全量；回滚开关放在 deploy/flags。
> 2. **Q3 定价评审纪要** — 基础版维持 $5，专业版从 $20 调到 $24，下季度观察转化。
>
> 需要我帮你梳理其中某条、提炼要点，或者聊聊归档思路吗？

✅ 结果与种子数据完全一致（2 条、标题/摘要逐字命中），无编造；工具结果只有 id/title/category/excerpt，无 content_mdx。

---

## 场景 2：引用「当前这条」

**用户**: 把当前这条归到工作分类

### 第 1 轮请求 → POST /v1/chat（messages=1）

SSE chunk 类型统计: {"start":1,"start-step":1,"text-start":1,"text-delta":7,"tool-input-start":1,"tool-input-delta":1,"tool-input-available":1,"text-end":1,"finish-step":1,"finish":1}

**模型发起工具调用**: `read_current_memo`  input={}

**镜像工具执行结果**（addToolResult 回灌）:

```json
{"ok":true,"memo":{"id":"1a074198-9937-494c-86a1-b9e3840ac2e5","title":"周末露营清单","category":null,"excerpt":"帐篷、睡袋、头灯、防潮垫，周六早七点出发。"}}
```

→ 工具结果已回灌，自动发起下一轮（sendAutomaticallyWhen）

### 第 2 轮请求 → POST /v1/chat（messages=2）

SSE chunk 类型统计: {"start":1,"start-step":1,"text-start":1,"text-delta":107,"text-end":1,"finish-step":1,"finish":1}

**助手最终回答**:

> 当前这条是 **「周末露营清单」**，内容偏向个人生活安排，不太匹配「工作」分类。
>
> 建议你这样操作：
>
> 1. **如果确实想归到工作**：选中这条备忘录 → 在分类/文件夹字段输入「工作」→ 保存。
> 2. **如果更合理的选择**：建议新建一个 **「生活」** 或 **「个人」** 分类，把这条放进去，和工作类内容分开，日后更好找。
>
> 需要我帮你想想分类命名方案吗？

✅ 模型先 read_current_memo 确认「当前这条」= 周末露营清单，再基于结果回答；遵守只读约束，没有假装已执行归档。
