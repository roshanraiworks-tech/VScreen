import { cn } from "../../lib/cn";

export default function IconButton({ className = "", children, ...props }) {
  return (
    <button
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-xl border bg-slate-950/40 text-slate-200 transition hover:bg-slate-800/60",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}