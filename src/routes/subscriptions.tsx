// Recurring Billing and Subscription Management — Client retainers, billing cycles, auto-invoicing, and renewal tracking
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Repeat, Plus, CreditCard, Calendar, FileText, CheckCircle2, ArrowRight
} from "lucide-react";
import { useDemo, update, clientName } from "@/store/demo-store";
import { PageHeader, Panel, StatCard, StatusBadge, Select, Field, inputCls, TableWrap, DemoTag } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ClientSubscription, Invoice } from "@/types";
import { inr, fmtDate, today } from "@/utils/format";
import { pageHead } from "@/lib/seo";
import { toast } from "sonner";
import { addDays, format } from "date-fns";

export const Route = createFileRoute("/subscriptions")({
  head: pageHead("Recurring Subscriptions", "Client recurring retainer management, automated invoicing schedules, and renewals."),
  component: SubscriptionsPage,
});

export function SubscriptionsPage() {
  const s = useDemo();
  const [selectedSub, setSelectedSub] = useState<ClientSubscription | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const [form, setForm] = useState({
    clientId: s.clients[0]?.id || "CL-301",
    planName: "Digital Growth Retainer",
    amount: 25000,
    frequency: "Monthly" as ClientSubscription["frequency"],
    nextBillingDate: format(addDays(new Date(), 30), "yyyy-MM-dd"),
    autoGenerateInvoice: true,
  });

  const mrr = s.subscriptions
    .filter((sub) => sub.status === "Active")
    .reduce((acc, sub) => acc + (sub.frequency === "Annual" ? sub.amount / 12 : sub.amount), 0);

  const handleGenerateInvoice = (sub: ClientSubscription) => {
    const newInvoiceId = `INV-${9000 + s.invoices.length + 1}`;
    const newInvoice: Invoice = {
      id: newInvoiceId,
      clientId: sub.clientId,
      date: today(),
      due: format(addDays(new Date(), 14), "yyyy-MM-dd"),
      items: [{ label: `${sub.planName} (${sub.frequency})`, amount: sub.amount }],
      paid: 0,
      status: "Sent",
    };

    const nextBilling = format(addDays(new Date(), sub.frequency === "Annual" ? 365 : 30), "yyyy-MM-dd");

    update((state) => ({
      ...state,
      invoices: [newInvoice, ...state.invoices],
      subscriptions: state.subscriptions.map((sb) =>
        sb.id === sub.id
          ? {
              ...sb,
              nextBillingDate: nextBilling,
              history: [{ date: today(), invoiceId: newInvoiceId, amount: sub.amount, status: "Sent" }, ...sb.history],
            }
          : sb
      ),
    }), { action: `generated recurring invoice ${newInvoiceId} for ${sub.id}`, module: "Billing" });

    toast.success(`Recurring invoice ${newInvoiceId} generated in Finance.`);
  };

  const handleCreateSubscription = () => {
    const newSub: ClientSubscription = {
      id: `SUB-${100 + s.subscriptions.length + 1}`,
      clientId: form.clientId,
      planName: form.planName,
      amount: Number(form.amount) || 0,
      frequency: form.frequency,
      startDate: today(),
      nextBillingDate: form.nextBillingDate,
      status: "Active",
      autoGenerateInvoice: form.autoGenerateInvoice,
      history: [],
    };

    update((state) => ({
      ...state,
      subscriptions: [newSub, ...state.subscriptions],
    }), { action: `created subscription ${newSub.id}`, module: "Billing" });

    toast.success(`Retainer subscription ${newSub.id} created.`);
    setIsAdding(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recurring Billing & Subscriptions"
        subtitle="Manage client monthly retainers, automated invoice generation, and MRR growth"
        actions={
          <Button onClick={() => setIsAdding(true)} className="gap-1.5">
            <Plus className="size-4" /> New Subscription
          </Button>
        }
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Monthly Recurring Revenue"
          value={inr(mrr)}
          hint="Normalized MRR"
          icon={<Repeat className="size-4" />}
          tone="success"
        />
        <StatCard
          label="Active Retainers"
          value={s.subscriptions.filter((sub) => sub.status === "Active").length}
          hint="Recurring client plans"
          icon={<CreditCard className="size-4" />}
          tone="primary"
        />
        <StatCard
          label="Past Due Subscriptions"
          value={s.subscriptions.filter((sub) => sub.status === "Past Due").length}
          hint="Requires payment follow-up"
          icon={<CreditCard className="size-4" />}
          tone="destructive"
        />
        <StatCard
          label="Auto-Invoicing Active"
          value={`${s.subscriptions.filter((sub) => sub.autoGenerateInvoice).length} Plans`}
          hint="Automated schedules"
          icon={<Calendar className="size-4" />}
          tone="info"
        />
      </div>

      {/* Subscription Table */}
      <Panel title="Client Subscriptions">
        <TableWrap>
          <thead>
            <tr>
              <th>ID</th>
              <th>Client</th>
              <th>Plan Name</th>
              <th>Amount</th>
              <th>Frequency</th>
              <th>Next Billing</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {s.subscriptions.map((sub) => (
              <tr key={sub.id} className="cursor-pointer" onClick={() => setSelectedSub(sub)}>
                <td className="font-mono text-xs font-semibold">{sub.id}</td>
                <td className="font-semibold text-sm">{clientName(s, sub.clientId)}</td>
                <td>{sub.planName}</td>
                <td className="font-semibold text-xs text-primary">{inr(sub.amount)}</td>
                <td><span className="rounded bg-muted px-2 py-0.5 text-xs">{sub.frequency}</span></td>
                <td>{fmtDate(sub.nextBillingDate)}</td>
                <td><StatusBadge status={sub.status} /></td>
                <td>
                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      handleGenerateInvoice(sub);
                    }}
                  >
                    <FileText className="size-3" /> Generate Invoice
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Panel>

      {/* Detail Dialog */}
      <Dialog open={!!selectedSub} onOpenChange={() => setSelectedSub(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedSub?.planName}</DialogTitle>
          </DialogHeader>
          {selectedSub && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-3">
                <div>Client: <b>{clientName(s, selectedSub.clientId)}</b></div>
                <div>Amount: <b>{inr(selectedSub.amount)}</b></div>
                <div>Frequency: <b>{selectedSub.frequency}</b></div>
                <div>Status: <StatusBadge status={selectedSub.status} /></div>
                <div>Started: <b>{fmtDate(selectedSub.startDate)}</b></div>
                <div>Next Billing: <b>{fmtDate(selectedSub.nextBillingDate)}</b></div>
              </div>

              <div>
                <p className="font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Invoice Generation History
                </p>
                {selectedSub.history.length === 0 ? (
                  <p className="text-muted-foreground italic">No past billing runs logged.</p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedSub.history.map((h, i) => (
                      <div key={i} className="flex justify-between items-center rounded border p-2 bg-card/60">
                        <span>Invoice: <b>{h.invoiceId}</b> ({fmtDate(h.date)})</span>
                        <span className="font-semibold">{inr(h.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setSelectedSub(null)}>Close</Button>
                <Button onClick={() => handleGenerateInvoice(selectedSub)}>
                  Generate Next Invoice
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Modal */}
      <Dialog open={isAdding} onOpenChange={setIsAdding}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Setup Client Subscription Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Client Account">
              <select
                className={inputCls}
                value={form.clientId}
                onChange={(e) => setForm({ ...form, clientId: e.target.value })}
              >
                {s.clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Plan / Retainer Name">
              <input
                className={inputCls}
                value={form.planName}
                onChange={(e) => setForm({ ...form, planName: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Retainer Amount (₹)">
                <input
                  type="number"
                  className={inputCls}
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: Number(e.target.value) || 0 })}
                />
              </Field>
              <Field label="Billing Frequency">
                <select
                  className={inputCls}
                  value={form.frequency}
                  onChange={(e) => setForm({ ...form, frequency: e.target.value as ClientSubscription["frequency"] })}
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Annual">Annual</option>
                </select>
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
              <Button onClick={handleCreateSubscription}>Activate Subscription</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
