/**
 * [INPUT]: 无重依赖；仅登记 design system 组件元数据与动态 import 工厂
 * [OUTPUT]: 对外提供 galleryEntries 轻量注册表
 * [POS]: pages/design-system 的组件清单真相源；禁止在此静态 import 全部 UI 组件
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { ComponentType } from "react";

export type GalleryEntry = {
  id: string;
  name: string;
  file: string;
  /** 动态加载对应展示区块，保证首屏不打包全部 gallery section */
  load: () => Promise<{ default: ComponentType }>;
};

export const galleryEntries: readonly GalleryEntry[] = [
  {
    id: "button",
    name: "Button",
    file: "shared/ui/Button.tsx",
    load: () => import("./sections/ButtonGallery"),
  },
  {
    id: "input",
    name: "Input",
    file: "shared/ui/Input.tsx",
    load: () => import("./sections/InputGallery"),
  },
  {
    id: "textarea",
    name: "Textarea",
    file: "shared/ui/Textarea.tsx",
    load: () => import("./sections/TextareaGallery"),
  },
  {
    id: "card",
    name: "Card",
    file: "shared/ui/Card.tsx",
    load: () => import("./sections/CardGallery"),
  },
  {
    id: "dialog",
    name: "Dialog",
    file: "shared/ui/Dialog.tsx",
    load: () => import("./sections/DialogGallery"),
  },
  {
    id: "logo-mark",
    name: "LogoMark",
    file: "shared/ui/LogoMark.tsx",
    load: () => import("./sections/LogoMarkGallery"),
  },
] as const;
