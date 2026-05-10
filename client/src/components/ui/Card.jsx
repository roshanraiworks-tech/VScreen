import { cn } from "../../lib/cn";

export function Card({ className = "", children, ...props }) {
  return (
    <div className={cn("vs-card p-5", className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ className = "", children, ...props }) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-4", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className = "", children, ...props }) {
  return (
    <h3 className={cn("text-lg font-semibold tracking-tight text-white", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className = "", children, ...props }) {
  return (
    <p className={cn("mt-1 text-sm text-slate-400", className)} {...props}>
      {children}
    </p>
  );
}