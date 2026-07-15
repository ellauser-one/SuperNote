/**
 * [INPUT]: 依赖 shared/ui Button
 * [OUTPUT]: 默认导出 Button 变体矩阵（含 ghost 与 loading）
 * [POS]: design-system/sections 的 Button 展示块
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Save, SendHorizontal } from "lucide-react";

import { Button } from "../../../shared/ui";

export default function ButtonGallery() {
  return (
    <div className="grid gap-12">
      <section className="rounded-lg bg-putty p-16">
        <p className="mb-10 font-helvetica-now text-meta uppercase text-graphite">
          Variants · primary / outline / ghost
        </p>
        <div className="flex flex-wrap items-center gap-10">
          <Button>Primary md</Button>
          <Button size="sm">Primary sm</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="ghost" size="sm">
            Ghost sm
          </Button>
          <Button icon={<Save aria-hidden="true" />}>With icon</Button>
          <Button size="sm" icon={<SendHorizontal aria-hidden="true" />}>
            Send
          </Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      <section className="rounded-lg bg-putty p-16">
        <p className="mb-10 font-helvetica-now text-meta uppercase text-graphite">
          Loading · spinner + shimmer
        </p>
        <div className="flex flex-wrap items-center gap-10">
          <Button loading>Saving</Button>
          <Button loading size="sm">
            Wait
          </Button>
          <Button loading variant="outline">
            Loading
          </Button>
          <Button loading variant="ghost">
            Ghost load
          </Button>
        </div>
      </section>

      <section className="rounded-lg bg-ink p-16">
        <p className="mb-10 font-helvetica-now text-meta uppercase text-paper/60">
          On ink · inverse / loading
        </p>
        <div className="flex flex-wrap items-center gap-10">
          <Button variant="inverse">Inverse md</Button>
          <Button variant="inverse" size="sm">
            Inverse sm
          </Button>
          <Button variant="inverse" icon={<Save aria-hidden="true" />}>
            Save
          </Button>
          <Button variant="inverse" loading>
            Loading
          </Button>
        </div>
      </section>
    </div>
  );
}
