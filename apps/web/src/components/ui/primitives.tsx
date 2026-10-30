import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

/* ------------------------------------------------------------------ */
/* Button                                                              */
/* ------------------------------------------------------------------ */

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-[background-color,color,border-color,box-shadow,transform] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-accent-fg hover:brightness-110 shadow-[0_1px_0_0_hsl(var(--accent-fg)/0.18)_inset]",
        secondary:
          "bg-surface-2 text-fg border border-line hover:bg-surface-3 hover:border-line-strong",
        ghost: "text-fg-muted hover:bg-surface-2 hover:text-fg",
        outline:
          "border border-line-strong text-fg hover:bg-surface-2 hover:border-accent",
        danger: "bg-danger text-white hover:brightness-110",
        link: "text-accent underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        sm: "h-7 px-2.5 text-xs rounded-xs",
        md: "h-9 px-3.5 text-sm rounded-sm",
        lg: "h-11 px-6 text-[15px] rounded-md",
        icon: "h-9 w-9 rounded-sm",
        "icon-sm": "h-7 w-7 rounded-xs",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Input                                                               */
/* ------------------------------------------------------------------ */

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function Input({
  className,
  invalid,
  ...props
}: InputProps) {
  return (
    <input
      className={cn(
        "h-9 w-full rounded-sm border bg-surface-2 px-3 text-sm text-fg transition-colors",
        "placeholder:text-fg-subtle",
        "focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        invalid ? "border-danger focus:border-danger focus:ring-danger/30" : "border-line",
        className
      )}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Textarea                                                            */
/* ------------------------------------------------------------------ */

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export function Textarea({
  className,
  invalid,
  ...props
}: TextareaProps) {
  return (
    <textarea
      className={cn(
        "w-full resize-y rounded-sm border bg-surface-2 px-3 py-2 text-sm leading-relaxed text-fg",
        "placeholder:text-fg-subtle",
        "focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        invalid ? "border-danger" : "border-line",
        className
      )}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Label                                                               */
/* ------------------------------------------------------------------ */

export function Label({
  className,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "text-xs font-medium text-fg-muted tracking-wide",
        className
      )}
      {...props}
    >
      {children}
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Select                                                              */
/* ------------------------------------------------------------------ */

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export function Select({ className, invalid, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select
        className={cn(
          "h-9 w-full appearance-none rounded-sm border bg-surface-2 pl-3 pr-8 text-sm text-fg",
          "focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40",
          "disabled:cursor-not-allowed disabled:opacity-50",
          invalid ? "border-danger" : "border-line",
          className
        )}
        aria-invalid={invalid || undefined}
        {...props}
      />
      <svg
        aria-hidden
        viewBox="0 0 12 12"
        className="pointer-events-none absolute right-2.5 top-1/2 size-3 -translate-y-1/2 text-fg-subtle"
      >
        <path d="M3 4.5 6 8l3-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Checkbox / Switch / Radio                                           */
/* ------------------------------------------------------------------ */

export function Checkbox({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      className={cn(
        "size-4 shrink-0 cursor-pointer appearance-none rounded-xs border border-line-strong bg-surface-2",
        "checked:border-accent checked:bg-accent",
        "focus-visible:ring-2 focus-visible:ring-accent/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: string;
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  className,
  disabled,
  ...props
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
        "focus-visible:ring-2 focus-visible:ring-accent/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-accent" : "bg-surface-3",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "inline-block size-3.5 rounded-full bg-white shadow-sm transition-transform duration-150",
          checked ? "translate-x-4.5" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

export function Radio({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="radio"
      className={cn(
        "size-4 shrink-0 cursor-pointer appearance-none rounded-full border border-line-strong bg-surface-2",
        "checked:border-[5px] checked:border-accent",
        "focus-visible:ring-2 focus-visible:ring-accent/40",
        className
      )}
      {...props}
    />
  );
}
