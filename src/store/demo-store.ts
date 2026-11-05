// UrNinja OS — Centralized DEMO State Store & Authority Layer
// All modules share this reactive state, enforcing strict upward authority protection
// and interconnected lifecycle workflows.

import { useSyncExternalStore } from "react";
import * as seed from "@/data/mock";
import type {
  Activity, AppNotification, AutomationRule, Client, Deliverable,
  Employee, Invoice, Permission, Role, SecurityAuditLog,
} from "@/types";
import { ROLE_WEIGHTS } from "@/types";
import { today } from "@/utils/format";

const STORAGE_KEY = "urninja-demo-v3";

function createInitialState() {
  return structuredClone({
    departments: seed.departments,
    employees: seed.employees,
    leads: seed.leads,
    uploads: seed.uploads,
    clients: seed.clients,
    tasks: seed.tasks,
    announcements: seed.announcements,
    dailyWorkReports: seed.dailyWorkReports,
    attendance: seed.attendance,
    leaves: seed.leaves,
    salaries: seed.salaries,
    adjustments: seed.adjustments,
    payrollRuns: seed.payrollRuns,
    tickets: seed.tickets,
    invoices: seed.invoices,
    expenses: seed.expenses,
    subscriptions: seed.subscriptions,
    chatChannels: seed.chatChannels,
    chatMessages: seed.chatMessages,
    meetings: seed.meetings,
    assets: seed.assets,
    jobOpenings: seed.jobOpenings,
    applicants: seed.applicants,
    knowledgeArticles: seed.knowledgeArticles,
    automationRules: seed.automationRules,
    automationLogs: seed.automationLogs,
    contracts: seed.contracts,
    okrs: seed.okrs,
    securityAuditLogs: seed.securityAuditLogs,
    userSessions: seed.userSessions,
    notifications: seed.notifications,
    activity: seed.activity,
    documents: seed.documents,
    audits: seed.audits,
    settings: seed.settings,
    session: {
      loggedIn: true,
      employeeId: "UN-1001",
      role: "Owner" as Role,
      clientId: undefined as string | undefined,
    },
  });
}

export type DemoState = ReturnType<typeof createInitialState>;

const initial = createInitialState();
let state: DemoState = initial;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

// Update state and optionally log to activity trail
export function update(fn: (s: DemoState) => DemoState, log?: { action: string; module: string }) {
  let next = fn(state);
  if (log) {
    const entry: Activity = {
      id: `A${Date.now()}`,
      date: new Date().toISOString(),
      by: next.session.employeeId || "System",
      ...log,
    };
    next = { ...next, activity: [entry, ...next.activity].slice(0, 300) };
  }
  state = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore storage errors */
  }
  emit();
}

