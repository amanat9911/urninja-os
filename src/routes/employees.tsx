// UrNinja OS — Complete Employee Management, Roles, Profiles, and Resigned Archives
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Plus, Search, IdCard, Printer, Lock, KeyRound, ShieldAlert,
  UserCheck, History, CalendarCheck, Wallet, Target, ListChecks,
  UserX, RotateCcw, Edit, Save, ArrowRight, ShieldCheck, Mail, Phone, Building2
} from "lucide-react";
import {
  useDemo, update, deptName, empName, canManageUser, canResetPassword,
  recordSecurityAudit, resignEmployee, restoreEmployee, transferEmployee
} from "@/store/demo-store";
import { PageHeader, Panel, StatusBadge, Avatar, TableWrap, Select, Field, inputCls, textareaCls, Empty, DemoTag, StatCard } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { inr, fmtDate, today } from "@/utils/format";
import type { Employee, Role } from "@/types";
import { computePayslip } from "@/utils/payroll";
import { pageHead } from "@/lib/seo";
import { toast } from "sonner";

export const Route = createFileRoute("/employees")({
  head: pageHead("Employees", "Employee directory, comprehensive profiles, credentials, and archived records."),
  component: EmployeesPage,
});

const ROLES: Role[] = [
  "Super Owner", "Owner", "Super Admin", "Admin", "Department Head", "HR", "Manager", "Team Leader", "Employee"
];

