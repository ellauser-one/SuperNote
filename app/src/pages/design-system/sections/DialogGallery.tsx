/**
 * [INPUT]: 依赖 shared/ui Dialog/Button
 * [OUTPUT]: 默认导出 Dialog 交互示例
 * [POS]: design-system/sections 的 Dialog 展示块（独立 chunk）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Button, Dialog } from "../../../shared/ui";

export default function DialogGallery() {
  return (
    <div className="flex flex-wrap items-center gap-8">
      <Dialog.Root>
        <Dialog.Trigger className="ds-button ds-button--outline ds-button--sm">
          Open dialog
        </Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Title>Dialog</Dialog.Title>
          <Dialog.Description>
            Compound API: Root / Trigger / Content / Title / Description / Close.
          </Dialog.Description>
          <div className="mt-12 flex justify-end">
            <Dialog.Close className="ds-button ds-button--primary ds-button--sm">
              Close
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Root>
      <Button size="sm" variant="ghost" disabled>
        Static ref
      </Button>
    </div>
  );
}
