// UrNinja OS — Complete Client Account Management, Services Catalogue, Deliverables, and Invoicing
import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Plus, Briefcase, Search, Wallet, FileText, CheckCircle2, Clock,
  ArrowRight, ShieldCheck, Edit, Trash2, Sliders, ExternalLink, Receipt
} from "lucide-react";
import {
  useDemo, update, empName, recordClientPayment
} from "@/store/demo-store";
import { PageHeader, Panel, StatusBadge, Bar, Avatar, Field, inputCls, textareaCls, TableWrap, StatCard, Empty, DemoTag } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { inr, fmtDate, today } from "@/utils/format";
import type { Client, Deliverable, Invoice, ServiceItem } from "@/types";
import { pageHead } from "@/lib/seo";
import { toast } from "sonner";

export const Route = createFileRoute("/clients")({
  head: pageHead("Clients", "Client accounts, services scope, custom pricing, deliverables and billing history."),
  component: ClientsPage,
});

export function ClientsPage() {
  const s = useDemo();
  const currentRole = s.session.role;
  const currentUserId = s.session.employeeId || "UN-1001";
  const t = today();

  const [q, setQ] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string>(s.clients[0]?.id || "");
  const [timelineNote, setTimelineNote] = useState("");

  // Modals
  const [addingClient, setAddingClient] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [addingService, setAddingService] = useState(false);
  const [addingDeliverable, setAddingDeliverable] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState("Bank Transfer");
  const [payRef, setPayRef] = useState("");

  // New Client Form
  const [newClientForm, setNewClientForm] = useState({
    name: "",
    contactPerson: "",
    phone: "",
    email: "",
    city: "Mumbai",
    accountManagerId: s.employees[0]?.id || "UN-1002",
  });

  // New Service Form
  const [newServiceForm, setNewServiceForm] = useState({
    catalogueServiceId: "",
    name: "",
    price: 35000,
    billing: "Monthly" as ServiceItem["billing"],
    discount: 0,
    notes: "",
  });

  // New Deliverable Form
  const [newDeliverableForm, setNewDeliverableForm] = useState({
    title: "",
    serviceId: "",
    target: 5,
    assigneeId: currentUserId,
    due: today(),
  });

  // Filtered Client List
  const filteredClients = useMemo(() => {
    return s.clients.filter((c) =>
      (c.name + c.contactPerson + c.city + c.id).toLowerCase().includes(q.toLowerCase())
    );
  }, [s.clients, q]);

  // Selected Client
  const selectedClient = s.clients.find((c) => c.id === selectedClientId) || s.clients[0];

  // Invoices for this Client
  const clientInvoices = useMemo(() => {
    if (!selectedClient) return [];
    return s.invoices.filter((i) => i.clientId === selectedClient.id);
  }, [s.invoices, selectedClient]);

  const totalBilled = clientInvoices.reduce((acc, i) => acc + i.items.reduce((a, x) => a + x.amount, 0), 0);
  const totalPaid = clientInvoices.reduce((acc, i) => acc + i.paid, 0);
  const totalPending = Math.max(0, totalBilled - totalPaid);

  // Bump Deliverable
  const bumpDeliverable = (did: string) => {
    if (!selectedClient) return;
    update((x) => ({
      ...x,
      clients: x.clients.map((cl) =>
        cl.id !== selectedClient.id
          ? cl
          : {
              ...cl,
              deliverables: cl.deliverables.map((d) =>
                d.id === did
                  ? {
                      ...d,
                      done: Math.min(d.target, d.done + 1),
                      status: d.done + 1 >= d.target ? "Approved" : "In Progress",
                    }
                  : d
              ),
            }
      ),
    }), { action: `updated deliverable on ${selectedClient.name}`, module: "Clients" });
    toast.success("Deliverable progress updated (+1).");
  };

  // Create Client Handler
  const handleCreateClient = () => {
    if (!newClientForm.name.trim() || !newClientForm.phone.trim()) {
      toast.error("Company name and phone number are required.");
      return;
    }

    const newId = `CL-${300 + s.clients.length + 1}`;
    const newClient: Client = {
      ...newClientForm,
      id: newId,
      onboardedOn: t,
      services: [],
      deliverables: [],
      timeline: [{ date: t, text: `Client account onboarded by ${empName(s, currentUserId)}` }],
      portalPassword: "password123",
    };

    update((x) => ({
      ...x,
      clients: [newClient, ...x.clients],
    }), { action: `created client ${newClient.name}`, module: "Clients" });

    toast.success(`Client "${newClient.name}" created (${newId}).`);
    setSelectedClientId(newId);
    setAddingClient(false);
    setNewClientForm({
      name: "",
      contactPerson: "",
      phone: "",
      email: "",
      city: "Mumbai",
      accountManagerId: s.employees[0]?.id || "UN-1002",
    });
  };

  // Add Service to Client
  const handleAddServiceToClient = () => {
    if (!selectedClient || !newServiceForm.name.trim()) {
      toast.error("Service name is required.");
      return;
    }

    const serviceItem: ServiceItem = {
      id: `${selectedClient.id}-S${selectedClient.services.length + 1}`,
      name: newServiceForm.name.trim(),
      price: Number(newServiceForm.price) || 25000,
      billing: newServiceForm.billing,
      discount: Number(newServiceForm.discount) || 0,
      notes: newServiceForm.notes || "Assigned from service catalogue",
    };

    update((x) => ({
      ...x,
      clients: x.clients.map((c) =>
        c.id === selectedClient.id
          ? {
              ...c,
              services: [...c.services, serviceItem],
              timeline: [{ date: t, text: `Assigned service: ${serviceItem.name} (${inr(serviceItem.price)}/${serviceItem.billing})` }, ...c.timeline],
            }
          : c
      ),
    }), { action: `added service ${serviceItem.name} to ${selectedClient.name}`, module: "Clients" });

    toast.success(`Service "${serviceItem.name}" assigned to ${selectedClient.name}.`);
    setAddingService(false);
    setNewServiceForm({
      catalogueServiceId: "",
      name: "",
      price: 35000,
      billing: "Monthly",
      discount: 0,
      notes: "",
    });
  };

  // Add Deliverable to Client
  const handleAddDeliverable = () => {
    if (!selectedClient || !newDeliverableForm.title.trim()) {
      toast.error("Deliverable title is required.");
      return;
    }

    const deliverableItem: Deliverable = {
      id: `${selectedClient.id}-DL${Date.now()}`,
      title: newDeliverableForm.title.trim(),
      serviceId: newDeliverableForm.serviceId || selectedClient.services[0]?.id || "S1",
      target: Number(newDeliverableForm.target) || 1,
      done: 0,
      status: "Planned",
      assigneeId: newDeliverableForm.assigneeId,
      due: newDeliverableForm.due || t,
    };

    update((x) => ({
      ...x,
      clients: x.clients.map((c) =>
        c.id === selectedClient.id
          ? { ...c, deliverables: [...c.deliverables, deliverableItem] }
          : c
      ),
    }), { action: `added deliverable ${deliverableItem.title} to ${selectedClient.name}`, module: "Clients" });

    toast.success(`Deliverable added.`);
    setAddingDeliverable(false);
    setNewDeliverableForm({
      title: "",
      serviceId: "",
      target: 5,
      assigneeId: currentUserId,
      due: today(),
    });
  };

  // Record Payment
  const handleConfirmPayment = () => {
    if (!payingInvoice) return;
    if (payAmount <= 0) {
      toast.error("Please enter a valid payment amount.");
      return;
    }

    recordClientPayment(payingInvoice.id, payAmount, payMethod, payRef);
    toast.success(`Payment of ${inr(payAmount)} recorded.`);
    setPayingInvoice(null);
    setPayAmount(0);
    setPayRef("");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Client Accounts & Services"
        subtitle={`${s.clients.length} active enterprise accounts · Total Portfolio: ${inr(s.clients.reduce((acc, c) => acc + c.services.reduce((a, s) => a + s.price, 0), 0))}`}
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={() => setAddingClient(true)}>
              <Plus className="size-4" /> Add Client Account
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Client List with Search */}
        <div className="space-y-3 lg:col-span-4">
          <Panel>
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search clients, city, ID..."
                className={inputCls + " pl-8 text-xs"}
              />
            </div>

            <div className="space-y-1 max-h-[72vh] overflow-y-auto pr-1">
              {filteredClients.length === 0 ? (
                <Empty text="No clients found." />
              ) : (
                filteredClients.map((cl) => {
                  const isSelected = cl.id === selectedClient?.id;
                  const activeServicesCount = cl.services.length;
                  return (
                    <button
                      key={cl.id}
                      onClick={() => setSelectedClientId(cl.id)}
                      className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all ${
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-glow"
                          : "hover:bg-muted/60 text-foreground"
                      }`}
                    >
                      <Avatar name={cl.name} size={36} />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{cl.name}</p>
                        <p className={`text-xs truncate ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                          {cl.city} · {activeServicesCount} service{activeServicesCount === 1 ? "" : "s"}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </Panel>
        </div>

        {/* Right Column: Client Detail Dashboard */}
        {selectedClient ? (
          <div className="space-y-6 lg:col-span-8">
            {/* Header & Quick Financial Summary */}
            <Panel>
              <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b">
                <div>
                  <h2 className="text-xl font-bold">{selectedClient.name}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Account ID: {selectedClient.id} · Client since {fmtDate(selectedClient.onboardedOn)} · Account Manager: <b>{empName(s, selectedClient.accountManagerId)}</b>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditingClient(selectedClient)}>
                    <Edit className="size-3.5" /> Edit Account
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <StatCard label="Total Billed" value={inr(totalBilled)} tone="info" />
                <StatCard label="Total Collected" value={inr(totalPaid)} tone="success" />
                <StatCard label="Outstanding Balance" value={inr(totalPending)} tone={totalPending > 0 ? "warning" : "success"} />
              </div>
            </Panel>

            {/* Active Services & Scope */}
            <Panel
              title={`Service Scope & Retainers (${selectedClient.services.length})`}
              action={
                <Button size="sm" variant="outline" onClick={() => setAddingService(true)} className="gap-1.5 text-xs">
                  <Plus className="size-3.5" /> Assign Service
                </Button>
              }
            >
              {selectedClient.services.length === 0 ? (
                <Empty text="No active services configured for this client." />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {selectedClient.services.map((sv) => (
                    <div key={sv.id} className="rounded-xl border p-3.5 bg-card/60 text-xs space-y-1.5">
                      <div className="flex justify-between items-start">
                        <p className="font-bold text-sm text-foreground">{sv.name}</p>
                        <span className="rounded bg-primary/10 px-2 py-0.5 font-bold text-primary text-[10px]">
                          {sv.billing}
                        </span>
                      </div>
                      <p className="text-muted-foreground">{sv.notes || "Active operational retainer."}</p>
                      <div className="pt-2 border-t flex justify-between items-center font-bold text-sm">
                        <span>Pricing:</span>
                        <span className="text-success">{inr(sv.price)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            {/* Deliverables Progress */}
            <Panel
              title={`Monthly Deliverables & Work Progress (${selectedClient.deliverables.length})`}
              action={
                <Button size="sm" variant="outline" onClick={() => setAddingDeliverable(true)} className="gap-1.5 text-xs">
                  <Plus className="size-3.5" /> Add Deliverable
                </Button>
              }
            >
              {selectedClient.deliverables.length === 0 ? (
                <Empty text="No active deliverables scheduled." />
              ) : (
                <div className="space-y-3">
                  {selectedClient.deliverables.map((d) => (
                    <div key={d.id} className="rounded-xl border p-3.5 bg-card/40 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-sm">{d.title}</p>
                          <p className="text-muted-foreground text-[11px]">
                            Progress: {d.done} of {d.target} items · Assignee: <b>{empName(s, d.assigneeId)}</b>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={d.status} />
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => bumpDeliverable(d.id)}>
                            +1 Done
                          </Button>
                        </div>
                      </div>
                      <Bar value={Math.round((d.done / d.target) * 100)} />
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            {/* Invoices & Payment History */}
            <Panel title={`Invoices & Payment History (${clientInvoices.length})`}>
              {clientInvoices.length === 0 ? (
                <Empty text="No invoices issued for this client yet." />
              ) : (
                <TableWrap>
                  <thead>
                    <tr>
                      <th>Invoice ID</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Paid</th>
                      <th>Status</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientInvoices.map((inv) => {
                      const invTotal = inv.items.reduce((a, x) => a + x.amount, 0);
                      return (
                        <tr key={inv.id}>
                          <td className="font-mono text-xs font-semibold">{inv.id}</td>
                          <td className="text-xs">{fmtDate(inv.date)}</td>
                          <td className="font-bold text-xs">{inr(invTotal)}</td>
                          <td className="text-success text-xs font-semibold">{inr(inv.paid)}</td>
                          <td><StatusBadge status={inv.status} /></td>
                          <td className="text-right">
                            {inv.status !== "Paid" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7 gap-1"
                                onClick={() => {
                                  setPayingInvoice(inv);
                                  setPayAmount(Math.max(0, invTotal - inv.paid));
                                  setPayRef("");
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

            {/* Interactive Client Timeline */}
            <Panel title="Account History & Activity Timeline">
              <div className="mb-3 flex gap-2">
                <input
                  className={inputCls}
                  placeholder="Log meeting notes, client update, or milestone..."
                  value={timelineNote}
                  onChange={(e) => setTimelineNote(e.target.value)}
                />
                <Button
                  onClick={() => {
                    if (!timelineNote.trim()) return;
                    update((x) => ({
                      ...x,
                      clients: x.clients.map((cl) =>
                        cl.id === selectedClient.id
                          ? { ...cl, timeline: [{ date: t, text: timelineNote.trim() }, ...cl.timeline] }
                          : cl
                      ),
                    }));
                    setTimelineNote("");
                    toast.success("Timeline update logged.");
                  }}
                >
                  Post Note
                </Button>
              </div>

              <ul className="space-y-2 border-l-2 border-primary/30 pl-4 text-xs">
                {(selectedClient.timeline || []).map((ev, idx) => (
                  <li key={idx}>
                    <span className="font-semibold text-muted-foreground">{fmtDate(ev.date)}</span>
                    <p className="text-foreground">{ev.text}</p>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        ) : (
          <div className="lg:col-span-8">
            <Empty text="Select a client from the directory to view details." />
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* RECORD PAYMENT MODAL */}
      {/* ========================================================================= */}
      <Dialog open={!!payingInvoice} onOpenChange={() => setPayingInvoice(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Client Payment</DialogTitle>
          </DialogHeader>
          {payingInvoice && (
            <div className="space-y-3 text-xs">
              <p className="text-muted-foreground">
                Record incoming settlement against Invoice <b>{payingInvoice.id}</b> for <b>{selectedClient?.name}</b>.
              </p>
              <Field label="Payment Amount (₹)">
                <input
                  type="number"
                  className={inputCls}
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value) || 0)}
                />
              </Field>
              <Field label="Payment Method">
                <select
                  className={inputCls}
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                >
                  <option value="Bank Transfer (NEFT/RTGS/IMPS)">Bank Transfer (NEFT / RTGS / IMPS)</option>
                  <option value="UPI">UPI</option>
                  <option value="Credit / Debit Card">Credit / Debit Card</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Cash">Cash</option>
                </select>
              </Field>
              <Field label="Transaction Reference ID (UTR / Cheque No.)">
                <input
                  className={inputCls}
                  placeholder="e.g. UTR-98213812903"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
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
      {/* ADD SERVICE TO CLIENT MODAL */}
      {/* ========================================================================= */}
      <Dialog open={addingService} onOpenChange={setAddingService}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Service & Scope to {selectedClient?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            {/* Quick Pick from Service Catalogue */}
            {(s.settings.servicesCatalogue || []).length > 0 && (
              <Field label="Quick-Select from Service Catalogue">
                <select
                  className={inputCls}
                  onChange={(e) => {
                    const svc = (s.settings.servicesCatalogue || []).find((x) => x.id === e.target.value);
                    if (svc) {
                      setNewServiceForm({
                        catalogueServiceId: svc.id,
                        name: svc.name,
                        price: svc.price,
                        billing: svc.billing,
                        discount: 0,
                        notes: svc.description,
                      });
                    }
                  }}
                >
                  <option value="">Choose Service from Catalogue</option>
                  {(s.settings.servicesCatalogue || []).map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name} ({inr(x.price)} / {x.billing})
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <Field label="Service Name">
              <input
                className={inputCls}
                value={newServiceForm.name}
                onChange={(e) => setNewServiceForm({ ...newServiceForm, name: e.target.value })}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Pricing (₹)">
                <input
                  type="number"
                  className={inputCls}
                  value={newServiceForm.price}
                  onChange={(e) => setNewServiceForm({ ...newServiceForm, price: Number(e.target.value) || 0 })}
                />
              </Field>
              <Field label="Billing Frequency">
                <select
                  className={inputCls}
                  value={newServiceForm.billing}
                  onChange={(e) => setNewServiceForm({ ...newServiceForm, billing: e.target.value as any })}
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Yearly">Yearly</option>
                  <option value="One-time">One-time</option>
                </select>
              </Field>
            </div>

            <Field label="Scope & Operational Notes">
              <textarea
                rows={2}
                className={textareaCls}
                value={newServiceForm.notes}
                onChange={(e) => setNewServiceForm({ ...newServiceForm, notes: e.target.value })}
              />
            </Field>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setAddingService(false)}>Cancel</Button>
              <Button onClick={handleAddServiceToClient}>Assign Service</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* ADD DELIVERABLE MODAL */}
      {/* ========================================================================= */}
      <Dialog open={addingDeliverable} onOpenChange={setAddingDeliverable}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Monthly Deliverable Milestone</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <Field label="Deliverable Title">
              <input
                className={inputCls}
                placeholder="e.g. 10 Social Media Graphics & 2 Ad Campaigns"
                value={newDeliverableForm.title}
                onChange={(e) => setNewDeliverableForm({ ...newDeliverableForm, title: e.target.value })}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Target Quantity">
                <input
                  type="number"
                  className={inputCls}
                  value={newDeliverableForm.target}
                  onChange={(e) => setNewDeliverableForm({ ...newDeliverableForm, target: Number(e.target.value) || 1 })}
                />
              </Field>
              <Field label="Due Date">
                <input
                  type="date"
                  className={inputCls}
                  value={newDeliverableForm.due}
                  onChange={(e) => setNewDeliverableForm({ ...newDeliverableForm, due: e.target.value })}
                />
              </Field>
            </div>

            <Field label="Assigned Team Member">
              <select
                className={inputCls}
                value={newDeliverableForm.assigneeId}
                onChange={(e) => setNewDeliverableForm({ ...newDeliverableForm, assigneeId: e.target.value })}
              >
                {s.employees.filter((e) => e.status !== "Resigned").map((e) => (
                  <option key={e.id} value={e.id}>{e.name} ({e.designation})</option>
                ))}
              </select>
            </Field>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setAddingDeliverable(false)}>Cancel</Button>
              <Button onClick={handleAddDeliverable}>Save Deliverable</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* ADD CLIENT ACCOUNT MODAL */}
      {/* ========================================================================= */}
      <Dialog open={addingClient} onOpenChange={setAddingClient}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Onboard New Client Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <Field label="Client / Business Name">
              <input
                className={inputCls}
                placeholder="e.g. Horizon Health Clinics"
                value={newClientForm.name}
                onChange={(e) => setNewClientForm({ ...newClientForm, name: e.target.value })}
              />
            </Field>
            <Field label="Contact Person">
              <input
                className={inputCls}
                placeholder="e.g. Dr. Rajesh Sharma"
                value={newClientForm.contactPerson}
                onChange={(e) => setNewClientForm({ ...newClientForm, contactPerson: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone Number">
                <input
                  className={inputCls}
                  placeholder="+91 98000 00000"
                  value={newClientForm.phone}
                  onChange={(e) => setNewClientForm({ ...newClientForm, phone: e.target.value })}
                />
              </Field>
              <Field label="Email Address">
                <input
                  type="email"
                  className={inputCls}
                  placeholder="contact@horizonhealth.in"
                  value={newClientForm.email}
                  onChange={(e) => setNewClientForm({ ...newClientForm, email: e.target.value })}
                />
              </Field>
            </div>
            <Field label="City">
              <input
                className={inputCls}
                value={newClientForm.city}
                onChange={(e) => setNewClientForm({ ...newClientForm, city: e.target.value })}
              />
            </Field>
            <Field label="Assigned Account Manager">
              <select
                className={inputCls}
                value={newClientForm.accountManagerId}
                onChange={(e) => setNewClientForm({ ...newClientForm, accountManagerId: e.target.value })}
              >
                {s.employees.filter((e) => e.status !== "Resigned").map((e) => (
                  <option key={e.id} value={e.id}>{e.name} ({e.designation})</option>
                ))}
              </select>
            </Field>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setAddingClient(false)}>Cancel</Button>
              <Button onClick={handleCreateClient}>Create Client Account</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
