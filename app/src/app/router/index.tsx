/**
 * [INPUT]: 依赖 react-router-dom createBrowserRouter、pages 与 RequireAuth
 * [OUTPUT]: 对外提供 router 浏览器路由实例
 * [POS]: app/src/app/router 的路由装配层；/ 公开，/app 需登录
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { lazy, Suspense, type ComponentType } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";

import { AppShell } from "../../pages/AppShell";
import { LandingPage } from "../../pages/LandingPage";
import { NewMemoPage } from "../../pages/NewMemoPage";
import { NotesLayout } from "../../pages/NotesLayout";
import { ProfilePage } from "../../pages/ProfilePage";
import { TrashPage } from "../../pages/TrashPage";
import { RequireAuth } from "../providers/RequireAuth";

const DesignSystemPage: ComponentType | null = import.meta.env.DEV
  ? lazy(() =>
      import("../../pages/design-system").then((module) => ({
        default: module.DesignSystemPage,
      })),
    )
  : null;

function DesignSystemRoute() {
  if (!DesignSystemPage) {
    return <Navigate to="/app" replace />;
  }
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center bg-putty font-helvetica-now text-ui text-graphite">
          Loading Design System…
        </div>
      }
    >
      <DesignSystemPage />
    </Suspense>
  );
}

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
        element: <AppShell />,
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
            path: "new",
            element: <NewMemoPage />,
          },
          {
            path: "trash",
            element: <TrashPage />,
          },
          {
            path: "profile",
            element: <ProfilePage />,
          },
          {
            path: "design",
            element: <DesignSystemRoute />,
          },
          // 兼容旧入口
          {
            path: "dashboard",
            element: <Navigate to="/app/new" replace />,
          },
        ],
      },
    ],
  },
]);
