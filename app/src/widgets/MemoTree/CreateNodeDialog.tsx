/**
 * [INPUT]: 依赖 shared/ui 的 Dialog/Button/Input，依赖 store 的 createFolder/createMemo
 * [OUTPUT]: 对外提供 CreateNodeDialog（新建文件夹 / 新建备忘录）
 * [POS]: widgets/MemoTree 对话框层；右键菜单与拖拽后创建入口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useCallback, useEffect, useState } from "react";

import { Button, Dialog, Input } from "../../shared/ui";
import { useMemoTreeStore } from "../../shared/stores/memo-tree.store";

type CreateNodeType = "folder" | "memo";

type CreateNodeDialogProps = {
  open: boolean;
  type: CreateNodeType;
  parentId: string | null;
  onClose: () => void;
  onCreated?: (nodeId: string) => void;
};

export function CreateNodeDialog({
  open,
  type,
  parentId,
  onClose,
  onCreated,
}: CreateNodeDialogProps) {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const createFolder = useMemoTreeStore((s) => s.createFolder);
  const createMemo = useMemoTreeStore((s) => s.createMemo);

  useEffect(() => {
    if (open) {
      setTitle("");
    }
  }, [open]);

  const handleSubmit = useCallback(async () => {
    const trimmed = title.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    try {
      if (type === "folder") {
        const node = await createFolder({ parent_id: parentId, title: trimmed });
        onCreated?.(node.id);
      } else {
        const node = await createMemo({ parent_id: parentId, title: trimmed });
        onCreated?.(node.id);
      }
      onClose();
    } catch {
      // store 已回滚，此处只关 Dialog
      onClose();
    } finally {
      setLoading(false);
    }
  }, [title, loading, type, parentId, createFolder, createMemo, onCreated, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleSubmit();
    },
    [handleSubmit],
  );

  const dialogTitle = type === "folder" ? "新建文件夹" : "新建备忘录";

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Content>
        <Dialog.Title>{dialogTitle}</Dialog.Title>
        <Dialog.Description className="font-helvetica-now text-ui text-graphite">
          {type === "folder" ? "给文件夹取个名字" : "给备忘录取个标题"}
        </Dialog.Description>

        <div className="mt-12">
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={type === "folder" ? "文件夹名称" : "备忘录标题"}
            aria-label={dialogTitle}
          />
        </div>

        <div className="mt-16 flex justify-end gap-8">
          <Dialog.Close asChild>
            <Button variant="ghost" size="sm">取消</Button>
          </Dialog.Close>
          <Button
            size="sm"
            loading={loading}
            disabled={!title.trim()}
            onClick={handleSubmit}
          >
            创建
          </Button>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
