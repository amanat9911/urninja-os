// Security and Audit Management — Authentication audit trails, failed login trackers, active sessions, and access control
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  ShieldAlert, Lock, KeyRound, Monitor, LogOut, CheckCircle2, AlertTriangle, ShieldCheck, Filter
} from "lucide-react";
import { useDemo, update, empName, recordSecurityAudit } from "@/store/demo-store";
import { PageHeader, Panel, StatCard, StatusBadge, Select, Field, inputCls, TableWrap, DemoTag } from "@/components/common";
import { Button } from "@/components/ui/button";
import type { SecurityAuditLog, UserSession } from "@/types";
import { pageHead } from "@/lib/seo";
import { toast } from "sonner";

export const Route = createFileRoute("/security")({
  head: pageHead("Security & Audit Logs", "System authentication records, failed login monitoring, sessions, and security governance."),
  component: SecurityPage,
});

export function SecurityPage() {
  const s = useDemo();
  const [actionFilter, setActionFilter] = useState("");
  const [actorFilter, setActorFilter] = useState("");

  const filteredLogs = s.securityAuditLogs.filter((log) => {
    const matchAction = !actionFilter || log.action === actionFilter;
    const matchActor = !actorFilter || log.actorId === actorFilter;
    return matchAction && matchActor;
  });

  const lockedAccounts = s.employees.filter((e) => e.isLocked);
  const failedLogins = s.securityAuditLogs.filter((l) => l.action === "Login Failed").length;

  const handleUnlockAccount = (empId: string) => {
    update((state) => ({
      ...state,
      employees: state.employees.map((e) =>
        e.id === empId ? { ...e, isLocked: false, failedLoginAttempts: 0 } : e
      ),
    }), { action: `unlocked account for ${empId}`, module: "Security" });

    recordSecurityAudit(s.session.employeeId, "Account Unlocked", `Unlocked login access for ${empName(s, empId)}`, "Success", empId);
    toast.success(`Account ${empId} unlocked.`);
  };

  const handleTerminateSession = (sessionId: string) => {
    update((state) => ({
      ...state,
      userSessions: state.userSessions.filter((ses) => ses.id !== sessionId),
    }), { action: `terminated user session ${sessionId}`, module: "Security" });

    toast.success("Active session terminated.");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security & System Audit Management"
        subtitle="Immutable-style authentication audit trail, failed login attempts, session governance, and account lockouts"
        actions={<DemoTag text="Immutable-style Audit Ledger" />}
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Total Audit Events"
          value={s.securityAuditLogs.length}
          hint="Security actions logged"
          icon={<ShieldAlert className="size-4" />}
          tone="primary"
        />
        <StatCard
          label="Active User Sessions"
          value={s.userSessions.length}
          hint="Live authenticated devices"
          icon={<Monitor className="size-4" />}
          tone="success"
        />
        <StatCard
          label="Failed Login Attempts"
          value={failedLogins}
          hint="Security monitoring"
          icon={<KeyRound className="size-4" />}
          tone={failedLogins > 0 ? "warning" : "info"}
        />
        <StatCard
          label="Locked Accounts"
          value={lockedAccounts.length}
          hint="Due to failed attempts"
          icon={<Lock className="size-4" />}
          tone={lockedAccounts.length > 0 ? "destructive" : "success"}
        />
      </div>

      {/* Locked Accounts Banner */}
      {lockedAccounts.length > 0 && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="size-5 text-destructive" />
              <div>
                <p className="font-semibold text-sm text-destructive">Account Lockout Detected</p>
                <p className="text-xs text-muted-foreground">
                  The following accounts have been locked after repeated failed login attempts.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {lockedAccounts.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-lg bg-background p-2.5 text-xs">
                <div>
                  <span className="font-semibold">{e.name}</span>
                  <span className="text-muted-foreground"> ({e.id} · {e.role})</span>
                </div>
                <Button size="sm" onClick={() => handleUnlockAccount(e.id)}>
                  Unlock Account
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Sessions Grid */}
      <Panel title="Active Authenticated Sessions">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {s.userSessions.map((ses) => (
            <div key={ses.id} className="rounded-xl border bg-card/60 p-3.5 text-xs space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-sm">{empName(s, ses.employeeId)}</p>
                  <p className="text-muted-foreground">{ses.role}</p>
                </div>
                <StatusBadge status="Active" />
              </div>
              <p className="text-muted-foreground flex items-center gap-1">
                <Monitor className="size-3" /> {ses.device}
              </p>
              <div className="flex justify-between items-center pt-2 border-t text-[11px] text-muted-foreground">
                <span>IP: {ses.ip}</span>
                <button
                  onClick={() => handleTerminateSession(ses.id)}
                  className="text-destructive font-medium hover:underline flex items-center gap-0.5"
                >
                  <LogOut className="size-3" /> Terminate
                </button>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Security Audit Ledger */}
      <Panel title="Security & Authentication Audit Trail">
        <div className="mb-4 flex flex-wrap gap-2">
          <Select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
            <option value="">All Security Events</option>
            <option value="Login Success">Login Success</option>
            <option value="Login Failed">Login Failed</option>
            <option value="Password Changed">Password Changed</option>
            <option value="Password Reset">Password Reset</option>
            <option value="Role Changed">Role Changed</option>
            <option value="Account Created">Account Created</option>
            <option value="Permission Modified">Permission Modified</option>
          </Select>
          <Select value={actorFilter} onChange={(e) => setActorFilter(e.target.value)}>
            <option value="">All Actors</option>
            {s.employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name} ({e.id})</option>
            ))}
          </Select>
        </div>

        <TableWrap>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action Type</th>
              <th>Actor (Initiator)</th>
              <th>Target Account</th>
              <th>IP Address</th>
              <th>Event Details</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log) => (
              <tr key={log.id}>
                <td className="font-mono text-xs text-muted-foreground">{log.timestamp}</td>
                <td className="font-semibold text-xs">{log.action}</td>
                <td>{empName(s, log.actorId)}</td>
                <td>{log.targetUserId ? empName(s, log.targetUserId) : "—"}</td>
                <td className="font-mono text-xs text-muted-foreground">{log.ipAddress}</td>
                <td className="text-xs text-muted-foreground">{log.details}</td>
                <td><StatusBadge status={log.status} /></td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Panel>

      {/* Security Policies Configuration */}
      <Panel title="Configured Security Policies">
        <div className="grid gap-4 sm:grid-cols-3 text-xs">
          <div className="rounded-lg border p-3 space-y-1">
            <p className="font-semibold text-sm">Account Lockout Policy</p>
            <p className="text-muted-foreground">Locks out account after 5 consecutive failed password attempts.</p>
            <p className="text-primary font-bold pt-1">Active (5 Attempts)</p>
          </div>
          <div className="rounded-lg border p-3 space-y-1">
            <p className="font-semibold text-sm">Password Expiry Policy</p>
            <p className="text-muted-foreground">Prompts periodic credential rotation every 90 days.</p>
            <p className="text-primary font-bold pt-1">Configured (90 Days)</p>
          </div>
          <div className="rounded-lg border p-3 space-y-1">
            <p className="font-semibold text-sm">Session Timeout</p>
            <p className="text-muted-foreground">Automatically logs out inactive sessions after 60 minutes.</p>
            <p className="text-primary font-bold pt-1">Configured (60 Mins)</p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
