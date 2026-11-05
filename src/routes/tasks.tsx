// Tasks & Announcements — task assign karna, status flow (submit → approve/reject), checklist, notices
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Megaphone } from "lucide-react";
import { useDemo, update, empName, notify } from "@/store/demo-store";
import { PageHeader, Panel, StatusBadge, Select, Field, inputCls, textareaCls, Avatar } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Task, TaskStatus } from "@/types";
import { fmtDate, today } from "@/utils/format";
import { pageHead } from "@/lib/seo";
import { toast } from "sonner";

export const Route = createFileRoute("/tasks")({
  head: pageHead("Tasks & Announcements", "Assign tasks, track approvals and post company announcements."),
  component: Tasks,
});

const COLS: TaskStatus[] = ["To Do", "In Progress", "Submitted", "Correction", "Approved", "Rejected"];

function Tasks() {
  const s = useDemo();
  const [sel, setSel] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [mine, setMine] = useState(false);
  const [f, setF] = useState({ title: "", description: "", priority: "Medium" as Task["priority"], deadline: today(), assignee: s.employees[1]?.id ?? "" });
  const [ann, setAnn] = useState({ title: "", body: "" });
  const [comment, setComment] = useState("");
  const task = s.tasks.find((t) => t.id === sel);
  const list = s.tasks.filter((t) => !mine || t.assignees.includes(s.session.employeeId));

  const patch = (id: string, p: Partial<Task>, msg: string) => update((x) => ({ ...x, tasks: x.tasks.map((t) => (t.id === id ? { ...t, ...p } : t)) }), { action: msg, module: "Tasks" });
  const add = () => {
    if (!f.title) {
      toast.error("Title zaroori hai");
      return;
    }
    const t: Task = { id: `T${Date.now()}`, title: f.title, description: f.description, priority: f.priority, deadline: f.deadline, assignees: [f.assignee], type: "Personal", status: "To Do", checklist: [], comments: [], createdBy: s.session.employeeId, createdAt: today() };
    update((x) => ({ ...x, tasks: [t, ...x.tasks] }), { action: `assigned task "${t.title}"`, module: "Tasks" });
    notify("New task assigned", t.title, "/tasks", f.assignee);
    setAdding(false);
    toast.success("Task assign ho gaya");
  };
  const post = () => {
    if (!ann.title) return;
    update((x) => ({ ...x, announcements: [{ id: `AN${Date.now()}`, ...ann, audience: "All", date: today(), by: x.session.employeeId, acknowledgedBy: [] }, ...x.announcements] }), { action: `posted announcement`, module: "Announcements" });
    notify("📣 " + ann.title, ann.body, "/tasks");
    setAnn({ title: "", body: "" });
    toast.success("Announcement post ho gaya");
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Tasks & Announcements" actions={<><Button variant="outline" onClick={() => setMine(!mine)}>{mine ? "All tasks" : "My tasks"}</Button><Button onClick={() => setAdding(true)}><Plus className="size-4" /> Assign task</Button></>} />
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
        {COLS.map((c) => (
          <div key={c} className="w-64 shrink-0">
            <div className="mb-2 flex justify-between px-1"><StatusBadge status={c} /><span className="text-xs text-muted-foreground">{list.filter((t) => t.status === c).length}</span></div>
            <div className="space-y-2">{list.filter((t) => t.status === c).map((t) => (
              <button key={t.id} onClick={() => setSel(t.id)} className="glass lift block w-full p-3 text-left">
                <div className="flex justify-between gap-2"><p className="text-sm font-semibold">{t.title}</p><StatusBadge status={t.priority} /></div>
                <p className="mt-1 text-xs text-muted-foreground">Due {fmtDate(t.deadline)}</p>
                <div className="mt-2 flex -space-x-1.5">{t.assignees.map((a) => <Avatar key={a} name={empName(s, a)} size={22} className="ring-2 ring-background" />)}</div>
              </button>))}</div>
          </div>))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Post announcement">
          <div className="space-y-2"><input className={inputCls} placeholder="Title" value={ann.title} onChange={(e) => setAnn({ ...ann, title: e.target.value })} /><textarea className={textareaCls} placeholder="Message" value={ann.body} onChange={(e) => setAnn({ ...ann, body: e.target.value })} /><Button onClick={post}><Megaphone className="size-4" /> Post to everyone</Button></div>
        </Panel>
        <Panel title="Announcements">
          <ul className="space-y-3">{s.announcements.map((a) => {
            const ack = a.acknowledgedBy.includes(s.session.employeeId);
            return <li key={a.id} className="rounded-lg border p-3"><p className="font-medium">{a.title}</p><p className="text-sm text-muted-foreground">{a.body}</p><div className="mt-2 flex items-center justify-between text-xs"><span>{fmtDate(a.date)} · {a.acknowledgedBy.length} acknowledged</span><Button size="sm" variant={ack ? "secondary" : "default"} disabled={ack} onClick={() => update((x) => ({ ...x, announcements: x.announcements.map((m) => m.id === a.id ? { ...m, acknowledgedBy: [...m.acknowledgedBy, x.session.employeeId] } : m) }))}>{ack ? "Acknowledged" : "Acknowledge"}</Button></div></li>;
          })}</ul>
        </Panel>
      </div>

      {/* Daily Work Reports (DWR) Feed */}
      <Panel title="Team Daily Work Reports (DWR)">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {s.dailyWorkReports.map((dwr) => (
            <div key={dwr.id} className="rounded-xl border bg-card/60 p-3.5 text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-sm">{empName(s, dwr.employeeId)}</span>
                <span className="text-muted-foreground">{dwr.hoursWorked} hrs worked</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Date: {fmtDate(dwr.date)}</p>
              <div className="pt-1 border-t space-y-1">
                <p><b>Done:</b> {dwr.tasksCompleted}</p>
                {dwr.plansForTomorrow && <p className="text-muted-foreground"><b>Tomorrow:</b> {dwr.plansForTomorrow}</p>}
                {dwr.blockersOrChallenges && <p className="text-warning"><b>Blockers:</b> {dwr.blockersOrChallenges}</p>}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Dialog open={!!task} onOpenChange={() => setSel(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          {task && (<>
            <DialogHeader><DialogTitle>{task.title}</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">{task.description}</p>
            <div className="flex flex-wrap gap-2 text-xs"><StatusBadge status={task.status} /><StatusBadge status={task.priority} /><span>Due {fmtDate(task.deadline)}</span><span>By {empName(s, task.createdBy)}</span></div>
            {task.checklist.length > 0 && <ul className="space-y-1">{task.checklist.map((c, i) => <li key={i}><label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-primary" checked={c.done} onChange={() => patch(task.id, { checklist: task.checklist.map((x, j) => j === i ? { ...x, done: !x.done } : x) }, "updated checklist")} />{c.text}</label></li>)}</ul>}
            <div className="flex flex-wrap gap-2">
              {task.status === "To Do" && <Button size="sm" onClick={() => patch(task.id, { status: "In Progress" }, `started "${task.title}"`)}>Start</Button>}
              {["In Progress", "Correction"].includes(task.status) && <Button size="sm" onClick={() => patch(task.id, { status: "Submitted", completedAt: today() }, `submitted "${task.title}"`)}>Submit for review</Button>}
              {task.status === "Submitted" && <><Button size="sm" onClick={() => patch(task.id, { status: "Approved" }, `approved "${task.title}"`)}>Approve</Button><Button size="sm" variant="outline" onClick={() => patch(task.id, { status: "Correction" }, `sent back "${task.title}"`)}>Ask correction</Button><Button size="sm" variant="destructive" onClick={() => patch(task.id, { status: "Rejected" }, `rejected "${task.title}"`)}>Reject</Button></>}
            </div>
            <div>
              <p className="mb-1 text-sm font-semibold">Comments</p>
              <ul className="mb-2 space-y-1 text-sm">{task.comments.map((c, i) => <li key={i}><b>{empName(s, c.by)}:</b> {c.text}</li>)}</ul>
              <div className="flex gap-2"><input className={inputCls} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write a comment" /><Button size="sm" onClick={() => { if (!comment) return; patch(task.id, { comments: [...task.comments, { by: s.session.employeeId, text: comment, date: today() }] }, "commented on task"); setComment(""); }}>Send</Button></div>
            </div>
          </>)}
        </DialogContent>
      </Dialog>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign task</DialogTitle></DialogHeader>
          <Field label="Title"><input className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Description"><textarea className={textareaCls} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Priority"><Select value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value as Task["priority"] })}>{["Low", "Medium", "High", "Urgent"].map((p) => <option key={p}>{p}</option>)}</Select></Field>
            <Field label="Deadline"><input type="date" className={inputCls} value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} /></Field>
            <Field label="Assignee"><Select value={f.assignee} onChange={(e) => setF({ ...f, assignee: e.target.value })}>{s.employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</Select></Field>
          </div>
          <Button onClick={add}>Assign</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
