/**
 * [INPUT]: 依赖 Hono、router/health.router、profile.router、memo.router
 * [OUTPUT]: 对外提供 router（根路由聚合）
 * [POS]: router 层；index.ts 只挂载子路由，禁止业务判断
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Hono } from "hono";

import { agentRouter } from "./agent.router";
import { feedbackRouter } from "./feedback.router";
import { healthRouter } from "./health.router";
import { memoRouter } from "./memo.router";
import { profileRouter } from "./profile.router";

export const router = new Hono();

router.route("/", healthRouter);
router.route("/", profileRouter);
router.route("/", memoRouter);
router.route("/api", feedbackRouter);
router.route("/agent", agentRouter);
