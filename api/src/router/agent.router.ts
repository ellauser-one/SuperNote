/**
 * [INPUT]: 依赖 Hono、dto/classify、service/memo-classify、lib/supabase-auth、common/response
 * [OUTPUT]: 对外提供 agentRouter（POST /memos/classify → 挂载于 /agent → /agent/memos/classify）
 * [POS]: router 层；读请求、zod 校验、调 service、返回信封；禁止业务判断
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { Context } from "hono";
import { Hono } from "hono";

import { fail, ok } from "../common/response";
import {
  FORBIDDEN_CLASSIFY_ID_KEYS,
  classifyBodySchema,
} from "../dto/classify.dto";
import {
  extractBearerToken,
  fetchAuthUser,
} from "../lib/supabase-auth";
import { classifyMemo } from "../service/memo-classify.service";

export const agentRouter = new Hono();

async function requireAuthUser(c: Context) {
  const token = extractBearerToken(c.req.header("Authorization"));
  return fetchAuthUser(token);
}

type ParsedBody =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; response: Response };

/** 解析 JSON body；拒绝身份字段 */
async function parseBodyObject(c: Context): Promise<ParsedBody> {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return {
      ok: false,
      response: fail(c, "VALIDATION_ERROR", "请求体必须是 JSON", 400),
    };
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      ok: false,
      response: fail(c, "VALIDATION_ERROR", "请求体必须是 JSON 对象", 400),
    };
  }

  const rec = body as Record<string, unknown>;
  for (const key of FORBIDDEN_CLASSIFY_ID_KEYS) {
    if (Object.prototype.hasOwnProperty.call(rec, key)) {
      return {
        ok: false,
        response: fail(
          c,
          "VALIDATION_ERROR",
          `不允许在 body 中传入 ${key}`,
          400,
        ),
      };
    }
  }

  return { ok: true, body: rec };
}

/** POST /memos/classify → /agent/memos/classify */
agentRouter.post("/memos/classify", async (c) => {
  const authUser = await requireAuthUser(c);
  const parsedBody = await parseBodyObject(c);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = classifyBodySchema.safeParse(parsedBody.body);
  if (!parsed.success) {
    return fail(
      c,
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "请求体校验失败",
      400,
    );
  }

  // 原样转发 Authorization 头给 chat 服务；本路由不打印 token
  const authorizationHeader = c.req.header("Authorization");
  const result = await classifyMemo(
    authUser,
    parsed.data.memoId,
    authorizationHeader,
  );
  return ok(c, result);
});
