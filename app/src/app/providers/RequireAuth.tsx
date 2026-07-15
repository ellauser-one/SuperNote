/**
 * [INPUT]: 依赖 react-router-dom Navigate/Outlet、useAuth
 * [OUTPUT]: 未登录重定向首页；已登录渲染子路由
 * [POS]: app/providers 路由守卫，挂在 /app 父级
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "./AuthProvider";

export function RequireAuth() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-putty font-helvetica-now text-ui text-graphite">
        正在验证会话…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
