import { cn } from "../../lib/cn";

export default function Input({ className = "", ...props }) {
  return <input className={cn("vs-input", className)} {...props} />;
}