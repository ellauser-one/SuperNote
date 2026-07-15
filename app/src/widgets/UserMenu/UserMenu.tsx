/**
 * [INPUT]: 依赖 lucide-react、shared/ui Avatar/Button、useAuth、react-router navigate
 * [OUTPUT]: 对外提供 UserMenu（账户入口 + 退出登录）
 * [POS]: widgets/UserMenu 侧栏底部账户区；展示 profile.username 优先于 email
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { LogOut } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../app/providers/AuthProvider";
import { Avatar, Button } from "../../shared/ui";

export type UserMenuProps = {
  /** 当前是否高亮「个人主页」 */
  isProfileActive?: boolean;
  onOpenProfile?: () => void;
};

function accountInitials(label: string | undefined | null): string {
  if (!label) {
    return "?";
  }
  const local = label.includes("@") ? (label.split("@")[0] ?? label) : label;
  return local.slice(0, 2).toUpperCase();
}

export function UserMenu({ isProfileActive = false, onOpenProfile }: UserMenuProps) {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const displayName =
    profile?.username?.trim() ||
    user?.email ||
    "已登录";
  const email = user?.email ?? profile?.email ?? "";

  async function handleSignOut() {
    if (signingOut) {
      return;
    }

    setSignOutError(null);
    setSigningOut(true);

    try {
      const result = await signOut();
      if (result.error) {
        setSignOutError(result.error);
        return;
      }
      navigate("/", { replace: true });
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="mt-10 shrink-0 border-t border-paper/20 pt-10">
      <p className="font-helvetica-now text-meta uppercase text-paper/60">账户</p>

      <button
        type="button"
        onClick={onOpenProfile}
        aria-current={isProfileActive ? "page" : undefined}
        className={`mt-8 flex w-full min-w-0 items-center gap-8 rounded-sm px-8 py-6 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-paper/50 ${
          isProfileActive ? "bg-paper text-ink" : "text-paper hover:bg-paper/10"
        }`}
      >
        <Avatar
          size="sm"
          tone={isProfileActive ? "default" : "on-ink"}
          fallback={accountInitials(displayName)}
          alt={displayName}
        />
        <span className="min-w-0 flex-1">
          <span
            className={`block truncate font-helvetica-now text-ui ${
              isProfileActive ? "text-ink" : "text-paper"
            }`}
            title={displayName}
          >
            {displayName}
          </span>
          <span
            className={`mt-2 block truncate font-helvetica-now text-meta ${
              isProfileActive ? "text-graphite" : "text-paper/60"
            }`}
            title={email || "个人主页"}
          >
            {email || "个人主页"}
          </span>
        </span>
      </button>

      {signOutError ? (
        <p className="mt-6 font-helvetica-now text-meta text-paper/80" role="alert">
          {signOutError}
        </p>
      ) : null}

      <Button
        className="mt-10 w-full"
        variant="inverse"
        size="sm"
        loading={signingOut}
        icon={<LogOut aria-hidden="true" />}
        onClick={() => {
          void handleSignOut();
        }}
      >
        退出登录
      </Button>
    </div>
  );
}
