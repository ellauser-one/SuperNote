/**
 * [INPUT]: 依赖 Hono 与 api/* 路由模块
 * [OUTPUT]: 对外提供根路由聚合（health + 业务挂载点）
 * [POS]: router 层；index.ts 只挂载本模块
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Hono } from "hono";

import { aiApi } from "../api/ai.api";
import { meApi } from "../api/me.api";
import { profilesApi } from "../api/profiles.api";
import type { AuthVariables } from "../common/auth-context";
import { ok } from "../common/response";

export const router = new Hono<{ Variables: AuthVariables }>();

router.get("/health", (c) => ok(c, { service: "api" }));

router.route("/v1/me", meApi);
router.route("/v1/profiles", profilesApi);
router.route("/v1/ai", aiApi);
