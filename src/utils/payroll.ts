// UrNinja OS — Centralized Payroll & Dynamic Salary Calculation Engine
// Supports dynamic custom earnings & deductions, attendance unpaid deductions,
// manual overrides with audit, and immutable snapshots for past finalized runs.

import type { AttendanceRecord, LeaveRequest, MonthlyAdjustment, PayrollSnapshot, SalaryComponent, SalaryStructure } from "@/types";

export interface PayslipBreakdown {
  earnings: { label: string; amount: number }[];
  deductions: { label: string; amount: number }[];
  gross: number;
  totalDeductions: number;
  net: number;
  unpaidDays: number;
  overridden: boolean;
  overrideNote?: string;
}

export function computePayslip(
  s: SalaryStructure,
  adj: MonthlyAdjustment | undefined,
  month: string,
  attendance: AttendanceRecord[],
  leaves: LeaveRequest[],
  globalComponents: SalaryComponent[] = [],
): PayslipBreakdown {
  // Unpaid days = absent days + approved unpaid leaves in this month
  const absent = attendance.filter(
    (a) => a.employeeId === s.employeeId && a.date.startsWith(month) && a.status === "Absent"
  ).length;

  const unpaidLeave = leaves
    .filter(
      (l) =>
        l.employeeId === s.employeeId &&
        l.status === "Approved" &&
        l.type === "Unpaid" &&
        l.from.startsWith(month)
    )
    .reduce((a, l) => a + l.days, 0);

  const unpaidDays = absent + unpaidLeave;

  const fixedGross = s.basic + s.hra + s.allowances;
  const perDay = fixedGross / 30; // standard 30-day assumption

  // Gather active components for this employee
  const activeComponents = [
    ...globalComponents.filter((c) => c.active && (!c.employeeId || c.employeeId === s.employeeId)),
    ...(s.components || []).filter((c) => c.active),
  ];

  const dynEarnings = activeComponents
    .filter((c) => c.kind === "earning")
    .map((c) => ({
      label: c.name,
      amount: c.mode === "Calculated" && c.calculationPercent ? Math.round((s.basic * c.calculationPercent) / 100) : c.amount,
    }));

  const dynDeductions = activeComponents
    .filter((c) => c.kind === "deduction")
    .map((c) => ({
      label: c.name,
      amount: c.mode === "Calculated" && c.calculationPercent ? Math.round((s.basic * c.calculationPercent) / 100) : c.amount,
    }));

  const legacyEarn = (s.custom || []).filter((c) => c.kind === "earning");
  const legacyDed = (s.custom || []).filter((c) => c.kind === "deduction");

  const earnings = [
    { label: "Basic", amount: s.basic },
    { label: "HRA", amount: s.hra },
    { label: "Allowances", amount: s.allowances },
    ...dynEarnings,
    ...legacyEarn.map((c) => ({ label: c.label, amount: c.amount })),
    { label: "Incentive", amount: adj?.incentive ?? 0 },
    { label: "Bonus", amount: adj?.bonus ?? 0 },
    { label: "Reimbursement", amount: adj?.reimbursement ?? 0 },
  ].filter((e) => e.amount > 0);

  const gross = earnings.reduce((a, e) => a + e.amount, 0);

  const pf = Math.round((s.basic * (s.pfPercent || 0)) / 100);
  const tds = Math.round(((gross - (adj?.reimbursement ?? 0)) * (s.tdsPercent || 0)) / 100);

  const deductions = [
    { label: "PF", amount: pf },
    { label: "ESI", amount: s.esi || 0 },
    { label: "Professional Tax", amount: s.professionalTax || 0 },
    { label: "TDS", amount: tds },
    { label: "Advance recovery", amount: adj?.advance ?? 0 },
    { label: "Loan EMI", amount: adj?.loan ?? 0 },
    { label: `Unpaid leave (${unpaidDays}d)`, amount: Math.round(perDay * unpaidDays) },
    ...dynDeductions,
    ...legacyDed.map((c) => ({ label: c.label, amount: c.amount })),
  ].filter((x) => x.amount > 0);

  const totalDeductions = deductions.reduce((a, x) => a + x.amount, 0);
  const calculatedNet = Math.max(0, gross - totalDeductions);

  const hasOverride = typeof adj?.overrideNet === "number" && adj.overrideNet >= 0;
  const finalNet = hasOverride ? adj!.overrideNet! : calculatedNet;

  return {
    earnings,
    deductions,
    gross,
    totalDeductions,
    net: finalNet,
    unpaidDays,
    overridden: hasOverride,
    overrideNote: adj?.overrideReason,
  };
}
