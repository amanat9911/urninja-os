// Settings — company info, office timing, holidays, leave policy aur lead sources
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useDemo, update } from "@/store/demo-store";
import { PageHeader, Panel, Field, inputCls } from "@/components/common";
import { Button } from "@/components/ui/button";
import { fmtDate } from "@/utils/format";
import { pageHead } from "@/lib/seo";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: pageHead("Settings", "Company details, office hours, holidays and policies."),
  component: SettingsPage,
});

function SettingsPage() {
  const s = useDemo();
  const [f, setF] = useState({ companyName: s.settings.companyName, tagline: s.settings.tagline, officeStart: s.settings.officeStart });
  const [hol, setHol] = useState({ date: "", name: "" });
  const [src, setSrc] = useState("");
  const set = (p: Partial<typeof s.settings>, msg: string) => update((x) => ({ ...x, settings: { ...x.settings, ...p } }), { action: msg, module: "Settings" });
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Company">
          <div className="space-y-3">
            <Field label="Company name"><input className={inputCls} value={f.companyName} onChange={(e) => setF({ ...f, companyName: e.target.value })} /></Field>
            <Field label="Tagline"><input className={inputCls} value={f.tagline} onChange={(e) => setF({ ...f, tagline: e.target.value })} /></Field>
            <Field label="Office start time (late after this)"><input type="time" className={inputCls} value={f.officeStart} onChange={(e) => setF({ ...f, officeStart: e.target.value })} /></Field>
            <Button onClick={() => { set(f, "updated company settings"); toast.success("Saved"); }}>Save</Button>
          </div>
        </Panel>
        <Panel title="Holidays">
          <div className="mb-3 flex gap-2"><input type="date" className={inputCls} value={hol.date} onChange={(e) => setHol({ ...hol, date: e.target.value })} /><input className={inputCls} placeholder="Name" value={hol.name} onChange={(e) => setHol({ ...hol, name: e.target.value })} /><Button onClick={() => { if (!hol.date || !hol.name) return; set({ holidays: [...s.settings.holidays, hol].sort((a, b) => a.date.localeCompare(b.date)) }, `added holiday ${hol.name}`); setHol({ date: "", name: "" }); }}>Add</Button></div>
          <ul className="space-y-1 text-sm">{s.settings.holidays.map((h) => <li key={h.date + h.name} className="flex justify-between"><span>{h.name}</span><span className="text-muted-foreground">{fmtDate(h.date)}</span></li>)}</ul>
        </Panel>
        <Panel title="Leave policy (days per year)">
          <ul className="space-y-2">{s.settings.leavePolicy.map((p, i) => <li key={p.type} className="flex items-center justify-between gap-2 text-sm"><span>{p.type} {p.paid ? "(paid)" : "(unpaid)"}</span><input type="number" className="h-8 w-20 rounded border bg-background px-2" value={p.perYear} onChange={(e) => set({ leavePolicy: s.settings.leavePolicy.map((x, j) => j === i ? { ...x, perYear: +e.target.value } : x) }, "updated leave policy")} /></li>)}</ul>
          <p className="mt-3 text-xs text-muted-foreground">Approval chain: {s.settings.approvalChain.join(" → ")}</p>
        </Panel>
        <Panel title="Lead sources">
          <div className="mb-3 flex gap-2"><input className={inputCls} value={src} onChange={(e) => setSrc(e.target.value)} placeholder="e.g. IndiaMART" /><Button onClick={() => { if (!src) return; set({ leadSources: [...s.settings.leadSources, src] }, `added lead source ${src}`); setSrc(""); }}>Add</Button></div>
          <div className="flex flex-wrap gap-2">{s.settings.leadSources.map((x) => <span key={x} className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">{x}</span>)}</div>
          <p className="mt-4 text-xs text-muted-foreground">{s.settings.taxNote}</p>
        </Panel>
        <Panel title="Security & Authentication Policies">
          <div className="space-y-3">
            <Field label="Max Failed Password Attempts Before Lockout">
              <input
                type="number"
                className={inputCls}
                value={s.settings.securityPolicies?.maxFailedAttempts || 5}
                onChange={(e) =>
                  set(
                    {
                      securityPolicies: {
                        ...(s.settings.securityPolicies || { passwordExpiryDays: 90, sessionTimeoutMinutes: 60 }),
                        maxFailedAttempts: Number(e.target.value) || 5,
                      },
                    },
                    "updated lockout policy"
                  )
                }
              />
            </Field>
            <Field label="Credential Expiry Period (Days)">
              <input
                type="number"
                className={inputCls}
                value={s.settings.securityPolicies?.passwordExpiryDays || 90}
                onChange={(e) =>
                  set(
                    {
                      securityPolicies: {
                        ...(s.settings.securityPolicies || { maxFailedAttempts: 5, sessionTimeoutMinutes: 60 }),
                        passwordExpiryDays: Number(e.target.value) || 90,
                      },
                    },
                    "updated password expiry policy"
                  )
                }
              />
            </Field>
            <p className="text-xs text-muted-foreground pt-1">
              Violations and lockouts are logged to the immutable-style Security Audit ledger.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
