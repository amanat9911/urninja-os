// Roles & Access — Granular 14-permission matrix, authority weights, and governance policies
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, Lock, Users, AlertTriangle, Check, Shield } from "lucide-react";
import { useDemo, update, recordSecurityAudit } from "@/store/demo-store";
import { PageHeader, Panel, TableWrap, DemoTag, StatusBadge } from "@/components/common";
import { PERMISSIONS, type Permission, ROLE_WEIGHTS, type Role } from "@/types";
import { pageHead } from "@/lib/seo";
import { toast } from "sonner";

export const Route = createFileRoute("/roles")({
  head: pageHead("Roles & Permissions", "Centralized role-based access matrix and authority governance."),
  component: RolesPage,
});

export function RolesPage() {
  const s = useDemo();
  const currentRole = s.session.role;
  const currentUserId = s.session.employeeId || "UN-1001";
  const rp = s.settings.rolePermissions;

  const canEditMatrix = ["Owner", "Super Admin", "Admin"].includes(currentRole);

  const toggle = (role: string, p: Permission) => {
    if (!canEditMatrix) {
      toast.error(`Authority Protection: ${currentRole} cannot alter the system permission matrix.`);
      return;
    }

    if (role === "Owner") {
      toast.info("The Owner role retains absolute authority across all system operations.");
      return;
    }

    const cur = rp[role] ?? [];
    const next = cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p];

    update((x) => ({
      ...x,
      settings: {
        ...x.settings,
        rolePermissions: { ...rp, [role]: next },
      },
    }), { action: `modified ${role} permission: ${p}`, module: "Roles" });

    recordSecurityAudit(currentUserId, "Permission Modified", `Updated permission '${p}' for role '${role}'`, "Success");
    toast.success(`${role} permission '${p}' updated.`);
  };

  const rolesList: Role[] = [
    "Owner", "Super Admin", "Admin", "Department Head", "HR", "Manager", "Team Leader", "Employee", "Client"
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Role Hierarchy & Permission Matrix"
        subtitle="Configure granular capability matrix, authority weights, and operational boundaries"
        actions={<DemoTag text="Enforced Upward Protection" />}
      />

      {/* Upward Authority Policy Banner */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-xs space-y-1">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">Strict Upward Authority Policy Active</span>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          No employee or manager can modify, deactivate, or reset credentials of an account holding a higher authority weight.
          Owner holds absolute governance. HR and Admin roles have specialized department access without authority over executive accounts.
        </p>
      </div>

      <Panel>
        <div className="overflow-x-auto">
          <TableWrap>
            <thead>
              <tr>
                <th className="min-w-[160px]">Role & Authority Level</th>
                {PERMISSIONS.map((p) => (
                  <th key={p} className="text-center text-[11px] whitespace-nowrap px-2">
                    {p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rolesList.map((role) => {
                const count = s.employees.filter((e) => e.role === role).length;
                const weight = ROLE_WEIGHTS[role] || 1;
                return (
                  <tr key={role} className="hover:bg-muted/40 transition-colors">
                    <td className="font-medium text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{role}</span>
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          Lvl {weight}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {count} assigned user{count === 1 ? "" : "s"}
                      </span>
                    </td>
                    {PERMISSIONS.map((p) => {
                      const isGranted = (rp[role] ?? []).includes(p) || role === "Owner";
                      return (
                        <td key={p} className="text-center">
                          <input
                            type="checkbox"
                            className="size-4 rounded accent-primary cursor-pointer disabled:opacity-50"
                            checked={isGranted}
                            disabled={role === "Owner" || !canEditMatrix}
                            onChange={() => toggle(role, p)}
                            aria-label={`${role} ${p}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        </div>
      </Panel>
    </div>
  );
}
