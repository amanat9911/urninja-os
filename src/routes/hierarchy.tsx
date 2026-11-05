// Organizational Hierarchy — Visual reporting tree, manager assignments, and department transfers
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  GitFork, Users, Building2, ArrowRight, ShieldCheck,
  ChevronDown, ChevronRight, UserCheck, AlertTriangle
} from "lucide-react";
import { useDemo, update, empName, deptName, canManageUser, getReportingChain, getSubordinates } from "@/store/demo-store";
import { PageHeader, Panel, Avatar, StatusBadge, Select, Field, inputCls, DemoTag } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Employee, Role } from "@/types";
import { pageHead } from "@/lib/seo";
import { toast } from "sonner";

export const Route = createFileRoute("/hierarchy")({
  head: pageHead("Organizational Hierarchy", "Visual reporting hierarchy and organizational chain of command."),
  component: HierarchyPage,
});

export function HierarchyPage() {
  const s = useDemo();
  const [selectedEmpId, setSelectedEmpId] = useState<string>("UN-1001");
  const [filterDept, setFilterDept] = useState<string>("");
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({ "UN-1001": true, "UN-1002": true, "UN-1003": true, "UN-1004": true, "UN-1009": true, "UN-1010": true });
  
  // Dialog states
  const [reassignTarget, setReassignTarget] = useState<Employee | null>(null);
  const [newManagerId, setNewManagerId] = useState<string>("");
  const [transferTarget, setTransferTarget] = useState<Employee | null>(null);
  const [newDeptId, setNewDeptId] = useState<string>("");

  const selectedEmp = s.employees.find((e) => e.id === selectedEmpId) || s.employees[0];
  const reportingChain = selectedEmp ? getReportingChain(s.employees, selectedEmp.id) : [];
  const directSubs = s.employees.filter((e) => e.managerId === selectedEmp?.id);
  const allSubs = selectedEmp ? getSubordinates(s.employees, selectedEmp.id) : [];

  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleReassignManager = () => {
    if (!reassignTarget || !newManagerId) return;

    // Upward authority protection check
    if (!canManageUser(s.session.role, reassignTarget.role)) {
      toast.error(`Authority Protection: ${s.session.role} cannot reassign a ${reassignTarget.role}.`);
      return;
    }

    if (newManagerId === reassignTarget.id) {
      toast.error("An employee cannot report to themselves.");
      return;
    }

    // Circular reporting structure prevention
    const subs = getSubordinates(s.employees, reassignTarget.id, true);
    if (subs.some((sub) => sub.id === newManagerId)) {
      toast.error(`Invalid Circular Hierarchy: ${empName(s, newManagerId)} is currently a subordinate of ${reassignTarget.name}.`);
      return;
    }

    update((state) => ({
      ...state,
      employees: state.employees.map((e) =>
        e.id === reassignTarget.id ? { ...e, managerId: newManagerId } : e
      ),
    }), { action: `reassigned manager of ${reassignTarget.name} to ${empName(s, newManagerId)}`, module: "Hierarchy" });

    toast.success(`Reporting manager for ${reassignTarget.name} updated.`);
    setReassignTarget(null);
  };

  const handleTransferDepartment = () => {
    if (!transferTarget || !newDeptId) return;

    if (!canManageUser(s.session.role, transferTarget.role)) {
      toast.error(`Authority Protection: Cannot transfer ${transferTarget.role}.`);
      return;
    }

    update((state) => ({
      ...state,
      employees: state.employees.map((e) =>
        e.id === transferTarget.id
          ? {
              ...e,
              departmentId: newDeptId,
              history: [{ date: new Date().toISOString().slice(0, 10), note: `Transferred to ${deptName(s, newDeptId)}` }, ...e.history],
            }
          : e
      ),
    }), { action: `transferred ${transferTarget.name} to ${deptName(s, newDeptId)}`, module: "Hierarchy" });

    toast.success(`${transferTarget.name} transferred to ${deptName(s, newDeptId)}.`);
    setTransferTarget(null);
  };

  // Find root employees (e.g. Owner or those without managers)
  const roots = s.employees.filter((e) => !e.managerId || e.role === "Owner");

  // Render tree node recursively
  const renderTreeNode = (emp: Employee, depth = 0) => {
    const subs = s.employees.filter((e) => e.managerId === emp.id);
    const isExpanded = expandedNodes[emp.id] !== false;
    const isSelected = selectedEmp?.id === emp.id;

    if (filterDept && emp.departmentId !== filterDept && !subs.some((sub) => sub.departmentId === filterDept)) {
      return null;
    }

    return (
      <div key={emp.id} className="relative">
        <div
          onClick={() => setSelectedEmpId(emp.id)}
          className={`flex items-center justify-between gap-3 rounded-xl border p-3 transition-all cursor-pointer ${
            isSelected
              ? "border-primary bg-primary/10 shadow-glow"
              : "border-border/60 bg-card/60 hover:border-primary/40 hover:bg-accent/30"
          }`}
          style={{ marginLeft: `${depth * 24}px` }}
        >
          <div className="flex items-center gap-3">
            {subs.length > 0 ? (
              <button
                type="button"
                onClick={(ev) => {
                  ev.stopPropagation();
                  toggleExpand(emp.id);
                }}
                className="grid size-6 place-items-center rounded bg-muted/80 text-muted-foreground hover:bg-muted"
              >
                {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
              </button>
            ) : (
              <span className="size-6" />
            )}

            <Avatar name={emp.name} size={36} />
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm leading-tight">{emp.name}</p>
                <StatusBadge status={emp.role} />
              </div>
              <p className="text-xs text-muted-foreground">
                {emp.designation} · <span className="font-medium text-foreground/80">{deptName(s, emp.departmentId)}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {subs.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground">
                <Users className="size-3" /> {subs.length} direct
              </span>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={(ev) => {
                ev.stopPropagation();
                setReassignTarget(emp);
                setNewManagerId(emp.managerId || "");
              }}
            >
              Reassign
            </Button>
          </div>
        </div>

        {isExpanded && subs.length > 0 && (
          <div className="mt-2 space-y-2 border-l-2 border-primary/20 pl-2">
            {subs.map((sub) => renderTreeNode(sub, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Unassigned employees or vacant positions check
  const unassigned = s.employees.filter((e) => e.role !== "Owner" && !e.managerId);
  const vacantDepts = s.departments.filter((d) => !d.headId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organizational Hierarchy"
        subtitle="Complete company chain of command, reporting lines, and departmental governance"
        actions={<DemoTag text="Strict Upward Authority Policy" />}
      />

      {/* Warnings & Alerts */}
      {(unassigned.length > 0 || vacantDepts.length > 0) && (
        <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning-foreground flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="size-5 shrink-0 text-warning" />
            <div>
              <p className="font-semibold">Organizational Structure Notice</p>
              <p className="text-xs opacity-90">
                {unassigned.length} employee(s) without reporting manager. {vacantDepts.length} department(s) with vacant Head.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Left Tree, Right Inspector */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Visual Tree */}
        <div className="space-y-4 lg:col-span-7">
          <Panel
            title="Reporting Tree"
            action={
              <div className="flex items-center gap-2">
                <Select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className="h-8 text-xs">
                  <option value="">All Departments</option>
                  {s.departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </Select>
              </div>
            }
          >
            <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
              {roots.map((root) => renderTreeNode(root))}
            </div>
          </Panel>
        </div>

        {/* Right Column: Account Inspector & Reporting Chain */}
        <div className="space-y-4 lg:col-span-5">
          {selectedEmp && (
            <Panel title="Account Inspector">
              <div className="flex items-start gap-3 pb-4 border-b">
                <Avatar name={selectedEmp.name} size={48} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-semibold text-base">{selectedEmp.name}</h3>
                    <StatusBadge status={selectedEmp.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">{selectedEmp.id} · {selectedEmp.designation}</p>
                  <p className="text-xs font-medium text-primary mt-0.5">{deptName(s, selectedEmp.departmentId)}</p>
                </div>
              </div>

              {/* Hierarchy Stats */}
              <div className="grid grid-cols-2 gap-2 my-4 text-center">
                <div className="rounded-lg bg-muted/50 p-2.5">
                  <p className="text-xs text-muted-foreground">Direct Subordinates</p>
                  <p className="font-display text-lg font-semibold">{directSubs.length}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-2.5">
                  <p className="text-xs text-muted-foreground">Total In Hierarchy</p>
                  <p className="font-display text-lg font-semibold">{allSubs.length}</p>
                </div>
              </div>

              {/* Upward Reporting Chain */}
              <div className="space-y-2 mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Upward Reporting Chain (To Founder)
                </p>
                <div className="space-y-1.5 rounded-lg border bg-card/40 p-3 text-xs">
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <span className="size-2 rounded-full bg-primary" />
                    <span>{selectedEmp.name}</span>
                    <span className="text-muted-foreground">({selectedEmp.role})</span>
                  </div>
                  {reportingChain.map((mgr, i) => (
                    <div key={mgr.id} className="flex items-center gap-2 text-muted-foreground pl-3 border-l-2 border-primary/30">
                      <ArrowRight className="size-3 text-primary/70 shrink-0" />
                      <span className="font-medium text-foreground">{mgr.name}</span>
                      <span>({mgr.role} · {mgr.designation})</span>
                    </div>
                  ))}
                  {reportingChain.length === 0 && selectedEmp.role === "Owner" && (
                    <p className="text-xs text-muted-foreground italic pl-3">Owner is at the top of authority tree.</p>
                  )}
                </div>
              </div>

              {/* Direct Subordinates List */}
              <div className="space-y-2 mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Direct Subordinates ({directSubs.length})
                </p>
                {directSubs.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No subordinates reporting directly.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {directSubs.map((sub) => (
                      <div
                        key={sub.id}
                        onClick={() => setSelectedEmpId(sub.id)}
                        className="flex items-center justify-between rounded-md border border-border/50 bg-background/60 p-2 text-xs hover:border-primary/40 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar name={sub.name} size={24} />
                          <div>
                            <p className="font-medium">{sub.name}</p>
                            <p className="text-[11px] text-muted-foreground">{sub.designation}</p>
                          </div>
                        </div>
                        <StatusBadge status={sub.role} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-5 flex gap-2 pt-4 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setReassignTarget(selectedEmp);
                    setNewManagerId(selectedEmp.managerId || "");
                  }}
                >
                  <GitFork className="size-3.5" /> Change Manager
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setTransferTarget(selectedEmp);
                    setNewDeptId(selectedEmp.departmentId);
                  }}
                >
                  <Building2 className="size-3.5" /> Transfer Dept
                </Button>
              </div>
            </Panel>
          )}

          {/* Quick Authority Rules Card */}
          <Panel title="Authority Rules Enforcement">
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-start gap-2">
                <ShieldCheck className="size-3.5 text-primary shrink-0 mt-0.5" />
                <span><b>Upward Protection:</b> Subordinates cannot modify, reassign, or alter credentials for superiors.</span>
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="size-3.5 text-primary shrink-0 mt-0.5" />
                <span><b>Department Head Scope:</b> Department Heads manage all employees, managers, and team leaders in their department.</span>
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="size-3.5 text-primary shrink-0 mt-0.5" />
                <span><b>Owner Ultimate Authority:</b> The Founder & CEO holds sole authority over all administrative accounts.</span>
              </li>
            </ul>
          </Panel>
        </div>
      </div>

      {/* Dialog: Reassign Reporting Manager */}
      <Dialog open={!!reassignTarget} onOpenChange={() => setReassignTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reassign Reporting Manager</DialogTitle>
          </DialogHeader>
          {reassignTarget && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Assign a new supervisor for <b>{reassignTarget.name}</b> ({reassignTarget.role}).
              </p>
              <Field label="New Reporting Manager">
                <Select value={newManagerId} onChange={(e) => setNewManagerId(e.target.value)} className="w-full">
                  <option value="">None (Top Level / Unassigned)</option>
                  {s.employees
                    .filter((e) => e.id !== reassignTarget.id)
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} ({e.role} · {e.designation})
                      </option>
                    ))}
                </Select>
              </Field>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setReassignTarget(null)}>Cancel</Button>
                <Button onClick={handleReassignManager}>Confirm Reassignment</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Transfer Department */}
      <Dialog open={!!transferTarget} onOpenChange={() => setTransferTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer Department</DialogTitle>
          </DialogHeader>
          {transferTarget && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Move <b>{transferTarget.name}</b> to another department. Historical records will be retained.
              </p>
              <Field label="Destination Department">
                <Select value={newDeptId} onChange={(e) => setNewDeptId(e.target.value)} className="w-full">
                  {s.departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.description})</option>
                  ))}
                </Select>
              </Field>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setTransferTarget(null)}>Cancel</Button>
                <Button onClick={handleTransferDepartment}>Confirm Transfer</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
