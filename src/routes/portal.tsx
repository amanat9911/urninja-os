// Client Portal — Dedicated isolated portal for clients to track deliverables, approve work, raise tickets, and pay invoices
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Briefcase, CheckCircle, Clock, AlertCircle, LifeBuoy, FileText, Download,
  Send, CreditCard, ExternalLink, ThumbsUp, RefreshCw, MessageSquare
} from "lucide-react";
import { useDemo, update, empName } from "@/store/demo-store";
import { PageHeader, Panel, StatCard, StatusBadge, Avatar, Field, inputCls, textareaCls, TableWrap, DemoTag, Bar } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { inr, fmtDate, today } from "@/utils/format";
import type { Deliverable, Ticket } from "@/types";
import { pageHead } from "@/lib/seo";
import { toast } from "sonner";

export const Route = createFileRoute("/portal")({
  head: pageHead("Client Portal", "Dedicated client dashboard for deliverables, approvals, tickets, and payments."),
  component: ClientPortalPage,
});

export function ClientPortalPage() {
  const s = useDemo();
  // Allow switching client account for demo testing
  const [activeClientId, setActiveClientId] = useState<string>(s.clients[0]?.id || "CL-301");
  const client = s.clients.find((c) => c.id === activeClientId) || s.clients[0];

  // Modals
  const [isRaisingTicket, setIsRaisingTicket] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    title: "",
    category: "General Query",
    priority: "Medium" as Ticket["priority"],
    description: "",
  });

  const [reviewDeliverable, setReviewDeliverable] = useState<Deliverable | null>(null);
  const [feedbackNote, setFeedbackNote] = useState("");

  const [messagingManager, setMessagingManager] = useState(false);
  const [clientMessage, setClientMessage] = useState("");

  // Isolated client records
  const myServices = client?.services || [];
  const myDeliverables = client?.deliverables || [];
  const myInvoices = s.invoices.filter((i) => i.clientId === client?.id);
  const myTickets = s.tickets.filter((t) => t.clientId === client?.id);
  const myContracts = s.contracts.filter((ctr) => ctr.relatedId === client?.id);
  const myAudits = s.audits.filter((a) => a.businessName.toLowerCase().includes(client?.name.toLowerCase()) || client?.name.toLowerCase().includes(a.businessName.toLowerCase()));

  // Financials
  const totalBilled = myInvoices.reduce((acc, i) => acc + i.items.reduce((s, it) => s + it.amount, 0), 0);
  const totalPaid = myInvoices.reduce((acc, i) => acc + i.paid, 0);
  const outstanding = totalBilled - totalPaid;

  const handleApproveDeliverable = (delivId: string) => {
    update((state) => ({
      ...state,
      clients: state.clients.map((c) =>
        c.id === client.id
          ? {
              ...c,
              deliverables: c.deliverables.map((d) =>
                d.id === delivId ? { ...d, status: "Approved" } : d
              ),
              timeline: [{ date: today(), text: `Client approved deliverable` }, ...c.timeline],
            }
          : c
      ),
    }), { action: `client approved deliverable`, module: "Client Portal" });

    toast.success("Deliverable marked as Approved. Thank you!");
    setReviewDeliverable(null);
  };

  const handleRequestRevision = (delivId: string) => {
    if (!feedbackNote.trim()) {
      toast.error("Please provide revision feedback instructions.");
      return;
    }
    update((state) => ({
      ...state,
      clients: state.clients.map((c) =>
        c.id === client.id
          ? {
              ...c,
              deliverables: c.deliverables.map((d) =>
                d.id === delivId ? { ...d, status: "In Progress", clientFeedback: feedbackNote } : d
              ),
              timeline: [{ date: today(), text: `Revision requested: ${feedbackNote}` }, ...c.timeline],
            }
          : c
      ),
    }), { action: `client requested revision`, module: "Client Portal" });

    toast.success("Revision request dispatched to account manager.");
    setReviewDeliverable(null);
    setFeedbackNote("");
  };

  const handleRaiseTicket = () => {
    if (!ticketForm.title.trim()) {
      toast.error("Please enter a ticket title.");
      return;
    }
    const newTicket: Ticket = {
      id: `TKT-${7000 + s.tickets.length + 1}`,
      clientId: client.id,
      category: ticketForm.category,
      title: ticketForm.title,
      description: ticketForm.description,
      priority: ticketForm.priority,
      team: "IT Support",
      service: myServices[0]?.name || "General Service",
      status: "New",
      createdAt: today(),
      slaHours: ticketForm.priority === "Critical" ? 4 : ticketForm.priority === "High" ? 24 : 72,
      notes: [{ by: "Client Portal", text: ticketForm.description, internal: false, date: today() }],
    };

    update((state) => ({
      ...state,
      tickets: [newTicket, ...state.tickets],
    }), { action: `client raised ticket ${newTicket.id}`, module: "Client Portal" });

    toast.success(`Support ticket ${newTicket.id} created.`);
    setIsRaisingTicket(false);
    setTicketForm({ title: "", category: "General Query", priority: "Medium", description: "" });
  };

  const handleSimulatePayment = (invoiceId: string) => {
    update((state) => ({
      ...state,
      invoices: state.invoices.map((inv) => {
        if (inv.id !== invoiceId) return inv;
        const total = inv.items.reduce((s, it) => s + it.amount, 0);
        return { ...inv, paid: total, status: "Paid" };
      }),
    }), { action: `client paid invoice ${invoiceId}`, module: "Client Portal" });

    toast.success(`Payment for ${invoiceId} processed successfully!`);
  };

  const handleSendMessage = () => {
    if (!clientMessage.trim()) return;
    update((state) => ({
      ...state,
      clients: state.clients.map((c) =>
        c.id === client.id
          ? {
              ...c,
              timeline: [{ date: today(), text: `Client message to Manager: ${clientMessage}` }, ...c.timeline],
            }
          : c
      ),
    }), { action: `sent message to account manager`, module: "Client Portal" });

    toast.success("Message sent to your Account Manager.");
    setClientMessage("");
    setMessagingManager(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Demo Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-base text-primary">Client Portal View</span>
            <DemoTag text="Client Isolated Environment" />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Clients only have access to their company records, deliverables, and billing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Switch Client Demo:</span>
          <select
            value={activeClientId}
            onChange={(e) => setActiveClientId(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2.5 text-xs font-medium"
          >
            {s.clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.city})</option>
            ))}
          </select>
        </div>
      </div>

      <PageHeader
        title={`Welcome, ${client?.contactPerson || client?.name}`}
        subtitle={`${client?.name} · Managed by ${empName(s, client?.accountManagerId)}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setMessagingManager(true)}>
              <MessageSquare className="size-4" /> Contact Account Manager
            </Button>
            <Button onClick={() => setIsRaisingTicket(true)}>
              <LifeBuoy className="size-4" /> Raise Support Ticket
            </Button>
          </div>
        }
      />

      {/* KPI Overview */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Active Retainers"
          value={`${myServices.length} Services`}
          hint="Recurring & Project"
          icon={<Briefcase className="size-4" />}
          tone="primary"
        />
        <StatCard
          label="Monthly Deliverables"
          value={`${myDeliverables.filter((d) => d.status === "Approved").length}/${myDeliverables.length}`}
          hint="Completed this month"
          icon={<CheckCircle className="size-4" />}
          tone="success"
        />
        <StatCard
          label="Outstanding Balance"
          value={inr(outstanding)}
          hint={outstanding > 0 ? "Payment Due" : "All Paid"}
          icon={<CreditCard className="size-4" />}
          tone={outstanding > 0 ? "warning" : "success"}
        />
        <StatCard
          label="Support Tickets"
          value={myTickets.length}
          hint={`${myTickets.filter((t) => !["Resolved", "Closed"].includes(t.status)).length} Open`}
          icon={<LifeBuoy className="size-4" />}
          tone="info"
        />
      </div>

      {/* Main Grid: Deliverables Review & Services */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Deliverables Progress & Submissions */}
        <div className="space-y-6 lg:col-span-8">
          <Panel title="Deliverables & Submissions Review">
            <div className="space-y-4">
              {myDeliverables.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No deliverables active this month.</p>
              ) : (
                myDeliverables.map((deliv) => {
                  const pct = Math.round((deliv.done / deliv.target) * 100);
                  return (
                    <div key={deliv.id} className="rounded-xl border bg-card/60 p-4 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm">{deliv.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Target: {deliv.done}/{deliv.target} units · Due: {fmtDate(deliv.due)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={deliv.status} />
                          {deliv.submissionUrl && (
                            <a
                              href={deliv.submissionUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted"
                            >
                              <ExternalLink className="size-3" /> View Work
                            </a>
                          )}
                          {deliv.status === "Submitted" && (
                            <Button size="sm" className="h-7 text-xs" onClick={() => setReviewDeliverable(deliv)}>
                              Review & Sign-off
                            </Button>
                          )}
                        </div>
                      </div>
                      <Bar value={pct} />
                      {deliv.clientFeedback && (
                        <p className="text-xs text-warning bg-warning/10 p-2 rounded">
                          Your Feedback: {deliv.clientFeedback}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </Panel>

          {/* Invoices & Billing */}
          <Panel title="Invoices & Payment History">
            <TableWrap>
              <thead>
                <tr>
                  <th>Invoice ID</th>
                  <th>Date</th>
                  <th>Due Date</th>
                  <th>Amount</th>
                  <th>Paid</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {myInvoices.map((inv) => {
                  const total = inv.items.reduce((s, it) => s + it.amount, 0);
                  return (
                    <tr key={inv.id}>
                      <td className="font-mono text-xs font-semibold">{inv.id}</td>
                      <td>{fmtDate(inv.date)}</td>
                      <td>{fmtDate(inv.due)}</td>
                      <td className="font-semibold">{inr(total)}</td>
                      <td className="text-success">{inr(inv.paid)}</td>
                      <td><StatusBadge status={inv.status} /></td>
                      <td>
                        {inv.status !== "Paid" && (
                          <Button size="sm" className="h-7 text-xs gap-1" onClick={() => handleSimulatePayment(inv.id)}>
                            <CreditCard className="size-3" /> Pay Online
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </TableWrap>
          </Panel>

          {/* Support Tickets */}
          <Panel title="Support Tickets">
            {myTickets.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No support tickets created.</p>
            ) : (
              <div className="space-y-2">
                {myTickets.map((tkt) => (
                  <div key={tkt.id} className="rounded-lg border p-3 text-xs space-y-1">
                    <div className="flex justify-between items-center font-semibold">
                      <span className="text-sm">{tkt.title}</span>
                      <StatusBadge status={tkt.status} />
                    </div>
                    <p className="text-muted-foreground">{tkt.description}</p>
                    <div className="flex justify-between items-center text-[11px] pt-1 border-t">
                      <span>Category: {tkt.category} · Priority: {tkt.priority}</span>
                      <span>Created {fmtDate(tkt.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* Right Column: Active Services, Contracts, Audit Scores */}
        <div className="space-y-6 lg:col-span-4">
          {/* Active Services */}
          <Panel title="Subscribed Services">
            <div className="space-y-2.5">
              {myServices.map((sv) => (
                <div key={sv.id} className="rounded-lg border p-3 text-xs space-y-1">
                  <div className="flex justify-between items-center font-semibold text-sm">
                    <span>{sv.name}</span>
                    <span className="text-primary">{inr(sv.price)}</span>
                  </div>
                  <p className="text-muted-foreground">Billing: {sv.billing}</p>
                </div>
              ))}
            </div>
          </Panel>

          {/* Contracts & Agreements */}
          <Panel title="Agreements & Contracts">
            {myContracts.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No contracts on file.</p>
            ) : (
              <div className="space-y-2">
                {myContracts.map((ctr) => (
                  <div key={ctr.id} className="rounded-lg border p-2.5 text-xs space-y-1">
                    <p className="font-semibold">{ctr.title}</p>
                    <p className="text-muted-foreground">Expires: {fmtDate(ctr.expiryDate)}</p>
                    <div className="flex justify-between items-center pt-1">
                      <StatusBadge status={ctr.status} />
                      <button className="text-primary font-medium text-xs flex items-center gap-1 hover:underline">
                        <Download className="size-3" /> Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* Digital Marketing Audit Score */}
          {myAudits.length > 0 && (
            <Panel title="Growth & Audit Scores">
              {myAudits.map((a) => {
                const avg = Math.round(Object.values(a.scores).reduce((x, y) => x + y, 0) / 5);
                return (
                  <div key={a.id} className="space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Overall Agency Audit</span>
                      <span className="font-display text-xl font-bold text-primary">{avg}/100</span>
                    </div>
                    {Object.entries(a.scores).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2">
                        <span className="w-16 capitalize">{k}</span>
                        <Bar value={v} />
                        <span className="w-6 text-right font-semibold">{v}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </Panel>
          )}
        </div>
      </div>

      {/* Review Deliverable Modal */}
      <Dialog open={!!reviewDeliverable} onOpenChange={() => setReviewDeliverable(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review Work Submission</DialogTitle>
          </DialogHeader>
          {reviewDeliverable && (
            <div className="space-y-4">
              <p className="text-sm font-semibold">{reviewDeliverable.title}</p>
              {reviewDeliverable.submissionUrl && (
                <a
                  href={reviewDeliverable.submissionUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="size-4" /> Open Delivered Assets / Preview
                </a>
              )}
              <Field label="Revision Feedback (if requesting changes)">
                <textarea
                  rows={3}
                  className={textareaCls}
                  placeholder="Specify what edits are needed..."
                  value={feedbackNote}
                  onChange={(e) => setFeedbackNote(e.target.value)}
                />
              </Field>
              <div className="flex gap-2 justify-end pt-2 border-t">
                <Button variant="outline" onClick={() => handleRequestRevision(reviewDeliverable.id)} className="gap-1">
                  <RefreshCw className="size-3.5" /> Request Revisions
                </Button>
                <Button onClick={() => handleApproveDeliverable(reviewDeliverable.id)} className="gap-1">
                  <ThumbsUp className="size-3.5" /> Approve & Sign-off
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Raise Ticket Modal */}
      <Dialog open={isRaisingTicket} onOpenChange={setIsRaisingTicket}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Raise Support Ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Subject">
              <input
                className={inputCls}
                placeholder="Brief summary of the issue"
                value={ticketForm.title}
                onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Category">
                <select
                  className={inputCls}
                  value={ticketForm.category}
                  onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                >
                  <option value="General Query">General Query</option>
                  <option value="Bug">Technical Issue / Bug</option>
                  <option value="Content">Content Update</option>
                  <option value="Billing">Billing & Invoice</option>
                </select>
              </Field>
              <Field label="Priority">
                <select
                  className={inputCls}
                  value={ticketForm.priority}
                  onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value as Ticket["priority"] })}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical (Down)</option>
                </select>
              </Field>
            </div>
            <Field label="Details">
              <textarea
                rows={4}
                className={textareaCls}
                placeholder="Provide details and reproduction steps..."
                value={ticketForm.description}
                onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
              />
            </Field>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setIsRaisingTicket(false)}>Cancel</Button>
              <Button onClick={handleRaiseTicket}>Submit Ticket</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contact Manager Modal */}
      <Dialog open={messagingManager} onOpenChange={setMessagingManager}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Message Account Manager</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Direct communication with <b>{empName(s, client?.accountManagerId)}</b>.
            </p>
            <textarea
              rows={4}
              className={textareaCls}
              placeholder="Type your message or project question..."
              value={clientMessage}
              onChange={(e) => setClientMessage(e.target.value)}
            />
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setMessagingManager(false)}>Cancel</Button>
              <Button onClick={handleSendMessage}>Send Message</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
