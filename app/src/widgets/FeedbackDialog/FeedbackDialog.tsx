/**
 * [INPUT]: 依赖 React useState/useEffect、react-router useLocation、
 *         shared/ui Dialog/Input/Textarea/Button/showToast、
 *         shared/services/api/client（apiJson / ApiClientError / 401 收敛）
 * [OUTPUT]: 对外提供 FeedbackDialog（受控模态：page / message / screenshot_url）
 * [POS]: widgets 最小反馈入口；提交到 POST /api/feedback，带 Authorization
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { MessageSquarePlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import { ApiClientError, apiJson } from "../../shared/services/api/client";
import { handleUnauthorized } from "../../shared/services/unauthorized";
import { Button, Dialog, Input, showToast, Textarea } from "../../shared/ui";

export type FeedbackDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type FeedbackPayload = {
  page: string;
  message: string;
  screenshot_url?: string;
};

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const location = useLocation();
  const [page, setPage] = useState(location.pathname);
  const [message, setMessage] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 每次打开：page 默认填当前路由，清空上次内容
  useEffect(() => {
    if (open) {
      setPage(location.pathname);
      setMessage("");
      setScreenshotUrl("");
      setError(null);
      setSubmitting(false);
    }
  }, [open, location.pathname]);

  const canSubmit = message.trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload: FeedbackPayload = {
        page: page.trim() || location.pathname,
        message: message.trim(),
      };
      if (screenshotUrl.trim()) {
        payload.screenshot_url = screenshotUrl.trim();
      }
      await apiJson<{ ok?: boolean }>("/api/feedback", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      showToast("已收到反馈", "success");
      onOpenChange(false);
    } catch (err) {
      // 401：会话失效，apiFetch 已触发回登录；此处仅兜底
      if (err instanceof ApiClientError && err.status === 401) {
        handleUnauthorized();
        return;
      }
      setError(err instanceof Error ? err.message : "提交失败，请稍后重试。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className="flex flex-col gap-12">
        <div className="flex items-center gap-8">
          <span className="ds-button__icon" aria-hidden="true">
            <MessageSquarePlus className="size-icon-md" />
          </span>
          <Dialog.Title>反馈</Dialog.Title>
        </div>
        <Dialog.Description>
          遇到问题或有建议？告诉我们所在页面与具体情况。
        </Dialog.Description>

        <label className="flex flex-col gap-4 font-helvetica-now text-meta text-graphite">
          页面路径
          <Input
            value={page}
            onChange={(e) => setPage(e.target.value)}
            aria-label="页面路径"
          />
        </label>

        <label className="flex flex-col gap-4 font-helvetica-now text-meta text-graphite">
          反馈内容<span className="text-ink">*</span>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            aria-label="反馈内容"
            placeholder="请描述你遇到的问题或建议…"
          />
        </label>

        <label className="flex flex-col gap-4 font-helvetica-now text-meta text-graphite">
          截图链接（可选）
          <Input
            value={screenshotUrl}
            onChange={(e) => setScreenshotUrl(e.target.value)}
            aria-label="截图链接"
            placeholder="粘贴截图链接（https://…）"
          />
        </label>

        {error ? (
          <p className="font-helvetica-now text-meta text-ink" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-8">
          <Dialog.Close asChild>
            <Button variant="ghost" size="sm" flat>
              取消
            </Button>
          </Dialog.Close>
          <Button
            size="sm"
            loading={submitting}
            disabled={!canSubmit}
            onClick={() => {
              void handleSubmit();
            }}
          >
            提交反馈
          </Button>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
