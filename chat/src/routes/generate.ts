/**
 * [INPUT]: 依赖 Hono、requireTrustedUser、generate.service、zod
 * [OUTPUT]: 对外提供 POST /v1/generate
 * [POS]: routes HTTP 入口；只接收 api 转发的受信请求
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Hono } from "hono";
import { z } from "zod";

import type { UserContextVariables } from "../common/user-context";
import { requireTrustedUser } from "../middleware/user-context";
import { generateReply } from "../services/generate.service";

const bodySchema = z.object({
  message: z.string().trim().min(1).max(8000),
});

export const generateRoute = new Hono<{ Variables: UserContextVariables }>();

generateRoute.use("*", requireTrustedUser);

generateRoute.post("/", async (c) => {
  const user = c.get("user");
  const raw = await c.req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);

  if (!parsed.success) {
    return c.json({ error: "Invalid body", details: parsed.error.flatten() }, 400);
  }

  const result = await generateReply({
    user,
    message: parsed.data.message,
  });

  return c.json(result);
});
