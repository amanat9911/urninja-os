// Dashboard — Role-based operational overview dynamically adapting to logged-in user role
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Users, Target, Wallet, LifeBuoy, ListChecks, CalendarCheck, ShieldCheck,
  TrendingUp, Clock, AlertTriangle, ArrowRight, CheckCircle2, UserCheck, Briefcase, Sparkles
} from "lucide-react";
import { Bar as RBar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";
import { useDemo, empName, deptName, clientName } from "@/store/demo-store";
import { PageHeader, Panel, StatCard, StatusBadge, RangePicker, Avatar, DemoTag, Bar } from "@/components/common";
import { Button } from "@/components/ui/button";
import { inr, today, rangeBounds, inRange, type RangeKey, fmtDate } from "@/utils/format";
import { LEAD_STAGES } from "@/types";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: pageHead("Dashboard", "Role-based operations overview: pipeline, revenue, team, attendance and performance."),
  component: Dashboard,
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export function Dashboard() {
  const s = useDemo();
  const currentRole = s.session.role;
  const currentEmpId = s.session.employeeId || "UN-1001";
  const currentEmp = s.employees.find((e) => e.id === currentEmpId) || s.employees[0];
  const myDeptId = currentEmp.departmentId;

  const [range, setRange] = useState<RangeKey>("month");
  const [custom, setCustom] = useState({ from: today(), to: today() });
  const b = rangeBounds(range, custom);

  // Common stats
  const leadsIn = s.leads.filter((l) => inRange(l.createdAt, b));
  const won = s.leads.filter((l) => l.stage === "Deal Won");
  const revenue = s.invoices.reduce((a, i) => a + i.paid, 0);
  const todayAtt = s.attendance.filter((a) => a.date === today());
  const present = todayAtt.filter((a) => a.status === "Present" || a.status === "Late").length;
  const openTickets = s.tickets.filter((t) => !["Resolved", "Closed"].includes(t.status)).length;
  const pipeline = LEAD_STAGES.map((st) => ({
    stage: st.replace("Deal ", ""),
    count: s.leads.filter((l) => l.stage === st).length,
  }));
  const taskStatus = ["To Do", "In Progress", "Submitted", "Approved"].map((st) => ({
    name: st,
    value: s.tasks.filter((t) => t.status === st).length,
  }));

  // Role-specific slices
  const myDirectSubs = s.employees.filter((e) => e.managerId === currentEmpId);
  const myDeptEmployees = s.employees.filter((e) => e.departmentId === myDeptId);
  const myTasks = s.tasks.filter((t) => t.assignees.includes(currentEmpId));
  const myPendingApprovals = s.leaves.filter((l) => l.status === "Pending");
  const mySubmittedTasks = s.tasks.filter((t) => t.status === "Submitted");

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Namaste, ${currentEmp.name.split(" ")[0]} 👋`}
        subtitle={`${s.settings.companyName} · Viewing as ${currentRole} (${currentEmp.designation})`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <DemoTag text={`${currentRole} View Active`} />
            <RangePicker value={range} onChange={setRange} custom={custom} onCustom={setCustom} />
          </div>
        }
      />

      {/* ========================================================================= */}
      {/* 1. OWNER & SUPER ADMIN DASHBOARD VIEW */}
      {/* ========================================================================= */}
      {["Super Owner", "Owner", "Super Admin", "Admin"].includes(currentRole) && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
            <Link to="/employees" className="block">
              <StatCard label="Employees" value={s.employees.filter((e) => e.status === "Active").length} hint={`${s.departments.length} departments`} icon={<Users className="size-4" />} />
            </Link>
            <Link to="/leads" className="block">
              <StatCard label="New leads" value={leadsIn.length} hint="Selected range" icon={<Target className="size-4" />} tone="info" />
            </Link>
            <Link to="/leads" className="block">
              <StatCard label="Deals won" value={won.length} hint={inr(won.reduce((a, l) => a + l.dealValue, 0))} icon={<Target className="size-4" />} tone="success" />
            </Link>
            <Link to="/finance" className="block">
              <StatCard label="Collected" value={inr(revenue)} hint="All invoices" icon={<Wallet className="size-4" />} tone="success" />
            </Link>
            <Link to="/attendance" className="block">
              <StatCard label="Present today" value={`${present}/${s.employees.filter((e) => e.status !== "Resigned").length}`} icon={<CalendarCheck className="size-4" />} tone="warning" />
            </Link>
            <Link to="/tickets" className="block">
              <StatCard label="Open tickets" value={openTickets} icon={<LifeBuoy className="size-4" />} tone="destructive" />
            </Link>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Panel title="Sales pipeline" className="lg:col-span-2" action={<Link to="/leads" className="text-xs text-primary">Open pipeline →</Link>}>
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={pipeline}>
                    <XAxis dataKey="stage" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={50} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <RBar dataKey="count" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel title="Task status distribution">
              <div className="h-64">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={taskStatus} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3}>
                      {taskStatus.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {taskStatus.map((t, i) => (
                  <span key={t.name} className="flex items-center gap-1">
                    <span className="size-2 rounded-full" style={{ background: COLORS[i] }} />
                    {t.name} ({t.value})
                  </span>
                ))}
              </div>
            </Panel>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* 2. HR DASHBOARD VIEW */}
      {/* ========================================================================= */}
      {currentRole === "HR" && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Link to="/employees" className="block">
              <StatCard label="Total Staff" value={s.employees.filter((e) => e.status !== "Resigned").length} hint="Active accounts" icon={<Users className="size-4" />} tone="primary" />
            </Link>
            <Link to="/attendance" className="block">
              <StatCard label="Present Today" value={`${present}/${s.employees.filter((e) => e.status !== "Resigned").length}`} hint={`${s.employees.filter((e) => e.status !== "Resigned").length - present} Absent/Leave`} icon={<CalendarCheck className="size-4" />} tone="success" />
            </Link>
            <Link to="/attendance" className="block">
              <StatCard label="Pending Leaves" value={myPendingApprovals.length} hint="Awaiting review" icon={<Clock className="size-4" />} tone="warning" />
            </Link>
            <Link to="/recruitment" className="block">
              <StatCard label="Recruitment Pipeline" value={s.applicants.length} hint={`${s.jobOpenings.filter((j) => j.status === "Open").length} Open Jobs`} icon={<Briefcase className="size-4" />} tone="info" />
            </Link>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Pending Leave Requests" action={<Link to="/attendance" className="text-xs text-primary">View All →</Link>}>
              {myPendingApprovals.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No leaves pending HR review.</p>
              ) : (
                <ul className="space-y-2">
                  {myPendingApprovals.map((l) => (
                    <li key={l.id} className="flex items-center justify-between rounded-lg border p-2.5 text-xs">
                      <div>
                        <p className="font-semibold">{empName(s, l.employeeId)}</p>
                        <p className="text-muted-foreground">{l.days} days ({l.type}) · {l.reason}</p>
                      </div>
                      <StatusBadge status={l.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="ATS & Candidate Pipeline" action={<Link to="/recruitment" className="text-xs text-primary">Open ATS →</Link>}>
              <ul className="space-y-2">
                {s.applicants.slice(0, 5).map((app) => (
                  <li key={app.id} className="flex items-center justify-between rounded-lg border p-2.5 text-xs">
                    <div>
                      <p className="font-semibold">{app.name}</p>
                      <p className="text-muted-foreground">{app.experienceYears} yrs exp · {app.email}</p>
                    </div>
                    <StatusBadge status={app.currentStage} />
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* 3. DEPARTMENT HEAD & MANAGER DASHBOARD VIEW */}
      {/* ========================================================================= */}
      {["Department Head", "Manager", "Team Leader"].includes(currentRole) && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Link to="/hierarchy" className="block">
              <StatCard
                label="Direct Subordinates"
                value={myDirectSubs.length}
                hint="Under your hierarchy"
                icon={<Users className="size-4" />}
                tone="primary"
              />
            </Link>
            <Link to="/tasks" className="block">
              <StatCard
                label="Tasks Under Review"
                value={mySubmittedTasks.length}
                hint="Submitted for approval"
                icon={<CheckCircle2 className="size-4" />}
                tone="warning"
              />
            </Link>
            <Link to="/departments" className="block">
              <StatCard
                label="Department Members"
                value={myDeptEmployees.length}
                hint={deptName(s, myDeptId)}
                icon={<Briefcase className="size-4" />}
                tone="info"
              />
            </Link>
            <Link to="/tasks" className="block">
              <StatCard
                label="My Open Tasks"
                value={myTasks.filter((t) => t.status !== "Approved").length}
                hint="Personal workload"
                icon={<ListChecks className="size-4" />}
                tone="success"
              />
            </Link>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Direct Subordinates Status" action={<Link to="/hierarchy" className="text-xs text-primary">Hierarchy Tree →</Link>}>
              <div className="space-y-2">
                {myDirectSubs.map((sub) => {
                  const subTasks = s.tasks.filter((t) => t.assignees.includes(sub.id) && t.status !== "Approved");
                  return (
                    <div key={sub.id} className="flex items-center justify-between rounded-lg border p-2.5 text-xs">
                      <div className="flex items-center gap-2">
                        <Avatar name={sub.name} size={28} />
                        <div>
                          <p className="font-semibold">{sub.name}</p>
                          <p className="text-muted-foreground">{sub.designation} ({sub.role})</p>
                        </div>
                      </div>
                      <span className="font-semibold text-primary">{subTasks.length} active tasks</span>
                    </div>
                  );
                })}
              </div>
            </Panel>

            <Panel title="Tasks Submitted for Verification" action={<Link to="/tasks" className="text-xs text-primary">Review All →</Link>}>
              {mySubmittedTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No tasks currently awaiting review.</p>
              ) : (
                <ul className="space-y-2">
                  {mySubmittedTasks.slice(0, 5).map((tk) => (
                    <li key={tk.id} className="flex items-center justify-between rounded-lg border p-2.5 text-xs">
                      <div>
                        <p className="font-semibold">{tk.title}</p>
                        <p className="text-muted-foreground">Assignee: {empName(s, tk.assignees[0])}</p>
                      </div>
                      <StatusBadge status={tk.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* 4. EMPLOYEE DASHBOARD VIEW */}
      {/* ========================================================================= */}
      {currentRole === "Employee" && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Assigned Tasks"
              value={myTasks.filter((t) => t.status !== "Approved").length}
              hint="Active work items"
              icon={<ListChecks className="size-4" />}
              tone="primary"
            />
            <StatCard
              label="Completed Tasks"
              value={myTasks.filter((t) => t.status === "Approved").length}
              hint="Approved this cycle"
              icon={<CheckCircle2 className="size-4" />}
              tone="success"
            />
            <StatCard
              label="Today's Attendance"
              value={s.attendance.find((a) => a.employeeId === currentEmpId && a.date === today())?.status || "Pending"}
              hint={`Office start: ${s.settings.officeStart}`}
              icon={<Clock className="size-4" />}
              tone="info"
            />
            <StatCard
              label="Self-Service Portal"
              value="My Portal"
              hint="DWR, Leave & Slips"
              icon={<UserCheck className="size-4" />}
              tone="warning"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="My Active Workload" action={<Link to="/self-service" className="text-xs text-primary">Open Self-Service →</Link>}>
              <ul className="space-y-2">
                {myTasks.slice(0, 5).map((tk) => (
                  <li key={tk.id} className="flex items-center justify-between rounded-lg border p-2.5 text-xs">
                    <div>
                      <p className="font-semibold">{tk.title}</p>
                      <p className="text-muted-foreground">Due: {fmtDate(tk.deadline)}</p>
                    </div>
                    <StatusBadge status={tk.status} />
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel title="Company Announcements">
              <ul className="space-y-2.5">
                {s.announcements.slice(0, 3).map((a) => (
                  <li key={a.id} className="rounded-lg border p-2.5 text-xs">
                    <p className="font-semibold text-sm">{a.title}</p>
                    <p className="text-muted-foreground mt-0.5">{a.body}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Posted by {empName(s, a.by)} on {fmtDate(a.date)}
                    </p>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* 5. COMMON BOTTOM PANELS: ANNOUNCEMENTS & RECENT AUDIT ACTIVITY */}
      {/* ========================================================================= */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Upcoming Tasks" action={<Link to="/tasks" className="text-xs text-primary">All Tasks →</Link>}>
          <ul className="space-y-2">
            {s.tasks
              .filter((t) => t.status !== "Approved")
              .slice(0, 6)
              .map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{t.title}</span>
                  <StatusBadge status={t.priority} />
                </li>
              ))}
          </ul>
        </Panel>

        <Panel title="Announcements & Notices" action={<Link to="/tasks" className="text-xs text-primary">Notices →</Link>}>
          <ul className="space-y-3">
            {s.announcements.slice(0, 4).map((a) => (
              <li key={a.id}>
                <p className="text-sm font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground">
                  {fmtDate(a.date)} · {empName(s, a.by)}
                </p>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Recent System Activity" action={<Link to="/activity" className="text-xs text-primary">Full Log →</Link>}>
          <ul className="space-y-2.5">
            {s.activity.slice(0, 6).map((a) => (
              <li key={a.id} className="flex gap-2 text-sm">
                <Avatar name={empName(s, a.by)} size={24} />
                <span className="truncate text-xs">
                  <b className="font-medium">{empName(s, a.by)}</b>{" "}
                  <span className="text-muted-foreground">{a.action}</span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
