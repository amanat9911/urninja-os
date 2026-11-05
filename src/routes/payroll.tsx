// UrNinja OS — Configurable Dynamic Payroll, Dynamic Components, and Immutable Historical Snapshots
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Printer, Plus, Lock, CheckCircle2, Sliders, ShieldCheck,
  AlertCircle, History, Sparkles, Edit2, DollarSign, ArrowRight
} from "lucide-react";
import { useDemo, update, empName, deptName, canManageUser } from "@/store/demo-store";
import { PageHeader, Panel, StatusBadge, TableWrap, StatCard, DemoTag, Select, Field, inputCls, textareaCls } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { computePayslip } from "@/utils/payroll";
import { inr, today, fmtDate } from "@/utils/format";
import type { MonthlyAdjustment, PayrollRun, PayrollSnapshot, SalaryComponent } from "@/types";
import { pageHead } from "@/lib/seo";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/payroll")({
  head: pageHead("Payroll", "Real dynamic salary sheets, custom earnings/deductions, approvals, and immutable snapshots."),
  component: PayrollPage,
});

const FLOW: PayrollRun["status"][] = ["Draft", "Pending Approval", "Approved", "Paid", "Locked"];

export function PayrollPage() {
  const s = useDemo();
  const currentRole = s.session.role;
  const currentUserId = s.session.employeeId || "UN-1001";

  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [selectedSlipEmpId, setSelectedSlipEmpId] = useState<string | null>(null);

  // Dynamic Components Manager Modal
  const [managingComponents, setManagingComponents] = useState(false);
  const [newComp, setNewComp] = useState<Partial<SalaryComponent>>({
    name: "",
    kind: "earning",
    amount: 2000,
    frequency: "Monthly",
    mode: "Fixed",
    active: true,
  });

  // Manual Override Dialog
  const [overrideTargetEmpId, setOverrideTargetEmpId] = useState<string | null>(null);
  const [overrideAmount, setOverrideAmount] = useState<number>(0);
  const [overrideReason, setOverrideReason] = useState<string>("");

  // Get or initialize run for this month
  const run =
    s.payrollRuns.find((r) => r.month === month) ??
    ({
      month,
      status: "Draft",
      audit: [{ by: currentUserId, action: "Created Draft Run", date: today() }],
      snapshots: undefined,
    } as PayrollRun);

  const isLocked = run.status === "Locked" || run.status === "Paid";
  const globalComponents = s.settings.salaryComponents || [];

  // Active employees for payroll
  const activeEmployees = s.employees.filter((e) => e.status !== "Resigned");

  // Compute rows: use snapshots if locked & present, otherwise calculate dynamically
  const rows = activeEmployees.map((e) => {
    // Check if snapshot exists for this month
    const snapshot = run.snapshots?.find((sn) => sn.employeeId === e.id);
    if (snapshot) {
      return {
        emp: e,
        isSnapshot: true,
        p: {
          earnings: snapshot.earnings,
          deductions: snapshot.deductions,
          gross: snapshot.gross,
          totalDeductions: snapshot.totalDeductions,
          net: snapshot.net,
          unpaidDays: snapshot.unpaidDays,
          overridden: snapshot.overridden || false,
          overrideNote: snapshot.overrideNote,
        },
      };
    }

    const sal = s.salaries.find((x) => x.employeeId === e.id) || {
      employeeId: e.id,
      basic: 30000,
      hra: 12000,
      allowances: 3000,
      pfPercent: 12,
      esi: 0,
      professionalTax: 200,
      tdsPercent: 5,
      custom: [],
      components: [],
    };

    const adj = s.adjustments.find((a) => a.employeeId === e.id && a.month === month);
    const p = computePayslip(sal, adj, month, s.attendance, s.leaves, globalComponents);

    return { emp: e, isSnapshot: false, p };
  });

  const totalPayout = rows.reduce((acc, r) => acc + r.p.net, 0);
  const totalUnpaidDays = rows.reduce((acc, r) => acc + r.p.unpaidDays, 0);

  // Advance workflow state
  const handleAdvanceStage = () => {
    const currentIndex = FLOW.indexOf(run.status);
    const nextStatus = FLOW[currentIndex + 1];
    if (!nextStatus) return;

    const t = today();
    let newSnapshots = run.snapshots;

    // If advancing to Locked or Paid, generate permanent immutable snapshot
    if (nextStatus === "Locked" || nextStatus === "Paid") {
      newSnapshots = rows.map(({ emp, p }) => ({
        employeeId: emp.id,
        employeeName: emp.name,
        departmentId: emp.departmentId,
        designation: emp.designation,
        basic: s.salaries.find((sal) => sal.employeeId === emp.id)?.basic || 30000,
        gross: p.gross,
        earnings: p.earnings,
        deductions: p.deductions,
        totalDeductions: p.totalDeductions,
        net: p.net,
        unpaidDays: p.unpaidDays,
        overridden: p.overridden,
        overrideNote: p.overrideNote,
      }));
    }

    const updatedRun: PayrollRun = {
      ...run,
      status: nextStatus,
      finalizedAt: nextStatus === "Locked" ? t : run.finalizedAt,
      audit: [
        ...run.audit,
        { by: currentUserId, action: `Advanced to ${nextStatus}`, date: t },
      ],
      snapshots: newSnapshots,
    };

    update((x) => ({
      ...x,
      payrollRuns: [
        ...x.payrollRuns.filter((r) => r.month !== month),
        updatedRun,
      ],
    }), { action: `payroll ${month} advanced to ${nextStatus}`, module: "Payroll" });

    toast.success(`Payroll for ${month} moved to ${nextStatus}.`);
  };

  // Monthly Adjustment helper
  const updateAdj = (empId: string, patch: Partial<MonthlyAdjustment>) => {
    if (isLocked) {
      toast.error("Cannot modify adjustments on a locked or paid payroll run.");
      return;
    }
    update((x) => {
      const cur =
        x.adjustments.find((a) => a.employeeId === empId && a.month === month) ??
        {
          employeeId: empId,
          month,
          incentive: 0,
          bonus: 0,
          reimbursement: 0,
          advance: 0,
          loan: 0,
        };
      return {
        ...x,
        adjustments: [
          ...x.adjustments.filter((a) => !(a.employeeId === empId && a.month === month)),
          { ...cur, ...patch },
        ],
      };
    });
  };

  // Add Dynamic Salary Component
  const handleAddSalaryComponent = () => {
    if (!newComp.name?.trim()) {
      toast.error("Component name is required.");
      return;
    }

    const comp: SalaryComponent = {
      id: `SC-${Date.now()}`,
      name: newComp.name.trim(),
      kind: newComp.kind || "earning",
      amount: Number(newComp.amount) || 0,
      frequency: newComp.frequency || "Monthly",
      mode: "Fixed",
      active: true,
    };

    update((x) => ({
      ...x,
      settings: {
        ...x.settings,
        salaryComponents: [...(x.settings.salaryComponents || []), comp],
      },
    }), { action: `created salary component ${comp.name}`, module: "Payroll" });

    toast.success(`Salary component "${comp.name}" added to compensation structure.`);
    setNewComp({ name: "", kind: "earning", amount: 2000, frequency: "Monthly", mode: "Fixed", active: true });
  };

  // Toggle Salary Component Active
  const handleToggleComponent = (id: string) => {
    update((x) => ({
      ...x,
      settings: {
        ...x.settings,
        salaryComponents: (x.settings.salaryComponents || []).map((c) =>
          c.id === id ? { ...c, active: !c.active } : c
        ),
      },
    }));
    toast.success("Component configuration updated.");
  };

  // Save Manual Net Salary Override
  const handleSaveOverride = () => {
    if (!overrideTargetEmpId) return;
    if (overrideAmount < 0) {
      toast.error("Override amount must be non-negative.");
      return;
    }

    updateAdj(overrideTargetEmpId, {
      overrideNet: overrideAmount,
      overrideReason: overrideReason || "Administrative manual payroll adjustment",
    });

    toast.success(`Net payout for ${empName(s, overrideTargetEmpId)} manually set to ${inr(overrideAmount)}.`);
    setOverrideTargetEmpId(null);
  };

  const selectedRow = rows.find((r) => r.emp.id === selectedSlipEmpId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll & Compensation"
        subtitle={`Period: ${month} · Dynamic salary calculation, custom earnings, and immutable snapshots`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="month"
              aria-label="Select payroll month"
              className={inputCls + " w-40 text-xs font-semibold"}
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />

            {["Super Owner", "Owner", "Super Admin", "Admin", "HR"].includes(currentRole) && (
              <Button variant="outline" onClick={() => setManagingComponents(true)} className="gap-1.5 text-xs">
                <Sliders className="size-3.5" /> Manage Salary Components
              </Button>
            )}

            {run.status !== "Locked" && ["Super Owner", "Owner", "Super Admin", "Admin", "HR"].includes(currentRole) && (
              <Button onClick={handleAdvanceStage} className="gap-1.5 text-xs">
                Advance to {FLOW[FLOW.indexOf(run.status) + 1] || "Locked"}
              </Button>
            )}
          </div>
        }
      />

      {/* Top Summary Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Payroll Status" value={<StatusBadge status={run.status} />} tone="info" />
        <StatCard label="Net Total Payout" value={inr(totalPayout)} tone="success" hint="Calculated Net" />
        <StatCard label="Eligible Employees" value={rows.length} hint={`${s.departments.length} departments`} />
        <StatCard label="Unpaid Days Total" value={totalUnpaidDays} tone="warning" hint="Absences + Unpaid Leaves" />
      </div>

      {isLocked && (
        <div className="rounded-xl border border-success/30 bg-success/10 p-3.5 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-success" />
            <span className="font-semibold text-foreground">
              Immutable Historical Snapshot Active for {month}
            </span>
          </div>
          <span className="text-muted-foreground">
            This payroll run is finalized and will not be overwritten by future employee salary updates.
          </span>
        </div>
      )}

      {/* Salary Sheet Panel */}
      <Panel title={`Payroll Sheet — ${format(new Date(month + "-01"), "MMMM yyyy")}`}>
        <TableWrap>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Gross Earnings</th>
              <th>Incentive</th>
              <th>Bonus</th>
              <th>Advance</th>
              <th>Deductions</th>
              <th>Net Payout</th>
              <th className="text-right">Salary Slip</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ emp, p, isSnapshot }) => {
              const adj = s.adjustments.find((a) => a.employeeId === emp.id && a.month === month);

              return (
                <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                  <td>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{emp.name}</p>
                      <span className="text-[11px] font-mono text-muted-foreground">({emp.id})</span>
                    </div>
                  </td>
                  <td className="text-xs text-muted-foreground">{deptName(s, emp.departmentId)}</td>
                  <td className="font-semibold text-xs text-foreground">{inr(p.gross)}</td>
                  <td>
                    <input
                      type="number"
                      aria-label={`Incentive for ${emp.name}`}
                      disabled={isLocked}
                      className="h-8 w-20 rounded border bg-background px-2 text-xs"
                      value={adj?.incentive ?? 0}
                      onChange={(e) => updateAdj(emp.id, { incentive: Number(e.target.value) || 0 })}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      aria-label={`Bonus for ${emp.name}`}
                      disabled={isLocked}
                      className="h-8 w-20 rounded border bg-background px-2 text-xs"
                      value={adj?.bonus ?? 0}
                      onChange={(e) => updateAdj(emp.id, { bonus: Number(e.target.value) || 0 })}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      aria-label={`Advance recovery for ${emp.name}`}
                      disabled={isLocked}
                      className="h-8 w-20 rounded border bg-background px-2 text-xs"
                      value={adj?.advance ?? 0}
                      onChange={(e) => updateAdj(emp.id, { advance: Number(e.target.value) || 0 })}
                    />
                  </td>
                  <td className="text-destructive font-semibold text-xs">-{inr(p.totalDeductions)}</td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-success">{inr(p.net)}</span>
                      {p.overridden && (
                        <span className="rounded bg-warning/20 px-1 py-0.2 text-[10px] font-bold text-warning" title={p.overrideNote}>
                          Override
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      {!isLocked && (
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Manual Net Salary Override"
                          onClick={() => {
                            setOverrideTargetEmpId(emp.id);
                            setOverrideAmount(p.net);
                            setOverrideReason("");
                          }}
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs gap-1"
                        onClick={() => setSelectedSlipEmpId(emp.id)}
                      >
                        <Printer className="size-3.5" /> Slip
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      </Panel>

      {/* Audit Trail Panel */}
      {run.audit && run.audit.length > 0 && (
        <Panel title="Payroll Stage Audit Trail">
          <ul className="space-y-1.5 text-xs">
            {run.audit.map((a, i) => (
              <li key={i} className="flex items-center gap-2 text-muted-foreground">
                <span className="font-mono text-[11px]">{a.date}</span>
                <span>—</span>
                <span className="font-semibold text-foreground">{empName(s, a.by)}</span>
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold text-foreground">
                  {a.action}
                </span>
                {a.note && <span className="text-[11px] italic">({a.note})</span>}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {/* ========================================================================= */}
      {/* DYNAMIC SALARY COMPONENTS MANAGER MODAL */}
      {/* ========================================================================= */}
      <Dialog open={managingComponents} onOpenChange={setManagingComponents}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sliders className="size-5 text-primary" /> Dynamic Salary Components Manager
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            <p className="text-muted-foreground">
              Define reusable custom earnings and deductions (e.g. Travel Allowance, Performance Bonus, Health Deductions).
              These components calculate automatically in employee monthly salary structures.
            </p>

            {/* Existing Components List */}
            <div className="space-y-2 rounded-xl border p-3 bg-card/60">
              <p className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Active Components</p>
              {globalComponents.length === 0 ? (
                <p className="text-muted-foreground italic">No custom components configured.</p>
              ) : (
                <div className="space-y-1.5">
                  {globalComponents.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-2 rounded-lg border bg-background text-xs">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={c.active}
                          onChange={() => handleToggleComponent(c.id)}
                          className="size-4 accent-primary"
                        />
                        <div>
                          <p className="font-semibold">{c.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {c.frequency} · {c.kind === "earning" ? "Earning Addition" : "Deduction"}
                          </p>
                        </div>
                      </div>
                      <b className={c.kind === "earning" ? "text-success" : "text-destructive"}>
                        {c.kind === "earning" ? "+" : "-"}{inr(c.amount)}
                      </b>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Component Form */}
            <div className="rounded-xl border p-3.5 bg-muted/30 space-y-3">
              <p className="font-bold text-xs">Create New Component</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Component Name">
                  <input
                    className={inputCls}
                    placeholder="e.g. Performance Incentive / Overtime"
                    value={newComp.name}
                    onChange={(e) => setNewComp({ ...newComp, name: e.target.value })}
                  />
                </Field>
                <Field label="Kind">
                  <select
                    className={inputCls}
                    value={newComp.kind}
                    onChange={(e) => setNewComp({ ...newComp, kind: e.target.value as any })}
                  >
                    <option value="earning">Earning (+) Addition</option>
                    <option value="deduction">Deduction (-) Reduction</option>
                  </select>
                </Field>
                <Field label="Default Amount (₹)">
                  <input
                    type="number"
                    className={inputCls}
                    value={newComp.amount}
                    onChange={(e) => setNewComp({ ...newComp, amount: Number(e.target.value) || 0 })}
                  />
                </Field>
                <Field label="Frequency">
                  <select
                    className={inputCls}
                    value={newComp.frequency}
                    onChange={(e) => setNewComp({ ...newComp, frequency: e.target.value as any })}
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Yearly">Yearly</option>
                    <option value="Weekly">Weekly</option>
                    <option value="One-time">One-time</option>
                  </select>
                </Field>
              </div>

              <div className="flex justify-end pt-1">
                <Button size="sm" onClick={handleAddSalaryComponent}>
                  <Plus className="size-3.5" /> Add Component
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MANUAL OVERRIDE MODAL */}
      {/* ========================================================================= */}
      <Dialog open={!!overrideTargetEmpId} onOpenChange={() => setOverrideTargetEmpId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manual Net Salary Override</DialogTitle>
          </DialogHeader>
          {overrideTargetEmpId && (
            <div className="space-y-4 text-xs">
              <p className="text-muted-foreground">
                Override the calculated net payout for <b>{empName(s, overrideTargetEmpId)}</b> for month <b>{month}</b>.
                An audit record will be logged with the reason provided.
              </p>
              <Field label="Override Net Amount (₹)">
                <input
                  type="number"
                  className={inputCls}
                  value={overrideAmount}
                  onChange={(e) => setOverrideAmount(Number(e.target.value) || 0)}
                />
              </Field>
              <Field label="Override Reason / Justification">
                <textarea
                  rows={2}
                  className={textareaCls}
                  placeholder="e.g. Advance adjustment waiver approved by Director"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                />
              </Field>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setOverrideTargetEmpId(null)}>Cancel</Button>
                <Button onClick={handleSaveOverride}>Save Override</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* PRINTABLE / DOWNLOADABLE PAYSLIP MODAL */}
      {/* ========================================================================= */}
      <Dialog open={!!selectedSlipEmpId} onOpenChange={() => setSelectedSlipEmpId(null)}>
        <DialogContent className="max-w-xl">
          {selectedRow && (
            <div className="space-y-4 p-2 text-xs">
              <div className="text-center pb-4 border-b">
                <h2 className="font-display text-xl font-bold">{s.settings.companyName}</h2>
                <p className="text-muted-foreground">{s.settings.tagline}</p>
                <p className="font-semibold text-sm mt-1">
                  Salary Slip for {format(new Date(month + "-01"), "MMMM yyyy")}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-xl border p-3 bg-muted/20">
                <div>Employee Name: <b>{selectedRow.emp.name}</b></div>
                <div>Employee ID: <b>{selectedRow.emp.id}</b></div>
                <div>Designation: <b>{selectedRow.emp.designation}</b></div>
                <div>Department: <b>{deptName(s, selectedRow.emp.departmentId)}</b></div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-3">
                <div>
                  <p className="font-bold text-success mb-2">Earnings</p>
                  <div className="space-y-1">
                    {selectedRow.p.earnings.map((x) => (
                      <div key={x.label} className="flex justify-between">
                        <span>{x.label}</span>
                        <b>{inr(x.amount)}</b>
                      </div>
                    ))}
                    <div className="flex justify-between border-t pt-1 font-bold">
                      <span>Total Gross</span>
                      <span>{inr(selectedRow.p.gross)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="font-bold text-destructive mb-2">Deductions</p>
                  <div className="space-y-1">
                    {selectedRow.p.deductions.map((x) => (
                      <div key={x.label} className="flex justify-between">
                        <span>{x.label}</span>
                        <b className="text-destructive">-{inr(x.amount)}</b>
                      </div>
                    ))}
                    <div className="flex justify-between border-t pt-1 font-bold">
                      <span>Total Deductions</span>
                      <span className="text-destructive">-{inr(selectedRow.p.totalDeductions)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-accent/30 p-3.5 flex justify-between items-center text-sm font-bold border">
                <span>Net Transferrable Pay:</span>
                <span className="text-base text-success">{inr(selectedRow.p.net)}</span>
              </div>

              <Button onClick={() => window.print()} className="w-full gap-2">
                <Printer className="size-4" /> Print / Save Payslip PDF
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
