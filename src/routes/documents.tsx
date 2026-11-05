// Audits & Documents — business audit reports (scores) aur company documents ki list
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useDemo, update, empName } from "@/store/demo-store";
import { PageHeader, Panel, TableWrap, Bar, StatusBadge, inputCls, Select, DemoTag } from "@/components/common";
import { Button } from "@/components/ui/button";
import type { DocumentItem } from "@/types";
import { fmtDate, today } from "@/utils/format";
import { pageHead } from "@/lib/seo";
import { toast } from "sonner";

export const Route = createFileRoute("/documents")({
  head: pageHead("Audits & Documents", "Business audit reports and the company document library."),
  component: Docs,
});

const CATS: DocumentItem["category"][] = ["Resume", "Agreement", "Invoice", "Salary Slip", "Audit", "Attachment"];

function Docs() {
  const s = useDemo();
  const [cat, setCat] = useState("");
  return (
    <div className="space-y-6">
      <PageHeader title="Audits & Documents" />
      <div className="grid gap-4 md:grid-cols-2">
        {s.audits.map((a) => {
          const avg = Math.round(Object.values(a.scores).reduce((x, y) => x + y, 0) / 5);
          return (
            <Panel key={a.id} title={a.businessName} action={<span className="font-display text-2xl font-semibold">{avg}</span>}>
              <p className="mb-3 text-xs text-muted-foreground">{fmtDate(a.date)}</p>
              <div className="space-y-2">{Object.entries(a.scores).map(([k, v]) => <div key={k} className="flex items-center gap-2 text-sm"><span className="w-20 capitalize">{k}</span><Bar value={v} /><span className="w-8 text-right">{v}</span></div>)}</div>
              <p className="mt-3 text-sm"><b>Findings:</b> {a.findings}</p>
              <p className="text-sm"><b>Recommended:</b> {a.services.join(", ")}</p>
            </Panel>
          );
        })}
      </div>
      <Panel title="Documents" action={<DemoTag text="Files not actually stored" />}>
        <div className="mb-4 flex flex-wrap gap-2">
          <Select value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All categories</option>{CATS.map((c) => <option key={c}>{c}</option>)}</Select>
          <label className="inline-flex h-9 cursor-pointer items-center rounded-md border px-3 text-sm font-medium hover:bg-muted">Upload file<input type="file" hidden onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; update((x) => ({ ...x, documents: [{ id: `DOC${Date.now()}`, name: file.name, category: "Attachment", ownerId: x.session.employeeId, date: today(), versions: 1, access: "Private" }, ...x.documents] }), { action: `uploaded ${file.name}`, module: "Documents" }); toast.success("File list mein add ho gayi"); }} /></label>
        </div>
        <TableWrap><thead><tr><th>Name</th><th>Category</th><th>Owner</th><th>Date</th><th>Versions</th><th>Access</th></tr></thead>
          <tbody>{s.documents.filter((d) => !cat || d.category === cat).map((d) => <tr key={d.id}><td className="font-medium">{d.name}</td><td>{d.category}</td><td>{empName(s, d.ownerId)}</td><td>{fmtDate(d.date)}</td><td>v{d.versions}</td><td><StatusBadge status={d.access} /></td></tr>)}</tbody></TableWrap>
      </Panel>
    </div>
  );
}
