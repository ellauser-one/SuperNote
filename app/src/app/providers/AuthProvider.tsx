/**
 * [INPUT]: 依赖 React context、shared/services/auth 与 supabase 配置探测
 * [OUTPUT]: 对外提供 AuthProvider 与 useAuth（user/session/profile/loading + signIn/signUp/signOut）
 * [POS]: app/providers 全局鉴权状态；路由守卫、AuthModal、UserMenu 只读此上下文
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import {
  getSession,
  onAuthStateChange,
  profileFromUser,
  resolveProfile,
  signIn as authSignIn,
  signOut as authSignOut,
  signUp as authSignUp,
  type Profile,
  type SignInInput,
  type SignUpInput,
} from "../../shared/services/auth/auth.service";
import {
  getSupabaseConfigError,
  isSupabaseConfigured,
} from "../../shared/services/supabase/client";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** 启动恢复会话或切换会话时的加载态 */
  loading: boolean;
  isAuthenticated: boolean;
  isConfigured: boolean;
  configError: string | null;
  signIn: (input: SignInInput) => Promise<{ error: string | null }>;
  signUp: (input: SignUpInput) => Promise<{
    error: string | null;
    needsEmailConfirmation: boolean;
  }>;
  signOut: () => Promise<{ error: string | null }>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  const applySession = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);

    const nextUser = nextSession?.user ?? null;
    if (!nextUser) {
      setProfile(null);
      return;
    }

    // 先用 metadata 立刻填充，再异步拉 profiles
    setProfile(profileFromUser(nextUser));
    const resolved = await resolveProfile(nextUser);
    setProfile(resolved);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let mounted = true;

    void (async () => {
      const initial = await getSession();
      if (!mounted) {
        return;
      }
      await applySession(initial);
      if (mounted) {
        setLoading(false);
      }
    })();

    const {
      data: { subscription },
    } = onAuthStateChange((_event, nextSession) => {
      void (async () => {
        await applySession(nextSession);
        if (mounted) {
          setLoading(false);
        }
      })();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [applySession]);

  const signIn = useCallback(async (input: SignInInput) => {
    return authSignIn(input);
  }, []);

  const signUp = useCallback(async (input: SignUpInput) => {
    return authSignUp(input);
  }, []);

  const signOut = useCallback(async () => {
    const result = await authSignOut();
    if (!result.error) {
      // 立即清空本地态；onAuthStateChange 也会再清一次
      setSession(null);
      setProfile(null);
    }
    return result;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      isAuthenticated: Boolean(session?.user),
      isConfigured: isSupabaseConfigured,
      configError: getSupabaseConfigError(),
      signIn,
      signUp,
      signOut,
    }),
    [session, profile, loading, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
