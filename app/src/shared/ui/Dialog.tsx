/**
 * [INPUT]: 依赖 React context/state 与 createPortal；样式真相来自 index.css 的 .ds-dialog*
 * [OUTPUT]: 对外提供 Dialog 设计系统对话框（Root/Trigger/Content/Title/Description/Close）
 * [POS]: shared/ui 原子组件，替代第三方 Dialog；支持受控 open/onOpenChange
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { cn } from "./cn";

type DialogContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  titleId: string;
  descriptionId: string;
};

const DialogContext = createContext<DialogContextValue | null>(null);

function useDialogContext(component: string): DialogContextValue {
  const context = useContext(DialogContext);

  if (!context) {
    throw new Error(`${component} must be used within Dialog.Root`);
  }

  return context;
}

type DialogRootProps = {
  children: ReactNode;
  defaultOpen?: boolean;
  /** Controlled open state. When set, pair with onOpenChange. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

function DialogRoot({
  children,
  defaultOpen = false,
  open: openProp,
  onOpenChange,
}: DialogRootProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : uncontrolledOpen;
  const titleId = useId();
  const descriptionId = useId();

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(next);
      }
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  const value = useMemo(
    () => ({ open, setOpen, titleId, descriptionId }),
    [open, setOpen, titleId, descriptionId],
  );

  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>;
}

type DialogTriggerProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

function DialogTrigger({ children, className, onClick, type = "button", ...props }: DialogTriggerProps) {
  const { setOpen } = useDialogContext("Dialog.Trigger");

  return (
    <button
      type={type}
      className={className}
      onClick={(event) => {
        onClick?.(event);
        setOpen(true);
      }}
      {...props}
    >
      {children}
    </button>
  );
}

type DialogContentProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

function DialogContent({ children, className, ...props }: DialogContentProps) {
  const { open, setOpen, titleId, descriptionId } = useDialogContext("Dialog.Content");

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    },
    [setOpen],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onKeyDown]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="ds-dialog-backdrop"
      role="presentation"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className={cn("ds-dialog-panel", className)}
        onClick={(event) => event.stopPropagation()}
        {...props}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

function DialogTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  const { titleId } = useDialogContext("Dialog.Title");
  return <h2 id={titleId} className={cn("ds-dialog-title", className)} {...props} />;
}

function DialogDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  const { descriptionId } = useDialogContext("Dialog.Description");
  return <p id={descriptionId} className={cn("ds-dialog-description", className)} {...props} />;
}

type DialogCloseProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

function DialogClose({ children, className, onClick, type = "button", ...props }: DialogCloseProps) {
  const { setOpen } = useDialogContext("Dialog.Close");

  return (
    <button
      type={type}
      className={className}
      onClick={(event) => {
        onClick?.(event);
        setOpen(false);
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export const Dialog = {
  Root: DialogRoot,
  Trigger: DialogTrigger,
  Content: DialogContent,
  Title: DialogTitle,
  Description: DialogDescription,
  Close: DialogClose,
};
