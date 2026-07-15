/**
 * [INPUT]: 依赖 react-dom/client 的 createRoot，依赖 app/router 与 AuthProvider，依赖 index.css
 * [OUTPUT]: 对外提供浏览器端 React 挂载入口
 * [POS]: app/src 的运行时入口；全局 AuthProvider 包裹路由树
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import { AuthProvider } from "./app/providers/AuthProvider";
import { router } from "./app/router";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
);