export function EmployeesPage() {
  const s = useDemo();
  const currentRole = s.session.role;
  const currentUserId = s.session.employeeId || "UN-1001";

  // Tab view: "active" | "resigned"
  const [activeTab, setActiveTab] = useState<"active" | "resigned">("active");

  // Search & Filters
  const [q, setQ] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "id" | "date">("name");

  // Selection & Modals
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [detailTab, setDetailTab] = useState<"overview" | "salary" | "payroll" | "attendance" | "tasks" | "history">("overview");
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [cardTarget, setCardTarget] = useState<Employee | null>(null);
  const [adding, setAdding] = useState(false);

  // Resignation modal
  const [resigningEmp, setResigningEmp] = useState<Employee | null>(null);
  const [resignReason, setResignReason] = useState("Career Growth");
  const [resignNotes, setResignNotes] = useState("");

  // Password reset dialog
  const [resetTarget, setResetTarget] = useState<Employee | null>(null);
  const [newTempPassword, setNewTempPassword] = useState("welcome123");

  // Add Employee Form State
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "Employee" as Role,
    departmentId: s.departments[0]?.id ?? "D01",
    designation: "",
    managerId: s.employees[0]?.id ?? "UN-1001",
    password: "password123",
    joiningDate: today(),
    status: "Active" as Employee["status"],
  });

  // Filtered employee lists
  const activeEmployees = useMemo(
    () => s.employees.filter((e) => e.status !== "Resigned" && e.status !== "Archived"),
    [s.employees]
  );

  const resignedEmployees = useMemo(
    () => s.employees.filter((e) => e.status === "Resigned" || e.status === "Archived"),
    [s.employees]
  );

  const displayedList = useMemo(() => {
    const source = activeTab === "active" ? activeEmployees : resignedEmployees;
    return source
      .filter((e) => {
        const matchesQ =
          (e.name + e.id + e.userId + e.designation + e.role + empName(s, e.managerId))
            .toLowerCase()
            .includes(q.toLowerCase());
        const matchesDept = !filterDept || e.departmentId === filterDept;
        const matchesRole = !filterRole || e.role === filterRole;
        const matchesStatus = !filterStatus || e.status === filterStatus;
        return matchesQ && matchesDept && matchesRole && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name);
        if (sortBy === "id") return a.id.localeCompare(b.id);
        return b.joiningDate.localeCompare(a.joiningDate);
      });
  }, [activeTab, activeEmployees, resignedEmployees, q, filterDept, filterRole, filterStatus, sortBy, s]);

  // Create Employee & Account
  const handleCreate = () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Employee full name and corporate email are required.");
      return;
    }

    // Duplicate email check
    if (s.employees.some((e) => e.email.toLowerCase() === form.email.toLowerCase())) {
      toast.error("An employee account with this corporate email already exists.");
      return;
    }

    // Role creation authority check
    if (!canManageUser(currentRole, form.role) && currentRole !== form.role && currentRole !== "Super Owner") {
      toast.error(`Authority Protection: ${currentRole} cannot create a ${form.role} account.`);
      return;
    }

    const nextIdNum = 1001 + s.employees.length;
    const id = `UN-${nextIdNum}`;
    const first = form.name.trim().split(" ")[0].toLowerCase().replace(/[^a-z]/g, "");
    const userId = `${first}.${nextIdNum}`;

    const newEmp: Employee = {
      ...form,
      id,
      userId,
      joiningDate: form.joiningDate || today(),
      status: form.status,
      avatarSeed: s.employees.length + 1,
      dob: "1998-01-01",
      address: "Headquarters",
      emergencyContact: "+91 98000 00000",
      qualification: "Degree / Professional Certification",
      experienceYears: 2,
      history: [
        {
          date: today(),
          note: `Account created by ${empName(s, currentUserId)} with role ${form.role} in ${deptName(s, form.departmentId)}`,
        },
      ],
      isLocked: false,
      failedLoginAttempts: 0,
      lastPasswordChange: today(),
      temporaryPassword: true,
    };

    update((x) => ({
      ...x,
      employees: [...x.employees, newEmp],
      salaries: [
        ...x.salaries,
        {
          employeeId: id,
          basic: 30000,
          hra: 12000,
          allowances: 4000,
          pfPercent: 12,
          esi: 0,
          professionalTax: 200,
          tdsPercent: 5,
          custom: [],
          components: [],
        },
      ],
    }), { action: `created employee account ${newEmp.name} (${id})`, module: "Employees" });

    recordSecurityAudit(currentUserId, "Account Created", `Generated user account ${userId} with role ${newEmp.role}`, "Success", id);
    toast.success(`Account created: ${newEmp.name} (${id}) with username @${userId}. Connected to hierarchy.`);
    setAdding(false);
    setForm({
      name: "",
      email: "",
      phone: "",
      role: "Employee",
      departmentId: s.departments[0]?.id ?? "D01",
      designation: "",
      managerId: s.employees[0]?.id ?? "UN-1001",
      password: "password123",
      joiningDate: today(),
      status: "Active",
    });
  };

  // Update Profile
  const handleSaveProfile = () => {
    if (!editingEmp) return;

    if (!canManageUser(currentRole, editingEmp.role) && editingEmp.id !== currentUserId && currentRole !== "Super Owner") {
      toast.error(`Authority Protection: Cannot modify a ${editingEmp.role} account.`);
      return;
    }

    const t = today();
    update((x) => ({
      ...x,
      employees: x.employees.map((e) =>
        e.id === editingEmp.id
          ? {
              ...editingEmp,
              history: [
                { date: t, note: `Profile updated by ${empName(x, currentUserId)}` },
                ...editingEmp.history,
              ],
            }
          : e
      ),
    }), { action: `updated profile of ${editingEmp.name}`, module: "Employees" });

    toast.success(`Profile for ${editingEmp.name} updated successfully.`);
    setSelectedEmp(editingEmp);
    setEditingEmp(null);
  };

  // Resignation Confirmation
  const handleConfirmResignation = () => {
    if (!resigningEmp) return;

    if (!canManageUser(currentRole, resigningEmp.role) && currentRole !== "Super Owner") {
      toast.error(`Authority Protection: Cannot mark a superior (${resigningEmp.role}) as Resigned.`);
      return;
    }

    resignEmployee(resigningEmp.id, resignReason, resignNotes);
    toast.success(`${resigningEmp.name} marked as Resigned. Historical data preserved.`);
    setResigningEmp(null);
    setSelectedEmp(null);
  };

  // Restore Employee
  const handleRestore = (emp: Employee) => {
    if (!canManageUser(currentRole, emp.role) && currentRole !== "Super Owner") {
      toast.error(`Authority Protection: Cannot restore ${emp.role}.`);
      return;
    }
    restoreEmployee(emp.id);
    toast.success(`${emp.name} restored to Active status.`);
  };

  // Admin Password Reset
  const handleAdminResetPassword = () => {
    if (!resetTarget) return;

    if (!canResetPassword(currentRole, resetTarget.role) && currentRole !== "Super Owner") {
      toast.error(`Authority Protection: Cannot reset password for a superior role (${resetTarget.role}).`);
      return;
    }

    if (newTempPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    update((x) => ({
      ...x,
      employees: x.employees.map((e) =>
        e.id === resetTarget.id
          ? {
              ...e,
              password: newTempPassword,
              isLocked: false,
              failedLoginAttempts: 0,
              temporaryPassword: true,
              lastPasswordChange: today(),
            }
          : e
      ),
    }), { action: `reset password for ${resetTarget.name}`, module: "Security" });

    recordSecurityAudit(currentUserId, "Password Reset", `Superior initiated password reset for ${resetTarget.id}`, "Success", resetTarget.id);
    toast.success(`Password for ${resetTarget.name} reset to: ${newTempPassword}`);
    setResetTarget(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Directory & Accounts"
        subtitle={`${activeEmployees.length} active employees · ${resignedEmployees.length} resigned/archived records`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <DemoTag text="Strict Upward Authority Policy" />
            <Button onClick={() => setAdding(true)}>
              <Plus className="size-4" /> Add Employee Account
            </Button>
          </div>
        }
      />

      {/* Top Stat Summary Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Active Employees"
          value={activeEmployees.length}
          hint={`${s.departments.length} departments`}
          icon={<UserCheck className="size-4" />}
          tone="success"
        />
        <StatCard
          label="On Leave Today"
          value={s.attendance.filter((a) => a.date === today() && a.status === "Leave").length}
          hint="Approved leaves"
          icon={<CalendarCheck className="size-4" />}
          tone="info"
        />
        <StatCard
          label="Resigned / Archived"
          value={resignedEmployees.length}
          hint="Full history preserved"
          icon={<UserX className="size-4" />}
          tone="warning"
        />
        <StatCard
          label="Reporting Hierarchy"
          value={`${s.employees.filter((e) => e.managerId).length} Connected`}
          hint="Chain of command intact"
          icon={<ShieldCheck className="size-4" />}
          tone="success"
        />
      </div>

      {/* Main Tab Controls */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("active")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
            activeTab === "active"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <UserCheck className="size-4" /> Active Employees ({activeEmployees.length})
        </button>
        <button
          onClick={() => setActiveTab("resigned")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
            activeTab === "resigned"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <UserX className="size-4" /> Resigned & Archived ({resignedEmployees.length})
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <Panel>
        <div className="flex flex-wrap gap-2.5">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, employee ID, username, designation, manager..."
              className={inputCls + " pl-8 text-xs"}
            />
          </div>

          <Select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className="w-40 text-xs">
            <option value="">All Departments</option>
            {s.departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </Select>

          <Select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="w-36 text-xs">
            <option value="">All Roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </Select>

          {activeTab === "active" && (
            <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-32 text-xs">
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="On Leave">On Leave</option>
              <option value="Suspended">Suspended</option>
            </Select>
          )}

          <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="w-36 text-xs">
            <option value="name">Sort by Name</option>
            <option value="id">Sort by ID</option>
            <option value="date">Sort by Joining</option>
          </Select>
        </div>

        {/* Employee Table */}
        <div className="mt-4">
          {displayedList.length === 0 ? (
            <Empty
              text={
                activeTab === "active"
                  ? "No active employees found matching your filters."
                  : "No resigned or archived employee records found."
              }
            />
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <th>Employee / User ID</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Role & Level</th>
                  <th>Reporting Manager</th>
                  <th>Status</th>
                  {activeTab === "resigned" && <th>Exit Details</th>}
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedList.map((e) => (
                  <tr
                    key={e.id}
                    className="cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => {
                      setSelectedEmp(e);
                      setDetailTab("overview");
                    }}
                  >
                    <td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={e.name} />
                        <div>
                          <p className="font-semibold text-sm leading-tight">{e.name}</p>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">
                            {e.id} · @{e.userId}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>{deptName(s, e.departmentId)}</td>
                    <td className="text-xs font-medium">{e.designation}</td>
                    <td>
                      <StatusBadge status={e.role} />
                    </td>
                    <td>
                      {e.managerId ? (
                        <span className="text-xs text-foreground/80 font-medium">
                          {empName(s, e.managerId)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Top Level</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={e.status} />
                    </td>
                    {activeTab === "resigned" && (
                      <td className="text-xs text-muted-foreground">
                        <span>{e.resignedDate ? fmtDate(e.resignedDate) : "—"}</span>
                        {e.exitReason && <p className="text-[11px] font-medium text-destructive">{e.exitReason}</p>}
                      </td>
                    )}
                    <td>
                      <div className="flex items-center justify-end gap-1.5" onClick={(ev) => ev.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="ghost"
                          title="View ID Card"
                          onClick={() => setCardTarget(e)}
                        >
                          <IdCard className="size-4" />
                        </Button>

                        {activeTab === "active" ? (
                          <>
                            {canResetPassword(currentRole, e.role) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Reset Password"
                                onClick={() => setResetTarget(e)}
                              >
                                <KeyRound className="size-4 text-primary" />
                              </Button>
                            )}
                            {canManageUser(currentRole, e.role) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                title="Log Resignation / Archive"
                                onClick={() => {
                                  setResigningEmp(e);
                                  setResignReason("Career Growth");
                                  setResignNotes("");
                                }}
                              >
                                <UserX className="size-4" />
                              </Button>
                            )}
                          </>
                        ) : (
                          ["Super Owner", "Owner", "Super Admin", "HR"].includes(currentRole) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs gap-1"
                              onClick={() => handleRestore(e)}
                            >
                              <RotateCcw className="size-3.5" /> Restore
                            </Button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </div>
      </Panel>

      {/* ========================================================================= */}
      {/* COMPREHENSIVE EMPLOYEE DETAIL PROFILE MODAL */}
      {/* ========================================================================= */}
      <Dialog open={!!selectedEmp} onOpenChange={() => setSelectedEmp(null)}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          {selectedEmp && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between gap-3 pb-3 border-b">
                  <div className="flex items-center gap-3">
                    <Avatar name={selectedEmp.name} size={48} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold">{selectedEmp.name}</span>
                        <StatusBadge status={selectedEmp.status} />
                        <StatusBadge status={selectedEmp.role} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {selectedEmp.id} · @{selectedEmp.userId} · {selectedEmp.designation} in {deptName(s, selectedEmp.departmentId)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setCardTarget(selectedEmp);
                        setSelectedEmp(null);
                      }}
                    >
                      <IdCard className="size-4" /> Print ID Card
                    </Button>
                  </div>
                </DialogTitle>
              </DialogHeader>

              {/* Sub-tabs for Employee Detail */}
              <div className="flex gap-1 border-b pb-1 overflow-x-auto text-xs">
                {(
                  [
                    ["overview", "Profile & Info", UserCheck],
                    ["salary", "Salary Structure", Wallet],
                    ["payroll", "Payroll & Payslips", Printer],
                    ["attendance", "Attendance & Leaves", CalendarCheck],
                    ["tasks", "Tasks & Leads", ListChecks],
                    ["history", "Audit Trail & History", History],
                  ] as const
                ).map(([tabKey, label, Icon]) => (
                  <button
                    key={tabKey}
                    onClick={() => setDetailTab(tabKey)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                      detailTab === tabKey
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="size-3.5" /> {label}
                  </button>
                ))}
              </div>

              {/* TAB 1: OVERVIEW & PERSONAL INFO */}
              {detailTab === "overview" && (
                <div className="space-y-4">
                  {editingEmp?.id === selectedEmp.id ? (
                    <div className="space-y-3 rounded-xl border p-4 bg-card/60">
                      <p className="font-semibold text-sm">Edit Employee Information</p>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <Field label="Full Name">
                          <input
                            className={inputCls}
                            value={editingEmp.name}
                            onChange={(e) => setEditingEmp({ ...editingEmp, name: e.target.value })}
                          />
                        </Field>
                        <Field label="Corporate Email">
                          <input
                            className={inputCls}
                            value={editingEmp.email}
                            onChange={(e) => setEditingEmp({ ...editingEmp, email: e.target.value })}
                          />
                        </Field>
                        <Field label="Phone">
                          <input
                            className={inputCls}
                            value={editingEmp.phone}
                            onChange={(e) => setEditingEmp({ ...editingEmp, phone: e.target.value })}
                          />
                        </Field>
                        <Field label="Designation">
                          <input
                            className={inputCls}
                            value={editingEmp.designation}
                            onChange={(e) => setEditingEmp({ ...editingEmp, designation: e.target.value })}
                          />
                        </Field>
                        <Field label="Department">
                          <select
                            className={inputCls}
                            value={editingEmp.departmentId}
                            onChange={(e) => setEditingEmp({ ...editingEmp, departmentId: e.target.value })}
                          >
                            {s.departments.map((d) => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Role">
                          <select
                            className={inputCls}
                            value={editingEmp.role}
                            disabled={!canManageUser(currentRole, editingEmp.role) && currentRole !== "Super Owner"}
                            onChange={(e) => setEditingEmp({ ...editingEmp, role: e.target.value as Role })}
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Reporting Manager">
                          <select
                            className={inputCls}
                            value={editingEmp.managerId}
                            onChange={(e) => setEditingEmp({ ...editingEmp, managerId: e.target.value })}
                          >
                            <option value="">None (Top Level)</option>
                            {s.employees
                              .filter((e) => e.id !== editingEmp.id)
                              .map((e) => (
                                <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                              ))}
                          </select>
                        </Field>
                        <Field label="Account Status">
                          <select
                            className={inputCls}
                            value={editingEmp.status}
                            onChange={(e) => setEditingEmp({ ...editingEmp, status: e.target.value as any })}
                          >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                            <option value="On Leave">On Leave</option>
                            <option value="Suspended">Suspended</option>
                            <option value="Resigned">Resigned</option>
                          </select>
                        </Field>
                      </div>
                      <div className="flex justify-end gap-2 pt-2 border-t">
                        <Button variant="outline" size="sm" onClick={() => setEditingEmp(null)}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleSaveProfile}>
                          <Save className="size-4" /> Save Changes
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 rounded-xl border bg-card/60 p-4 text-xs">
                        <div>
                          <p className="text-muted-foreground">Corporate Email</p>
                          <p className="font-semibold text-sm">{selectedEmp.email}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Phone</p>
                          <p className="font-semibold text-sm">{selectedEmp.phone}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Department</p>
                          <p className="font-semibold text-sm">{deptName(s, selectedEmp.departmentId)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Role</p>
                          <p className="font-semibold text-sm">{selectedEmp.role}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Reporting Manager</p>
                          <p className="font-semibold text-sm">{empName(s, selectedEmp.managerId)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Joined On</p>
                          <p className="font-semibold text-sm">{fmtDate(selectedEmp.joiningDate)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Address</p>
                          <p className="font-semibold text-sm">{selectedEmp.address || "Mumbai"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Emergency Contact</p>
                          <p className="font-semibold text-sm">{selectedEmp.emergencyContact || "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Qualification</p>
                          <p className="font-semibold text-sm">{selectedEmp.qualification || "Graduate"}</p>
                        </div>
                      </div>

                      {canManageUser(currentRole, selectedEmp.role) && (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => setEditingEmp(selectedEmp)}>
                            <Edit className="size-4" /> Edit Profile
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* TAB 2: SALARY STRUCTURE & CUSTOM COMPONENTS */}
              {detailTab === "salary" && (
                <div className="space-y-4">
                  {(() => {
                    const sal = s.salaries.find((x) => x.employeeId === selectedEmp.id);
                    if (!sal) return <p className="text-xs text-muted-foreground italic">No salary structure configured.</p>;
                    const fixedGross = sal.basic + sal.hra + sal.allowances;
                    return (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 rounded-xl border p-4 bg-card/60 text-xs">
                          <div>
                            <p className="font-bold text-sm text-success mb-2">Earnings Structure</p>
                            <div className="space-y-1.5">
                              <div className="flex justify-between"><span>Basic Pay</span><b>{inr(sal.basic)}</b></div>
                              <div className="flex justify-between"><span>HRA</span><b>{inr(sal.hra)}</b></div>
                              <div className="flex justify-between"><span>Special Allowances</span><b>{inr(sal.allowances)}</b></div>
                              <div className="flex justify-between border-t pt-1 font-bold text-sm">
                                <span>Fixed Gross</span>
                                <span className="text-success">{inr(fixedGross)}</span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <p className="font-bold text-sm text-destructive mb-2">Statutory Deductions</p>
                            <div className="space-y-1.5">
                              <div className="flex justify-between"><span>PF ({sal.pfPercent}%)</span><b>{inr(Math.round((sal.basic * sal.pfPercent) / 100))}</b></div>
                              <div className="flex justify-between"><span>ESI</span><b>{inr(sal.esi)}</b></div>
                              <div className="flex justify-between"><span>Professional Tax</span><b>{inr(sal.professionalTax)}</b></div>
                              <div className="flex justify-between"><span>TDS Withholding</span><b>{sal.tdsPercent}%</b></div>
                            </div>
                          </div>
                        </div>

                        {/* Custom Dynamic Components for this Employee */}
                        <div className="rounded-xl border p-3.5 bg-card/40">
                          <p className="font-semibold text-xs mb-2">Custom Salary Components</p>
                          <div className="space-y-1.5">
                            {(s.settings.salaryComponents || [])
                              .filter((c) => c.active && (!c.employeeId || c.employeeId === selectedEmp.id))
                              .map((c) => (
                                <div key={c.id} className="flex justify-between items-center text-xs p-1.5 rounded bg-muted/40">
                                  <span>{c.name} ({c.frequency})</span>
                                  <b className={c.kind === "earning" ? "text-success" : "text-destructive"}>
                                    {c.kind === "earning" ? "+" : "-"}{inr(c.amount)}
                                  </b>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* TAB 3: PAYROLL HISTORY & SLIPS */}
              {detailTab === "payroll" && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Historical payroll calculation snapshots and generated pay slips for {selectedEmp.name}.
                  </p>
                  <TableWrap>
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Run Status</th>
                        <th>Gross Pay</th>
                        <th>Total Deductions</th>
                        <th>Net Payout</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.payrollRuns.map((run) => {
                        const sal = s.salaries.find((x) => x.employeeId === selectedEmp.id);
                        if (!sal) return null;
                        const adj = s.adjustments.find((a) => a.employeeId === selectedEmp.id && a.month === run.month);
                        const p = computePayslip(sal, adj, run.month, s.attendance, s.leaves, s.settings.salaryComponents || []);
                        return (
                          <tr key={run.month}>
                            <td className="font-semibold text-xs">{run.month}</td>
                            <td><StatusBadge status={run.status} /></td>
                            <td>{inr(p.gross)}</td>
                            <td className="text-destructive">-{inr(p.totalDeductions)}</td>
                            <td className="font-bold text-success">{inr(p.net)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </TableWrap>
                </div>
              )}

              {/* TAB 4: ATTENDANCE & LEAVES */}
              {detailTab === "attendance" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <StatCard
                      label="Present Days (30d)"
                      value={s.attendance.filter((a) => a.employeeId === selectedEmp.id && a.status === "Present").length}
                      tone="success"
                    />
                    <StatCard
                      label="Late Check-ins"
                      value={s.attendance.filter((a) => a.employeeId === selectedEmp.id && a.status === "Late").length}
                      tone="warning"
                    />
                    <StatCard
                      label="Approved Leaves"
                      value={s.leaves.filter((l) => l.employeeId === selectedEmp.id && l.status === "Approved").reduce((a, l) => a + l.days, 0)}
                      tone="info"
                    />
                  </div>
                  <p className="font-semibold text-xs mt-3">Leave Request History</p>
                  <TableWrap>
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>From - To</th>
                        <th>Days</th>
                        <th>Reason</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.leaves
                        .filter((l) => l.employeeId === selectedEmp.id)
                        .map((l) => (
                          <tr key={l.id}>
                            <td>{l.type}</td>
                            <td>{fmtDate(l.from)} → {fmtDate(l.to)}</td>
                            <td>{l.days}</td>
                            <td className="text-muted-foreground">{l.reason}</td>
                            <td><StatusBadge status={l.status} /></td>
                          </tr>
                        ))}
                    </tbody>
                  </TableWrap>
                </div>
              )}

              {/* TAB 5: TASKS & LEADS */}
              {detailTab === "tasks" && (
                <div className="space-y-4">
                  <div>
                    <p className="font-semibold text-xs mb-2">Assigned Tasks ({s.tasks.filter((t) => t.assignees.includes(selectedEmp.id)).length})</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {s.tasks
                        .filter((t) => t.assignees.includes(selectedEmp.id))
                        .map((t) => (
                          <div key={t.id} className="flex justify-between items-center p-2 rounded-lg border text-xs">
                            <div>
                              <p className="font-semibold">{t.title}</p>
                              <p className="text-muted-foreground">Due: {fmtDate(t.deadline)}</p>
                            </div>
                            <StatusBadge status={t.status} />
                          </div>
                        ))}
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-xs mb-2">Assigned CRM Leads ({s.leads.filter((l) => l.assignedTo === selectedEmp.id).length})</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {s.leads
                        .filter((l) => l.assignedTo === selectedEmp.id)
                        .map((l) => (
                          <div key={l.id} className="flex justify-between items-center p-2 rounded-lg border text-xs">
                            <div>
                              <p className="font-semibold">{l.businessName}</p>
                              <p className="text-muted-foreground">{l.city} · {inr(l.dealValue)}</p>
                            </div>
                            <StatusBadge status={l.stage} />
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: AUDIT TRAIL & HISTORY */}
              {detailTab === "history" && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Chronological lifecycle events and audit log for account {selectedEmp.id}.
                  </p>
                  <ul className="space-y-2 border-l-2 border-primary/30 pl-4 text-xs">
                    {(selectedEmp.history || []).map((h, i) => (
                      <li key={i}>
                        <span className="font-semibold text-muted-foreground">{fmtDate(h.date)}</span>
                        <p className="text-foreground">{h.note}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* RESIGNATION / ARCHIVAL MODAL */}
      {/* ========================================================================= */}
      <Dialog open={!!resigningEmp} onOpenChange={() => setResigningEmp(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <UserX className="size-5" /> Mark Employee as Resigned / Archived
            </DialogTitle>
          </DialogHeader>
          {resigningEmp && (
            <div className="space-y-4 text-xs">
              <p className="text-muted-foreground">
                You are transitioning <b>{resigningEmp.name}</b> ({resigningEmp.id}) to Resigned status.
                Their account credentials will be disabled, but all historical payroll, attendance, leads,
                and activity records will be strictly preserved in the Resigned Employees directory.
              </p>
              <Field label="Reason for Departure">
                <select
                  className={inputCls}
                  value={resignReason}
                  onChange={(e) => setResignReason(e.target.value)}
                >
                  <option value="Career Growth">Career Growth / Better Opportunity</option>
                  <option value="Relocation">Relocation / Personal Reasons</option>
                  <option value="Higher Education">Higher Education</option>
                  <option value="Health Reasons">Health / Medical</option>
                  <option value="Contract Ended">Contract Ended / Project Completion</option>
                  <option value="Mutual Separation">Mutual Separation</option>
                </select>
              </Field>
              <Field label="Exit Handover Notes">
                <textarea
                  rows={2}
                  className={textareaCls}
                  placeholder="Details of project handover, equipment returns..."
                  value={resignNotes}
                  onChange={(e) => setResignNotes(e.target.value)}
                />
              </Field>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setResigningEmp(null)}>Cancel</Button>
                <Button variant="destructive" onClick={handleConfirmResignation}>Confirm Resignation</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* ADD EMPLOYEE ACCOUNT MODAL */}
      {/* ========================================================================= */}
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Create Complete Employee & Login Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <Field label="Full Employee Name">
                <input
                  className={inputCls}
                  placeholder="e.g. Ananya Das"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>
              <Field label="Corporate Email">
                <input
                  type="email"
                  className={inputCls}
                  placeholder="name@urninja.in"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </Field>
              <Field label="Phone Number">
                <input
                  className={inputCls}
                  placeholder="+91 98000 00000"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </Field>
              <Field label="Designation">
                <input
                  className={inputCls}
                  placeholder="e.g. Lead Designer"
                  value={form.designation}
                  onChange={(e) => setForm({ ...form, designation: e.target.value })}
                />
              </Field>
              <Field label="Department">
                <select
                  className={inputCls}
                  value={form.departmentId}
                  onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                >
                  {s.departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Assigned Role">
                <select
                  className={inputCls}
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </Field>
              <Field label="Reporting Manager">
                <select
                  className={inputCls}
                  value={form.managerId}
                  onChange={(e) => setForm({ ...form, managerId: e.target.value })}
                >
                  {s.employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                  ))}
                </select>
              </Field>
              <Field label="Joining Date">
                <input
                  type="date"
                  className={inputCls}
                  value={form.joiningDate}
                  onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
                />
              </Field>
            </div>

            <Field label="Initial Temporary Password">
              <input
                type="text"
                className={inputCls}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </Field>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
              <Button onClick={handleCreate}>Create Account</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* RESET PASSWORD MODAL */}
      {/* ========================================================================= */}
      <Dialog open={!!resetTarget} onOpenChange={() => setResetTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Administrative Password Reset</DialogTitle>
          </DialogHeader>
          {resetTarget && (
            <div className="space-y-4 text-xs">
              <p className="text-muted-foreground">
                Set a temporary replacement password for <b>{resetTarget.name}</b> ({resetTarget.id} · {resetTarget.role}).
              </p>
              <Field label="New Temporary Password">
                <input
                  type="text"
                  className={inputCls}
                  value={newTempPassword}
                  onChange={(e) => setNewTempPassword(e.target.value)}
                />
              </Field>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setResetTarget(null)}>Cancel</Button>
                <Button onClick={handleAdminResetPassword}>Confirm Password Reset</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* PRINTABLE ID CARD MODAL */}
      {/* ========================================================================= */}
      <Dialog open={!!cardTarget} onOpenChange={() => setCardTarget(null)}>
        <DialogContent className="max-w-sm">
          {cardTarget && (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-2xl border shadow-glow bg-card">
                <div className="bg-gradient-primary p-5 text-primary-foreground text-center">
                  <p className="font-display text-lg font-bold">{s.settings.companyName}</p>
                  <p className="text-xs opacity-90">{s.settings.tagline}</p>
                </div>
                <div className="flex flex-col items-center gap-1.5 p-5 text-center">
                  <Avatar name={cardTarget.name} size={80} className="-mt-14 ring-4 ring-background" />
                  <p className="mt-2 font-display text-lg font-bold">{cardTarget.name}</p>
                  <p className="text-xs font-semibold text-primary">{cardTarget.designation}</p>
                  <p className="text-xs text-muted-foreground">{deptName(s, cardTarget.departmentId)}</p>
                  <p className="mt-2 rounded-md bg-muted px-3 py-1 font-mono text-xs font-bold">
                    {cardTarget.id}
                  </p>
                  <p className="text-[11px] text-muted-foreground pt-1">{cardTarget.email}</p>
                  <p className="text-[11px] text-muted-foreground">{cardTarget.phone}</p>
                </div>
              </div>
              <Button onClick={() => window.print()} className="w-full gap-2">
                <Printer className="size-4" /> Print ID Card
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
