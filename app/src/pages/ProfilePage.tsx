/**
 * [INPUT]: 依赖 React useId/useRef/useState、lucide-react、useAuth、shared/ui Avatar/Button/Card/Input
 * [OUTPUT]: 对外提供 ProfilePage 个人主页（展示 auth profile；昵称/头像保存仍空接）
 * [POS]: pages 个人资料视图；username 来自 profiles 或 user_metadata，保存 API 待 profiles 表就绪
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Camera, Save, UserRound } from "lucide-react";
import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";

import { useAuth } from "../app/providers/AuthProvider";
import { Avatar, Button, Card, Input } from "../shared/ui";

/** 从邮箱或昵称推导头像字标 */
function initialsFrom(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) {
    return "?";
  }

  const local = trimmed.includes("@") ? trimmed.split("@")[0] ?? trimmed : trimmed;
  return local.slice(0, 2).toUpperCase();
}

export function ProfilePage() {
  const { user, profile } = useAuth();
  const nicknameId = useId();
  const emailId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const email = user?.email ?? profile?.email ?? "";
  const userId = user?.id ?? "—";
  const username = profile?.username ?? "";

  const [nickname, setNickname] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // 预填：优先 profiles / user_metadata 的 username，否则用邮箱本地部分
  useEffect(() => {
    if (username) {
      setNickname(username);
      return;
    }
    if (!email) {
      setNickname("");
      return;
    }
    const local = email.split("@")[0] ?? "";
    setNickname(local);
  }, [email, username]);

  // 释放本地预览 URL，避免内存泄漏
  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  function handleAvatarPick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // 允许重复选择同一文件
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setStatusMessage("请选择图片文件作为头像。");
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    setAvatarPreview((previous) => {
      if (previous) {
        URL.revokeObjectURL(previous);
      }
      return nextUrl;
    });
    // 无 Storage / profile 表：仅本地预览
    setStatusMessage("头像已本地预览。上传与持久化待 profile 表接入后实现。");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // 无 API：保存动作占位
    setStatusMessage("资料保存逻辑待接入（profile 表尚未建立）。");
  }

  const displayLabel = nickname.trim() || email || "用户";
  const fallback = initialsFrom(displayLabel);

  return (
    <main className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-putty text-ink">
      <header className="flex h-header shrink-0 items-center justify-between border-b border-vellum bg-paper px-12 md:px-16">
        <div className="min-w-0">
          <p className="font-helvetica-now text-label font-medium uppercase text-graphite">
            Profile
          </p>
          <h1 className="truncate font-davinci text-title font-medium">个人主页</h1>
        </div>
        <p className="hidden shrink-0 font-helvetica-now text-meta text-graphite sm:block">
          UI 预览 · 数据待接入
        </p>
      </header>

      <section className="min-h-0 flex-1 overflow-y-auto px-12 py-16 md:px-16">
        <div className="mx-auto w-full max-w-content-sm">
          <Card tone="paper" className="p-16 md:p-20">
            <div className="flex flex-col gap-16 sm:flex-row sm:items-center">
              <div className="flex shrink-0 flex-col items-start gap-10">
                <Avatar
                  size="xl"
                  src={avatarPreview}
                  alt={`${displayLabel} 的头像`}
                  fallback={fallback}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  aria-label="选择头像图片"
                  onChange={handleAvatarPick}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  icon={<Camera aria-hidden="true" />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  更换头像
                </Button>
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-helvetica-now text-label font-medium uppercase text-graphite">
                  当前账户
                </p>
                <p className="mt-6 truncate font-davinci text-title-md font-medium text-ink">
                  {displayLabel}
                </p>
                <p className="mt-4 truncate font-helvetica-now text-ui text-graphite" title={email}>
                  {email || "未绑定邮箱"}
                </p>
              </div>
            </div>

            <form className="mt-20 flex flex-col gap-16" onSubmit={handleSubmit} noValidate>
              <div className="flex flex-col gap-6">
                <label
                  htmlFor={nicknameId}
                  className="font-helvetica-now text-label font-medium uppercase text-graphite"
                >
                  昵称
                </label>
                <Input
                  id={nicknameId}
                  name="nickname"
                  fieldSize="lg"
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  placeholder="设置显示昵称"
                  autoComplete="nickname"
                  maxLength={48}
                />
                <p className="font-helvetica-now text-meta text-graphite">
                  展示名称；保存接口尚未接入。
                </p>
              </div>

              <div className="flex flex-col gap-6">
                <label
                  htmlFor={emailId}
                  className="font-helvetica-now text-label font-medium uppercase text-graphite"
                >
                  邮箱
                </label>
                <Input
                  id={emailId}
                  name="email"
                  fieldSize="lg"
                  value={email}
                  readOnly
                  disabled
                  aria-readonly="true"
                />
              </div>

              <div className="grid gap-12 border-t border-vellum pt-16 sm:grid-cols-2">
                <div className="min-w-0">
                  <p className="font-helvetica-now text-label font-medium uppercase text-graphite">
                    用户 ID
                  </p>
                  <p
                    className="mt-6 break-all font-helvetica-now text-ui text-ink"
                    title={userId}
                  >
                    {userId}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="font-helvetica-now text-label font-medium uppercase text-graphite">
                    订阅
                  </p>
                  <p className="mt-6 font-helvetica-now text-ui text-graphite">—</p>
                </div>
              </div>

              {statusMessage ? (
                <p
                  className="rounded-md border border-vellum bg-chalk px-10 py-8 font-helvetica-now text-ui text-graphite"
                  role="status"
                >
                  {statusMessage}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-8">
                <Button type="submit" size="md" icon={<Save aria-hidden="true" />}>
                  保存资料
                </Button>
                <p className="font-helvetica-now text-meta text-graphite">
                  逻辑空接 · profile 表建立后再写 API
                </p>
              </div>
            </form>
          </Card>

          <Card tone="bone" className="mt-12 flex items-start gap-10 p-16">
            <UserRound className="mt-2 size-icon-md shrink-0 text-graphite" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-helvetica-now text-ui font-medium text-ink">关于本页</p>
              <p className="mt-6 font-helvetica-now text-ui text-graphite">
                个人主页目前只做界面与本地交互预览。昵称、头像上传不会写入数据库；待
                profile 表与存储就绪后再接真实读写。
              </p>
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}
