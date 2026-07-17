/**
 * [INPUT]: 依赖 shared/ui Button/Card、lucide-react 图标、
 *         features/agent-chat/tools/memo-write-tools ConfirmationStore
 * [OUTPUT]: 对外提供 ToolConfirmCard（写入确认卡片组件）
 * [POS]: features/agent-chat/components/tools；AgentPanel 消息流内嵌渲染
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 职责：
 * - 展示即将执行的写操作摘要（create_memo / update_memo）
 * - 用户确认 → ConfirmationStore.confirm() → 工具 execute 继续
 * - 用户拒绝 → ConfirmationStore.reject() → 工具返回 user_rejected
 */
import { FilePlus, Pencil } from "lucide-react";
import { useEffect, useState } from "react";

import { Button, Card } from "../../../../shared/ui";
import {
  ConfirmationStore,
} from "../../tools/memo-write-tools";

/* -------------------------------------------------------------------------- */
/* 工具输入摘要提取                                                             */
/* -------------------------------------------------------------------------- */

function summarizeCreate(input: Record<string, unknown>): {
  label: string;
  title: string;
  content: string;
} {
  const title =
    typeof input.title === "string" && input.title.trim()
      ? input.title.trim()
      : "新备忘录";
  const content =
    typeof input.content === "string" ? input.content : "";
  return { label: "创建备忘录", title, content };
}

function summarizeUpdate(input: Record<string, unknown>): {
  label: string;
  id: string;
  changes: string[];
  content: string;
} {
  const id = typeof input.id === "string" ? input.id : "?";
  const patch =
    input.patch && typeof input.patch === "object"
      ? (input.patch as Record<string, unknown>)
      : {};
  const changes: string[] = [];
  if (typeof patch.title === "string") changes.push(`标题 → ${patch.title}`);
  if (typeof patch.category === "string")
    changes.push(`分类 → ${patch.category}`);
  if (Array.isArray(patch.tags))
    changes.push(`标签 → ${patch.tags.join(", ")}`);
  if (typeof patch.pinned === "boolean")
    changes.push(patch.pinned ? "置顶" : "取消置顶");
  const content =
    typeof patch.content === "string" ? patch.content : "";
  return { label: "修改备忘录", id, changes, content };
}

/* -------------------------------------------------------------------------- */
/* 组件                                                                        */
/* -------------------------------------------------------------------------- */

export function ToolConfirmCard() {
  // 自订阅：ConfirmationStore 变更时触发重渲染
  const [, setTick] = useState(0);
  useEffect(() => {
    return ConfirmationStore.subscribe(() => setTick((t) => t + 1));
  }, []);

  const pending = ConfirmationStore.pending;
  if (!pending) return null;

  const { toolName, input } = pending;
  const isCreate = toolName === "create_memo";
  const Icon = isCreate ? FilePlus : Pencil;

  const summary = isCreate
    ? summarizeCreate(input)
    : summarizeUpdate(input);

  return (
    <Card
      tone="paper"
      className="rounded-md border border-amber-200 p-8"
    >
      <div className="flex items-center gap-4">
        <Icon className="size-icon-sm shrink-0 text-amber-600" aria-hidden="true" />
        <p className="font-helvetica-now text-label font-medium uppercase text-amber-700">
          {summary.label}
        </p>
      </div>

      {/* 摘要区 */}
      <div className="mt-4 space-y-2 font-helvetica-now text-ui text-ink">
        {isCreate ? (
          <>
            <p>
              <span className="font-medium">标题：</span>
              {summarizeCreate(input).title}
            </p>
          </>
        ) : (
          <>
            <p>
              <span className="font-medium">目标 id：</span>
              <code className="font-helvetica-now text-meta">
                {summarizeUpdate(input).id}
              </code>
            </p>
            {summarizeUpdate(input).changes.length > 0 && (
              <ul className="list-disc pl-16 text-meta text-graphite">
                {summarizeUpdate(input).changes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            )}
          </>
        )}
        {"content" in summary && summary.content && (
          <div className="mt-2 max-h-[120px] overflow-y-auto rounded bg-bone p-4">
            <pre className="whitespace-pre-wrap font-helvetica-now text-meta text-graphite">
              {summary.content.length > 300
                ? `${summary.content.slice(0, 300)}…`
                : summary.content}
            </pre>
          </div>
        )}
      </div>

      {/* 操作区 */}
      <div className="mt-6 flex gap-4">
        <Button
          size="sm"
          onClick={() => ConfirmationStore.confirm()}
        >
          确认写入
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => ConfirmationStore.reject()}
        >
          取消
        </Button>
      </div>
    </Card>
  );
}
