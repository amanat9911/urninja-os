// UrNinja OS — Complete Leads & Sales CRM Pipeline, Excel Table View, Date Filters, and Audit Tracking
import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Plus, Phone, Upload, Download, Table as TableIcon, LayoutGrid, Calendar,
  Search, Lock, Globe, ArrowRight, ShieldCheck, CheckCircle2, History, User,
  FileSpreadsheet, Filter, Sparkles
} from "lucide-react";
import {
  useDemo, update, empName, notify, convertLeadToClient, updateLeadStatus
} from "@/store/demo-store";
import { PageHeader, Panel, StatusBadge, Select, Field, inputCls, textareaCls, TableWrap, StatCard, Empty, DemoTag } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LEAD_STAGES, type Lead, type LeadStage, type CallLog } from "@/types";
import { inr, today, fmtDate } from "@/utils/format";
import { pageHead } from "@/lib/seo";
import { toast } from "sonner";
import { subDays, format } from "date-fns";

export const Route = createFileRoute("/leads")({
  head: pageHead("Leads & Pipeline", "Sales pipeline, Excel table view, lead privacy, import/export, and audit tracking."),
  component: LeadsPage,
});

export function LeadsPage() {
  const s = useDemo();
  const currentRole = s.session.role;
  const currentUserId = s.session.employeeId || "UN-1001";
  const t = today();
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");

  // View Mode: "kanban" | "excel"
  const [viewMode, setViewMode] = useState<"kanban" | "excel">("excel");

  // Date Navigation Filter: "all" | "today" | "yesterday" | "custom"
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "yesterday" | "custom">("all");
  const [customRange, setCustomRange] = useState({ from: t, to: t });
  const [selectedUploadBatch, setSelectedUploadBatch] = useState<string>("");

  // Filters & Search
  const [q, setQ] = useState("");
  const [filterStage, setFilterStage] = useState<string>("");
  const [filterAssignee, setFilterAssignee] = useState<string>("");
  const [filterPrivacy, setFilterPrivacy] = useState<string>("");

  // Selection & Modals
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [callLogForm, setCallLogForm] = useState<{ outcome: CallLog["outcome"]; remark: string }>({
    outcome: "Connected",
    remark: "",
  });

  // New Lead Form State
  const [newLeadForm, setNewLeadForm] = useState({
    businessName: "",
    contactPerson: "",
    phone: "",
    email: "",
    city: "Mumbai",
    category: "Hospitality & Restaurant",
    source: s.settings.leadSources[0] ?? "Google Maps",
    dealValue: 35000,
    priority: "Medium" as Lead["priority"],
    isPrivate: false,
    assignedTo: currentUserId,
    remarks: "",
  });

  // Sales team employees
  const salesTeam = s.employees.filter((e) => e.status !== "Resigned");

  // Privacy Scope: Supervisors see all; regular sales reps only see their own or shared leads
  const isSupervisor = ["Super Owner", "Owner", "Super Admin", "Admin", "Department Head", "Manager"].includes(currentRole);

  const accessibleLeads = useMemo(() => {
    return s.leads.filter((l) => {
      if (isSupervisor) return true;
      if (l.assignedTo === currentUserId) return true;
      if (l.sharedWith && l.sharedWith.includes(currentUserId)) return true;
      if (!l.isPrivate) return true;
      return false;
    });
  }, [s.leads, isSupervisor, currentUserId]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return accessibleLeads.filter((l) => {
      const matchesQ =
        (l.businessName + l.contactPerson + l.phone + l.city + l.category + l.id)
          .toLowerCase()
          .includes(q.toLowerCase());

      const matchesStage = !filterStage || l.stage === filterStage;
      const matchesAssignee = !filterAssignee || l.assignedTo === filterAssignee;
      const matchesPrivacy =
        !filterPrivacy ||
        (filterPrivacy === "private" && l.isPrivate) ||
        (filterPrivacy === "shared" && !l.isPrivate);

      // Date navigation
      let matchesDate = true;
      if (selectedUploadBatch) {
        matchesDate = l.uploadId === selectedUploadBatch;
      } else if (dateFilter === "today") {
        matchesDate = l.createdAt === t;
      } else if (dateFilter === "yesterday") {
        matchesDate = l.createdAt === yesterday;
      } else if (dateFilter === "custom") {
        matchesDate = l.createdAt >= customRange.from && l.createdAt <= customRange.to;
      }

      return matchesQ && matchesStage && matchesAssignee && matchesPrivacy && matchesDate;
    });
  }, [accessibleLeads, q, filterStage, filterAssignee, filterPrivacy, dateFilter, customRange, selectedUploadBatch, t, yesterday]);

  // Selected Lead object
  const activeLead = s.leads.find((l) => l.id === selectedLeadId);

  // Quick Stage Change with Audit Record
  const handleQuickStageChange = (lead: Lead, newStage: LeadStage) => {
    updateLeadStatus(lead.id, newStage, `Stage updated to ${newStage}`);
    toast.success(`${lead.businessName} moved to ${newStage}.`);
  };

  // Add Lead
  const handleCreateLead = () => {
    if (!newLeadForm.businessName.trim() || !newLeadForm.phone.trim()) {
      toast.error("Business name and phone number are required.");
      return;
    }

    const leadId = `L${Date.now()}`;
    const newLead: Lead = {
      ...newLeadForm,
      id: leadId,
      whatsapp: newLeadForm.phone,
      area: "",
      website: "",
      instagram: "",
      gbp: "",
      stage: "New Lead",
      sharedWith: [],
      received: 0,
      createdAt: t,
      calls: [],
      history: [
        {
          date: t,
          by: currentUserId,
          fromStage: "Draft",
          toStage: "New Lead",
          remark: "Lead manually entered into CRM",
        },
      ],
    };

    update((x) => ({
      ...x,
      leads: [newLead, ...x.leads],
    }), { action: `added lead ${newLead.businessName}`, module: "Leads" });

    toast.success(`Lead "${newLead.businessName}" added successfully.`);
    setAdding(false);
    setNewLeadForm({
      businessName: "",
      contactPerson: "",
      phone: "",
      email: "",
      city: "Mumbai",
      category: "Hospitality & Restaurant",
      source: s.settings.leadSources[0] ?? "Google Maps",
      dealValue: 35000,
      priority: "Medium",
      isPrivate: false,
      assignedTo: currentUserId,
      remarks: "",
    });
  };

  // Log a Call against Lead
  const handleLogCall = () => {
    if (!activeLead) return;
    const callEntry: CallLog = {
      id: `C${Date.now()}`,
      date: t,
      employeeId: currentUserId,
      outcome: callLogForm.outcome,
      remark: callLogForm.remark || `Outcome: ${callLogForm.outcome}`,
    };

    update((x) => ({
      ...x,
      leads: x.leads.map((l) =>
        l.id === activeLead.id
          ? {
              ...l,
              lastContactedAt: t,
              calls: [callEntry, ...l.calls],
            }
          : l
      ),
    }), { action: `logged call with ${activeLead.businessName}`, module: "Leads" });

    toast.success("Call log saved.");
    setCallLogForm({ outcome: "Connected", remark: "" });
  };

  // CSV / XLSX Import
  const handleImportFile = (file: File) => {
    file.text().then((text) => {
      const rows = text.split(/\r?\n/).slice(1).filter(Boolean).map((r) => r.split(","));
      const now = Date.now();
      const uploadId = `U${now}`;

      const items: Lead[] = rows.map((r, i) => ({
        id: `L${now}${i}`,
        businessName: r[0]?.trim() || `Business ${i + 1}`,
        contactPerson: r[1]?.trim() || "Contact Person",
        phone: r[2]?.trim() || "+91 98000 00000",
        whatsapp: r[2]?.trim() || "",
        email: r[3]?.trim() || "",
        city: r[4]?.trim() || "Mumbai",
        area: "",
        category: r[5]?.trim() || "General",
        website: "",
        instagram: "",
        gbp: "",
        source: "CSV / Sheet",
        priority: "Medium",
        remarks: "Imported via dataset batch " + uploadId,
        stage: "New Lead",
        assignedTo: currentUserId,
        sharedWith: [],
        dealValue: 25000,
        received: 0,
        createdAt: t,
        calls: [],
        uploadId,
        isPrivate: false,
      }));

      update((x) => ({
        ...x,
        leads: [...items, ...x.leads],
        uploads: [
          {
            id: uploadId,
            fileName: file.name,
            uploaderId: currentUserId,
            date: t,
            source: "Spreadsheet",
            category: "Bulk Import",
            count: items.length,
            status: "Imported",
          },
          ...x.uploads,
        ],
      }), { action: `imported ${items.length} leads from ${file.name}`, module: "Leads" });

      toast.success(`${items.length} leads successfully imported!`);
    });
  };

  // CSV Export
  const handleExportCsv = () => {
    const headers = ["Lead ID", "Business Name", "Contact Person", "Phone", "Email", "City", "Category", "Deal Value", "Stage", "Assigned To"];
    const rows = filteredLeads.map((l) => [
      l.id,
      `"${l.businessName.replace(/"/g, '""')}"`,
      `"${l.contactPerson.replace(/"/g, '""')}"`,
      l.phone,
      l.email,
      l.city,
      l.category,
      l.dealValue,
      l.stage,
      empName(s, l.assignedTo),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `UrNinja_Leads_${t}.csv`;
    link.click();
    toast.success("Leads CSV exported.");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="CRM Leads & Sales Pipeline"
        subtitle={`${accessibleLeads.length} visible leads · Total Pipeline: ${inr(accessibleLeads.reduce((a, l) => a + l.dealValue, 0))}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border bg-card p-0.5">
              <Button
                size="sm"
                variant={viewMode === "excel" ? "default" : "ghost"}
                className="h-7 text-xs gap-1.5"
                onClick={() => setViewMode("excel")}
              >
                <TableIcon className="size-3.5" /> Excel View
              </Button>
              <Button
                size="sm"
                variant={viewMode === "kanban" ? "default" : "ghost"}
                className="h-7 text-xs gap-1.5"
                onClick={() => setViewMode("kanban")}
              >
                <LayoutGrid className="size-3.5" /> Kanban Board
              </Button>
            </div>

            <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border bg-card px-3 text-xs font-semibold hover:bg-muted">
              <Upload className="size-3.5" /> Import Sheet
              <input type="file" accept=".csv" hidden onChange={(e) => e.target.files?.[0] && handleImportFile(e.target.files[0])} />
            </label>

            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={handleExportCsv}>
              <Download className="size-3.5" /> Export
            </Button>

            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setAdding(true)}>
              <Plus className="size-3.5" /> New Lead
            </Button>
          </div>
        }
      />

      {/* Pipeline Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        <StatCard
          label="Total Leads"
          value={accessibleLeads.length}
          onClick={() => { setFilterStage(""); setDateFilter("all"); }}
          className="cursor-pointer"
        />
        <StatCard
          label="New Leads"
          value={accessibleLeads.filter((l) => l.stage === "New Lead").length}
          tone="info"
          onClick={() => setFilterStage("New Lead")}
          className="cursor-pointer"
        />
        <StatCard
          label="Interested"
          value={accessibleLeads.filter((l) => l.stage === "Interested").length}
          tone="success"
          onClick={() => setFilterStage("Interested")}
          className="cursor-pointer"
        />
        <StatCard
          label="Follow-ups"
          value={accessibleLeads.filter((l) => l.stage === "Follow-up").length}
          tone="warning"
          onClick={() => setFilterStage("Follow-up")}
          className="cursor-pointer"
        />
        <StatCard
          label="Meetings"
          value={accessibleLeads.filter((l) => l.stage === "Meeting").length}
          tone="info"
          onClick={() => setFilterStage("Meeting")}
          className="cursor-pointer"
        />
        <StatCard
          label="Deals Won"
          value={accessibleLeads.filter((l) => l.stage === "Deal Won").length}
          tone="success"
          hint={inr(accessibleLeads.filter((l) => l.stage === "Deal Won").reduce((a, l) => a + l.dealValue, 0))}
          onClick={() => setFilterStage("Deal Won")}
          className="cursor-pointer"
        />
        <StatCard
          label="Deal Lost"
          value={accessibleLeads.filter((l) => l.stage === "Deal Lost").length}
          tone="destructive"
          onClick={() => setFilterStage("Deal Lost")}
          className="cursor-pointer"
        />
      </div>

      {/* Date Navigation & Search Toolbar */}
      <Panel>
        <div className="space-y-3">
          {/* Date Navigation Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-muted-foreground mr-1">Date Navigation:</span>
              {(
                [
                  ["all", "All Dates"],
                  ["today", "Today"],
                  ["yesterday", "Yesterday"],
                  ["custom", "Custom Range"],
                ] as const
              ).map(([dk, label]) => (
                <button
                  key={dk}
                  onClick={() => {
                    setDateFilter(dk);
                    setSelectedUploadBatch("");
                  }}
                  className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                    dateFilter === dk && !selectedUploadBatch
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Historical Upload Sheet Selector */}
            {s.uploads.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-muted-foreground">Historical Sheet:</span>
                <Select
                  value={selectedUploadBatch}
                  onChange={(e) => setSelectedUploadBatch(e.target.value)}
                  className="w-52 text-xs"
                >
                  <option value="">Select Imported Batch</option>
                  {s.uploads.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fileName} ({u.count} leads · {fmtDate(u.date)})
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </div>

          {/* Search & Granular Filters */}
          <div className="flex flex-wrap gap-2.5">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search business, contact person, phone, city, category..."
                className={inputCls + " pl-8 text-xs"}
              />
            </div>

            <Select value={filterStage} onChange={(e) => setFilterStage(e.target.value)} className="w-36 text-xs">
              <option value="">All Stages</option>
              {LEAD_STAGES.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </Select>

            <Select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)} className="w-40 text-xs">
              <option value="">All Assignees</option>
              {salesTeam.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </Select>

            <Select value={filterPrivacy} onChange={(e) => setFilterPrivacy(e.target.value)} className="w-32 text-xs">
              <option value="">Privacy (All)</option>
              <option value="private">Private Only</option>
              <option value="shared">Shared Only</option>
            </Select>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* EXCEL TABLE VIEW */}
        {/* ========================================================================= */}
        {viewMode === "excel" ? (
          <div className="mt-4">
            {filteredLeads.length === 0 ? (
              <Empty text="No leads matched the current date and filter criteria." />
            ) : (
              <TableWrap>
                <thead>
                  <tr>
                    <th>Lead ID</th>
                    <th>Business Name</th>
                    <th>Contact Person</th>
                    <th>Phone</th>
                    <th>City / Area</th>
                    <th>Category</th>
                    <th>Deal Value</th>
                    <th>Stage</th>
                    <th>Assigned To</th>
                    <th>Privacy</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((l) => (
                    <tr
                      key={l.id}
                      className="cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => setSelectedLeadId(l.id)}
                    >
                      <td className="font-mono text-xs text-muted-foreground">{l.id}</td>
                      <td>
                        <p className="font-semibold text-sm leading-tight">{l.businessName}</p>
                        <p className="text-[10px] text-muted-foreground">Source: {l.source}</p>
                      </td>
                      <td className="text-xs">{l.contactPerson}</td>
                      <td className="text-xs font-mono">{l.phone}</td>
                      <td className="text-xs text-muted-foreground">{l.city}</td>
                      <td className="text-xs">{l.category}</td>
                      <td className="font-bold text-xs">{inr(l.dealValue)}</td>
                      <td>
                        <StatusBadge status={l.stage} />
                      </td>
                      <td className="text-xs">{empName(s, l.assignedTo)}</td>
                      <td>
                        {l.isPrivate ? (
                          <span className="flex items-center gap-1 text-[11px] text-warning font-semibold">
                            <Lock className="size-3" /> Private
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Globe className="size-3" /> Shared
                          </span>
                        )}
                      </td>
                      <td className="text-right" onClick={(ev) => ev.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={() => setSelectedLeadId(l.id)}
                        >
                          View / Call
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            )}
          </div>
        ) : (
          /* ========================================================================= */
          /* KANBAN BOARD VIEW */
          /* ========================================================================= */
          <div className="mt-4 -mx-4 flex gap-3 overflow-x-auto px-4 pb-4">
            {LEAD_STAGES.map((st) => {
              const stageLeads = filteredLeads.filter((l) => l.stage === st);
              return (
                <div key={st} className="w-72 shrink-0">
                  <div className="mb-2 flex items-center justify-between px-1">
                    <StatusBadge status={st} />
                    <span className="text-xs font-semibold text-muted-foreground">{stageLeads.length}</span>
                  </div>
                  <div className="space-y-2.5 max-h-[68vh] overflow-y-auto pr-1">
                    {stageLeads.map((l) => (
                      <div
                        key={l.id}
                        onClick={() => setSelectedLeadId(l.id)}
                        className="glass lift block w-full rounded-xl border p-3.5 text-left cursor-pointer hover:border-primary/50 transition-all bg-card/60"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <p className="font-bold text-sm leading-tight">{l.businessName}</p>
                          {l.isPrivate && <Lock className="size-3 text-warning shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{l.contactPerson} · {l.city}</p>
                        <div className="mt-2.5 flex items-center justify-between text-xs pt-2 border-t">
                          <span className="text-muted-foreground">{empName(s, l.assignedTo).split(" ")[0]}</span>
                          <b className="text-foreground">{inr(l.dealValue)}</b>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {/* ========================================================================= */}
      {/* LEAD DETAIL & ACTIVITY AUDIT MODAL */}
      {/* ========================================================================= */}
      <Dialog open={!!activeLead} onOpenChange={() => setSelectedLeadId(null)}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          {activeLead && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between gap-3 pb-3 border-b">
                  <div>
                    <h2 className="text-lg font-bold">{activeLead.businessName}</h2>
                    <p className="text-xs text-muted-foreground">
                      Lead ID: {activeLead.id} · Created on {fmtDate(activeLead.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={activeLead.stage} />
                </DialogTitle>
              </DialogHeader>

              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl border p-3 bg-muted/20 text-xs">
                <div>
                  <p className="text-muted-foreground">Contact Person</p>
                  <p className="font-semibold text-sm">{activeLead.contactPerson}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Phone Number</p>
                  <p className="font-semibold text-sm font-mono">{activeLead.phone}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">City & Category</p>
                  <p className="font-semibold">{activeLead.city} · {activeLead.category}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Deal Value</p>
                  <p className="font-bold text-sm text-success">{inr(activeLead.dealValue)}</p>
                </div>
              </div>

              {/* Editable Lead Controls */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <Field label="Current Pipeline Stage">
                  <Select
                    value={activeLead.stage}
                    onChange={(e) => handleQuickStageChange(activeLead, e.target.value as LeadStage)}
                  >
                    {LEAD_STAGES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </Select>
                </Field>

                <Field label="Assigned Sales Representative">
                  <Select
                    value={activeLead.assignedTo}
                    onChange={(e) => {
                      update((x) => ({
                        ...x,
                        leads: x.leads.map((l) => (l.id === activeLead.id ? { ...l, assignedTo: e.target.value } : l)),
                      }), { action: `reassigned ${activeLead.businessName} to ${empName(s, e.target.value)}`, module: "Leads" });
                      toast.success(`Assigned to ${empName(s, e.target.value)}.`);
                    }}
                  >
                    {salesTeam.map((e) => (
                      <option key={e.id} value={e.id}>{e.name} ({e.designation})</option>
                    ))}
                  </Select>
                </Field>

                <Field label="Next Follow-up Date">
                  <input
                    type="date"
                    className={inputCls}
                    value={activeLead.followUp || ""}
                    onChange={(e) => {
                      update((x) => ({
                        ...x,
                        leads: x.leads.map((l) => (l.id === activeLead.id ? { ...l, followUp: e.target.value } : l)),
                      }));
                      toast.success("Follow-up date scheduled.");
                    }}
                  />
                </Field>

                <Field label="Privacy Level">
                  <Select
                    value={activeLead.isPrivate ? "private" : "shared"}
                    onChange={(e) => {
                      const isPriv = e.target.value === "private";
                      update((x) => ({
                        ...x,
                        leads: x.leads.map((l) => (l.id === activeLead.id ? { ...l, isPrivate: isPriv } : l)),
                      }));
                      toast.success(`Lead set to ${isPriv ? "Private" : "Shared"}.`);
                    }}
                  >
                    <option value="shared">Shared (Team Visible)</option>
                    <option value="private">Private (Assignee & Leadership Only)</option>
                  </Select>
                </Field>
              </div>

              {/* Call Logging Box */}
              <div className="rounded-xl border p-3.5 bg-card/60 space-y-2 text-xs">
                <p className="font-bold flex items-center gap-1.5">
                  <Phone className="size-4 text-primary" /> Log Calling Activity
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <Select
                    value={callLogForm.outcome}
                    onChange={(e) => setCallLogForm({ ...callLogForm, outcome: e.target.value as any })}
                  >
                    {["Connected", "No Answer", "Busy", "Wrong Number", "Callback"].map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </Select>
                  <input
                    className={inputCls + " col-span-2"}
                    placeholder="Discussion notes, client feedback, next steps..."
                    value={callLogForm.remark}
                    onChange={(e) => setCallLogForm({ ...callLogForm, remark: e.target.value })}
                  />
                </div>
                <div className="flex justify-end pt-1">
                  <Button size="sm" onClick={handleLogCall}>Save Call Record</Button>
                </div>

                {/* Call History List */}
                {activeLead.calls && activeLead.calls.length > 0 && (
                  <div className="mt-3 space-y-1.5 border-t pt-2 max-h-36 overflow-y-auto">
                    {activeLead.calls.map((c) => (
                      <div key={c.id} className="flex justify-between items-center text-[11px] p-1.5 rounded bg-muted/40">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={c.outcome} />
                          <span>{c.remark}</span>
                        </div>
                        <span className="text-muted-foreground">{fmtDate(c.date)} ({empName(s, c.employeeId)})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Complete Stage History & Audit Trail */}
              {activeLead.history && activeLead.history.length > 0 && (
                <div className="rounded-xl border p-3 bg-muted/10 space-y-2 text-xs">
                  <p className="font-bold flex items-center gap-1.5">
                    <History className="size-4 text-primary" /> Stage Audit Trail
                  </p>
                  <ul className="space-y-1.5 border-l-2 border-primary/30 pl-3">
                    {activeLead.history.map((h, i) => (
                      <li key={i} className="text-[11px]">
                        <span className="text-muted-foreground">{fmtDate(h.date)}</span>
                        {" — "}
                        <b>{empName(s, h.by)}</b> moved from <i>{h.fromStage}</i> → <b className="text-primary">{h.toStage}</b>
                        {h.remark && <p className="text-muted-foreground">{h.remark}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Deal Won -> One-Click Convert to Client */}
              {activeLead.stage === "Deal Won" && !s.clients.some((c) => c.leadId === activeLead.id) && (
                <div className="rounded-xl border border-success/40 bg-success/10 p-3.5 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-bold text-sm text-foreground">Deal Won! Convert to Client</p>
                    <p className="text-muted-foreground">
                      Generates client profile, onboarding deliverables, initial service contract, and billing invoice.
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      convertLeadToClient(activeLead.id);
                      toast.success("Client account, initial deliverables, and invoice created!");
                      setSelectedLeadId(null);
                    }}
                    className="gap-1.5 whitespace-nowrap"
                  >
                    <CheckCircle2 className="size-4" /> Convert to Client
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* CREATE NEW LEAD MODAL */}
      {/* ========================================================================= */}
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Sales Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Business / Company Name">
                <input
                  className={inputCls}
                  placeholder="e.g. Urban Bites Bistro"
                  value={newLeadForm.businessName}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, businessName: e.target.value })}
                />
              </Field>
              <Field label="Contact Person">
                <input
                  className={inputCls}
                  placeholder="e.g. Vikram Seth"
                  value={newLeadForm.contactPerson}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, contactPerson: e.target.value })}
                />
              </Field>
              <Field label="Phone Number">
                <input
                  className={inputCls}
                  placeholder="+91 98000 00000"
                  value={newLeadForm.phone}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                />
              </Field>
              <Field label="Email Address">
                <input
                  type="email"
                  className={inputCls}
                  placeholder="contact@business.in"
                  value={newLeadForm.email}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                />
              </Field>
              <Field label="City">
                <input
                  className={inputCls}
                  value={newLeadForm.city}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, city: e.target.value })}
                />
              </Field>
              <Field label="Category / Industry">
                <input
                  className={inputCls}
                  value={newLeadForm.category}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, category: e.target.value })}
                />
              </Field>
              <Field label="Lead Source">
                <Select
                  value={newLeadForm.source}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, source: e.target.value })}
                >
                  {s.settings.leadSources.map((src) => (
                    <option key={src} value={src}>{src}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Expected Deal Value (₹)">
                <input
                  type="number"
                  className={inputCls}
                  value={newLeadForm.dealValue}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, dealValue: Number(e.target.value) || 0 })}
                />
              </Field>
            </div>

            <Field label="Assigned Sales Rep">
              <Select
                value={newLeadForm.assignedTo}
                onChange={(e) => setNewLeadForm({ ...newLeadForm, assignedTo: e.target.value })}
              >
                {salesTeam.map((e) => (
                  <option key={e.id} value={e.id}>{e.name} ({e.designation})</option>
                ))}
              </Select>
            </Field>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isPrivateCheck"
                checked={newLeadForm.isPrivate}
                onChange={(e) => setNewLeadForm({ ...newLeadForm, isPrivate: e.target.checked })}
                className="size-4 accent-primary"
              />
              <label htmlFor="isPrivateCheck" className="text-xs cursor-pointer font-medium">
                Mark as Private Lead (Restricted to Assignee and Executive Leadership)
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
              <Button onClick={handleCreateLead}>Save Lead</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
