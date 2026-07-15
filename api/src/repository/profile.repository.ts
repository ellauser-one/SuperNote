/**
 * [INPUT]: 依赖 lib/supabase-rest 与 model/user.model
 * [OUTPUT]: 对外提供 profiles 表 REST CRUD（find / upsert / update）
 * [POS]: repository 层；只封装 PostgREST，不写业务判断与归属校验
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { AppError } from "../common/app-error";
import { supabaseRest, SupabaseRestError } from "../lib/supabase-rest";
import { ApiCode } from "../model/response.model";
import {
  PROFILE_SELECT,
  PROFILES_TABLE,
  type ProfileInsert,
  type ProfileRow,
  type ProfileUpdate,
  type User,
  type UserId,
  userFromProfileRow,
} from "../model/user.model";

export class ProfileRepositoryError extends AppError {
  readonly missingRelation: boolean;
  readonly pgCode?: string;

  constructor(
    message: string,
    options?: { code?: string; httpStatus?: number; cause?: unknown },
  ) {
    super(
      options?.httpStatus && options.httpStatus >= 400 && options.httpStatus < 600
        ? options.httpStatus
        : ApiCode.BAD_GATEWAY,
      message,
      options?.httpStatus ?? 502,
    );
    this.name = "ProfileRepositoryError";
    this.pgCode = options?.code;
    this.missingRelation = isMissingRelation(message, options?.code);
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

function isMissingRelation(message: string, code?: string): boolean {
  const lower = message.toLowerCase();
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    lower.includes("does not exist") ||
    lower.includes("could not find the table") ||
    lower.includes("schema cache")
  );
}

function throwFromRest(op: string, err: unknown): never {
  if (err instanceof SupabaseRestError) {
    const details = err.details as { code?: string } | undefined;
    throw new ProfileRepositoryError(
      `[profile.repository] ${op} failed: ${err.message}`,
      {
        code: details?.code,
        httpStatus: err.status,
        cause: err,
      },
    );
  }
  const message = err instanceof Error ? err.message : String(err);
  throw new ProfileRepositoryError(`[profile.repository] ${op} failed: ${message}`, {
    httpStatus: 502,
    cause: err,
  });
}

function firstRow(rows: ProfileRow[] | ProfileRow | null): ProfileRow | null {
  if (!rows) {
    return null;
  }
  if (Array.isArray(rows)) {
    return rows[0] ?? null;
  }
  return rows;
}

/** 按 id 查询；不存在返回 null */
export async function findProfileById(id: UserId): Promise<User | null> {
  try {
    const { data } = await supabaseRest<ProfileRow[]>(PROFILES_TABLE, {
      method: "GET",
      query: {
        select: PROFILE_SELECT,
        id: `eq.${id}`,
        limit: 1,
      },
    });
    const row = firstRow(data);
    return row ? userFromProfileRow(row) : null;
  } catch (err) {
    throwFromRest("findProfileById", err);
  }
}

/**
 * 按 username 精确查找（大小写敏感，与写入值一致）。
 * 供唯一性校验使用；service 层负责是否暴露他人数据。
 */
export async function findProfileByUsername(username: string): Promise<User | null> {
  const normalized = username.trim();
  if (!normalized) {
    return null;
  }

  try {
    const { data } = await supabaseRest<ProfileRow[]>(PROFILES_TABLE, {
      method: "GET",
      query: {
        select: PROFILE_SELECT,
        username: `eq.${normalized}`,
        limit: 1,
      },
    });
    const row = firstRow(data);
    return row ? userFromProfileRow(row) : null;
  } catch (err) {
    throwFromRest("findProfileByUsername", err);
  }
}

/** 按 id upsert（PostgREST merge-duplicates + return=representation） */
export async function upsertProfile(input: ProfileInsert): Promise<User> {
  const payload: ProfileInsert = {
    id: input.id,
    email: input.email,
    username: input.username,
    ...(input.display_name !== undefined ? { display_name: input.display_name } : {}),
  };

  try {
    const { data } = await supabaseRest<ProfileRow[]>(PROFILES_TABLE, {
      method: "POST",
      query: {
        select: PROFILE_SELECT,
        // PostgREST upsert：以主键冲突合并，避免重复 insert 409
        on_conflict: "id",
      },
      body: payload,
      prefer: "resolution=merge-duplicates,return=representation",
    });
    const row = firstRow(data);
    if (!row) {
      throw new ProfileRepositoryError(
        "[profile.repository] upsertProfile returned empty representation",
        { httpStatus: 502 },
      );
    }
    return userFromProfileRow(row);
  } catch (err) {
    if (err instanceof ProfileRepositoryError) {
      throw err;
    }
    throwFromRest("upsertProfile", err);
  }
}

/** 按 id 部分更新 */
export async function updateProfile(
  id: UserId,
  patch: ProfileUpdate,
): Promise<User> {
  try {
    const { data } = await supabaseRest<ProfileRow[]>(PROFILES_TABLE, {
      method: "PATCH",
      query: {
        id: `eq.${id}`,
        select: PROFILE_SELECT,
      },
      body: patch,
      prefer: "return=representation",
    });
    const row = firstRow(data);
    if (!row) {
      throw new ProfileRepositoryError(
        "[profile.repository] updateProfile: profile not found",
        { httpStatus: 404 },
      );
    }
    return userFromProfileRow(row);
  } catch (err) {
    if (err instanceof ProfileRepositoryError) {
      throw err;
    }
    throwFromRest("updateProfile", err);
  }
}

export const profileRepository = {
  findById: findProfileById,
  findByUsername: findProfileByUsername,
  upsert: upsertProfile,
  update: updateProfile,
};