// Add notification
export function notify(
  title: string,
  body: string,
  link: string,
  target = "All",
  priority: AppNotification["priority"] = "Normal",
) {
  update((s) => ({
    ...s,
    notifications: [
      {
        id: `N${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
        title,
        body,
        link,
        target,
        priority,
        read: false,
        date: new Date().toISOString().slice(0, 10),
      },
      ...s.notifications,
    ],
  }));
}

// Hydrate from localStorage
export function hydrateFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = { ...createInitialState(), ...parsed };
      emit();
    }
  } catch {
    /* keep seed data */
  }
}

// Reset demo data
export function resetDemo() {
  localStorage.removeItem(STORAGE_KEY);
  state = createInitialState();
  emit();
}

// Hook for components
export function useDemo(): DemoState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => initial,
  );
}

// Lookups
export const empName = (s: DemoState, id?: string) => s.employees.find((e) => e.id === id)?.name ?? "—";
export const deptName = (s: DemoState, id?: string) => s.departments.find((d) => d.id === id)?.name ?? "—";
export const clientName = (s: DemoState, id?: string) => s.clients.find((c) => c.id === id)?.name ?? "—";

// =========================================================================
// SECTION 2 & 3: ROLE HIERARCHY & UPWARD AUTHORITY PROTECTION ENGINE
// =========================================================================

export function getRoleWeight(role: Role): number {
  return ROLE_WEIGHTS[role] ?? 1;
}

/**
 * Strict Upward Authority Protection:
 * - A lower-level user can NEVER modify, delete, disable, reset credentials for,
 *   or change the permissions of a higher-level user.
 * - Only higher authority (or Owner) can manage subordinates.
 * - Same-level accounts cannot manage each other unless Owner / Super Admin.
 */
export function canManageUser(actorRole: Role, targetRole: Role): boolean {
  if (actorRole === "Super Owner") return true;
  if (targetRole === "Super Owner") return false; // Only Super Owner can manage Super Owner
  if (actorRole === "Owner" && targetRole !== "Super Owner") return true;
  if (targetRole === "Owner") return false; // Lower roles cannot manage Owner
  if (actorRole === "Super Admin" && targetRole !== "Owner" && targetRole !== "Super Admin" && targetRole !== "Super Owner") return true;

  const actorWeight = getRoleWeight(actorRole);
  const targetWeight = getRoleWeight(targetRole);

  // Strict inequality: actor must have higher authority
  return actorWeight > targetWeight;
}

export function canResetPassword(actorRole: Role, targetRole: Role): boolean {
  return canManageUser(actorRole, targetRole);
}

export function hasPermission(s: DemoState, perm: Permission, roleOverride?: Role): boolean {
  const role = roleOverride ?? s.session.role;
  if (role === "Super Owner" || role === "Owner" || role === "Super Admin") return true;
  const perms = s.settings.rolePermissions[role] ?? [];
  return perms.includes(perm);
}

/**
 * Traverses reporting chain upwards from employee to Founder/Owner
 */
export function getReportingChain(employees: Employee[], empId: string): Employee[] {
  const chain: Employee[] = [];
  let current = employees.find((e) => e.id === empId);
  const visited = new Set<string>();

  while (current && current.managerId && !visited.has(current.id)) {
    visited.add(current.id);
    const mgr = employees.find((e) => e.id === current?.managerId);
    if (mgr) {
      chain.push(mgr);
      current = mgr;
    } else {
      break;
    }
  }
  return chain;
}

/**
 * Finds all direct or indirect subordinates under a manager
 */
export function getSubordinates(employees: Employee[], managerId: string, recursive = true): Employee[] {
  const result: Employee[] = [];
  const queue = employees.filter((e) => e.managerId === managerId);

  while (queue.length > 0) {
    const next = queue.shift()!;
    result.push(next);
    if (recursive) {
      const children = employees.filter((e) => e.managerId === next.id);
      queue.push(...children);
    }
  }
  return result;
}

// =========================================================================
// SECTION 5 & 8: CROSS-MODULE LIFECYCLE WORKFLOWS
// =========================================================================

export function recordSecurityAudit(
  actorId: string,
  action: SecurityAuditLog["action"],
  details: string,
  status: SecurityAuditLog["status"] = "Success",
  targetUserId?: string,
) {
  const entry: SecurityAuditLog = {
    id: `SEC-${Date.now()}`,
    timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
    actorId,
    action,
    details,
    status,
    targetUserId,
    ipAddress: "152.58.12.94",
  };
  update((s) => ({
    ...s,
    securityAuditLogs: [entry, ...s.securityAuditLogs].slice(0, 200),
  }));
}

/**
 * Lifecycle Workflow: Lead Won -> Client Created -> Services Onboarded -> Initial Invoice & Subscription
 */
export function convertLeadToClient(leadId: string): string {
  const lead = state.leads.find((l) => l.id === leadId);
  if (!lead) return "";

  const newClientId = `CL-${300 + state.clients.length + 1}`;
  const initialServices = [
    {
      id: `${newClientId}-S1`,
      name: lead.category + " Digital Growth Suite",
      price: lead.dealValue > 0 ? Math.round(lead.dealValue * 0.4) : 25000,
      billing: "Monthly" as const,
      discount: 0,
      notes: "Onboarded from won lead " + lead.id,
    },
  ];

  const deliverables: Deliverable[] = [
    {
      id: `${newClientId}-DL1`,
      title: "Brand Strategy & Onboarding Deck",
      serviceId: initialServices[0].id,
      target: 1,
      done: 0,
      status: "Planned",
      assigneeId: lead.assignedTo || "UN-1002",
      due: today(),
    },
    {
      id: `${newClientId}-DL2`,
      title: "Initial Asset Creation & Campaign Setup",
      serviceId: initialServices[0].id,
      target: 10,
      done: 0,
      status: "Planned",
      assigneeId: "UN-1015",
      due: today(),
    },
  ];

  const newClient: Client = {
    id: newClientId,
    name: lead.businessName,
    contactPerson: lead.contactPerson,
    phone: lead.phone,
    email: lead.email || `hello@${lead.businessName.toLowerCase().replace(/[^a-z]/g, "")}.in`,
    city: lead.city,
    onboardedOn: today(),
    accountManagerId: lead.assignedTo || "UN-1002",
    services: initialServices,
    deliverables,
    timeline: [
      { date: today(), text: `Client created from Deal Won lead (${lead.id})` },
    ],
    leadId: lead.id,
    portalPassword: "clientpass123",
  };

  // Generate initial invoice
  const newInvoice: Invoice = {
    id: `INV-${9000 + state.invoices.length + 1}`,
    clientId: newClientId,
    date: today(),
    due: today(),
    items: [{ label: initialServices[0].name, amount: initialServices[0].price }],
    paid: lead.received || 0,
    status: lead.received >= initialServices[0].price ? "Paid" : lead.received > 0 ? "Partially Paid" : "Sent",
  };

  update((s) => ({
    ...s,
    leads: s.leads.map((l) => (l.id === leadId ? { ...l, stage: "Deal Won", convertedClientId: newClientId } : l)),
    clients: [newClient, ...s.clients],
    invoices: [newInvoice, ...s.invoices],
  }), { action: `converted lead ${lead.businessName} to Client ${newClientId}`, module: "CRM" });

  notify("New Client Onboarded 🎉", `${lead.businessName} has been converted from CRM.`, "/clients");
  return newClientId;
}

/**
 * Lifecycle Workflow: Applicant Selected -> Employee Account Created -> Role & Department Connected -> Onboarding Tasks Assigned
 */
export function convertApplicantToEmployee(applicantId: string, form: Partial<Employee>): string {
  const applicant = state.applicants.find((a) => a.id === applicantId);
  const newEmpId = `UN-${1001 + state.employees.length}`;
  const first = (form.name || applicant?.name || "Employee").split(" ")[0].toLowerCase();
  const userId = `${first}.${1001 + state.employees.length}`;

  const newEmp: Employee = {
    id: newEmpId,
    userId,
    name: form.name || applicant?.name || "New Hire",
    email: form.email || applicant?.email || `${first}@urninja.in`,
    phone: form.phone || applicant?.phone || "+91 98000 00000",
    role: form.role || "Employee",
    departmentId: form.departmentId || "D05",
    designation: form.designation || "Executive",
    managerId: form.managerId || "UN-1001",
    joiningDate: today(),
    status: "Active",
    avatarSeed: state.employees.length,
    dob: "1998-05-15",
    address: "Mumbai",
    emergencyContact: "+91 97000 00000",
    qualification: "Bachelor Degree",
    experienceYears: applicant?.experienceYears || 2,
    history: [{ date: today(), note: `Hired via ATS for ${form.designation || "Role"}` }],
    password: form.password || "welcome123",
    isLocked: false,
    failedLoginAttempts: 0,
    lastPasswordChange: today(),
    temporaryPassword: true,
  };

  // Automated onboarding tasks
  const onboardingTasks: Array<typeof state.tasks[0]> = [
    {
      id: `TK-ONB-${Date.now()}-1`,
      title: `Onboarding Checklist for ${newEmp.name}`,
      description: "Complete workstation setup, email credentials, HR form, and security guidelines.",
      priority: "High",
      deadline: today(),
      assignees: [newEmpId],
      type: "Personal",
      status: "To Do",
      checklist: [
        { text: "Sign NDA & Offer Letter", done: true },
        { text: "Configure work laptop & security tools", done: false },
        { text: "Join internal communication channels", done: false },
        { text: "Meet reporting manager for 30-day goals", done: false },
      ],
      comments: [],
      createdBy: state.session.employeeId,
      createdAt: today(),
    },
  ];

  update((s) => ({
    ...s,
    applicants: s.applicants.map((a) => (a.id === applicantId ? { ...a, currentStage: "Selected", convertedToEmployeeId: newEmpId } : a)),
    employees: [...s.employees, newEmp],
    tasks: [...onboardingTasks, ...s.tasks],
    salaries: [
      ...s.salaries,
      {
        employeeId: newEmpId,
        basic: 35000,
        hra: 14000,
        allowances: 5000,
        pfPercent: 12,
        esi: 0,
        professionalTax: 200,
        tdsPercent: 5,
        custom: [],
      },
    ],
  }), { action: `hired applicant ${newEmp.name} as ${newEmp.id}`, module: "Recruitment" });

  recordSecurityAudit(state.session.employeeId, "Account Created", `Created user account ${userId} (${newEmpId})`, "Success", newEmpId);
  notify("Welcome New Team Member 🚀", `${newEmp.name} joined as ${newEmp.designation}.`, "/employees");

  return newEmpId;
}

/**
 * Resign / Archive an Employee (Preserves 100% of historical records)
 */
export function resignEmployee(empId: string, reason: string, notes?: string): boolean {
  const emp = state.employees.find((e) => e.id === empId);
  if (!emp) return false;

  const t = today();
  const superior = emp.managerId || "UN-1001";

  update((s) => ({
    ...s,
    // Move subordinates to manager so hierarchy remains intact
    employees: s.employees.map((e) => {
      if (e.id === empId) {
        return {
          ...e,
          status: "Resigned",
          resignedDate: t,
          exitReason: reason,
          exitNotes: notes,
          history: [{ date: t, note: `Employee marked Resigned. Reason: ${reason}` }, ...e.history],
        };
      }
      if (e.managerId === empId) {
        return {
          ...e,
          managerId: superior,
          history: [{ date: t, note: `Manager reassigned to ${empName(s, superior)} due to departure of ${emp.name}` }, ...e.history],
        };
      }
      return e;
    }),
  }), { action: `marked employee ${emp.name} as Resigned`, module: "HR" });

  recordSecurityAudit(state.session.employeeId, "Role Changed", `Employee ${emp.name} (${empId}) transitioned to Resigned status`, "Success", empId);
  notify("Employee Resignation Logged", `${emp.name} has moved to Resigned records. Historical data preserved.`, "/employees");
  return true;
}

/**
 * Restore a Resigned or Archived Employee
 */
export function restoreEmployee(empId: string): boolean {
  const emp = state.employees.find((e) => e.id === empId);
  if (!emp) return false;
  const t = today();

  update((s) => ({
    ...s,
    employees: s.employees.map((e) =>
      e.id === empId
        ? {
            ...e,
            status: "Active",
            resignedDate: undefined,
            exitReason: undefined,
            exitNotes: undefined,
            history: [{ date: t, note: `Account reactivated from Archived/Resigned status by ${empName(s, s.session.employeeId)}` }, ...e.history],
          }
        : e
    ),
  }), { action: `restored employee ${emp.name}`, module: "HR" });

  recordSecurityAudit(state.session.employeeId, "Account Unlocked", `Reactivated employee profile for ${emp.name} (${empId})`, "Success", empId);
  notify("Employee Restored", `${emp.name} has been returned to Active employees.`, "/employees");
  return true;
}

/**
 * Transfer Employee between Departments (updates department counts and hierarchy automatically)
 */
export function transferEmployee(empId: string, newDeptId: string, newManagerId?: string): boolean {
  const emp = state.employees.find((e) => e.id === empId);
  if (!emp) return false;
  const t = today();
  const oldDept = deptName(state, emp.departmentId);
  const newDept = deptName(state, newDeptId);

  update((s) => ({
    ...s,
    employees: s.employees.map((e) =>
      e.id === empId
        ? {
            ...e,
            departmentId: newDeptId,
            ...(newManagerId ? { managerId: newManagerId } : {}),
            history: [
              { date: t, note: `Transferred from ${oldDept} to ${newDept}${newManagerId ? ` under ${empName(s, newManagerId)}` : ""}` },
              ...e.history,
            ],
          }
        : e
    ),
  }), { action: `transferred ${emp.name} from ${oldDept} to ${newDept}`, module: "Departments" });

  notify("Department Transfer", `${emp.name} transferred to ${newDept}.`, "/departments");
  return true;
}

/**
 * Record a Client Payment against an Invoice
 */
export function recordClientPayment(
  invoiceId: string,
  amount: number,
  method = "Bank Transfer",
  reference = "",
  note = "",
): boolean {
  const inv = state.invoices.find((i) => i.id === invoiceId);
  if (!inv) return false;

  const invTotal = inv.items.reduce((a, x) => a + x.amount, 0);
  const newPaid = Math.min(invTotal, inv.paid + amount);
  const newStatus = newPaid >= invTotal ? "Paid" : "Partially Paid";
  const t = today();
  const client = state.clients.find((c) => c.id === inv.clientId);

  update((s) => ({
    ...s,
    invoices: s.invoices.map((i) =>
      i.id === invoiceId ? { ...i, paid: newPaid, status: newStatus as any } : i
    ),
    clients: s.clients.map((c) =>
      c.id === inv.clientId
        ? {
            ...c,
            timeline: [
              { date: t, text: `Payment received: ₹${amount.toLocaleString("en-IN")} via ${method}${reference ? ` (Ref: ${reference})` : ""}` },
              ...c.timeline,
            ],
          }
        : c
    ),
  }), { action: `recorded payment ₹${amount.toLocaleString("en-IN")} for ${invoiceId}`, module: "Finance" });

  notify("Payment Recorded", `₹${amount.toLocaleString("en-IN")} received from ${client?.name || inv.clientId}`, "/finance");
  return true;
}

/**
 * Update Lead Status with complete audit tracking
 */
export function updateLeadStatus(
  leadId: string,
  newStage: LeadStage,
  remark = "",
): boolean {
  const lead = state.leads.find((l) => l.id === leadId);
  if (!lead) return false;
  const t = today();
  const fromStage = lead.stage;

  const historyEntry = {
    date: t,
    by: state.session.employeeId || "UN-1001",
    fromStage,
    toStage: newStage,
    remark: remark || `Stage updated from ${fromStage} to ${newStage}`,
  };

  update((s) => ({
    ...s,
    leads: s.leads.map((l) =>
      l.id === leadId
        ? {
            ...l,
            stage: newStage,
            updatedAt: t,
            lastContactedAt: t,
            remarks: remark ? `${remark} | ${l.remarks || ""}` : l.remarks,
            history: [historyEntry, ...(l.history || [])],
          }
        : l
    ),
  }), { action: `updated lead ${lead.businessName} stage to ${newStage}`, module: "Leads" });

  if (newStage === "Deal Won") {
    notify("Deal Won! 🎉", `${lead.businessName} has been won! Available to convert to client.`, "/leads");
  }
  return true;
}

