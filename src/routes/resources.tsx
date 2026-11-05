// Resource Management — Team capacity, employee utilization, workload balancing, and allocation conflicts
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Users, AlertTriangle, CheckCircle2, TrendingUp, BarChart3, Filter
} from "lucide-react";
import { useDemo, deptName } from "@/store/demo-store";
import { PageHeader, Panel, StatCard, StatusBadge, Avatar, Select, Bar, TableWrap, DemoTag } from "@/components/common";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/resources")({
  head: pageHead("Resource Management", "Staff workload allocation, team capacity, and resource utilization."),
  component: ResourcesPage,
});

export function ResourcesPage() {
  const s = useDemo();
  const [deptFilter, setDeptFilter] = useState("");

  const STANDARD_CAPACITY = 4; // standard active tasks threshold per employee

  const rows = s.employees
    .filter((e) => !deptFilter || e.departmentId === deptFilter)
    .map((emp) => {
      const activeTasks = s.tasks.filter(
        (t) => t.assignees.includes(emp.id) && t.status !== "Approved"
      );
      const utilization = Math.min(150, Math.round((activeTasks.length / STANDARD_CAPACITY) * 100));
      const isOverallocated = activeTasks.length > STANDARD_CAPACITY;
      const isAvailable = activeTasks.length < 2;

      return {
        emp,
        activeTasks,
        utilization,
        isOverallocated,
        isAvailable,
      };
    })
    .sort((a, b) => b.utilization - a.utilization);

  const overallocatedCount = rows.filter((r) => r.isOverallocated).length;
  const availableCount = rows.filter((r) => r.isAvailable).length;
  const avgUtilization = Math.round(rows.reduce((acc, r) => acc + r.utilization, 0) / (rows.length || 1));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resource & Workload Management"
        subtitle="Monitor agency capacity, employee utilization, workload distribution, and allocate team bandwith"
        actions={<DemoTag text="Capacity Planner" />}
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Average Utilization"
          value={`${avgUtilization}%`}
          hint="Across all active staff"
          icon={<TrendingUp className="size-4" />}
          tone={avgUtilization > 85 ? "warning" : "success"}
        />
        <StatCard
          label="Overallocated Staff"
          value={`${overallocatedCount} Members`}
          hint="> 4 active tasks"
          icon={<AlertTriangle className="size-4" />}
          tone={overallocatedCount > 0 ? "destructive" : "success"}
        />
        <StatCard
          label="Available Capacity"
          value={`${availableCount} Members`}
          hint="< 2 active tasks"
          icon={<CheckCircle2 className="size-4" />}
          tone="info"
        />
        <StatCard
          label="Monitored Employees"
          value={rows.length}
          hint={`${s.departments.length} Departments`}
          icon={<Users className="size-4" />}
          tone="primary"
        />
      </div>

      {/* Overallocated Notice */}
      {overallocatedCount > 0 && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="size-4 shrink-0" />
            <span>
              <b>Workload Conflict Warning:</b> {overallocatedCount} team members exceed standard threshold. Consider reassigning tasks to available team members.
            </span>
          </div>
        </div>
      )}

      {/* Resource Allocation Table */}
      <Panel title="Team Utilization & Allocation Matrix">
        <div className="mb-4 flex flex-wrap gap-2">
          <Select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
            <option value="">All Departments</option>
            {s.departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </Select>
        </div>

        <TableWrap>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Active Workload</th>
              <th>Workload Utilization</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ emp, activeTasks, utilization, isOverallocated, isAvailable }) => (
              <tr key={emp.id}>
                <td>
                  <div className="flex items-center gap-2">
                    <Avatar name={emp.name} size={30} />
                    <div>
                      <p className="font-semibold text-sm">{emp.name}</p>
                      <p className="text-xs text-muted-foreground">{emp.id} · {emp.designation}</p>
                    </div>
                  </div>
                </td>
                <td>{deptName(s, emp.departmentId)}</td>
                <td>
                  <span className="font-semibold">{activeTasks.length}</span>
                  <span className="text-xs text-muted-foreground"> / {STANDARD_CAPACITY} max</span>
                </td>
                <td className="w-64">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <Bar value={Math.min(100, utilization)} />
                    </div>
                    <span className={`text-xs font-bold w-12 text-right ${isOverallocated ? "text-destructive" : ""}`}>
                      {utilization}%
                    </span>
                  </div>
                </td>
                <td>
                  {isOverallocated ? (
                    <StatusBadge status="Overdue" className="text-destructive border-destructive" />
                  ) : isAvailable ? (
                    <StatusBadge status="Available" className="text-info border-info" />
                  ) : (
                    <StatusBadge status="Active" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Panel>
    </div>
  );
}
