// UrNinja OS — Complete Employee Self-Service Portal
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  User, CalendarCheck, Clock, FileText, Lock, Send, Award, Megaphone, CheckCircle2,
  Printer, AlertCircle, ShieldAlert, Target, ListChecks, Building2, GitFork, Phone, Mail,
  CheckSquare, FileSpreadsheet, Eye, Bell
} from "lucide-react";
import { useDemo, update, empName, deptName, recordSecurityAudit } from "@/store/demo-store";
import { PageHeader, Panel, StatCard, StatusBadge, Avatar, Field, inputCls, textareaCls, TableWrap, DemoTag, Empty } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { computePayslip } from "@/utils/payroll";
import { inr, fmtDate, today } from "@/utils/format";
import type { DailyWorkReport, LeaveRequest, TaskStatus } from "@/types";
import { pageHead } from "@/lib/seo";
import { toast } from "sonner";
import { format, differenceInCalendarDays, parseISO } from "date-fns";

export const Route = createFileRoute("/self-service")({
  head: pageHead("Employee Portal", "Personal profile, punch clock, leaves, compensation, tasks, and assigned leads."),
  component: SelfServicePage,
});

export function SelfServicePage() {
  const s = useDemo();
  // Connect to the active logged-in employee record
  const currentEmpId = s.session.employeeId || "UN-1008";
  const emp = s.employees.find((e) => e.id === currentEmpId) || s.employees[0];
  const t = today();
  const currentMonth = format(new Date(), "yyyy-MM");

  // Portal active section tab
  const [activeTab, setActiveTab] = useState<"overview" | "profile" | "attendance" | "payroll" | "tasks" | "leads" | "documents">("overview");

  // Today's attendance record
  const todayAtt = s.attendance.find((a) => a.employeeId === emp.id && a.date === t);

  // Leave Application Form State
  const [leaveForm, setLeaveForm] = useState({
    type: "Casual" as LeaveRequest["type"],
    from: t,
    to: t,
    reason: "",
  });

  // Daily Work Report (DWR) Form State
  const [dwrForm, setDwrForm] = useState({
    hoursWorked: 8.0,
    tasksCompleted: "",
    plansForTomorrow: "",
    blockersOrChallenges: "",
  });

  // Password Change Modal
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  // Payslip Modal
  const [selectedPayslipMonth, setSelectedPayslipMonth] = useState<string | null>(null);

  // Profile Edit Modal
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    phone: emp.phone,
    address: emp.address || "Headquarters",
    emergencyContact: emp.emergencyContact || "+91 98000 00000",
  });

  // Calculate Leave Balances
  const myApprovedLeaves = s.leaves.filter((l) => l.employeeId === emp.id && l.status === "Approved");
  const casualUsed = myApprovedLeaves.filter((l) => l.type === "Casual").reduce((acc, l) => acc + l.days, 0);
  const sickUsed = myApprovedLeaves.filter((l) => l.type === "Sick").reduce((acc, l) => acc + l.days, 0);
  const earnedUsed = myApprovedLeaves.filter((l) => l.type === "Earned").reduce((acc, l) => acc + l.days, 0);

  // Tasks, Leads & Work Reports for this Employee
  const myTasks = s.tasks.filter((tk) => tk.assignees.includes(emp.id));
  const myReports = s.dailyWorkReports.filter((r) => r.employeeId === emp.id);
  const myLeads = s.leads.filter((l) => l.assignedTo === emp.id);

  // Punch Clock In / Out
  const handlePunchClock = (kind: "in" | "out") => {
    const time = format(new Date(), "HH:mm");
    update((state) => {
      const rest = state.attendance.filter((a) => !(a.employeeId === emp.id && a.date === t));
      const cur = state.attendance.find((a) => a.employeeId === emp.id && a.date === t);
      const rec =
        kind === "in"
          ? {
              employeeId: emp.id,
              date: t,
              checkIn: time,
              status: (time > state.settings.officeStart ? "Late" : "Present") as "Late" | "Present",
            }
          : { ...cur!, checkOut: time };
      return { ...state, attendance: [...rest, rec] };
    }, { action: `punched check-${kind} at ${time}`, module: "Self-Service" });

    toast.success(`Check-${kind} registered at ${time}`);
  };

  // Submit Leave Request
  const handleApplyLeave = () => {
    if (!leaveForm.reason.trim()) {
      toast.error("Please provide a reason for the leave application.");
      return;
    }
    const days = differenceInCalendarDays(parseISO(leaveForm.to), parseISO(leaveForm.from)) + 1;
    if (days < 1) {
      toast.error("Invalid leave date range.");
      return;
    }

    const newLeave: LeaveRequest = {
      id: `LV${Date.now()}`,
      employeeId: emp.id,
      ...leaveForm,
      days,
      status: "Pending",
      currentLevel: 0,
      trail: [],
      appliedOn: t,
    };

    update((state) => ({
      ...state,
      leaves: [newLeave, ...state.leaves],
    }), { action: `applied for ${days} days ${leaveForm.type} leave`, module: "Self-Service" });

    toast.success("Leave application submitted for approval.");
    setLeaveForm({ type: "Casual", from: t, to: t, reason: "" });
  };

  // Submit Daily Work Report
  const handleSubmitDwr = () => {
    if (!dwrForm.tasksCompleted.trim()) {
      toast.error("Please enter tasks and deliverables completed today.");
      return;
    }

    const report: DailyWorkReport = {
      id: `DWR-${Date.now()}`,
      employeeId: emp.id,
      date: t,
      hoursWorked: Number(dwrForm.hoursWorked) || 8,
      tasksCompleted: dwrForm.tasksCompleted,
      plansForTomorrow: dwrForm.plansForTomorrow,
      blockersOrChallenges: dwrForm.blockersOrChallenges,
      submittedAt: `${t} ${format(new Date(), "HH:mm")}`,
    };

    update((state) => ({
      ...state,
      dailyWorkReports: [report, ...state.dailyWorkReports],
    }), { action: `submitted daily work report for ${t}`, module: "Self-Service" });

    toast.success("Daily work report submitted successfully.");
    setDwrForm({ hoursWorked: 8.0, tasksCompleted: "", plansForTomorrow: "", blockersOrChallenges: "" });
  };

  // Change Password
  const handleChangePassword = () => {
    if (emp.password && currentPw !== emp.password) {
      toast.error("Current password incorrect.");
      return;
    }
    if (newPw.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    if (newPw !== confirmPw) {
      toast.error("New passwords do not match.");
      return;
    }

    update((state) => ({
      ...state,
      employees: state.employees.map((e) =>
        e.id === emp.id
          ? {
              ...e,
              password: newPw,
              lastPasswordChange: t,
              temporaryPassword: false,
            }
          : e
      ),
    }), { action: `changed account password`, module: "Security" });

    recordSecurityAudit(emp.id, "Password Changed", "Employee updated password via Self-Service portal", "Success", emp.id);
    toast.success("Password changed successfully.");
    setIsChangingPassword(false);
    setCurrentPw("");
    setNewPw("");
    setConfirmPw("");
  };

  // Update Profile Contact Info
  const handleSaveProfile = () => {
    update((state) => ({
      ...state,
      employees: state.employees.map((e) =>
        e.id === emp.id ? { ...e, ...profileForm } : e
      ),
    }), { action: "updated contact information", module: "Self-Service" });

    toast.success("Profile contact information updated.");
    setIsEditingProfile(false);
  };

  // Toggle Subtask Checklist in My Tasks
  const handleToggleSubtask = (taskId: string, itemIdx: number) => {
    update((state) => ({
      ...state,
      tasks: state.tasks.map((tk) => {
        if (tk.id !== taskId) return tk;
        const newChecklist = tk.checklist.map((item, idx) =>
          idx === itemIdx ? { ...item, done: !item.done } : item
        );
        return { ...tk, checklist: newChecklist };
      }),
    }));
  };

  // Update Task Status
  const handleUpdateTaskStatus = (taskId: string, newStatus: TaskStatus) => {
    update((state) => ({
      ...state,
      tasks: state.tasks.map((tk) => (tk.id === taskId ? { ...tk, status: newStatus } : tk)),
    }), { action: `updated task status to ${newStatus}`, module: "Tasks" });
    toast.success(`Task status marked as ${newStatus}.`);
  };

  // Compute Current Payslip Data
  const mySalary = s.salaries.find((sal) => sal.employeeId === emp.id);
  const myAdjustment = s.adjustments.find((a) => a.employeeId === emp.id && a.month === currentMonth);
  const payslipData = mySalary
    ? computePayslip(mySalary, myAdjustment, currentMonth, s.attendance, s.leaves, s.settings.salaryComponents || [])
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Employee Portal · ${emp.name}`}
        subtitle={`${emp.designation} · ${deptName(s, emp.departmentId)} (${emp.id})`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsChangingPassword(true)}>
              <Lock className="size-3.5" /> Change Password
            </Button>
            <Button size="sm" onClick={() => setIsEditingProfile(true)}>
              <User className="size-3.5" /> Edit Contact Info
            </Button>
          </div>
        }
      />

      {/* Top Summary Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Today's Attendance"
          value={todayAtt?.checkIn ? `In: ${todayAtt.checkIn}` : "Not Checked In"}
          hint={todayAtt?.checkOut ? `Out: ${todayAtt.checkOut}` : todayAtt?.status || "Pending Punch"}
          icon={<Clock className="size-4" />}
          tone={todayAtt?.status === "Present" ? "success" : "warning"}
        />
        <StatCard
          label="Casual Leave Balance"
          value={`${12 - casualUsed} Days`}
          hint={`${casualUsed} days used of 12`}
          icon={<CalendarCheck className="size-4" />}
          tone="info"
        />
        <StatCard
          label="Active Assigned Tasks"
          value={myTasks.filter((t) => t.status !== "Approved").length}
          hint={`${myTasks.length} total tasks`}
          icon={<ListChecks className="size-4" />}
          tone="warning"
        />
        <StatCard
          label="Net Salary Preview"
          value={payslipData ? inr(payslipData.net) : "—"}
          hint={`Month: ${currentMonth}`}
          icon={<FileText className="size-4" />}
          tone="success"
        />
      </div>

      {/* Main Portal Navigation Tabs */}
      <div className="flex border-b border-border overflow-x-auto text-xs">
        {(
          [
            ["overview", "Overview & Clock-in", Clock],
            ["profile", "Profile & Reporting Line", User],
            ["attendance", "Attendance & Leaves", CalendarCheck],
            ["payroll", "Compensation & Slips", FileText],
            ["tasks", "My Tasks & DWR", ListChecks],
            ["leads", "Assigned CRM Leads", Target],
            ["documents", "Company Documents", FileSpreadsheet],
          ] as const
        ).map(([tabKey, label, Icon]) => (
          <button
            key={tabKey}
            onClick={() => setActiveTab(tabKey)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 font-semibold whitespace-nowrap transition-colors ${
              activeTab === tabKey
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW & CLOCK-IN */}
      {activeTab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Column: Clock-in widget & DWR */}
          <div className="space-y-6 lg:col-span-7">
            {/* Daily Punch Clock */}
            <Panel title="Daily Work Clock-in">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border bg-card/60">
                <div className="flex items-center gap-3">
                  <div className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Clock className="size-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-base">Office Shift: {s.settings.officeStart} AM</p>
                    <p className="text-xs text-muted-foreground">Today's Date: {fmtDate(t)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    disabled={!!todayAtt?.checkIn}
                    onClick={() => handlePunchClock("in")}
                    variant={todayAtt?.checkIn ? "outline" : "default"}
                  >
                    {todayAtt?.checkIn ? `Checked In: ${todayAtt.checkIn}` : "Punch Check-in"}
                  </Button>
                  <Button
                    disabled={!todayAtt?.checkIn || !!todayAtt?.checkOut}
                    onClick={() => handlePunchClock("out")}
                    variant="outline"
                  >
                    {todayAtt?.checkOut ? `Checked Out: ${todayAtt.checkOut}` : "Punch Check-out"}
                  </Button>
                </div>
              </div>
            </Panel>

            {/* Daily Work Report Submission */}
            <Panel title="Submit Today's Daily Work Report (DWR)">
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Hours Worked Today">
                    <input
                      type="number"
                      step="0.5"
                      className={inputCls}
                      value={dwrForm.hoursWorked}
                      onChange={(e) => setDwrForm({ ...dwrForm, hoursWorked: Number(e.target.value) || 8 })}
                    />
                  </Field>
                  <Field label="Submission Date">
                    <input type="text" disabled className={inputCls} value={fmtDate(t)} />
                  </Field>
                </div>
                <Field label="Tasks & Deliverables Completed Today">
                  <textarea
                    rows={2}
                    className={textareaCls}
                    placeholder="List specific milestones, client deliverables, PRs, or calls completed..."
                    value={dwrForm.tasksCompleted}
                    onChange={(e) => setDwrForm({ ...dwrForm, tasksCompleted: e.target.value })}
                  />
                </Field>
                <Field label="Priorities & Plan for Tomorrow">
                  <textarea
                    rows={2}
                    className={textareaCls}
                    placeholder="Key focus areas for your next working day..."
                    value={dwrForm.plansForTomorrow}
                    onChange={(e) => setDwrForm({ ...dwrForm, plansForTomorrow: e.target.value })}
                  />
                </Field>
                <Field label="Blockers or Escalations (Optional)">
                  <input
                    className={inputCls}
                    placeholder="Any dependency on other departments or client approvals..."
                    value={dwrForm.blockersOrChallenges}
                    onChange={(e) => setDwrForm({ ...dwrForm, blockersOrChallenges: e.target.value })}
                  />
                </Field>
                <Button onClick={handleSubmitDwr} className="gap-2">
                  <Send className="size-4" /> Submit Work Report
                </Button>
              </div>
            </Panel>
          </div>

          {/* Right Column: Company Announcements & Quick Tasks */}
          <div className="space-y-6 lg:col-span-5">
            {/* Announcements */}
            <Panel title="Company Announcements">
              {s.announcements.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No company announcements.</p>
              ) : (
                <div className="space-y-2.5 max-h-60 overflow-y-auto">
                  {s.announcements.slice(0, 4).map((a) => (
                    <div key={a.id} className="p-3 rounded-lg border bg-card/40 text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-foreground">{a.title}</span>
                        <span className="text-[10px] text-muted-foreground">{fmtDate(a.date)}</span>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">{a.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            {/* Quick Tasks */}
            <Panel title={`Active Tasks (${myTasks.filter((t) => t.status !== "Approved").length})`}>
              {myTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No tasks assigned.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {myTasks.slice(0, 5).map((tk) => (
                    <div key={tk.id} className="rounded-lg border p-2.5 text-xs space-y-1 bg-card/30">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">{tk.title}</span>
                        <StatusBadge status={tk.status} />
                      </div>
                      <p className="text-muted-foreground line-clamp-1">{tk.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </div>
      )}

      {/* TAB 2: PROFILE & REPORTING LINE */}
      {activeTab === "profile" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Personal & Employment Profile */}
          <Panel title="My Profile Details">
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-3 pb-3 border-b">
                <Avatar name={emp.name} size={54} />
                <div>
                  <h3 className="font-bold text-base">{emp.name}</h3>
                  <p className="text-muted-foreground">
                    {emp.id} · @{emp.userId} · {emp.designation}
                  </p>
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <dt className="text-muted-foreground">Corporate Email</dt>
                  <dd className="font-semibold text-sm">{emp.email}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Phone Number</dt>
                  <dd className="font-semibold text-sm">{emp.phone}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Department</dt>
                  <dd className="font-semibold text-sm">{deptName(s, emp.departmentId)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Role</dt>
                  <dd className="font-semibold text-sm">{emp.role}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Joining Date</dt>
                  <dd className="font-semibold text-sm">{fmtDate(emp.joiningDate)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Residential Address</dt>
                  <dd className="font-semibold text-sm">{emp.address || "Headquarters"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Emergency Contact</dt>
                  <dd className="font-semibold text-sm">{emp.emergencyContact || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Account Status</dt>
                  <dd><StatusBadge status={emp.status} /></dd>
                </div>
              </dl>
            </div>
          </Panel>

          {/* Reporting Manager & Department Head Info */}
          <Panel title="Reporting Line & Chain of Command">
            <div className="space-y-4 text-xs">
              {/* Direct Manager */}
              <div className="rounded-xl border p-4 bg-card/60">
                <p className="text-muted-foreground font-semibold text-[11px] uppercase tracking-wider mb-2">
                  Direct Reporting Manager
                </p>
                {emp.managerId ? (
                  <div className="flex items-center gap-3">
                    <Avatar name={empName(s, emp.managerId)} size={42} />
                    <div>
                      <p className="font-bold text-sm">{empName(s, emp.managerId)}</p>
                      <p className="text-muted-foreground">
                        {s.employees.find((e) => e.id === emp.managerId)?.designation || "Manager"} · ({emp.managerId})
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {s.employees.find((e) => e.id === emp.managerId)?.email}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">You report directly to Executive Leadership.</p>
                )}
              </div>

              {/* Department Head */}
              <div className="rounded-xl border p-4 bg-card/40">
                <p className="text-muted-foreground font-semibold text-[11px] uppercase tracking-wider mb-2">
                  Department Leadership ({deptName(s, emp.departmentId)})
                </p>
                {(() => {
                  const dept = s.departments.find((d) => d.id === emp.departmentId);
                  const head = dept?.headId ? s.employees.find((e) => e.id === dept.headId) : null;
                  return head ? (
                    <div className="flex items-center gap-3">
                      <Avatar name={head.name} size={36} />
                      <div>
                        <p className="font-bold">{head.name}</p>
                        <p className="text-muted-foreground text-[11px]">{head.designation} (Department Head)</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic">Department Head position currently vacant.</p>
                  );
                })()}
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* TAB 3: ATTENDANCE & LEAVES */}
      {activeTab === "attendance" && (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Apply for Leave Panel */}
          <div className="space-y-6 lg:col-span-5">
            <Panel title="Apply for Leave">
              <div className="space-y-3 text-xs">
                <Field label="Leave Type">
                  <select
                    className={inputCls}
                    value={leaveForm.type}
                    onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value as LeaveRequest["type"] })}
                  >
                    <option value="Casual">Casual Leave ({12 - casualUsed} left)</option>
                    <option value="Sick">Sick Leave ({8 - sickUsed} left)</option>
                    <option value="Earned">Earned Leave ({15 - earnedUsed} left)</option>
                    <option value="Unpaid">Unpaid Leave</option>
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="From Date">
                    <input
                      type="date"
                      className={inputCls}
                      value={leaveForm.from}
                      onChange={(e) => setLeaveForm({ ...leaveForm, from: e.target.value })}
                    />
                  </Field>
                  <Field label="To Date">
                    <input
                      type="date"
                      className={inputCls}
                      value={leaveForm.to}
                      onChange={(e) => setLeaveForm({ ...leaveForm, to: e.target.value })}
                    />
                  </Field>
                </div>
                <Field label="Reason for Leave">
                  <input
                    className={inputCls}
                    placeholder="e.g. Family medical emergency / planned travel"
                    value={leaveForm.reason}
                    onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  />
                </Field>
                <Button onClick={handleApplyLeave} className="w-full">
                  Submit Leave Application
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  Approval chain: Team Leader → Manager → HR → Owner
                </p>
              </div>
            </Panel>
          </div>

          {/* Leave History & Attendance Records */}
          <div className="space-y-6 lg:col-span-7">
            <Panel title="My Leave Applications History">
              {s.leaves.filter((l) => l.employeeId === emp.id).length === 0 ? (
                <Empty text="No leave applications submitted yet." />
              ) : (
                <TableWrap>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Dates</th>
                      <th>Days</th>
                      <th>Reason</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.leaves
                      .filter((l) => l.employeeId === emp.id)
                      .map((l) => (
                        <tr key={l.id}>
                          <td className="font-semibold text-xs">{l.type}</td>
                          <td className="text-xs">{fmtDate(l.from)} → {fmtDate(l.to)}</td>
                          <td className="text-xs font-bold">{l.days}d</td>
                          <td className="text-xs text-muted-foreground">{l.reason}</td>
                          <td><StatusBadge status={l.status} /></td>
                        </tr>
                      ))}
                  </tbody>
                </TableWrap>
              )}
            </Panel>

            <Panel title="Recent Attendance Check-in Log">
              <TableWrap>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {s.attendance
                    .filter((a) => a.employeeId === emp.id)
                    .slice(0, 7)
                    .map((a, i) => (
                      <tr key={i}>
                        <td className="text-xs font-semibold">{fmtDate(a.date)}</td>
                        <td className="text-xs">{a.checkIn || "—"}</td>
                        <td className="text-xs">{a.checkOut || "—"}</td>
                        <td><StatusBadge status={a.status} /></td>
                      </tr>
                    ))}
                </tbody>
              </TableWrap>
            </Panel>
          </div>
        </div>
      )}

      {/* TAB 4: COMPENSATION & SLIPS */}
      {activeTab === "payroll" && (
        <div className="space-y-6">
          {/* Current Month Payslip Preview */}
          <Panel title={`Monthly Salary Slip Preview — ${currentMonth}`}>
            {payslipData ? (
              <div className="space-y-4 rounded-xl border bg-card/60 p-4 text-xs">
                <div className="flex justify-between items-center pb-2 border-b">
                  <div>
                    <p className="font-bold text-sm">{s.settings.companyName}</p>
                    <p className="text-muted-foreground">{s.settings.tagline}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setSelectedPayslipMonth(currentMonth)}>
                    <Printer className="size-3.5" /> Full Printable Slip
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-bold text-success mb-2">Earnings</p>
                    <div className="space-y-1">
                      {payslipData.earnings.map((x) => (
                        <div key={x.label} className="flex justify-between">
                          <span>{x.label}</span>
                          <b>{inr(x.amount)}</b>
                        </div>
                      ))}
                      <div className="flex justify-between border-t pt-1 font-bold">
                        <span>Total Gross</span>
                        <span>{inr(payslipData.gross)}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="font-bold text-destructive mb-2">Deductions</p>
                    <div className="space-y-1">
                      {payslipData.deductions.map((x) => (
                        <div key={x.label} className="flex justify-between">
                          <span>{x.label}</span>
                          <b className="text-destructive">-{inr(x.amount)}</b>
                        </div>
                      ))}
                      <div className="flex justify-between border-t pt-1 font-bold">
                        <span>Total Deductions</span>
                        <span className="text-destructive">-{inr(payslipData.totalDeductions)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t flex justify-between items-center font-bold text-sm">
                  <span>Net Take-home Payout:</span>
                  <span className="text-success text-base">{inr(payslipData.net)}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No compensation record found for this employee.</p>
            )}
          </Panel>

          {/* Past Months Salary Slips List */}
          <Panel title="Past Finalized Pay Slips">
            <TableWrap>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Gross Pay</th>
                  <th>Total Deductions</th>
                  <th>Net Transfer</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {s.payrollRuns.map((r) => {
                  return (
                    <tr key={r.month}>
                      <td className="font-semibold text-xs">{r.month}</td>
                      <td>{payslipData ? inr(payslipData.gross) : "—"}</td>
                      <td className="text-destructive">-{payslipData ? inr(payslipData.totalDeductions) : "—"}</td>
                      <td className="font-bold text-success">{payslipData ? inr(payslipData.net) : "—"}</td>
                      <td><StatusBadge status={r.status} /></td>
                      <td className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs gap-1"
                          onClick={() => setSelectedPayslipMonth(r.month)}
                        >
                          <Printer className="size-3.5" /> View Slip
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </TableWrap>
          </Panel>
        </div>
      )}

      {/* TAB 5: MY TASKS & DWR */}
      {activeTab === "tasks" && (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Active Tasks with Checklist */}
          <div className="space-y-6 lg:col-span-7">
            <Panel title={`My Assigned Tasks (${myTasks.length})`}>
              {myTasks.length === 0 ? (
                <Empty text="No tasks currently assigned to you." />
              ) : (
                <div className="space-y-3">
                  {myTasks.map((tk) => (
                    <div key={tk.id} className="rounded-xl border p-3.5 bg-card/60 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">{tk.title}</span>
                        <div className="flex items-center gap-1.5">
                          <StatusBadge status={tk.priority} />
                          <StatusBadge status={tk.status} />
                        </div>
                      </div>

                      <p className="text-muted-foreground">{tk.description}</p>

                      {/* Checklist Subtasks */}
                      {tk.checklist && tk.checklist.length > 0 && (
                        <div className="space-y-1.5 rounded-lg border bg-background/50 p-2.5">
                          <p className="font-semibold text-[11px] text-muted-foreground">Deliverables Checklist:</p>
                          {tk.checklist.map((item, idx) => (
                            <label key={idx} className="flex items-center gap-2 cursor-pointer text-xs">
                              <input
                                type="checkbox"
                                checked={item.done}
                                onChange={() => handleToggleSubtask(tk.id, idx)}
                                className="size-3.5 accent-primary"
                              />
                              <span className={item.done ? "line-through text-muted-foreground" : "text-foreground"}>
                                {item.text}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}

                      {/* Status Action Buttons */}
                      <div className="flex items-center justify-between pt-2 border-t text-[11px]">
                        <span className="text-muted-foreground">Deadline: {fmtDate(tk.deadline)}</span>
                        <div className="flex gap-1.5">
                          {tk.status === "To Do" && (
                            <Button size="sm" variant="outline" onClick={() => handleUpdateTaskStatus(tk.id, "In Progress")}>
                              Start Task
                            </Button>
                          )}
                          {tk.status === "In Progress" && (
                            <Button size="sm" onClick={() => handleUpdateTaskStatus(tk.id, "Submitted")}>
                              Submit for Review
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          {/* DWR Submission History */}
          <div className="space-y-6 lg:col-span-5">
            <Panel title="Past Work Reports & Manager Feedback">
              {myReports.length === 0 ? (
                <Empty text="No work reports submitted yet." />
              ) : (
                <div className="space-y-2.5 max-h-96 overflow-y-auto">
                  {myReports.map((r) => (
                    <div key={r.id} className="p-3 rounded-lg border bg-card/40 text-xs space-y-1.5">
                      <div className="flex justify-between items-center font-bold">
                        <span>{fmtDate(r.date)}</span>
                        <span className="text-muted-foreground">{r.hoursWorked} hrs</span>
                      </div>
                      <p className="text-muted-foreground line-clamp-2">{r.tasksCompleted}</p>
                      {r.managerFeedback && (
                        <div className="rounded bg-primary/10 p-2 text-[11px] text-primary border border-primary/20">
                          <b>Manager Feedback:</b> {r.managerFeedback}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </div>
      )}

      {/* TAB 6: ASSIGNED CRM LEADS */}
      {activeTab === "leads" && (
        <Panel title={`Leads Assigned to Me (${myLeads.length})`}>
          {myLeads.length === 0 ? (
            <Empty text="No CRM sales leads assigned to your account." />
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <th>Business Name</th>
                  <th>Contact Person</th>
                  <th>Phone</th>
                  <th>City / Category</th>
                  <th>Deal Value</th>
                  <th>Stage</th>
                </tr>
              </thead>
              <tbody>
                {myLeads.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <p className="font-semibold text-sm">{l.businessName}</p>
                      <p className="text-[11px] font-mono text-muted-foreground">{l.id}</p>
                    </td>
                    <td className="text-xs">{l.contactPerson}</td>
                    <td className="text-xs">{l.phone}</td>
                    <td className="text-xs text-muted-foreground">{l.city} · {l.category}</td>
                    <td className="font-semibold text-xs">{inr(l.dealValue)}</td>
                    <td><StatusBadge status={l.stage} /></td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Panel>
      )}

      {/* TAB 7: COMPANY DOCUMENTS */}
      {activeTab === "documents" && (
        <Panel title="My Employee Documents & Policies">
          <div className="space-y-2 text-xs">
            {[
              { name: `Employment Agreement — ${emp.name}`, type: "PDF Document", size: "2.4 MB" },
              { name: "Non-Disclosure Agreement (NDA)", type: "Signed PDF", size: "1.1 MB" },
              { name: `${s.settings.companyName} Employee Code of Conduct & IT Policy`, type: "Company Policy", size: "4.8 MB" },
              { name: "Health Insurance Coverage Policy", type: "Benefits Document", size: "1.6 MB" },
            ].map((doc, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 rounded-lg border bg-card/60">
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="size-4 text-primary" />
                  <div>
                    <p className="font-semibold">{doc.name}</p>
                    <p className="text-[11px] text-muted-foreground">{doc.type} · {doc.size}</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => toast.info(`Viewing ${doc.name}`)}>
                  View Document
                </Button>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* ========================================================================= */}
      {/* CHANGE PASSWORD MODAL */}
      {/* ========================================================================= */}
      <Dialog open={isChangingPassword} onOpenChange={setIsChangingPassword}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Account Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-xs">
            <Field label="Current Password">
              <input
                type="password"
                className={inputCls}
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
              />
            </Field>
            <Field label="New Password (Min 6 Characters)">
              <input
                type="password"
                className={inputCls}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
              />
            </Field>
            <Field label="Confirm New Password">
              <input
                type="password"
                className={inputCls}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
              />
            </Field>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setIsChangingPassword(false)}>Cancel</Button>
              <Button onClick={handleChangePassword}>Update Password</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* EDIT CONTACT INFO MODAL */}
      {/* ========================================================================= */}
      <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile Contact Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <Field label="Phone Number">
              <input
                className={inputCls}
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
              />
            </Field>
            <Field label="Residential Address">
              <input
                className={inputCls}
                value={profileForm.address}
                onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
              />
            </Field>
            <Field label="Emergency Contact Number">
              <input
                className={inputCls}
                value={profileForm.emergencyContact}
                onChange={(e) => setProfileForm({ ...profileForm, emergencyContact: e.target.value })}
              />
            </Field>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setIsEditingProfile(false)}>Cancel</Button>
              <Button onClick={handleSaveProfile}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* FULL PRINTABLE PAYSLIP MODAL */}
      {/* ========================================================================= */}
      <Dialog open={!!selectedPayslipMonth} onOpenChange={() => setSelectedPayslipMonth(null)}>
        <DialogContent className="max-w-lg">
          {payslipData && (
            <div className="space-y-4 p-2 text-xs">
              <div className="text-center pb-4 border-b">
                <h2 className="font-display text-xl font-bold">{s.settings.companyName}</h2>
                <p className="text-muted-foreground">{s.settings.tagline}</p>
                <p className="font-semibold text-sm mt-1">Pay Slip for {selectedPayslipMonth}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-xl border p-3 bg-muted/20">
                <div>Employee Name: <b>{emp.name}</b></div>
                <div>Employee ID: <b>{emp.id}</b></div>
                <div>Designation: <b>{emp.designation}</b></div>
                <div>Department: <b>{deptName(s, emp.departmentId)}</b></div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-3">
                <div>
                  <p className="font-bold text-success mb-2">Earnings</p>
                  <div className="space-y-1">
                    {payslipData.earnings.map((x) => (
                      <div key={x.label} className="flex justify-between">
                        <span>{x.label}</span>
                        <b>{inr(x.amount)}</b>
                      </div>
                    ))}
                    <div className="flex justify-between border-t pt-1 font-bold">
                      <span>Total Gross</span>
                      <span>{inr(payslipData.gross)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="font-bold text-destructive mb-2">Deductions</p>
                  <div className="space-y-1">
                    {payslipData.deductions.map((x) => (
                      <div key={x.label} className="flex justify-between">
                        <span>{x.label}</span>
                        <b className="text-destructive">-{inr(x.amount)}</b>
                      </div>
                    ))}
                    <div className="flex justify-between border-t pt-1 font-bold">
                      <span>Total Deductions</span>
                      <span className="text-destructive">-{inr(payslipData.totalDeductions)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-accent/30 p-3.5 flex justify-between items-center text-sm font-bold border">
                <span>Net Pay Transferrable:</span>
                <span className="text-base text-success">{inr(payslipData.net)}</span>
              </div>

              <Button onClick={() => window.print()} className="w-full gap-2">
                <Printer className="size-4" /> Print Payslip
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
