/**
 * [INPUT]: 依赖 React useMemo/useState，依赖 lucide-react 图标
 * [OUTPUT]: 对外提供 MemoLibraryPage
 * [POS]: pages 备忘录视图；紧凑文件树与详情，token 来自 index.css
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { FileText, Folder, FolderOpen } from "lucide-react";
import { useMemo, useState } from "react";

type Memo = {
  id: string;
  title: string;
  updatedAt: string;
  summary: string;
  content: string[];
};

type MemoFolder = {
  id: string;
  name: string;
  children?: MemoFolder[];
  memos?: Memo[];
};

const folders: MemoFolder[] = [
  {
    id: "product",
    name: "产品",
    children: [
      {
        id: "research",
        name: "用户研究",
        memos: [
          {
            id: "tree-chaos",
            title: "文件树混乱访谈",
            updatedAt: "今天 10:24",
            summary: "用户接受 AI 给出归档理由，但希望保留撤销能力。",
            content: ["高频记录者不会在输入前分类。", "目录越多，越不敢移动旧内容。", "保存动作必须承担整理成本。"],
          },
          {
            id: "pricing-draft",
            title: "定价草案",
            updatedAt: "昨天 18:12",
            summary: "$5 / $20 / $100 三档，按 AI 归档额度和团队能力区分。",
            content: ["Starter 面向个人轻量记录。", "Pro 面向高频知识工作者。", "Studio 面向团队与重度整理。"],
          },
        ],
      },
      {
        id: "roadmap",
        name: "路线图",
        memos: [
          {
            id: "q3-auto-archive",
            title: "Q3 自动归档路线",
            updatedAt: "周一 09:40",
            summary: "先做本地模拟，再接 chat/api，最后加入归档审计。",
            content: ["新建页接 MDX 编辑器。", "备忘录页提供文件树和详情。", "保存时调用 AI 分类。"],
          },
        ],
      },
    ],
  },
  {
    id: "work",
    name: "工作",
    memos: [
      {
        id: "weekly",
        title: "周会零散记录",
        updatedAt: "周二 15:30",
        summary: "行动项需要拆到项目文件夹，保留原始会议上下文。",
        content: ["Landing page 已补齐商业结构。", "App 需要进入三页信息架构。", "下次接入真实保存 API。"],
      },
    ],
  },
  {
    id: "life",
    name: "个人",
    memos: [
      {
        id: "reading",
        title: "读书摘记",
        updatedAt: "6 月 28 日",
        summary: "关于信息整理与长期知识库的几条摘记。",
        content: ["好的笔记系统不是写得多。", "关键是找得回、接得住、改得动。"],
      },
    ],
  },
];

function collectMemos(items: MemoFolder[]): Memo[] {
  return items.flatMap((folder) => [
    ...(folder.memos ?? []),
    ...collectMemos(folder.children ?? []),
  ]);
}

type FolderTreeProps = {
  items: MemoFolder[];
  selectedMemoId: string;
  onSelectMemo: (memoId: string) => void;
};

function FolderTree({ items, selectedMemoId, onSelectMemo }: FolderTreeProps) {
  return (
    <ul className="space-y-2">
      {items.map((folder) => (
        <li key={folder.id}>
          <div className="flex h-row items-center gap-6 px-4 font-helvetica-now text-ui font-medium text-ink">
            {folder.children ? (
              <FolderOpen className="size-icon-xs shrink-0 text-graphite" aria-hidden="true" />
            ) : (
              <Folder className="size-icon-xs shrink-0 text-graphite" aria-hidden="true" />
            )}
            <span className="truncate">{folder.name}</span>
          </div>
          {folder.memos ? (
            <ul className="ml-10 space-y-1 border-l border-vellum pl-8">
              {folder.memos.map((memo) => (
                <li key={memo.id}>
                  <button
                    type="button"
                    onClick={() => onSelectMemo(memo.id)}
                    className={`flex h-row w-full items-center gap-6 rounded-sm px-6 text-left font-helvetica-now text-ui ${
                      memo.id === selectedMemoId
                        ? "bg-ink text-paper"
                        : "text-graphite hover:bg-bone"
                    }`}
                  >
                    <FileText className="size-icon-xs shrink-0" aria-hidden="true" />
                    <span className="truncate">{memo.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {folder.children ? (
            <div className="ml-10 border-l border-vellum pl-8">
              <FolderTree
                items={folder.children}
                selectedMemoId={selectedMemoId}
                onSelectMemo={onSelectMemo}
              />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function MemoLibraryPage() {
  const allMemos = useMemo(() => collectMemos(folders), []);
  const [selectedMemoId, setSelectedMemoId] = useState(allMemos[0]?.id ?? "");
  const selectedMemo = allMemos.find((memo) => memo.id === selectedMemoId) ?? allMemos[0];

  return (
    <main
      className="ds-notes-grid min-w-0 bg-paper text-ink"
    >
      <aside className="flex min-h-0 min-w-0 flex-col overflow-hidden border-r border-vellum bg-chalk">
        <div className="flex shrink-0 items-center justify-between gap-8 border-b border-vellum px-12 py-10">
          <div className="min-w-0">
            <p className="font-helvetica-now text-label font-medium uppercase text-graphite">
              Memo Tree
            </p>
            <h1 className="truncate font-davinci text-title font-medium">备忘录</h1>
          </div>
          <span className="shrink-0 font-helvetica-now text-meta text-graphite">
            {allMemos.length} 条
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-8 py-8">
          <FolderTree
            items={folders}
            selectedMemoId={selectedMemoId}
            onSelectMemo={setSelectedMemoId}
          />
        </div>
      </aside>

      <section className="min-h-0 min-w-0 overflow-y-auto px-20 py-16 md:px-32">
        {selectedMemo ? (
          <article className="mx-auto max-w-content">
            <div className="border-b border-vellum pb-12">
              <p className="font-helvetica-now text-meta uppercase text-graphite">
                {selectedMemo.updatedAt}
              </p>
              <h2 className="mt-8 font-davinci text-heading-md font-medium">
                {selectedMemo.title}
              </h2>
              <p className="mt-8 max-w-content-sm font-helvetica-now text-ui-md text-graphite">
                {selectedMemo.summary}
              </p>
            </div>

            <div className="mt-16 space-y-12 font-helvetica-now text-body text-ink">
              {selectedMemo.content.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </article>
        ) : null}
      </section>
    </main>
  );
}
