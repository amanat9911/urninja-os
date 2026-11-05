// Support Tickets — client issues, assign, status flow, notes aur SLA tracking
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { differenceInHours, parseISO } from "date-fns";
import { useDemo, update, empName, clientName } from "@/store/demo-store";
import { PageHeader, Panel, StatusBadge, Select, Field, inputCls, textareaCls, TableWrap } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TICKET_STATUSES, type Ticket, type TicketStatus } from "@/types";
import { fmtDate, today } from "@/utils/format";
import { pageHead } from "@/lib/seo";
import { toast } from "sonner";

export const Route = createFileRoute("/tickets")({
  head: pageHead("Support Tickets", "Client support tickets with assignment, SLA and status tracking."),
  component: Tickets,
});

function Tickets() {
  const s = useDemo();
  const [filter, setFilter] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState("");
  const [f, setF] = useState({ clientId: s.clients[0]?.id ?? "", title: "", description: "", category: s.settings.ticketCategories[0] ?? "", priority: "Medium" as Ticket["priority"] });
  const t = s.tickets.find((x) => x.id === sel);
  const list = s.tickets.filter((x) => !filter || x.status === filter);
  const patch = (id: string, p: Partial<Ticket>, msg: string) => update((x) => ({ ...x, tickets: x.tickets.map((m) => m.id === id ? { ...m, ...p } : m) }), { action: msg, module: "Tickets" });
  const sla = (x: Ticket) => { const h = differenceInHours(new Date(), parseISO(x.createdAt)); return !["Resolved", "Closed"].includes(x.status) && h > x.slaHours; };

  return (
    <div>
      <PageHeader title="Support Tickets" actions={<><Select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="">All statuses</option>{TICKET_STATUSES.map((x) => <option key={x}>{x}</option>)}</Select><Button onClick={() => setAdding(true)}><Plus className="size-4" /> New ticket</Button></>} />
      <Panel>
        <TableWrap><thead><tr><th>Ticket</th><th>Client</th><th>Priority</th><th>Assignee</th><th>Status</th><th>SLA</th></tr></thead>
          <tbody>{list.map((x) => <tr key={x.id} className="cursor-pointer" onClick={() => setSel(x.id)}><td><p className="font-medium">{x.title}</p><p className="text-xs text-muted-foreground">{x.id} · {x.category} · {fmtDate(x.createdAt)}</p></td><td>{clientName(s, x.clientId)}</td><td><StatusBadge status={x.priority} /></td><td>{empName(s, x.assigneeId)}</td><td><StatusBadge status={x.status} /></td><td>{sla(x) ? <StatusBadge status="Overdue" /> : <span className="text-xs text-muted-foreground">{x.slaHours}h</span>}</td></tr>)}</tbody></TableWrap>
      </Panel>

      <Dialog open={!!t} onOpenChange={() => setSel(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          {t && (<>
            <DialogHeader><DialogTitle>{t.title}</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">{clientName(s, t.clientId)} — {t.description}</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Status"><Select value={t.status} onChange={(e) => patch(t.id, { status: e.target.value as TicketStatus }, `ticket ${t.id} → ${e.target.value}`)}>{TICKET_STATUSES.map((x) => <option key={x}>{x}</option>)}</Select></Field>
              <Field label="Assignee"><Select value={t.assigneeId ?? ""} onChange={(e) => patch(t.id, { assigneeId: e.target.value, status: t.status === "New" ? "Assigned" : t.status }, `assigned ticket ${t.id}`)}><option value="">Unassigned</option>{s.employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</Select></Field>
            </div>
            <div>
              <p className="mb-1 text-sm font-semibold">Notes</p>
              <ul className="mb-2 space-y-1 text-sm">{t.notes.map((n, i) => <li key={i} className={n.internal ? "rounded bg-warning/10 p-1.5" : "p-1.5"}><b>{empName(s, n.by)}</b>{n.internal && " (internal)"}: {n.text}</li>)}</ul>
              <textarea className={textareaCls} value={note} onChange={(e) => setNote(e.target.value)} />
              <div className="mt-2 flex gap-2"><Button size="sm" onClick={() => { if (!note) return; patch(t.id, { notes: [...t.notes, { by: s.session.employeeId, text: note, internal: false, date: today() }] }, "replied on ticket"); setNote(""); }}>Reply</Button><Button size="sm" variant="outline" onClick={() => { if (!note) return; patch(t.id, { notes: [...t.notes, { by: s.session.employeeId, text: note, internal: true, date: today() }] }, "added internal note"); setNote(""); }}>Internal note</Button></div>
            </div>
          </>)}
        </DialogContent>
      </Dialog>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader><DialogTitle>New ticket</DialogTitle></DialogHeader>
          <Field label="Client"><Select value={f.clientId} onChange={(e) => setF({ ...f, clientId: e.target.value })}>{s.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
          <Field label="Title"><input className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Description"><textarea className={textareaCls} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Category"><Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{s.settings.ticketCategories.map((c) => <option key={c}>{c}</option>)}</Select></Field>
            <Field label="Priority"><Select value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value as Ticket["priority"] })}>{["Low", "Medium", "High", "Critical"].map((p) => <option key={p}>{p}</option>)}</Select></Field>
          </div>
          <Button onClick={() => { if (!f.title) { toast.error("Title zaroori"); return; } update((x) => ({ ...x, tickets: [{ id: `TK${Date.now().toString().slice(-5)}`, ...f, team: "IT Support", service: "", status: "New", createdAt: today(), slaHours: f.priority === "Critical" ? 4 : 48, notes: [] }, ...x.tickets] }), { action: `raised ticket "${f.title}"`, module: "Tickets" }); setAdding(false); toast.success("Ticket ban gaya"); }}>Create</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
