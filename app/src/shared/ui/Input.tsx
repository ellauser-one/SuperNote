/**
 * [INPUT]: 依赖 React input 属性、lucide-react Eye/EyeOff、shared/ui/cn；样式来自 index.css .ds-input*
 * [OUTPUT]: 对外提供 Input（fieldSize · privacy 隐私输入变体，右侧眼睛切换可见性）
 * [POS]: shared/ui 原子组件，供 pages/widgets 与设计系统画廊使用
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Eye, EyeOff } from "lucide-react";
import { useId, useState, type InputHTMLAttributes } from "react";

import { cn } from "./cn";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  fieldSize?: "md" | "lg";
  /**
   * 隐私输入：默认 password 掩码，右侧眼睛按钮切换明文/密文。
   * 开启后忽略外部 type，由组件内部管理 password/text。
   */
  privacy?: boolean;
};

export function Input({
  fieldSize = "md",
  privacy = false,
  className,
  type = "text",
  disabled,
  id,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [revealed, setRevealed] = useState(false);

  if (!privacy) {
    return (
      <input
        id={inputId}
        type={type}
        disabled={disabled}
        className={cn("ds-input", fieldSize === "lg" && "ds-input--lg", className)}
        {...props}
      />
    );
  }

  const toggleLabel = revealed ? "隐藏内容" : "显示内容";

  return (
    <div
      className={cn(
        "ds-input-privacy",
        fieldSize === "lg" && "ds-input-privacy--lg",
      )}
    >
      <input
        id={inputId}
        disabled={disabled}
        className={cn(
          "ds-input",
          "ds-input--with-privacy",
          fieldSize === "lg" && "ds-input--lg",
          className,
        )}
        {...props}
        type={revealed ? "text" : "password"}
        autoComplete={props.autoComplete ?? "current-password"}
      />
      <button
        type="button"
        className="ds-input-privacy__toggle"
        aria-label={toggleLabel}
        aria-controls={inputId}
        aria-pressed={revealed}
        disabled={disabled}
        tabIndex={-1}
        onClick={() => setRevealed((current) => !current)}
      >
        {revealed ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
      </button>
    </div>
  );
}
