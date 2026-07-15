/**
 * [INPUT]: 依赖 shared/ui Input
 * [OUTPUT]: 默认导出 Input 变体矩阵（含 privacy）
 * [POS]: design-system/sections 的 Input 展示块（独立 chunk）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Input } from "../../../shared/ui";

export default function InputGallery() {
  return (
    <div className="grid gap-10">
      <label className="grid gap-4">
        <span className="font-helvetica-now text-meta text-graphite">fieldSize=md</span>
        <Input placeholder="Default input" aria-label="Default input" />
      </label>
      <label className="grid gap-4">
        <span className="font-helvetica-now text-meta text-graphite">fieldSize=lg</span>
        <Input fieldSize="lg" placeholder="Large input" aria-label="Large input" />
      </label>
      <label className="grid gap-4">
        <span className="font-helvetica-now text-meta text-graphite">privacy（眼睛切换）</span>
        <Input
          privacy
          placeholder="至少 6 位"
          defaultValue="secret-pass"
          aria-label="Privacy input"
          autoComplete="off"
        />
      </label>
      <label className="grid gap-4">
        <span className="font-helvetica-now text-meta text-graphite">privacy · fieldSize=lg</span>
        <Input
          privacy
          fieldSize="lg"
          placeholder="Large privacy"
          aria-label="Large privacy input"
          autoComplete="off"
        />
      </label>
      <label className="grid gap-4">
        <span className="font-helvetica-now text-meta text-graphite">privacy · disabled</span>
        <Input
          privacy
          disabled
          defaultValue="hidden"
          aria-label="Disabled privacy input"
        />
      </label>
      <label className="grid gap-4">
        <span className="font-helvetica-now text-meta text-graphite">disabled</span>
        <Input disabled placeholder="Disabled" aria-label="Disabled input" />
      </label>
    </div>
  );
}
