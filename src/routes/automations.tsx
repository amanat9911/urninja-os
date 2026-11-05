// Workflow Automation — Event triggers, conditional actions, and execution logs
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Zap, Play, Power, History, Plus, CheckCircle2, AlertTriangle, ArrowRight
} from "lucide-react";
import { useDemo, update } from "@/store/demo-store";
import { PageHeader, Panel, StatCard, StatusBadge, Select, Field, inputCls, textareaCls, TableWrap, DemoTag } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { AutomationLog, AutomationRule } from "@/types";
import { fmtDate, today } from "@/utils/format";
import { pageHead } from "@/lib/seo";
import { toast } from "sonner";

export const Route = createFileRoute("/automations")({
  head: pageHead("Workflow Automations", "Configurable event-driven rules, triggers, and execution history."),
  component: AutomationsPage,
});

export function AutomationsPage() {
  const s = useDemo();
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);
  const [isCreatingRule, setIsCreatingRule] = useState(false);

  const [form, setForm] = useState({
    name: "",
    trigger: "task_overdue" as AutomationRule["trigger"],
    description: "",
    condition: "",
    action: "",
  });

  const activeRulesCount = s.automationRules.filter((r) => r.enabled).length;

  const handleToggleRule = (ruleId: string) => {
    update((state) => ({
      ...state,
      automationRules: state.automationRules.map((r) =>
        r.id === ruleId ? { ...r, enabled: !r.enabled } : r
      ),
    }), { action: `toggled automation rule ${ruleId}`, module: "Automations" });
    toast.success("Automation rule status updated.");
  };

  const handleTestRunRule = (rule: AutomationRule) => {
    const newLog: AutomationLog = {
      id: `LOG-${Date.now()}`,
      ruleId: rule.id,
      ruleName: rule.name,
      triggeredAt: `${today()} ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
      status: "Success",
      details: `Manual test execution completed. Triggered condition '${rule.condition}' -> Action: '${rule.action}'.`,
    };

    update((state) => ({
      ...state,
      automationRules: state.automationRules.map((r) =>
        r.id === rule.id ? { ...r, lastExecuted: today() } : r
      ),
      automationLogs: [newLog, ...state.automationLogs],
    }), { action: `executed test run for ${rule.name}`, module: "Automations" });

    toast.success(`Rule "${rule.name}" triggered successfully.`);
  };

  const handleCreateRule = () => {
    if (!form.name.trim() || !form.action.trim()) {
      toast.error("Please enter rule name and action.");
      return;
    }
    const newRule: AutomationRule = {
      id: `AUT-${s.automationRules.length + 1}`,
      name: form.name,
      trigger: form.trigger,
      description: form.description || form.name,
      condition: form.condition || "Default Condition",
      action: form.action,
      enabled: true,
      lastExecuted: today(),
    };

    update((state) => ({
      ...state,
      automationRules: [...state.automationRules, newRule],
    }), { action: `created automation rule ${newRule.name}`, module: "Automations" });

    toast.success(`Automation rule "${newRule.name}" created.`);
    setIsCreatingRule(false);
    setForm({ name: "", trigger: "task_overdue", description: "", condition: "", action: "" });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workflow Automations"
        subtitle="Event-driven business rules, cross-module notifications, and real-time triggers"
        actions={
          <div className="flex gap-2">
            <DemoTag text="Simulation Engine" />
            <Button onClick={() => setIsCreatingRule(true)} className="gap-1.5">
              <Plus className="size-4" /> Add Rule
            </Button>
          </div>
        }
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Active Rules"
          value={`${activeRulesCount} of ${s.automationRules.length}`}
          hint="Automated processes"
          icon={<Zap className="size-4" />}
          tone="primary"
        />
        <StatCard
          label="Executions Logged"
          value={s.automationLogs.length}
          hint="Recent triggers"
          icon={<History className="size-4" />}
          tone="info"
        />
        <StatCard
          label="Execution Success"
          value="100%"
          hint="Zero failed events"
          icon={<CheckCircle2 className="size-4" />}
          tone="success"
        />
        <StatCard
          label="Modules Monitored"
          value="7 Modules"
          hint="HR, CRM, Tasks, Support"
          icon={<Zap className="size-4" />}
          tone="warning"
        />
      </div>

      {/* Automation Rules Grid */}
      <Panel title="Configured Rules">
        <div className="space-y-3">
          {s.automationRules.map((rule) => (
            <div
              key={rule.id}
              className={`rounded-xl border p-4 transition-all ${
                rule.enabled ? "bg-card/70 border-border" : "bg-muted/30 border-dashed border-border/60 opacity-70"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{rule.name}</span>
                    <span className="font-mono text-[11px] rounded bg-muted px-1.5 py-0.5">{rule.id}</span>
                    <StatusBadge status={rule.enabled ? "Active" : "Disabled"} />
                  </div>
                  <p className="text-xs text-muted-foreground">{rule.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1 text-xs"
                    onClick={() => handleTestRunRule(rule)}
                  >
                    <Play className="size-3" /> Test Run
                  </Button>
                  <Button
                    size="sm"
                    variant={rule.enabled ? "destructive" : "default"}
                    className="h-8 text-xs"
                    onClick={() => handleToggleRule(rule.id)}
                  >
                    {rule.enabled ? "Disable" : "Enable"}
                  </Button>
                </div>
              </div>

              {/* Logic Flow */}
              <div className="mt-3 grid gap-2 rounded-lg bg-muted/30 p-2.5 text-xs sm:grid-cols-3">
                <div>
                  <span className="font-semibold text-muted-foreground">Trigger: </span>
                  <span className="font-mono text-primary">{rule.trigger}</span>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">Condition: </span>
                  <span>{rule.condition}</span>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">Action: </span>
                  <span className="text-foreground font-medium">{rule.action}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Execution Logs */}
      <Panel title="Automation Execution History">
        <TableWrap>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Rule Name</th>
              <th>Status</th>
              <th>Execution Details</th>
            </tr>
          </thead>
          <tbody>
            {s.automationLogs.map((log) => (
              <tr key={log.id}>
                <td className="font-mono text-xs text-muted-foreground">{log.triggeredAt}</td>
                <td className="font-medium text-xs">{log.ruleName}</td>
                <td><StatusBadge status={log.status} /></td>
                <td className="text-xs text-muted-foreground">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Panel>

      {/* Add Rule Dialog */}
      <Dialog open={isCreatingRule} onOpenChange={setIsCreatingRule}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configure Automation Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Rule Name">
              <input
                className={inputCls}
                placeholder="e.g. Lead Followup Overdue Alert"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Trigger Event">
              <select
                className={inputCls}
                value={form.trigger}
                onChange={(e) => setForm({ ...form, trigger: e.target.value as AutomationRule["trigger"] })}
              >
                <option value="task_deadline_near">Task Deadline Approaching</option>
                <option value="task_overdue">Task Overdue</option>
                <option value="employee_created">New Employee Created</option>
                <option value="leave_approved">Leave Request Approved</option>
                <option value="invoice_overdue">Invoice Overdue</option>
                <option value="ticket_unresolved">Ticket SLA Breach</option>
                <option value="deal_won">CRM Deal Won</option>
                <option value="contract_expiring">Contract Approaching Expiry</option>
              </select>
            </Field>
            <Field label="Condition Logic">
              <input
                className={inputCls}
                placeholder="e.g. Priority == 'Critical' and SLA breached"
                value={form.condition}
                onChange={(e) => setForm({ ...form, condition: e.target.value })}
              />
            </Field>
            <Field label="Target Action">
              <input
                className={inputCls}
                placeholder="e.g. Dispatch high-priority notification to Manager"
                value={form.action}
                onChange={(e) => setForm({ ...form, action: e.target.value })}
              />
            </Field>
            <Field label="Description">
              <textarea
                rows={2}
                className={textareaCls}
                placeholder="Explain the purpose of this rule..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setIsCreatingRule(false)}>Cancel</Button>
              <Button onClick={handleCreateRule}>Save Automation</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
