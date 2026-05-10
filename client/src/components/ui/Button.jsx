import { cn } from "../../lib/cn";

export default function Button({
  children,
  className = "",
  variant = "primary",
  ...props
}) {
  const variantClass =
    variant === "ghost" ? "vs-btn-ghost" : "vs-btn-primary";

  return (
    <button className={cn(variantClass, className)} {...props}>
      {children}
    </button>
  );
}