/**
 * [INPUT]: 依赖 shared/services/supabase client 与 @supabase/supabase-js Session/User
 * [OUTPUT]: 对外提供 Auth 领域操作（signIn/signUp/signOut、getAccessToken、profile 读写、校验与错误映射）
 * [POS]: shared/services/auth 无 UI 服务层；AuthProvider 只编排此模块
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";

import {
  getSupabaseConfigError,
  isSupabaseConfigured,
  supabase,
} from "../supabase/client";

/** public.profiles 行形状（表尚未建时仍可从 user_metadata 推导） */
export type Profile = {
  id: string;
  email: string | null;
  username: string | null;
};

export type SignInInput = {
  email: string;
  password: string;
};

export type SignUpInput = {
  username: string;
  email: string;
  password: string;
};

export type AuthResult = {
  error: string | null;
};

export type SignUpResult = AuthResult & {
  /** Confirm email 开启且无 session 时为 true */
  needsEmailConfirmation: boolean;
};

const PROFILES_TABLE = "profiles";

/** username: 3–24 位字母数字下划线 */
const USERNAME_RE = /^[a-zA-Z0-9_]{3,24}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

export function validateUsername(raw: string): string | null {
  const username = raw.trim();
  if (!username) {
    return "请填写用户名。";
  }
  if (!USERNAME_RE.test(username)) {
    return "用户名需为 3–24 位字母、数字或下划线。";
  }
  return null;
}

export function validateEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  if (!email) {
    return "请填写邮箱。";
  }
  if (!EMAIL_RE.test(email)) {
    return "邮箱格式不正确。";
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) {
    return "请填写密码。";
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `密码至少 ${MIN_PASSWORD_LENGTH} 位。`;
  }
  return null;
}

/** Map Supabase / PostgREST errors to short Chinese copy. */
export function mapAuthError(message: string | undefined | null): string {
  if (!message) {
    return "操作失败，请稍后重试。";
  }

  const lower = message.toLowerCase();

  if (lower.includes("invalid login credentials")) {
    return "邮箱或密码不正确。";
  }
  if (lower.includes("email not confirmed")) {
    return "邮箱尚未验证，请先完成验证邮件中的链接。";
  }
  if (lower.includes("user already registered") || lower.includes("already been registered")) {
    return "该邮箱已注册，请直接登录。";
  }
  if (lower.includes("password should be at least")) {
    return `密码至少 ${MIN_PASSWORD_LENGTH} 位。`;
  }
  if (lower.includes("rate limit") || lower.includes("too many requests")) {
    return "请求过于频繁，请稍后再试。";
  }
  if (lower.includes("network") || lower.includes("fetch")) {
    return "网络异常，请检查连接后重试。";
  }

  return message;
}

/** Derive a display profile from auth user_metadata when profiles 表尚未就绪。 */
export function profileFromUser(user: User): Profile {
  const meta = user.user_metadata ?? {};
  const username =
    typeof meta.username === "string" && meta.username.trim()
      ? meta.username.trim()
      : null;

  return {
    id: user.id,
    email: user.email ?? null,
    username,
  };
}

/**
 * Load profiles row for the current user.
 * Soft-fails when the table is missing (returns null, no throw).
 */
export async function loadProfile(userId: string): Promise<Profile | null> {
  if (!isSupabaseConfigured) {
    return null;
  }

  const { data, error } = await supabase
    .from(PROFILES_TABLE)
    .select("id, email, username")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    // PGRST205 / 42P01: relation missing — expected until schema lands
    if (isMissingRelationError(error.message, error.code)) {
      return null;
    }
    console.warn("[auth] loadProfile failed:", error.message);
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id as string,
    email: (data.email as string | null) ?? null,
    username: (data.username as string | null) ?? null,
  };
}

/**
 * Upsert profiles after sign-up / first session.
 * Soft-skips when the table does not exist yet so auth still works.
 */
