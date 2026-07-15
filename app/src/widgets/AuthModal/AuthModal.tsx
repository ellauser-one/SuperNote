/**
 * [INPUT]: 依赖 shared/ui Dialog/Button/Input、useAuth、react-router-dom navigate
 * [OUTPUT]: 对外提供 AuthModal（登录 email+password / 注册 username+email+password）
 * [POS]: widgets/AuthModal 登录业务编排；登录态不提供 username-only（留给 api/）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useId, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../app/providers/AuthProvider";
import { Button, Dialog, Input } from "../../shared/ui";

type AuthMode = "sign-in" | "sign-up";

export type AuthModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const navigate = useNavigate();
  const { signIn, signUp, configError, isAuthenticated } = useAuth();
  const usernameId = useId();
  const emailId = useId();
  const passwordId = useId();

  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setError(null);
    setInfo(null);
    setSubmitting(false);
  }, [open, mode]);

  useEffect(() => {
    if (open && isAuthenticated) {
      onOpenChange(false);
      navigate("/app", { replace: true });
    }
  }, [open, isAuthenticated, navigate, onOpenChange]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) {
      return;
    }

    setError(null);
    setInfo(null);
    setSubmitting(true);

    try {
      if (mode === "sign-in") {
        const result = await signIn({ email, password });
        if (result.error) {
          setError(result.error);
          return;
        }

        onOpenChange(false);
        navigate("/app", { replace: true });
        return;
      }

      const result = await signUp({ username, email, password });
      if (result.error) {
        setError(result.error);
        return;
      }

      // Confirm email 已关闭时应有 session；若仍无 session 则提示查邮件
      if (result.needsEmailConfirmation) {
        setInfo("注册成功。请查收邮箱完成验证后再登录。");
        setMode("sign-in");
        return;
      }

      onOpenChange(false);
      navigate("/app", { replace: true });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content>
        <div className="flex items-start justify-between gap-12">
          <div className="min-w-0">
            <Dialog.Title>{mode === "sign-in" ? "登录 SuperNote" : "创建账户"}</Dialog.Title>
            <Dialog.Description>
              {mode === "sign-in"
                ? "使用邮箱与密码进入工作台。用户名登录将由服务端提供。"
                : "填写用户名、邮箱与密码即可开始自动归档。"}
            </Dialog.Description>
          </div>
          <Dialog.Close
            className="font-helvetica-now text-ui text-graphite underline-offset-4 hover:underline"
            aria-label="关闭登录"
          >
            关闭
          </Dialog.Close>
        </div>

        <div
          className="mt-16 flex items-center gap-20 border-b border-vellum"
          role="tablist"
          aria-label="登录或注册"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "sign-in"}
            onClick={() => setMode("sign-in")}
            className={`-mb-px border-b-2 pb-10 font-helvetica-now text-ui font-medium uppercase transition-colors ${
              mode === "sign-in"
                ? "border-ink text-ink"
                : "border-transparent text-graphite hover:text-ink"
            }`}
          >
            登录
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "sign-up"}
            onClick={() => setMode("sign-up")}
            className={`-mb-px border-b-2 pb-10 font-helvetica-now text-ui font-medium uppercase transition-colors ${
              mode === "sign-up"
                ? "border-ink text-ink"
                : "border-transparent text-graphite hover:text-ink"
            }`}
          >
            注册
          </button>
        </div>

        <form className="mt-16 flex flex-col gap-12" onSubmit={handleSubmit} noValidate>
          {mode === "sign-up" ? (
            <label className="flex flex-col gap-6" htmlFor={usernameId}>
              <span className="font-helvetica-now text-ui font-medium uppercase text-graphite">
                用户名
              </span>
              <Input
                id={usernameId}
                name="username"
                type="text"
                autoComplete="username"
                placeholder="3–24 位字母数字下划线"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
                disabled={submitting}
                minLength={3}
                maxLength={24}
              />
            </label>
          ) : null}

          <label className="flex flex-col gap-6" htmlFor={emailId}>
            <span className="font-helvetica-now text-ui font-medium uppercase text-graphite">
              邮箱
            </span>
            <Input
              id={emailId}
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={submitting}
            />
          </label>

          <label className="flex flex-col gap-6" htmlFor={passwordId}>
            <span className="font-helvetica-now text-ui font-medium uppercase text-graphite">
              密码
            </span>
            <Input
              id={passwordId}
              name="password"
              privacy
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              placeholder="至少 6 位"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              disabled={submitting}
            />
          </label>

          {configError ? (
            <p className="font-helvetica-now text-ui text-ink" role="alert">
              {configError}
            </p>
          ) : null}

          {error ? (
            <p className="font-helvetica-now text-ui text-ink" role="alert">
              {error}
            </p>
          ) : null}

          {info ? (
            <p className="font-helvetica-now text-ui text-graphite" role="status">
              {info}
            </p>
          ) : null}

          <div className="mt-4 flex items-center justify-end gap-8">
            <Dialog.Close className="ds-button ds-button--ghost ds-button--sm" disabled={submitting}>
              取消
            </Dialog.Close>
            <Button type="submit" size="sm" loading={submitting}>
              {mode === "sign-in" ? "进入工作台" : "注册并继续"}
            </Button>
          </div>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
