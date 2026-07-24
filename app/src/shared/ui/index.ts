/**
 * [INPUT]: 聚合 shared/ui 设计系统原子组件
 * [OUTPUT]: 对外提供 Avatar/Button/Input(含 privacy)/Textarea/Card/Dialog/LogoMark 统一导出
 * [POS]: shared/ui 设计系统公共入口；pages/widgets 必须从此处或同目录文件导入 UI 原子
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
export { Avatar, type AvatarProps } from "./Avatar";
export { Button, type ButtonProps } from "./Button";
export { Card, type CardProps } from "./Card";
export { Dialog } from "./Dialog";
export { Input, type InputProps } from "./Input";
export { LogoMark } from "./LogoMark";
export { Textarea, type TextareaProps } from "./Textarea";
export { cn } from "./cn";
export { ToastViewport, showToast, type ToastKind } from "./toast";
