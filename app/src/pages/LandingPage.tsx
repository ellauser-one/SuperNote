/**
 * [INPUT]: 依赖 react-router-dom Link/useNavigate、shared/ui Button/LogoMark、AuthModal、useAuth
 * [OUTPUT]: 对外提供 LandingPage
 * [POS]: pages 营销首页；颜色/字号/间距全部消费 index.css token；Header 登录打开模态
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import {
  ArrowRight,
  BrainCircuit,
  Check,
  FolderTree,
  Inbox,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../app/providers/AuthProvider";
import { Button, LogoMark } from "../shared/ui";
import { AuthModal } from "../widgets/AuthModal/AuthModal";

const paintingUrl =
  "https://images.metmuseum.org/CRDImages/ep/original/DP-14936-001.jpg";

const trustMetrics = [
  { value: "4.8h", label: "每周少整理" },
  { value: "91%", label: "备忘录自动入库" },
  { value: "3s", label: "保存后完成归档" },
];

const problemSignals = [
  "灵感、会议、链接和待办混在一个收件箱",
  "临时文件夹越建越多，最后没人敢清理",
  "搜索靠记忆里的关键词，找不到就等于丢了",
];

const featureGroups = [
  {
    icon: Inbox,
    title: "统一收件箱",
    description: "把临时记录先接住，避免用户为了分类打断思路。",
  },
  {
    icon: BrainCircuit,
    title: "保存时判断",
    description: "AI 在保存瞬间读取主题、上下文与已有目录，给出归档动作。",
  },
  {
    icon: FolderTree,
    title: "自生长文件树",
    description: "没有合适位置时创建新夹，但保持命名、层级和密度克制。",
  },
  {
    icon: Search,
    title: "语义检索",
    description: "按问题、项目、人物或模糊线索回到原始备忘录。",
  },
  {
    icon: ShieldCheck,
    title: "可审计整理",
    description: "归档理由、移动记录和新建文件夹都能被用户回看。",
  },
  {
    icon: Sparkles,
    title: "冗余回收",
    description: "识别重复主题和过期碎片，把笔记库从堆积带回秩序。",
  },
];

const workflowSteps = [
  ["01", "Capture", "用户随手写下一条 memo，不需要先选择分类。"],
  ["02", "Classify", "系统比较现有文件树、近期上下文与备忘录语义。"],
  ["03", "Place", "AI 移入合适文件夹，必要时创建一个可解释的新位置。"],
  ["04", "Retrieve", "后续通过文件树、搜索或 Agent 对话重新找到它。"],
];

const pricingPlans = [
  {
    name: "Starter",
    price: "$5",
    note: "个人轻量记录",
    features: ["基础 AI 归档", "个人备忘录库", "常规语义搜索"],
  },
  {
    name: "Pro",
    price: "$20",
    note: "高频知识工作者",
    features: ["更高归档额度", "进阶目录治理", "上下文增强检索"],
    featured: true,
  },
  {
    name: "Studio",
    price: "$100",
    note: "团队与重度整理",
    features: ["团队级文件树", "审计与权限边界", "专属工作流额度"],
  },
];

const faqs = [
  {
    question: "SuperNote 会替我改写备忘录吗？",
    answer: "默认不改正文，只负责判断位置、命名文件夹和解释归档理由。",
  },
  {
    question: "AI 分错了怎么办？",
    answer: "用户可以移动回正确位置，系统会把这次选择作为后续整理信号。",
  },
  {
    question: "它和普通笔记软件最大的差别是什么？",
    answer: "普通笔记软件要求用户维护结构；SuperNote 把结构维护变成保存动作的一部分。",
  },
];

export function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);

  function enterWorkspace() {
    if (isAuthenticated) {
      navigate("/app");
      return;
    }
    setLoginOpen(true);
  }

  return (
    <div className="min-h-screen bg-putty text-ink">
      <header className="flex h-header-lg items-center justify-between px-20 md:px-32">
        <Link to="/" aria-label="SuperNote 首页" className="flex items-center gap-16">
          <LogoMark />
          <span className="font-helvetica-now text-ui font-medium uppercase text-ink">
            SuperNote
          </span>
        </Link>
        {isAuthenticated ? (
          <Link
            to="/app"
            className="font-helvetica-now text-ui text-ink underline-offset-4 hover:underline"
          >
            工作台
          </Link>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setLoginOpen(true)}>
            登录
          </Button>
        )}
      </header>

      <AuthModal open={loginOpen} onOpenChange={setLoginOpen} />

      <main>
        <section
          className="relative flex flex-col overflow-hidden px-20 pb-20 md:px-32"
          style={{ minHeight: "calc(100vh - var(--header-height-lg))" }}
        >
          <div className="mx-auto mt-40 flex max-w-prose-xl flex-col items-center text-center">
            <p className="font-helvetica-now text-ui font-medium uppercase text-graphite">
              Clean memo archive
            </p>
            <h1 className="mt-16 font-davinci text-heading-lg font-medium text-ink md:text-display-xl">
              您备忘录的保洁阿姨
            </h1>
            <p className="mt-20 max-w-prose-sm font-helvetica-now text-body-sm text-graphite">
              随手写，系统负责把零散内容擦干净、分好类、放回正确抽屉。
            </p>
            <div className="mt-20 flex items-center gap-28 font-helvetica-now text-title font-medium text-ink">
              <span>DIRTY: 12</span>
              <span>CLEAN: 128</span>
            </div>
            <Button
              className="mt-20"
              icon={<ArrowRight aria-hidden="true" />}
              onClick={enterWorkspace}
            >
              进入工作台
            </Button>
          </div>

          <p className="pointer-events-none mt-auto translate-y-[18%] whitespace-nowrap text-center font-davinci text-display-lg font-medium text-ink md:text-display">
            SuperNote
          </p>
        </section>

        <section className="border-y border-ink/15 bg-bone px-20 py-28 md:px-32">
          <div className="mx-auto grid max-w-shell gap-20 md:grid-cols-3">
            {trustMetrics.map((metric) => (
              <div
                key={metric.label}
                className="flex items-end justify-between gap-16 border-b border-ink/20 pb-16 md:border-b-0 md:border-r md:pr-20 last:md:border-r-0"
              >
                <p className="font-davinci text-heading font-medium text-ink">{metric.value}</p>
                <p className="max-w-metric-label text-right font-helvetica-now text-ui uppercase text-graphite">
                  {metric.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="relative min-h-[72vh] overflow-hidden bg-ink">
          <img src={paintingUrl} alt="" className="h-[72vh] w-full object-cover opacity-90" />
          <div className="absolute inset-x-20 bottom-0 mx-auto flex max-w-prose-xs flex-col items-start rounded-xl bg-ink p-20 text-paper md:bottom-32">
            <p className="font-helvetica-now text-caption uppercase text-paper/70">Scroll</p>
            <h2 className="mt-16 font-davinci text-heading-sm font-medium">每条备忘录都应有归处</h2>
            <p className="mt-16 font-helvetica-now text-body-sm text-paper/70">
              产品壳先呈现记录、整理与对话面板；真实模型连接留给 chat/api 边界。
            </p>
          </div>
        </section>

        <section className="bg-putty px-20 py-60 text-ink md:px-32 md:py-96">
          <div className="mx-auto grid max-w-shell gap-40 md:grid-cols-[0.9fr_1.1fr] md:items-start">
            <div>
              <p className="font-helvetica-now text-ui font-medium uppercase text-graphite">
                Why notes get lost
              </p>
              <h2 className="mt-16 font-davinci text-heading-lg font-medium md:text-display-sm">
                问题不在记录，而在保存之后
              </h2>
            </div>
            <div className="grid gap-16">
              {problemSignals.map((signal, index) => (
                <div
                  key={signal}
                  className="grid items-start gap-20 border-t border-ink/25 py-20"
                  style={{ gridTemplateColumns: "var(--spacing-48) 1fr" }}
                >
                  <span className="font-davinci text-heading-sm text-graphite">0{index + 1}</span>
                  <p className="font-helvetica-now text-title-lg text-ink">{signal}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-chalk px-20 py-60 text-ink md:px-32 md:py-96">
          <div className="mx-auto grid max-w-shell-lg gap-32 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <p className="font-helvetica-now text-ui font-medium uppercase text-graphite">
                Product preview
              </p>
              <h2 className="mt-16 font-davinci text-heading-lg font-medium md:text-display-md">
                保存一刻，文件树自己站好
              </h2>
              <p className="mt-20 max-w-prose-sm font-helvetica-now text-body-sm text-graphite">
                Landing 不需要讲玄学。用户看到的核心动作只有一个：写下内容，点击保存，系统把它放到正确位置。
              </p>
            </div>
            <div className="rounded-xl border border-ink/20 bg-paper p-20 shadow-preview">
              <div className="flex items-center justify-between border-b border-ink/10 pb-16">
                <div className="flex items-center gap-8">
                  <span className="size-8 rounded-full bg-ink" />
                  <span className="size-8 rounded-full bg-graphite" />
                  <span className="size-8 rounded-full bg-ash" />
                </div>
                <p className="font-helvetica-now text-meta uppercase text-graphite">Auto archive</p>
              </div>
              <div className="mt-20 grid gap-20 md:grid-cols-[0.75fr_1fr]">
                <div className="space-y-10 border-r-0 border-ink/10 md:border-r md:pr-16">
                  {["Inbox", "Product", "Research", "Life", "Archive"].map((folder, index) => (
                    <div
                      key={folder}
                      className={`flex items-center justify-between rounded-md px-12 py-10 font-helvetica-now text-ui-md ${
                        index === 2 ? "bg-ink text-paper" : "bg-bone text-ink"
                      }`}
                    >
                      <span>{folder}</span>
                      <span>{index === 0 ? "12" : index === 2 ? "24" : "8"}</span>
                    </div>
                  ))}
                </div>
                <div className="flex min-h-preview-panel flex-col rounded-xl bg-putty p-16">
                  <p className="font-helvetica-now text-ui uppercase text-graphite">New memo</p>
                  <p className="mt-16 font-davinci text-heading-sm">
                    “把本周用户访谈里的文件树混乱问题整理进产品研究。”
                  </p>
                  <div className="mt-auto rounded-xl bg-ink p-16 text-paper">
                    <p className="font-helvetica-now text-meta uppercase text-paper/70">AI decision</p>
                    <p className="mt-8 font-helvetica-now text-body-sm">
                      移动到 Research / User Interviews，并标记为信息架构问题。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-ink px-20 py-60 text-paper md:px-32 md:py-96">
          <h2 className="mx-auto max-w-measure text-center font-davinci text-heading-lg font-medium md:text-display-xl">
            CLEANING METHOD
          </h2>
          <div className="mx-auto mt-40 grid max-w-measure gap-28 md:grid-cols-3">
            {["识别脏乱", "归档放回", "回收冗余"].map((item) => (
              <div key={item} className="flex flex-col items-center gap-16 text-center">
                <div className="size-160 overflow-hidden rounded-full bg-ash">
                  <img src={paintingUrl} alt="" className="h-full w-full object-cover" />
                </div>
                <p className="font-davinci text-subheading font-normal">{item}</p>
                <div className="h-16 w-16 rotate-45 border border-paper" aria-hidden="true" />
              </div>
            ))}
          </div>
        </section>

        <section className="bg-ink px-20 pb-60 text-paper md:px-32 md:pb-96">
          <div className="mx-auto grid max-w-shell-lg gap-16 md:grid-cols-3">
            {featureGroups.map((feature) => {
              const Icon = feature.icon;

              return (
                <article
                  key={feature.title}
                  className="rounded-xl border border-paper/15 bg-paper/5 p-20"
                >
                  <Icon className="size-icon-sm text-paper" aria-hidden="true" />
                  <h3 className="mt-24 font-davinci text-heading-sm font-medium">{feature.title}</h3>
                  <p className="mt-12 font-helvetica-now text-body-sm text-paper/70">
                    {feature.description}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="bg-bone px-20 py-60 text-ink md:px-32 md:py-96">
          <div className="mx-auto max-w-shell-lg">
            <div className="flex flex-col justify-between gap-20 md:flex-row md:items-end">
              <div>
                <p className="font-helvetica-now text-ui font-medium uppercase text-graphite">
                  Workflow
                </p>
                <h2 className="mt-16 max-w-prose-xl font-davinci text-heading-lg font-medium md:text-display-md">
                  从收集到找回，只留一条路径
                </h2>
              </div>
              <Button
                className="self-start md:self-auto"
                icon={<ArrowRight aria-hidden="true" />}
                onClick={enterWorkspace}
              >
                试用工作台
              </Button>
            </div>
            <div className="mt-40 grid gap-0 border-y border-ink/20 md:grid-cols-4">
              {workflowSteps.map(([step, title, detail]) => (
                <article
                  key={step}
                  className="border-b border-ink/20 py-24 md:border-b-0 md:border-r md:px-20 last:md:border-r-0"
                >
                  <p className="font-helvetica-now text-ui uppercase text-graphite">{step}</p>
                  <h3 className="mt-28 font-davinci text-heading-sm font-medium">{title}</h3>
                  <p className="mt-12 font-helvetica-now text-body-sm text-graphite">{detail}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-putty px-20 py-60 text-ink md:px-32 md:py-96">
          <div className="mx-auto max-w-shell-lg">
            <div className="grid gap-20 md:grid-cols-[0.8fr_1.2fr] md:items-end">
              <h2 className="font-davinci text-heading-lg font-medium md:text-display-md">
                按整理强度付费
              </h2>
              <p className="max-w-prose-lg font-helvetica-now text-body-sm text-graphite md:justify-self-end">
                价格层级跟随 AI 归档额度、目录治理能力和团队协作边界增长，不把简单用户拖进复杂套餐。
              </p>
            </div>
            <div className="mt-40 grid gap-16 md:grid-cols-3">
              {pricingPlans.map((plan) => (
                <article
                  key={plan.name}
                  className={`rounded-xl border p-20 ${
                    plan.featured ? "border-ink bg-ink text-paper" : "border-ink/20 bg-bone text-ink"
                  }`}
                >
                  <div className="flex items-start justify-between gap-16">
                    <div>
                      <h3 className="font-davinci text-heading-sm font-medium">{plan.name}</h3>
                      <p
                        className={`mt-8 font-helvetica-now text-ui uppercase ${
                          plan.featured ? "text-paper/70" : "text-graphite"
                        }`}
                      >
                        {plan.note}
                      </p>
                    </div>
                    <p className="font-davinci text-heading font-medium">{plan.price}</p>
                  </div>
                  <p
                    className={`mt-4 text-right font-helvetica-now text-ui ${
                      plan.featured ? "text-paper/70" : "text-graphite"
                    }`}
                  >
                    / month
                  </p>
                  <div className="mt-28 space-y-14">
                    {plan.features.map((feature) => (
                      <div
                        key={feature}
                        className="flex items-start gap-10 font-helvetica-now text-body-sm"
                      >
                        <Check className="mt-2 size-icon-sm shrink-0" aria-hidden="true" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-chalk px-20 py-60 text-ink md:px-32 md:py-96">
          <div className="mx-auto grid max-w-shell gap-40 md:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="font-helvetica-now text-ui font-medium uppercase text-graphite">FAQ</p>
              <h2 className="mt-16 font-davinci text-heading-lg font-medium">
                先回答最容易误解的地方
              </h2>
            </div>
            <div className="border-t border-ink/20">
              {faqs.map((item) => (
                <article key={item.question} className="border-b border-ink/20 py-24">
                  <h3 className="font-davinci text-heading-sm font-medium">{item.question}</h3>
                  <p className="mt-12 font-helvetica-now text-body-sm text-graphite">{item.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-ink px-20 py-60 text-paper md:px-32 md:py-96">
          <div className="mx-auto flex max-w-measure flex-col items-center text-center">
            <LogoMark tone="paper" />
            <h2 className="mt-24 font-davinci text-heading-lg font-medium md:text-display-xl">
              让备忘录回到它该在的地方
            </h2>
            <p className="mt-20 max-w-prose-md font-helvetica-now text-body-sm text-paper/70">
              写下想法，然后离开。剩下的整理、归档、命名和找回，由 SuperNote 接住。
            </p>
            <Button
              className="mt-28"
              variant="inverse"
              icon={<ArrowRight aria-hidden="true" />}
              onClick={enterWorkspace}
            >
              进入工作台
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
