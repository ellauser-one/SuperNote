# app/src/shared/services/
> L3 | 父级: ../CLAUDE.md

成员清单
supabase/: 浏览器端 Supabase 单例 client
auth/: Auth 领域服务（注册/登录/登出与 profile 同步；getAccessToken）
api/: 业务 api 客户端（Bearer access_token → api）
chat/: chat 传输层（DefaultChatTransport + session Bearer → `/v1/chat`）

## 约束
- 无 UI；由 providers / widgets 编排
- 禁止 service_role；只读 `VITE_*` 公开环境变量

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
