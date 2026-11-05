// Ye file poore app ke reusable UI building blocks rakhti hai — page header, stat card, status badge, avatar, range picker etc.
// Har module inhi components ko use karta hai taaki design consistent rahe.
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { initials, RANGE_LABELS, type RangeKey } from "@/utils/format";
import { FlaskConical } from "lucide-react";

// Page ka title, subtitle aur right side actions
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

// Glass panel — har section ka container
export function Panel({ title, action, children, className }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("glass p-4 sm:p-5", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-2">
          {title && <h3 className="text-base font-semibold">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

// KPI card — dashboard aur module summaries ke liye
export function StatCard({ label, value, hint, icon, tone = "primary" }: { label: string; value: ReactNode; hint?: string; icon?: ReactNode; tone?: "primary" | "success" | "warning" | "destructive" | "info" }) {
  const toneCls = {
    primary: "bg-accent text-accent-foreground",
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-warning-foreground dark:text-warning",
    destructive: "bg-destructive/15 text-destructive",
    info: "bg-info/15 text-info",
  }[tone];
  return (
    <div className="glass lift p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {icon && <span className={cn("grid size-8 place-items-center rounded-lg", toneCls)}>{icon}</span>}
      </div>
      <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// Status ke hisaab se badge ka color decide hota hai — pending/approved/rejected alag dikhne chahiye
const STATUS_TONE: Record<string, string> = {
  success: "bg-success/15 text-success border-success/30",
  warning: "bg-warning/20 text-warning-foreground border-warning/40 dark:text-warning",
  danger: "bg-destructive/12 text-destructive border-destructive/30",
  info: "bg-info/12 text-info border-info/30",
  neutral: "bg-muted text-muted-foreground border-border",
  primary: "bg-accent text-accent-foreground border-primary/20",
};
function toneFor(status: string) {
  const s = status.toLowerCase();
  if (/(approved|paid|won|resolved|closed|present|published|active|imported|done|connected)/.test(s)) return "success";
  if (/(pending|progress|submitted|follow|late|partial|waiting|draft|sent|leave|meeting|proposal|negotiation|medium|callback)/.test(s)) return "warning";
  if (/(rejected|lost|overdue|absent|escalated|failed|urgent|critical|high|inactive)/.test(s)) return "danger";
  if (/(new|assigned|to do|planned|interested|contacted)/.test(s)) return "info";
  return "neutral";
}
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold", STATUS_TONE[toneFor(status)], className)}>{status}</span>;
}

// Employee avatar — photo ki jagah initials (TODO: file storage aane par real photo)
export function Avatar({ name, size = 32, className }: { name: string; size?: number; className?: string }) {
  return (
    <span style={{ width: size, height: size, fontSize: size * 0.38 }} className={cn("inline-grid shrink-0 place-items-center rounded-full bg-gradient-primary font-semibold text-primary-foreground", className)}>
      {initials(name)}
    </span>
  );
}

// "Demo" label — simulated features ko clearly mark karne ke liye
export function DemoTag({ text = "Demo simulation" }: { text?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning-foreground dark:text-warning">
      <FlaskConical className="size-3" /> {text}
    </span>
  );
}

// Native select ka styled version — har form mein use hota hai
export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn("h-9 rounded-md border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring", className)} />;
}

// Form field label wrapper
export function Field({ label, children, error }: { label: string; children: ReactNode; error?: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-muted-foreground">{label}</span>
      {children}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </label>
  );
}

// Date range selector — Today / Yesterday / Weekly / Monthly / Custom
export function RangePicker({ value, onChange, custom, onCustom }: { value: RangeKey; onChange: (k: RangeKey) => void; custom: { from: string; to: string }; onCustom: (c: { from: string; to: string }) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={value} onChange={(e) => onChange(e.target.value as RangeKey)} aria-label="Date range">
        {(Object.keys(RANGE_LABELS) as RangeKey[]).map((k) => <option key={k} value={k}>{RANGE_LABELS[k]}</option>)}
      </Select>
      {value === "custom" && (
        <>
          <input type="date" value={custom.from} onChange={(e) => onCustom({ ...custom, from: e.target.value })} className="h-9 rounded-md border border-input bg-background px-2 text-sm" />
          <input type="date" value={custom.to} onChange={(e) => onCustom({ ...custom, to: e.target.value })} className="h-9 rounded-md border border-input bg-background px-2 text-sm" />
        </>
      )}
    </div>
  );
}

// Empty state jab koi record na ho
export function Empty({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{text}</div>;
}

// Simple responsive table wrapper
export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0"><table className="w-full min-w-[640px] text-sm [&_td]:border-t [&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-muted-foreground [&_tbody_tr:hover]:bg-muted/50">{children}</table></div>;
}

// Progress bar
export function Bar({ value, className }: { value: number; className?: string }) {
  return <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}><div className="h-full rounded-full bg-gradient-primary transition-all duration-700" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>;
}

export const inputCls = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
export const textareaCls = "min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