export async function upsertProfile(profile: Profile): Promise<AuthResult & { skipped?: boolean }> {
  if (!isSupabaseConfigured) {
    return { error: getSupabaseConfigError() };
  }

  const { error } = await supabase.from(PROFILES_TABLE).upsert(
    {
      id: profile.id,
      email: profile.email,
      username: profile.username,
    },
    { onConflict: "id" },
  );

  if (!error) {
    return { error: null };
  }

  if (isMissingRelationError(error.message, error.code)) {
    // Table not created yet — keep auth success; metadata already holds username
    return { error: null, skipped: true };
  }

  if (error.code === "23505" || error.message.toLowerCase().includes("duplicate")) {
    return { error: "用户名已被占用，请换一个。" };
  }

  console.warn("[auth] upsertProfile failed:", error.message);
  // Soft-fail: do not block registration while schema is evolving
  return { error: null, skipped: true };
}

export async function getSession(): Promise<Session | null> {
  if (!isSupabaseConfigured) {
    return null;
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.warn("[auth] getSession failed:", error.message);
    return null;
  }
  return data.session;
}

/**
 * 当前 session 的 access_token（Supabase JWT）。
 * 供 app → api 的 Authorization: Bearer 使用；无 session 时返回 null。
 */
export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();
  return session?.access_token ?? null;
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
) {
  return supabase.auth.onAuthStateChange(callback);
}

export async function signIn({ email, password }: SignInInput): Promise<AuthResult> {
  const configError = getSupabaseConfigError();
  if (configError) {
    return { error: configError };
  }

  const emailError = validateEmail(email);
  if (emailError) {
    return { error: emailError };
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return { error: passwordError };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  return { error: error ? mapAuthError(error.message) : null };
}

/**
 * Register with username + email + password.
 * - username → user_metadata
 * - profiles upsert when table exists (soft-skip otherwise)
 * - Confirm email off → session present → treated as signed in
 */
export async function signUp({
  username,
  email,
  password,
}: SignUpInput): Promise<SignUpResult> {
  const configError = getSupabaseConfigError();
  if (configError) {
    return { error: configError, needsEmailConfirmation: false };
  }

  const usernameError = validateUsername(username);
  if (usernameError) {
    return { error: usernameError, needsEmailConfirmation: false };
  }

  const emailError = validateEmail(email);
  if (emailError) {
    return { error: emailError, needsEmailConfirmation: false };
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return { error: passwordError, needsEmailConfirmation: false };
  }

  const normalizedUsername = username.trim();
  const normalizedEmail = email.trim().toLowerCase();

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: {
        username: normalizedUsername,
      },
    },
  });

  if (error) {
    return { error: mapAuthError(error.message), needsEmailConfirmation: false };
  }

  const user = data.user;
  if (user) {
    const profile: Profile = {
      id: user.id,
      email: user.email ?? normalizedEmail,
      username: normalizedUsername,
    };
    const upsertResult = await upsertProfile(profile);
    // Unique username conflict is the only upsert error we surface
    if (upsertResult.error) {
      return { error: upsertResult.error, needsEmailConfirmation: false };
    }
  }

  // Confirm email disabled → data.session is present and user is logged in
  return {
    error: null,
    needsEmailConfirmation: !data.session,
  };
}

export async function signOut(): Promise<AuthResult> {
  const configError = getSupabaseConfigError();
  if (configError) {
    return { error: configError };
  }

  const { error } = await supabase.auth.signOut();
  return { error: error ? mapAuthError(error.message) : null };
}

/**
 * Resolve the best profile for a session user:
 * 1) profiles row when table exists
 * 2) fallback to user_metadata.username
 */
export async function resolveProfile(user: User): Promise<Profile> {
  const fromTable = await loadProfile(user.id);
  if (fromTable) {
    return {
      ...fromTable,
      email: fromTable.email ?? user.email ?? null,
      username: fromTable.username ?? profileFromUser(user).username,
    };
  }
  return profileFromUser(user);
}

function isMissingRelationError(message: string, code?: string): boolean {
  const lower = message.toLowerCase();
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    lower.includes("does not exist") ||
    lower.includes("could not find the table") ||
    lower.includes("schema cache")
  );
}
