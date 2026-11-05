// UrNinja OS — Attendance Tracking, Multi-Level Leave Approvals, and Configurable Leave Policies
import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { format, differenceInCalendarDays, parseISO } from "date-fns";
import {
  Clock, CalendarCheck, Sliders, Plus, ShieldCheck, CheckCircle2,
  AlertCircle, Users, Check, X, Undo2, Filter
} from "lucide-react";
import { useDemo, update, empName, deptName, notify } from "@/store/demo-store";
import { PageHeader, Panel, StatusBadge, Select, Field, inputCls, textareaCls, TableWrap, StatCard, Avatar, Empty, DemoTag } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { LeavePolicyRule, LeaveRequest } from "@/types";
import { fmtDate, today } from "@/utils/format";
import { pageHead } from "@/lib/seo";
import { toast } from "sonner";

export const Route = createFileRoute("/attendance")({
  head: pageHead("Attendance & Leave", "Daily attendance, check-ins, multi-level leave approvals and configurable leave rules."),
  component: AttendancePage,
});

export function AttendancePage() {
  const s = useDemo();
  const currentRole = s.session.role;
  const currentEmpId = s.session.employeeId || "UN-1001";
  const t = today();

  // Active view tab: "attendance" | "leaves" | "policies"
  const [activeTab, setActiveTab] = useState<"attendance" | "leaves" | "policies">("attendance");

  // Filters
  const [filterDept, setFilterDept] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // My punch record
  const myPunch = s.attendance.find((a) => a.employeeId === currentEmpId && a.date === t);

  // Leave Form State
  const [leaveForm, setLeaveForm] = useState({
    type: "Casual" as LeaveRequest["type"],
    from: t,
    to: t,
    reason: "",
  });

  // Configurable Leave Policy Rule Form State
  const [addingPolicyRule, setAddingPolicyRule] = useState(false);
  const [newPolicyRule, setNewPolicyRule] = useState<Partial<LeavePolicyRule>>({
    type: "",
    perYear: 10,
    paid: true,
    active: true,
    description: "",
  });

  const approvalChain = s.settings.approvalChain;
  const activeEmployees = s.employees.filter((e) => e.status !== "Resigned");

  // Today's attendance ledger
  const todayAttendanceList = useMemo(() => {
    return activeEmployees
      .filter((e) => !filterDept || e.departmentId === filterDept)
      .map((e) => {
        const att = s.attendance.find((a) => a.employeeId === e.id && a.date === t);
        return {
          emp: e,
          record: att,
          status: att?.status || "Not Marked",
        };
      })
      .filter((row) => !filterStatus || row.status === filterStatus);
  }, [activeEmployees, s.attendance, filterDept, filterStatus, t]);

  // Punch In / Out Handler
  const handlePunch = (kind: "in" | "out") => {
    const time = format(new Date(), "HH:mm");
    update((x) => {
      const rest = x.attendance.filter((a) => !(a.employeeId === currentEmpId && a.date === t));
      const cur = x.attendance.find((a) => a.employeeId === currentEmpId && a.date === t);
      const rec =
        kind === "in"
          ? {
              employeeId: currentEmpId,
              date: t,
              checkIn: time,
              status: (time > x.settings.officeStart ? "Late" : "Present") as "Late" | "Present",
            }
          : { ...cur!, checkOut: time };
      return { ...x, attendance: [...rest, rec] };
    }, { action: `punched ${kind} at ${time}`, module: "Attendance" });

    toast.success(`Check-${kind} registered at ${time}`);
  };

  // Submit Leave Request
  const handleApplyLeave = () => {
    if (!leaveForm.reason.trim()) {
      toast.error("Please enter a reason for the leave application.");
      return;
    }

    const days = differenceInCalendarDays(parseISO(leaveForm.to), parseISO(leaveForm.from)) + 1;
    if (days < 1) {
      toast.error("Invalid leave date range.");
      return;
    }

    const newReq: LeaveRequest = {
      id: `LV${Date.now()}`,
      employeeId: currentEmpId,
      ...leaveForm,
      days,
      status: "Pending",
      currentLevel: 0,
      trail: [],
      appliedOn: t,
    };

    update((x) => ({
      ...x,
      leaves: [newReq, ...x.leaves],
    }), { action: `applied for ${days} days ${leaveForm.type} leave`, module: "Leave" });

    toast.success("Leave request submitted for approval.");
    setLeaveForm({ type: "Casual", from: t, to: t, reason: "" });
  };

  // Process Multi-Level Leave Approval
  const handleProcessLeave = (l: LeaveRequest, action: "Approved" | "Rejected" | "Returned") => {
    const levelName = approvalChain[l.currentLevel] || "Management";

    update((x) => ({
      ...x,
      leaves: x.leaves.map((m) => {
        if (m.id !== l.id) return m;

        const trail = [
          ...m.trail,
          { level: levelName, by: currentEmpId, action, date: t },
        ];

        if (action !== "Approved") {
          return { ...m, trail, status: action };
        }

        const isLastLevel = m.currentLevel >= approvalChain.length - 1;

        // If approved at final stage, automatically update attendance for employee
        if (isLastLevel) {
          setTimeout(() => {
            update((st) => ({
              ...st,
              attendance: [
                ...st.attendance.filter((a) => !(a.employeeId === l.employeeId && a.date === t)),
                { employeeId: l.employeeId, date: t, status: "Leave" },
              ],
            }));
          }, 10);
        }

        return {
          ...m,
          trail,
          currentLevel: isLastLevel ? m.currentLevel : m.currentLevel + 1,
          status: isLastLevel ? "Approved" : "Pending",
        };
      }),
    }), { action: `${action.toLowerCase()} leave request for ${empName(s, l.employeeId)} at ${levelName} level`, module: "Leave" });

    notify(
      `Leave Request ${action}`,
      `Your ${l.type} leave request was ${action.toLowerCase()} by ${empName(s, currentEmpId)}`,
      "/attendance",
      l.employeeId
    );
    toast.success(`Leave request ${action.toLowerCase()} at ${levelName} level.`);
  };

  // Add Configurable Leave Rule
  const handleAddPolicyRule = () => {
    if (!newPolicyRule.type?.trim()) {
      toast.error("Leave type name is required.");
      return;
    }

    const rule: LeavePolicyRule = {
      id: `LR-${Date.now()}`,
      type: newPolicyRule.type.trim(),
      perYear: Number(newPolicyRule.perYear) || 10,
      paid: newPolicyRule.paid ?? true,
      active: true,
      description: newPolicyRule.description || "Company leave rule",
    };

    update((x) => ({
      ...x,
      settings: {
        ...x.settings,
        leaveRules: [...(x.settings.leaveRules || []), rule],
        leavePolicy: [
          ...x.settings.leavePolicy,
          { type: rule.type, perYear: rule.perYear, paid: rule.paid },
        ],
      },
    }), { action: `added leave policy rule for ${rule.type}`, module: "Leave Policy" });

    toast.success(`Leave policy rule "${rule.type}" created.`);
    setAddingPolicyRule(false);
    setNewPolicyRule({ type: "", perYear: 10, paid: true, active: true, description: "" });
  };

  // Toggle Policy Rule Active
  const handleTogglePolicyRule = (ruleId: string) => {
    update((x) => ({
      ...x,
      settings: {
        ...x.settings,
        leaveRules: (x.settings.leaveRules || []).map((r) =>
          r.id === ruleId ? { ...r, active: !r.active } : r
        ),
      },
    }));
    toast.success("Leave policy rule status updated.");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance, Leaves & Policy Rules"
        subtitle={`${activeEmployees.length} employees · Today's Date: ${fmtDate(t)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              disabled={!!myPunch?.checkIn}
              onClick={() => handlePunch("in")}
              size="sm"
              className="text-xs"
            >
              {myPunch?.checkIn ? `In: ${myPunch.checkIn}` : "Punch In"}
            </Button>
            <Button
              variant="outline"
              disabled={!myPunch?.checkIn || !!myPunch?.checkOut}
              onClick={() => handlePunch("out")}
              size="sm"
              className="text-xs"
            >
              {myPunch?.checkOut ? `Out: ${myPunch.checkOut}` : "Punch Out"}
            </Button>

            {["Super Owner", "Owner", "Super Admin", "Admin", "HR"].includes(currentRole) && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setActiveTab("policies")}
              >
                <Sliders className="size-3.5" /> Leave Policies
              </Button>
            )}
          </div>
        }
      />

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Present Today"
          value={s.attendance.filter((a) => a.date === t && (a.status === "Present" || a.status === "Late")).length}
          tone="success"
          hint={`Of ${activeEmployees.length} total staff`}
        />
        <StatCard
          label="Late Check-ins"
          value={s.attendance.filter((a) => a.date === t && a.status === "Late").length}
          tone="warning"
          hint={`After ${s.settings.officeStart} AM`}
        />
        <StatCard
          label="On Approved Leave"
          value={s.attendance.filter((a) => a.date === t && a.status === "Leave").length}
          tone="info"
          hint="Leaves authorized"
        />
        <StatCard
          label="Pending Leave Requests"
          value={s.leaves.filter((l) => l.status === "Pending").length}
          tone="warning"
          hint="Awaiting managerial review"
        />
      </div>

      {/* Main Tabs */}
      <div className="flex border-b border-border text-xs">
        <button
          onClick={() => setActiveTab("attendance")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 font-semibold transition-colors ${
            activeTab === "attendance"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Clock className="size-4" /> Daily Attendance Ledger
        </button>
        <button
          onClick={() => setActiveTab("leaves")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 font-semibold transition-colors ${
            activeTab === "leaves"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <CalendarCheck className="size-4" /> Leave Approvals & Requests ({s.leaves.filter((l) => l.status === "Pending").length})
        </button>
        <button
          onClick={() => setActiveTab("policies")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 font-semibold transition-colors ${
            activeTab === "policies"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sliders className="size-4" /> Configurable Leave Policies
        </button>
      </div>

      {/* TAB 1: DAILY ATTENDANCE LEDGER */}
      {activeTab === "attendance" && (
        <Panel title={`Today's Attendance Sheet — ${fmtDate(t)}`}>
          <div className="mb-4 flex flex-wrap gap-2.5 text-xs">
            <Select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className="w-44 text-xs">
              <option value="">All Departments</option>
              {s.departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>

            <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-36 text-xs">
              <option value="">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Late">Late</option>
              <option value="Leave">On Leave</option>
              <option value="Absent">Absent</option>
              <option value="Not Marked">Not Marked</option>
            </Select>
          </div>

          <TableWrap>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {todayAttendanceList.map(({ emp, record, status }) => (
                <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                  <td>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={emp.name} size={30} />
                      <div>
                        <p className="font-semibold text-sm leading-tight">{emp.name}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{emp.id} · {emp.designation}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-xs text-muted-foreground">{deptName(s, emp.departmentId)}</td>
                  <td className="text-xs font-semibold">{record?.checkIn || "—"}</td>
                  <td className="text-xs font-semibold">{record?.checkOut || "—"}</td>
                  <td><StatusBadge status={status} /></td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </Panel>
      )}

      {/* TAB 2: LEAVE REQUESTS & APPROVALS */}
      {activeTab === "leaves" && (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Apply for Leave Panel */}
          <div className="space-y-6 lg:col-span-5">
            <Panel title="Apply for Leave">
              <div className="space-y-3 text-xs">
                <Field label="Leave Type">
                  <select
                    className={inputCls}
                    value={leaveForm.type}
                    onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value as any })}
                  >
                    {s.settings.leavePolicy.map((p) => (
                      <option key={p.type} value={p.type}>{p.type}</option>
                    ))}
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
                    placeholder="e.g. Health recovery / Family obligations"
                    value={leaveForm.reason}
                    onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  />
                </Field>

                <Button onClick={handleApplyLeave} className="w-full">
                  Submit Leave Request
                </Button>
                <p className="text-[11px] text-muted-foreground text-center">
                  Approval chain: {approvalChain.join(" → ")}
                </p>
              </div>
            </Panel>
          </div>

          {/* Leave Review & Approvals Queue */}
          <div className="space-y-6 lg:col-span-7">
            <Panel title={`Leave Requests Queue (${s.leaves.length})`}>
              {s.leaves.length === 0 ? (
                <Empty text="No leave applications on record." />
              ) : (
                <div className="space-y-3">
                  {s.leaves.map((l) => {
                    const applicant = s.employees.find((e) => e.id === l.employeeId);
                    const currentLevelName = approvalChain[l.currentLevel] || "Management";
                    const isPending = l.status === "Pending";

                    return (
                      <div key={l.id} className="rounded-xl border p-4 bg-card/60 text-xs space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={applicant?.name || "Employee"} size={34} />
                            <div>
                              <p className="font-bold text-sm leading-tight">{applicant?.name || l.employeeId}</p>
                              <p className="text-muted-foreground text-[11px]">
                                {applicant?.designation} · {deptName(s, applicant?.departmentId)}
                              </p>
                            </div>
                          </div>
                          <StatusBadge status={l.status} />
                        </div>

                        <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-2 text-[11px]">
                          <div>
                            <span>Period: </span>
                            <b>{fmtDate(l.from)} → {fmtDate(l.to)} ({l.days} days)</b>
                          </div>
                          <div>
                            <span>Category: </span>
                            <b className="text-foreground">{l.type}</b>
                          </div>
                        </div>

                        <p className="text-muted-foreground italic">"{l.reason}"</p>

                        {/* Approval Stage Action Bar */}
                        <div className="flex items-center justify-between pt-2 border-t text-[11px]">
                          <span className="text-muted-foreground">
                            {isPending ? `Pending Approval: ${currentLevelName} Level` : `Status: ${l.status}`}
                          </span>

                          {isPending && ["Super Owner", "Owner", "Super Admin", "Admin", "HR", "Department Head", "Manager"].includes(currentRole) && (
                            <div className="flex gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-destructive hover:text-destructive"
                                onClick={() => handleProcessLeave(l, "Rejected")}
                              >
                                <X className="size-3" /> Reject
                              </Button>
                              <Button
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={() => handleProcessLeave(l, "Approved")}
                              >
                                <Check className="size-3" /> Approve
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Audit Trail */}
                        {l.trail && l.trail.length > 0 && (
                          <div className="pt-1.5 border-t text-[10px] text-muted-foreground space-y-0.5">
                            {l.trail.map((tr, idx) => (
                              <p key={idx}>
                                {fmtDate(tr.date)} — <b>{tr.action}</b> by {empName(s, tr.by)} ({tr.level})
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>
          </div>
        </div>
      )}

      {/* TAB 3: CONFIGURABLE LEAVE POLICIES */}
      {activeTab === "policies" && (
        <div className="space-y-6">
          <Panel
            title="Configurable Enterprise Leave Policies & Quotas"
            action={
              ["Super Owner", "Owner", "Super Admin", "Admin", "HR"].includes(currentRole) && (
                <Button size="sm" onClick={() => setAddingPolicyRule(true)} className="gap-1.5 text-xs">
                  <Plus className="size-3.5" /> Add Leave Policy Rule
                </Button>
              )
            }
          >
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Configure annual paid and unpaid leave allowances across departments. Changes automatically
                update employee leave balances without altering historical leave applications.
              </p>

              <TableWrap>
                <thead>
                  <tr>
                    <th>Leave Policy Name</th>
                    <th>Annual Allowance</th>
                    <th>Pay Policy</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th className="text-right">Active Toggle</th>
                  </tr>
                </thead>
                <tbody>
                  {(s.settings.leaveRules || [
                    { id: "LR-1", type: "Casual Leave", perYear: 12, paid: true, active: true, description: "Short personal leaves" },
                    { id: "LR-2", type: "Sick Leave", perYear: 8, paid: true, active: true, description: "Medical leaves" },
                    { id: "LR-3", type: "Earned Leave", perYear: 15, paid: true, active: true, description: "Privilege annual leaves" },
                    { id: "LR-4", type: "Unpaid Leave", perYear: 30, paid: false, active: true, description: "Unpaid leave without pay" },
                  ]).map((rule) => (
                    <tr key={rule.id}>
                      <td className="font-bold text-xs">{rule.type}</td>
                      <td className="font-semibold text-xs">{rule.perYear} Days / Year</td>
                      <td>
                        {rule.paid ? (
                          <span className="rounded bg-success/15 px-2 py-0.5 text-[11px] font-bold text-success">
                            Paid Leave
                          </span>
                        ) : (
                          <span className="rounded bg-destructive/15 px-2 py-0.5 text-[11px] font-bold text-destructive">
                            Unpaid Deduction
                          </span>
                        )}
                      </td>
                      <td className="text-xs text-muted-foreground">{rule.description || "Company policy"}</td>
                      <td>
                        <StatusBadge status={rule.active ? "Active" : "Inactive"} />
                      </td>
                      <td className="text-right">
                        <input
                          type="checkbox"
                          checked={rule.active}
                          onChange={() => handleTogglePolicyRule(rule.id)}
                          className="size-4 accent-primary cursor-pointer"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </div>
          </Panel>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD LEAVE POLICY RULE MODAL */}
      {/* ========================================================================= */}
      <Dialog open={addingPolicyRule} onOpenChange={setAddingPolicyRule}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Leave Policy Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <Field label="Leave Policy Name">
              <input
                className={inputCls}
                placeholder="e.g. Maternity / Paternity Leave"
                value={newPolicyRule.type}
                onChange={(e) => setNewPolicyRule({ ...newPolicyRule, type: e.target.value })}
              />
            </Field>

            <Field label="Annual Allowance (Days per Year)">
              <input
                type="number"
                className={inputCls}
                value={newPolicyRule.perYear}
                onChange={(e) => setNewPolicyRule({ ...newPolicyRule, perYear: Number(e.target.value) || 0 })}
              />
            </Field>

            <Field label="Pay Policy">
              <select
                className={inputCls}
                value={newPolicyRule.paid ? "paid" : "unpaid"}
                onChange={(e) => setNewPolicyRule({ ...newPolicyRule, paid: e.target.value === "paid" })}
              >
                <option value="paid">Paid Leave (No Payroll Deduction)</option>
                <option value="unpaid">Unpaid Leave (Deducts from Net Salary)</option>
              </select>
            </Field>

            <Field label="Policy Description">
              <textarea
                rows={2}
                className={textareaCls}
                placeholder="Eligibility, notice periods, and documentation required..."
                value={newPolicyRule.description}
                onChange={(e) => setNewPolicyRule({ ...newPolicyRule, description: e.target.value })}
              />
            </Field>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setAddingPolicyRule(false)}>Cancel</Button>
              <Button onClick={handleAddPolicyRule}>Save Leave Rule</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
