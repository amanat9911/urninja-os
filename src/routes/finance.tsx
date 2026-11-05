// UrNinja OS — Finance, Invoicing, Payment Collection, and Expense Ledger
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Repeat, Plus, Receipt, DollarSign, Wallet, ArrowUpRight, ArrowDownRight,
  Printer, CheckCircle2, AlertCircle, FileText, Filter, Search
} from "lucide-react";
import { useDemo, update, clientName, deptName, recordClientPayment } from "@/store/demo-store";
import { PageHeader, Panel, StatusBadge, TableWrap, StatCard, inputCls, textareaCls, Field, Select, Empty, DemoTag } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Invoice } from "@/types";
import { inr, fmtDate, today } from "@/utils/format";
import { pageHead } from "@/lib/seo";
import { toast } from "sonner";

export const Route = createFileRoute("/finance")({
  head: pageHead("Finance", "Invoices, accounts receivable, payments collection, and expense ledger."),
  component: FinancePage,
});

const total = (i: Invoice) => i.items.reduce((a, x) => a + x.amount, 0);

export function FinancePage() {
  const s = useDemo();
  const currentRole = s.session.role;
  const currentUserId = s.session.employeeId || "UN-1001";
  const t = today();

  // Search & Filters
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Payment Recording Modal
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState("Bank Transfer (NEFT/RTGS)");
  const [payRef, setPayRef] = useState("");
  const [payNote, setPayNote] = useState("");

  // Create Invoice Modal
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [newInvoiceClientId, setNewInvoiceClientId] = useState(s.clients[0]?.id || "");
  const [newInvoiceDueDate, setNewInvoiceDueDate] = useState(t);
  const [newInvoiceItems, setNewInvoiceItems] = useState([
    { label: "Digital Growth & Marketing Retainer", amount: 35000 },
  ]);

  // Expense Form State
  const [exp, setExp] = useState({ category: "Software & Hosting", amount: "", note: "", departmentId: "D05" });

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return s.invoices.filter((i) => {
      const cName = clientName(s, i.clientId);
      const matchesQ = (i.id + cName).toLowerCase().includes(q.toLowerCase());
      const matchesStatus = !statusFilter || i.status === statusFilter;
      return matchesQ && matchesStatus;
    });
  }, [s.invoices, q, statusFilter, s]);

  // Overall Financial Totals
  const billed = s.invoices.reduce((a, i) => a + total(i), 0);
  const paid = s.invoices.reduce((a, i) => a + i.paid, 0);
  const outstanding = Math.max(0, billed - paid);
  const spent = s.expenses.reduce((a, e) => a + e.amount, 0);
  const profit = paid - spent;

  // Handle Record Payment
  const handleConfirmPayment = () => {
    if (!payingInvoice) return;
    if (payAmount <= 0) {
      toast.error("Please enter a valid payment amount.");
      return;
    }

    recordClientPayment(payingInvoice.id, payAmount, payMethod, payRef, payNote);
    toast.success(`Payment of ${inr(payAmount)} successfully recorded!`);
    setPayingInvoice(null);
    setPayAmount(0);
    setPayRef("");
    setPayNote("");
  };

  // Handle Create Invoice
  const handleCreateInvoice = () => {
    if (!newInvoiceClientId) {
      toast.error("Please select a client account.");
      return;
    }
    const validItems = newInvoiceItems.filter((item) => item.label.trim() && item.amount > 0);
    if (validItems.length === 0) {
      toast.error("Please add at least one line item with an amount.");
      return;
    }

    const invId = `INV-${9000 + s.invoices.length + 1}`;
    const newInv: Invoice = {
      id: invId,
      clientId: newInvoiceClientId,
      date: t,
      due: newInvoiceDueDate || t,
      items: validItems,
      paid: 0,
      status: "Sent",
    };

    update((x) => ({
      ...x,
      invoices: [newInv, ...x.invoices],
      clients: x.clients.map((c) =>
        c.id === newInvoiceClientId
          ? { ...c, timeline: [{ date: t, text: `Invoice ${invId} generated for ${inr(total(newInv))}` }, ...c.timeline] }
          : c
      ),
    }), { action: `created invoice ${invId} for ${clientName(s, newInvoiceClientId)}`, module: "Finance" });

    toast.success(`Invoice ${invId} created successfully.`);
    setCreatingInvoice(false);
    setNewInvoiceItems([{ label: "Digital Growth & Marketing Retainer", amount: 35000 }]);
  };

  // Handle Add Expense
  const handleAddExpense = () => {
    if (!exp.category || !+exp.amount) {
      toast.error("Expense category and amount are required.");
      return;
    }

    update((x) => ({
      ...x,
      expenses: [
        {
          id: `E${Date.now()}`,
          date: t,
          category: exp.category,
          amount: +exp.amount,
          note: exp.note,
          departmentId: exp.departmentId,
        },
        ...x.expenses,
      ],
    }), { action: `added expense ${exp.category} (${inr(+exp.amount)})`, module: "Finance" });

    toast.success("Expense recorded.");
    setExp({ category: "Software & Hosting", amount: "", note: "", departmentId: "D05" });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance & Profit Ledger"
        subtitle="Accounts receivable, invoice tracking, payment collections, and P&L ledger"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/subscriptions">
              <Button variant="outline" className="gap-1.5 text-xs">
                <Repeat className="size-3.5" /> Recurring Retainers
              </Button>
            </Link>
            {["Super Owner", "Owner", "Super Admin", "Admin"].includes(currentRole) && (
              <Button onClick={() => setCreatingInvoice(true)} className="gap-1.5 text-xs">
                <Plus className="size-3.5" /> Create Invoice
              </Button>
            )}
          </div>
        }
      />

      {/* Top Financial KPI Metrics */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total Invoiced" value={inr(billed)} hint={`${s.invoices.length} invoices issued`} />
        <StatCard label="Total Collected" value={inr(paid)} tone="success" hint="Accounts settled" />
        <StatCard
          label="Outstanding Balance"
          value={inr(outstanding)}
          tone={outstanding > 0 ? "warning" : "success"}
          hint="Accounts receivable"
        />
        <StatCard
          label="Net Operating Profit"
          value={inr(profit)}
          tone={profit >= 0 ? "success" : "destructive"}
          hint="Collected Revenue − Expenses"
        />
      </div>

      {/* Invoices Panel */}
      <Panel
        title={`Invoices Ledger (${filteredInvoices.length})`}
        action={
          <div className="flex items-center gap-2">
            <input
              placeholder="Search invoice #, client..."
              className={inputCls + " w-44 text-xs"}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-36 text-xs"
            >
              <option value="">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Sent">Sent</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Paid">Paid</option>
              <option value="Overdue">Overdue</option>
            </Select>
          </div>
        }
      >
        {filteredInvoices.length === 0 ? (
          <Empty text="No invoices matched your filter criteria." />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Client Account</th>
                <th>Issue Date</th>
                <th>Due Date</th>
                <th>Billed Amount</th>
                <th>Collected</th>
                <th>Pending</th>
                <th>Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((i) => {
                const invTotal = total(i);
                const invDue = Math.max(0, invTotal - i.paid);
                return (
                  <tr key={i.id} className="hover:bg-muted/30 transition-colors">
                    <td className="font-mono text-xs font-bold">{i.id}</td>
                    <td>
                      <p className="font-semibold text-sm leading-tight">{clientName(s, i.clientId)}</p>
                      <p className="text-[11px] text-muted-foreground">{i.items.length} line item(s)</p>
                    </td>
                    <td className="text-xs text-muted-foreground">{fmtDate(i.date)}</td>
                    <td className="text-xs">{fmtDate(i.due)}</td>
                    <td className="font-bold text-xs">{inr(invTotal)}</td>
                    <td className="text-success text-xs font-semibold">{inr(i.paid)}</td>
                    <td className="text-warning text-xs font-semibold">{inr(invDue)}</td>
                    <td><StatusBadge status={i.status} /></td>
                    <td className="text-right">
                      {i.status !== "Paid" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={() => {
                            setPayingInvoice(i);
                            setPayAmount(invDue);
                            setPayRef("");
                            setPayNote("");
                          }}
                        >
                          <Receipt className="size-3" /> Record Payment
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        )}
      </Panel>

      {/* Expenses Panel */}
      <Panel title="Operational Expenses Ledger">
        <div className="mb-4 flex flex-wrap gap-2.5 text-xs">
          <input
            className={inputCls + " w-44"}
            placeholder="Expense Category"
            value={exp.category}
            onChange={(e) => setExp({ ...exp, category: e.target.value })}
          />
          <input
            className={inputCls + " w-36"}
            type="number"
            placeholder="Amount (₹)"
            value={exp.amount}
            onChange={(e) => setExp({ ...exp, amount: e.target.value })}
          />
          <Select
            value={exp.departmentId}
            onChange={(e) => setExp({ ...exp, departmentId: e.target.value })}
            className="w-40"
          >
            {s.departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </Select>
          <input
            className={inputCls + " flex-1 min-w-[200px]"}
            placeholder="Description / Vendor / Purpose..."
            value={exp.note}
            onChange={(e) => setExp({ ...exp, note: e.target.value })}
          />
          <Button onClick={handleAddExpense}>Add Expense</Button>
        </div>

        <TableWrap>
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Department</th>
              <th>Description</th>
              <th className="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {s.expenses.map((e) => (
              <tr key={e.id}>
                <td className="text-xs text-muted-foreground">{fmtDate(e.date)}</td>
                <td className="font-semibold text-xs">{e.category}</td>
                <td className="text-xs text-muted-foreground">{deptName(s, e.departmentId)}</td>
                <td className="text-xs">{e.note || "Operational spend"}</td>
                <td className="text-right font-bold text-xs text-destructive">-{inr(e.amount)}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Panel>

      {/* ========================================================================= */}
      {/* RECORD PAYMENT MODAL (NO WINDOW.PROMPT!) */}
      {/* ========================================================================= */}
      <Dialog open={!!payingInvoice} onOpenChange={() => setPayingInvoice(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment Settlement</DialogTitle>
          </DialogHeader>
          {payingInvoice && (
            <div className="space-y-3 text-xs">
              <p className="text-muted-foreground">
                Settling accounts for Invoice <b>{payingInvoice.id}</b> issued to <b>{clientName(s, payingInvoice.clientId)}</b>.
              </p>
              <Field label="Settlement Amount (₹)">
                <input
                  type="number"
                  className={inputCls}
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value) || 0)}
                />
              </Field>
              <Field label="Payment Instrument">
                <select
                  className={inputCls}
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                >
                  <option value="Bank Transfer (NEFT/RTGS/IMPS)">Bank Transfer (NEFT / RTGS / IMPS)</option>
                  <option value="UPI">UPI Transfer</option>
                  <option value="Credit / Debit Card">Credit / Debit Card</option>
                  <option value="Cheque">Cheque Deposit</option>
                  <option value="Cash">Cash Receipt</option>
                </select>
              </Field>
              <Field label="Transaction Reference (UTR / Cheque No.)">
                <input
                  className={inputCls}
                  placeholder="e.g. UTR-89218938129"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                />
              </Field>
              <Field label="Internal Accounting Note (Optional)">
                <input
                  className={inputCls}
                  placeholder="e.g. Cleared via HDFC Corporate Account"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                />
              </Field>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setPayingInvoice(null)}>Cancel</Button>
                <Button onClick={handleConfirmPayment}>Confirm Payment</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* CREATE NEW INVOICE MODAL */}
      {/* ========================================================================= */}
      <Dialog open={creatingInvoice} onOpenChange={setCreatingInvoice}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate New Billing Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Client Account">
                <select
                  className={inputCls}
                  value={newInvoiceClientId}
                  onChange={(e) => setNewInvoiceClientId(e.target.value)}
                >
                  {s.clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
                  ))}
                </select>
              </Field>
              <Field label="Payment Due Date">
                <input
                  type="date"
                  className={inputCls}
                  value={newInvoiceDueDate}
                  onChange={(e) => setNewInvoiceDueDate(e.target.value)}
                />
              </Field>
            </div>

            {/* Line Items */}
            <div className="space-y-2 rounded-xl border p-3 bg-muted/20">
              <div className="flex justify-between items-center pb-1 border-b">
                <p className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Line Items</p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs gap-1"
                  onClick={() => setNewInvoiceItems([...newInvoiceItems, { label: "Additional Service", amount: 15000 }])}
                >
                  <Plus className="size-3" /> Add Item
                </Button>
              </div>

              {newInvoiceItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    className={inputCls + " flex-1"}
                    placeholder="Description"
                    value={item.label}
                    onChange={(e) => {
                      const updated = [...newInvoiceItems];
                      updated[idx].label = e.target.value;
                      setNewInvoiceItems(updated);
                    }}
                  />
                  <input
                    type="number"
                    className={inputCls + " w-28"}
                    placeholder="Amount (₹)"
                    value={item.amount}
                    onChange={(e) => {
                      const updated = [...newInvoiceItems];
                      updated[idx].amount = Number(e.target.value) || 0;
                      setNewInvoiceItems(updated);
                    }}
                  />
                </div>
              ))}

              <div className="pt-2 border-t flex justify-between items-center font-bold text-sm">
                <span>Total Invoice Value:</span>
                <span className="text-success">{inr(newInvoiceItems.reduce((a, x) => a + (Number(x.amount) || 0), 0))}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setCreatingInvoice(false)}>Cancel</Button>
              <Button onClick={handleCreateInvoice}>Issue Invoice</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
