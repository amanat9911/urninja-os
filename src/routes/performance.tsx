// Performance — har employee ka score: tasks complete, attendance aur sales (demo formula)
import { createFileRoute } from "@tanstack/react-router";
import { useDemo, deptName } from "@/store/demo-store";
import { PageHeader, Panel, TableWrap, Avatar, Bar, DemoTag } from "@/components/common";
import { inr } from "@/utils/format";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/performance")({
  head: pageHead("Performance", "Team leaderboard by tasks, attendance and sales."),
  component: Performance,
});

function Performance() {
  const s = useDemo();
  // Score = 40% task approval rate + 40% attendance + 20% sales share (sirf demo formula)
  const maxSales = Math.max(1, ...s.employees.map((e) => s.leads.filter((l) => l.assignedTo === e.id && l.stage === "Deal Won").reduce((a, l) => a + l.dealValue, 0)));
  const rows = s.employees.map((e) => {
    const tasks = s.tasks.filter((t) => t.assignees.includes(e.id));
    const done = tasks.filter((t) => t.status === "Approved").length;
    const att = s.attendance.filter((a) => a.employeeId === e.id && ["Present", "Late", "Absent"].includes(a.status));
    const present = att.filter((a) => a.status !== "Absent").length;
    const sales = s.leads.filter((l) => l.assignedTo === e.id && l.stage === "Deal Won").reduce((a, l) => a + l.dealValue, 0);
    const taskPct = tasks.length ? (done / tasks.length) * 100 : 50;
    const attPct = att.length ? (present / att.length) * 100 : 100;
    const score = Math.round(taskPct * 0.4 + attPct * 0.4 + (sales / maxSales) * 100 * 0.2);
    return { e, done, total: tasks.length, attPct, sales, score };
  }).sort((a, b) => b.score - a.score);
  return (
    <div>
      <PageHeader title="Performance" subtitle="Leaderboard" actions={<DemoTag text="Demo scoring formula" />} />
      <Panel>
        <TableWrap><thead><tr><th>#</th><th>Employee</th><th>Tasks approved</th><th>Attendance</th><th>Sales won</th><th className="w-48">Score</th></tr></thead>
          <tbody>{rows.map((r, i) => <tr key={r.e.id}><td className="font-semibold">{i + 1}</td><td><div className="flex items-center gap-2"><Avatar name={r.e.name} size={28} /><div><p className="font-medium">{r.e.name}</p><p className="text-xs text-muted-foreground">{deptName(s, r.e.departmentId)}</p></div></div></td><td>{r.done}/{r.total}</td><td>{Math.round(r.attPct)}%</td><td>{inr(r.sales)}</td><td><div className="flex items-center gap-2"><Bar value={r.score} /><b className="w-8 text-right">{r.score}</b></div></td></tr>)}</tbody></TableWrap>
      </Panel>
    </div>
  );
}
