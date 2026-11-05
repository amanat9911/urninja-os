// UrNinja OS — Complete Department Management, Hierarchy, and Employee Transfer Engine
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Plus, GitFork, Users, Building2, UserPlus, ArrowRightLeft, ShieldAlert,
  Edit, Trash2, CheckCircle2, AlertTriangle, UserCheck
} from "lucide-react";
import {
  useDemo, update, empName, deptName, canManageUser, transferEmployee
} from "@/store/demo-store";
import { PageHeader, Panel, Avatar, Field, inputCls, textareaCls, Select, TableWrap, Empty, DemoTag, StatusBadge } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Department, Employee } from "@/types";
import { pageHead } from "@/lib/seo";
import { toast } from "sonner";

export const Route = createFileRoute("/departments")({
  head: pageHead("Departments", "Department hierarchy, heads, member directory, and inter-department transfers."),
  component: DepartmentsPage,
});

export function DepartmentsPage() {
  const s = useDemo();
  const currentRole = s.session.role;
  const currentUserId = s.session.employeeId || "UN-1001";

  // Create Department State
  const [adding, setAdding] = useState(false);
  const [newDept, setNewDept] = useState({ name: "", description: "", parentId: "", headId: "" });

  // Selected Department Drawer / Modal
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const selectedDept = s.departments.find((d) => d.id === selectedDeptId);

  // Edit Department Modal
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  // Transfer Employee Modal
  const [transferTarget, setTransferTarget] = useState<Employee | null>(null);
  const [transferNewDeptId, setTransferNewDeptId] = useState<string>("");
  const [transferNewManagerId, setTransferNewManagerId] = useState<string>("");

  // Add Employee to Department Modal
  const [addingEmpToDept, setAddingEmpToDept] = useState(false);
  const [selectedEmpToAssign, setSelectedEmpToAssign] = useState<string>("");

  // Create Department Handler
  const handleCreateDept = () => {
    if (!newDept.name.trim()) {
      toast.error("Department name is required.");
      return;
    }

    const nextId = `D${String(s.departments.length + 1).padStart(2, "0")}`;
    const dept: Department = {
      id: nextId,
      name: newDept.name.trim(),
      description: newDept.description.trim() || `${newDept.name} operational division`,
      parentId: newDept.parentId || undefined,
      headId: newDept.headId || undefined,
      color: String((s.departments.length % 5) + 1),
    };

    update((x) => ({
      ...x,
      departments: [...x.departments, dept],
    }), { action: `created department ${dept.name}`, module: "Departments" });

    toast.success(`Department "${dept.name}" created.`);
    setAdding(false);
    setNewDept({ name: "", description: "", parentId: "", headId: "" });
  };

  // Edit Department Handler
  const handleSaveEditDept = () => {
    if (!editingDept || !editingDept.name.trim()) return;

    update((x) => ({
      ...x,
      departments: x.departments.map((d) => (d.id === editingDept.id ? editingDept : d)),
    }), { action: `updated department ${editingDept.name}`, module: "Departments" });

    toast.success(`Department "${editingDept.name}" updated.`);
    setEditingDept(null);
  };

  // Archive / Delete Department Handler
  const handleDeleteDept = (deptId: string) => {
    const dept = s.departments.find((d) => d.id === deptId);
    if (!dept) return;

    const team = s.employees.filter((e) => e.departmentId === deptId && e.status !== "Resigned");
    if (team.length > 0) {
      toast.error(`Cannot delete "${dept.name}": contains ${team.length} active employee(s). Transfer them first.`);
      return;
    }

    if (!confirm(`Are you sure you want to delete department "${dept.name}"?`)) return;

    update((x) => ({
      ...x,
      departments: x.departments.filter((d) => d.id !== deptId),
    }), { action: `deleted department ${dept.name}`, module: "Departments" });

    toast.success(`Department "${dept.name}" removed.`);
    setSelectedDeptId(null);
  };

  // Handle Transfer Employee
  const handleConfirmTransfer = () => {
    if (!transferTarget || !transferNewDeptId) {
      toast.error("Please select a target department.");
      return;
    }

    if (transferNewDeptId === transferTarget.departmentId) {
      toast.error("Employee is already in this department.");
      return;
    }

    transferEmployee(transferTarget.id, transferNewDeptId, transferNewManagerId || undefined);
    toast.success(`${transferTarget.name} transferred to ${deptName(s, transferNewDeptId)}.`);
    setTransferTarget(null);
  };

  // Handle Assign Employee to this Department
  const handleAssignEmpToDept = () => {
    if (!selectedDeptId || !selectedEmpToAssign) return;
    transferEmployee(selectedEmpToAssign, selectedDeptId);
    toast.success(`${empName(s, selectedEmpToAssign)} added to ${deptName(s, selectedDeptId)}.`);
    setAddingEmpToDept(false);
    setSelectedEmpToAssign("");
  };

  // Quick Change Department Head
  const handleChangeDeptHead = (deptId: string, newHeadId: string) => {
    update((x) => ({
      ...x,
      departments: x.departments.map((d) => (d.id === deptId ? { ...d, headId: newHeadId || undefined } : d)),
    }), { action: `updated head of ${deptName(s, deptId)} to ${empName(s, newHeadId)}`, module: "Departments" });

    toast.success(`Department Head updated to ${empName(s, newHeadId)}.`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments & Organization Structure"
        subtitle={`${s.departments.length} departments · Manage teams, department heads, and cross-department transfers`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/hierarchy">
              <Button variant="outline" className="gap-1.5">
                <GitFork className="size-4" /> Full Reporting Hierarchy Tree
              </Button>
            </Link>
            {["Super Owner", "Owner", "Super Admin", "Admin"].includes(currentRole) && (
              <Button onClick={() => setAdding(true)}>
                <Plus className="size-4" /> New Department
              </Button>
            )}
          </div>
        }
      />

      {/* Department Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {s.departments.map((d) => {
          const team = s.employees.filter((e) => e.departmentId === d.id && e.status !== "Resigned");
          const parent = s.departments.find((p) => p.id === d.parentId);

          return (
            <div
              key={d.id}
              onClick={() => setSelectedDeptId(d.id)}
              className="glass lift group relative flex flex-col justify-between rounded-2xl border p-4 cursor-pointer transition-all hover:border-primary/50"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-display font-bold text-base text-foreground group-hover:text-primary transition-colors">
                      {d.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {d.description || "Operational team and functional division."}
                    </p>
                  </div>
                  <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                    <Users className="size-3" /> {team.length}
                  </span>
                </div>

                {parent && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Parent: <b className="text-foreground">{parent.name}</b>
                  </p>
                )}

                <div className="mt-3 flex items-center gap-2 border-t pt-2.5 text-xs">
                  <span className="text-muted-foreground">Head:</span>
                  {d.headId ? (
                    <div className="flex items-center gap-1.5 font-semibold text-foreground">
                      <Avatar name={empName(s, d.headId)} size={22} />
                      <span className="truncate">{empName(s, d.headId)}</span>
                    </div>
                  ) : (
                    <span className="text-warning italic text-[11px]">Vacant Head</span>
                  )}
                </div>
              </div>

              {/* Members Avatar Pile */}
              <div className="mt-3 flex items-center justify-between pt-2 border-t text-[11px]">
                <div className="flex -space-x-2 overflow-hidden">
                  {team.slice(0, 6).map((e) => (
                    <Avatar key={e.id} name={e.name} size={24} className="ring-2 ring-background" />
                  ))}
                </div>
                <span className="text-primary font-medium group-hover:underline">Manage Team →</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* DEPARTMENT DETAIL & TEAM MANAGEMENT MODAL */}
      {/* ========================================================================= */}
      <Dialog open={!!selectedDept} onOpenChange={() => setSelectedDeptId(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedDept && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between gap-3 pb-3 border-b">
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Building2 className="size-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold">{selectedDept.name} Department</h2>
                      <p className="text-xs text-muted-foreground">{selectedDept.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {["Super Owner", "Owner", "Super Admin", "Admin"].includes(currentRole) && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setEditingDept(selectedDept)}>
                          <Edit className="size-3.5" /> Edit Dept
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteDept(selectedDept.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </DialogTitle>
              </DialogHeader>

              {/* Department Head Selector & Add Employee Action */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5 bg-card/60">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-muted-foreground">Department Head:</span>
                  <Select
                    value={selectedDept.headId || ""}
                    onChange={(e) => handleChangeDeptHead(selectedDept.id, e.target.value)}
                    className="w-48 text-xs font-semibold"
                  >
                    <option value="">Vacant (Select Head)</option>
                    {s.employees
                      .filter((e) => e.status !== "Resigned")
                      .map((e) => (
                        <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                      ))}
                  </Select>
                </div>

                <Button size="sm" onClick={() => setAddingEmpToDept(true)} className="gap-1.5 text-xs">
                  <UserPlus className="size-3.5" /> Add Employee to {selectedDept.name}
                </Button>
              </div>

              {/* Department Employees Table */}
              <div>
                <p className="font-semibold text-xs mb-2">
                  Active Team Members ({s.employees.filter((e) => e.departmentId === selectedDept.id && e.status !== "Resigned").length})
                </p>

                {s.employees.filter((e) => e.departmentId === selectedDept.id && e.status !== "Resigned").length === 0 ? (
                  <Empty text="No active employees currently assigned to this department." />
                ) : (
                  <TableWrap>
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Designation</th>
                        <th>Role</th>
                        <th>Reporting Manager</th>
                        <th>Status</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.employees
                        .filter((e) => e.departmentId === selectedDept.id && e.status !== "Resigned")
                        .map((emp) => (
                          <tr key={emp.id}>
                            <td>
                              <div className="flex items-center gap-2">
                                <Avatar name={emp.name} size={28} />
                                <div>
                                  <p className="font-semibold text-sm leading-tight">{emp.name}</p>
                                  <p className="text-xs text-muted-foreground font-mono">{emp.id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="text-xs">{emp.designation}</td>
                            <td><StatusBadge status={emp.role} /></td>
                            <td className="text-xs">{empName(s, emp.managerId)}</td>
                            <td><StatusBadge status={emp.status} /></td>
                            <td>
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs gap-1"
                                  onClick={() => {
                                    setTransferTarget(emp);
                                    setTransferNewDeptId("");
                                    setTransferNewManagerId("");
                                  }}
                                >
                                  <ArrowRightLeft className="size-3.5" /> Transfer
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </TableWrap>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* TRANSFER EMPLOYEE MODAL */}
      {/* ========================================================================= */}
      <Dialog open={!!transferTarget} onOpenChange={() => setTransferTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="size-5 text-primary" /> Transfer Employee to Another Department
            </DialogTitle>
          </DialogHeader>
          {transferTarget && (
            <div className="space-y-4 text-xs">
              <p className="text-muted-foreground">
                Transferring <b>{transferTarget.name}</b> ({transferTarget.id}) from{" "}
                <b>{deptName(s, transferTarget.departmentId)}</b>. The employee will be automatically removed
                from the old department and added to the new department. Department head/member counts and reporting
                hierarchy will update automatically.
              </p>

              <Field label="Target Department">
                <select
                  className={inputCls}
                  value={transferNewDeptId}
                  onChange={(e) => setTransferNewDeptId(e.target.value)}
                >
                  <option value="">Select Destination Department</option>
                  {s.departments
                    .filter((d) => d.id !== transferTarget.departmentId)
                    .map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                </select>
              </Field>

              <Field label="New Reporting Manager (Optional)">
                <select
                  className={inputCls}
                  value={transferNewManagerId}
                  onChange={(e) => setTransferNewManagerId(e.target.value)}
                >
                  <option value="">Keep Existing Manager ({empName(s, transferTarget.managerId)})</option>
                  {s.employees
                    .filter((e) => e.id !== transferTarget.id && (!transferNewDeptId || e.departmentId === transferNewDeptId))
                    .map((e) => (
                      <option key={e.id} value={e.id}>{e.name} ({e.designation} - {deptName(s, e.departmentId)})</option>
                    ))}
                </select>
              </Field>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setTransferTarget(null)}>Cancel</Button>
                <Button onClick={handleConfirmTransfer}>Confirm Transfer</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* ADD EMPLOYEE TO DEPARTMENT MODAL */}
      {/* ========================================================================= */}
      <Dialog open={addingEmpToDept} onOpenChange={setAddingEmpToDept}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add / Move Employee to {selectedDept?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-xs">
            <p className="text-muted-foreground">
              Select an employee to transfer into the <b>{selectedDept?.name}</b> department.
            </p>
            <Field label="Select Employee">
              <select
                className={inputCls}
                value={selectedEmpToAssign}
                onChange={(e) => setSelectedEmpToAssign(e.target.value)}
              >
                <option value="">Choose Employee</option>
                {s.employees
                  .filter((e) => e.departmentId !== selectedDeptId && e.status !== "Resigned")
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.id} · currently in {deptName(s, e.departmentId)})
                    </option>
                  ))}
              </select>
            </Field>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setAddingEmpToDept(false)}>Cancel</Button>
              <Button onClick={handleAssignEmpToDept} disabled={!selectedEmpToAssign}>
                Assign to Department
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* CREATE NEW DEPARTMENT MODAL */}
      {/* ========================================================================= */}
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Department</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <Field label="Department Name">
              <input
                className={inputCls}
                placeholder="e.g. Artificial Intelligence & Automations"
                value={newDept.name}
                onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
              />
            </Field>

            <Field label="Description">
              <textarea
                rows={2}
                className={textareaCls}
                placeholder="Operational purpose and scope..."
                value={newDept.description}
                onChange={(e) => setNewDept({ ...newDept, description: e.target.value })}
              />
            </Field>

            <Field label="Parent Department (Optional)">
              <select
                className={inputCls}
                value={newDept.parentId}
                onChange={(e) => setNewDept({ ...newDept, parentId: e.target.value })}
              >
                <option value="">None (Top-Level Division)</option>
                {s.departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </Field>

            <Field label="Department Head (Optional)">
              <select
                className={inputCls}
                value={newDept.headId}
                onChange={(e) => setNewDept({ ...newDept, headId: e.target.value })}
              >
                <option value="">Vacant (Assign Later)</option>
                {s.employees
                  .filter((e) => e.status !== "Resigned")
                  .map((e) => (
                    <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                  ))}
              </select>
            </Field>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
              <Button onClick={handleCreateDept}>Create Department</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* EDIT DEPARTMENT MODAL */}
      {/* ========================================================================= */}
      <Dialog open={!!editingDept} onOpenChange={() => setEditingDept(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Department Details</DialogTitle>
          </DialogHeader>
          {editingDept && (
            <div className="space-y-3 text-xs">
              <Field label="Department Name">
                <input
                  className={inputCls}
                  value={editingDept.name}
                  onChange={(e) => setEditingDept({ ...editingDept, name: e.target.value })}
                />
              </Field>

              <Field label="Description">
                <textarea
                  rows={2}
                  className={textareaCls}
                  value={editingDept.description}
                  onChange={(e) => setEditingDept({ ...editingDept, description: e.target.value })}
                />
              </Field>

              <Field label="Parent Department">
                <select
                  className={inputCls}
                  value={editingDept.parentId || ""}
                  onChange={(e) => setEditingDept({ ...editingDept, parentId: e.target.value || undefined })}
                >
                  <option value="">None (Top-Level Division)</option>
                  {s.departments
                    .filter((d) => d.id !== editingDept.id)
                    .map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                </select>
              </Field>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setEditingDept(null)}>Cancel</Button>
                <Button onClick={handleSaveEditDept}>Save Changes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
