/**
 * [INPUT]: 依赖 Hono、dto/memo、service/memo、lib/supabase-auth、common/response
 * [OUTPUT]: 对外提供 memoRouter
 *   GET  /memo-tree
 *   POST /memo-folders
 *   POST /memos
 *   GET  /memos/:nodeId
 *   PATCH /memos/:nodeId
 *   PATCH /memo-nodes/:nodeId
 *   PATCH /memo-nodes/:nodeId/move
 * [POS]: router 层；读请求、zod 校验、调 service、返回信封；禁止业务判断
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { Context } from "hono";
import { Hono } from "hono";

import { fail, ok } from "../common/response";
import {
  FORBIDDEN_MEMO_ID_KEYS,
  createFolderBodySchema,
  createMemoBodySchema,
  moveNodeBodySchema,
  nodeIdParamSchema,
  renameNodeBodySchema,
  updateMemoBodySchema,
} from "../dto/memo.dto";
import {
  extractBearerToken,
  fetchAuthUser,
} from "../lib/supabase-auth";
import * as memoService from "../service/memo.service";

export const memoRouter = new Hono();

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
  for (const key of FORBIDDEN_MEMO_ID_KEYS) {
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

/** GET /memo-tree */
memoRouter.get("/memo-tree", async (c) => {
  const authUser = await requireAuthUser(c);
  const tree = await memoService.getMemoTree(authUser);
  return ok(c, tree);
});

/** POST /memo-folders */
memoRouter.post("/memo-folders", async (c) => {
  const authUser = await requireAuthUser(c);
  const parsedBody = await parseBodyObject(c);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = createFolderBodySchema.safeParse(parsedBody.body);
  if (!parsed.success) {
    return fail(
      c,
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "请求体校验失败",
      400,
    );
  }

  const node = await memoService.createFolder(authUser, parsed.data);
  return ok(c, node, "created", 201);
});

/** POST /memos */
memoRouter.post("/memos", async (c) => {
  const authUser = await requireAuthUser(c);
  const parsedBody = await parseBodyObject(c);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = createMemoBodySchema.safeParse(parsedBody.body);
  if (!parsed.success) {
    return fail(
      c,
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "请求体校验失败",
      400,
    );
  }

  const node = await memoService.createMemo(authUser, parsed.data);
  return ok(c, node, "created", 201);
});

/** GET /memos/:nodeId */
memoRouter.get("/memos/:nodeId", async (c) => {
  const authUser = await requireAuthUser(c);
  const idParsed = nodeIdParamSchema.safeParse(c.req.param("nodeId"));
  if (!idParsed.success) {
    return fail(c, "VALIDATION_ERROR", "nodeId 必须是 uuid", 400);
  }

  const node = await memoService.getMemo(authUser, idParsed.data);
  return ok(c, node);
});

/** PATCH /memos/:nodeId */
memoRouter.patch("/memos/:nodeId", async (c) => {
  const authUser = await requireAuthUser(c);
  const idParsed = nodeIdParamSchema.safeParse(c.req.param("nodeId"));
  if (!idParsed.success) {
    return fail(c, "VALIDATION_ERROR", "nodeId 必须是 uuid", 400);
  }

  const parsedBody = await parseBodyObject(c);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = updateMemoBodySchema.safeParse(parsedBody.body);
  if (!parsed.success) {
    return fail(
      c,
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "请求体校验失败",
      400,
    );
  }

  const node = await memoService.updateMemo(
    authUser,
    idParsed.data,
    parsed.data,
  );
  return ok(c, node);
});

/** PATCH /memo-nodes/:nodeId */
memoRouter.patch("/memo-nodes/:nodeId", async (c) => {
  const authUser = await requireAuthUser(c);
  const idParsed = nodeIdParamSchema.safeParse(c.req.param("nodeId"));
  if (!idParsed.success) {
    return fail(c, "VALIDATION_ERROR", "nodeId 必须是 uuid", 400);
  }

  const parsedBody = await parseBodyObject(c);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = renameNodeBodySchema.safeParse(parsedBody.body);
  if (!parsed.success) {
    return fail(
      c,
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "请求体校验失败",
      400,
    );
  }

  const node = await memoService.renameNode(
    authUser,
    idParsed.data,
    parsed.data,
  );
  return ok(c, node);
});

/** PATCH /memo-nodes/:nodeId/move */
memoRouter.patch("/memo-nodes/:nodeId/move", async (c) => {
  const authUser = await requireAuthUser(c);
  const idParsed = nodeIdParamSchema.safeParse(c.req.param("nodeId"));
  if (!idParsed.success) {
    return fail(c, "VALIDATION_ERROR", "nodeId 必须是 uuid", 400);
  }

  const parsedBody = await parseBodyObject(c);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = moveNodeBodySchema.safeParse(parsedBody.body);
  if (!parsed.success) {
    return fail(
      c,
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "请求体校验失败",
      400,
    );
  }

  const node = await memoService.moveNode(
    authUser,
    idParsed.data,
    parsed.data,
  );
  return ok(c, node);
});
