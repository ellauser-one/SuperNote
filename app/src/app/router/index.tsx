/**
 * [INPUT]: 依赖 react-router-dom createBrowserRouter、pages 与 RequireAuth
 * [OUTPUT]: 对外提供 router 浏览器路由实例
 * [POS]: app/src/app/router 的路由装配层；/ 公开，/app 需登录
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { createBrowserRouter } from "react-router-dom";

import { AppDashboard } from "../../pages/AppDashboard";
import { LandingPage } from "../../pages/LandingPage";
import { NotesLayout } from "../../pages/NotesLayout";
import { RequireAuth } from "../providers/RequireAuth";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
  },
  {
    path: "/app",
    element: <RequireAuth />,
    children: [
      {
        index: true,
        element: <NotesLayout />,
      },
      {
        path: "notes/:noteId",
        element: <NotesLayout />,
      },
      {
        path: "dashboard",
        element: <AppDashboard />,
      },
    ],
  },
]);
