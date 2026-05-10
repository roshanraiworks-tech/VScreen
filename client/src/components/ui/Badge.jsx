import { cn } from "../../lib/cn";

export default function Badge({ className = "", children, tone = "neutral" }) {
  const toneClass =
    tone === "success"
      ? "text-emerald-300 border-emerald-500/20 bg-emerald-500/10"
      : tone === "danger"
      ? "text-rose-300 border-rose-500/20 bg-rose-500/10"
      : tone === "primary"
      ? "text-violet-300 border-violet-500/20 bg-violet-500/10"
      : "text-slate-300 border-slate-500/20 bg-slate-500/10";

  return <span className={cn("vs-badge", toneClass, className)}>{children}</span>;
}