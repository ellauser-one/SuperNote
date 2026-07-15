# app/src/widgets/AuthModal/
> L3 | 父级: ../CLAUDE.md

成员清单
AuthModal.tsx: 登录/注册模态；注册 username+email+password，登录 email+password

## 约束
- 不直查用户表做 username 登录
- loading 防重复提交；错误文案友好展示
- 只组合 shared/ui，无第三方 UI 库

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
