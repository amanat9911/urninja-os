// Contract Management — Client agreements, employee NDAs, vendor contracts, values and renewals
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  FileCheck, Plus, AlertCircle, Calendar, Download, RefreshCw, FileText
} from "lucide-react";
import { useDemo, update } from "@/store/demo-store";
import { PageHeader, Panel, StatCard, StatusBadge, Select, Field, inputCls, TableWrap, DemoTag } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Contract } from "@/types";
import { inr, fmtDate, today } from "@/utils/format";
import { pageHead } from "@/lib/seo";
import { toast } from "sonner";
import { addDays, format, parseISO } from "date-fns";

export const Route = createFileRoute("/contracts")({
  head: pageHead("Contract Management", "Client MSAs, employment contracts, NDAs, renewal tracking, and versions."),
  component: ContractsPage,
});

export function ContractsPage() {
  const s = useDemo();
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [typeFilter, setTypeFilter] = useState("");

  const [form, setForm] = useState({
    title: "",
    type: "Client Agreement" as Contract["type"],
    partyName: "",
    startDate: today(),
    expiryDate: format(addDays(new Date(), 365), "yyyy-MM-dd"),
    value: 120000,
    autoRenew: true,
  });

  const filteredContracts = s.contracts.filter((c) => !typeFilter || c.type === typeFilter);
  const totalValue = s.contracts.reduce((acc, c) => acc + c.value, 0);
  const activeCount = s.contracts.filter((c) => c.status === "Active").length;

  const handleAddContract = () => {
    if (!form.title || !form.partyName) {
      toast.error("Please fill title and party name.");
      return;
    }
    const newContract: Contract = {
      id: `CTR-${200 + s.contracts.length + 1}`,
      title: form.title,
      type: form.type,
      partyName: form.partyName,
      startDate: form.startDate,
      expiryDate: form.expiryDate,
      renewalDate: form.expiryDate,
      value: Number(form.value) || 0,
      status: "Active",
      version: 1,
      documentName: `${form.title.replace(/\s/g, "_")}.pdf`,
      autoRenew: form.autoRenew,
    };

    update((state) => ({
      ...state,
      contracts: [newContract, ...state.contracts],
    }), { action: `added contract ${newContract.id}`, module: "Contracts" });

    toast.success(`Contract ${newContract.id} created.`);
    setIsAdding(false);
    setForm({ title: "", type: "Client Agreement", partyName: "", startDate: today(), expiryDate: format(addDays(new Date(), 365), "yyyy-MM-dd"), value: 120000, autoRenew: true });
  };

  const handleRenewContract = (contractId: string) => {
    update((state) => ({
      ...state,
      contracts: state.contracts.map((c) => {
        if (c.id !== contractId) return c;
        const newExpiry = format(addDays(parseISO(c.expiryDate), 365), "yyyy-MM-dd");
        return {
          ...c,
          expiryDate: newExpiry,
          version: c.version + 1,
          status: "Active",
        };
      }),
    }), { action: `renewed contract ${contractId} for 1 year`, module: "Contracts" });

    toast.success("Contract renewed for 1 additional year.");
    setSelectedContract(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contract & Agreement Lifecycle"
        subtitle="Track master service agreements, employee confidentiality NDAs, vendor contracts, and renewal dates"
        actions={
          <Button onClick={() => setIsAdding(true)} className="gap-1.5">
            <Plus className="size-4" /> New Contract
          </Button>
        }
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Total Contracts"
          value={s.contracts.length}
          hint="All active & archive"
          icon={<FileCheck className="size-4" />}
          tone="primary"
        />
        <StatCard
          label="Active Agreements"
          value={activeCount}
          hint="Enforceable contracts"
          icon={<FileText className="size-4" />}
          tone="success"
        />
        <StatCard
          label="Total Contract Value"
          value={inr(totalValue)}
          hint="Gross committed value"
          icon={<FileCheck className="size-4" />}
          tone="warning"
        />
        <StatCard
          label="Expiring in < 30 Days"
          value={s.contracts.filter((c) => c.status === "Active" && c.expiryDate <= format(addDays(new Date(), 30), "yyyy-MM-dd")).length}
          hint="Needs renewal attention"
          icon={<AlertCircle className="size-4" />}
          tone="destructive"
        />
      </div>

      {/* Contracts Table */}
      <Panel>
        <div className="mb-4 flex flex-wrap gap-2">
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All Contract Types</option>
            <option value="Client Agreement">Client Agreements</option>
            <option value="Employee Agreement">Employee NDAs & Employment</option>
            <option value="Vendor Contract">Vendor & Infrastructure</option>
          </Select>
        </div>

        <TableWrap>
          <thead>
            <tr>
              <th>ID</th>
              <th>Contract Title</th>
              <th>Party / Client</th>
              <th>Type</th>
              <th>Contract Value</th>
              <th>Start Date</th>
              <th>Expiry Date</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filteredContracts.map((ctr) => (
              <tr key={ctr.id} className="cursor-pointer" onClick={() => setSelectedContract(ctr)}>
                <td className="font-mono text-xs font-semibold">{ctr.id}</td>
                <td className="font-medium text-sm">
                  {ctr.title} <span className="text-[11px] text-muted-foreground font-normal">v{ctr.version}</span>
                </td>
                <td>{ctr.partyName}</td>
                <td><StatusBadge status={ctr.type} /></td>
                <td className="font-semibold text-xs">{inr(ctr.value)}</td>
                <td>{fmtDate(ctr.startDate)}</td>
                <td>{fmtDate(ctr.expiryDate)}</td>
                <td><StatusBadge status={ctr.status} /></td>
                <td>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      handleRenewContract(ctr.id);
                    }}
                  >
                    <RefreshCw className="size-3" /> Renew
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Panel>

      {/* Contract Detail Dialog */}
      <Dialog open={!!selectedContract} onOpenChange={() => setSelectedContract(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedContract?.title}</DialogTitle>
          </DialogHeader>
          {selectedContract && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-3">
                <div>Contract ID: <b>{selectedContract.id}</b></div>
                <div>Version: <b>v{selectedContract.version}</b></div>
                <div>Party Name: <b>{selectedContract.partyName}</b></div>
                <div>Contract Type: <StatusBadge status={selectedContract.type} /></div>
                <div>Total Value: <b>{inr(selectedContract.value)}</b></div>
                <div>Status: <StatusBadge status={selectedContract.status} /></div>
                <div>Start Date: <b>{fmtDate(selectedContract.startDate)}</b></div>
                <div>Expiry Date: <b>{fmtDate(selectedContract.expiryDate)}</b></div>
              </div>

              {selectedContract.documentName && (
                <div className="flex items-center justify-between rounded-lg border p-3 bg-card/60">
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-primary" />
                    <span>{selectedContract.documentName}</span>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
                    <Download className="size-3" /> Download
                  </Button>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setSelectedContract(null)}>Close</Button>
                <Button onClick={() => handleRenewContract(selectedContract.id)} className="gap-1">
                  <RefreshCw className="size-3.5" /> Extend / Renew 1 Year
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New Contract Modal */}
      <Dialog open={isAdding} onOpenChange={setIsAdding}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Contract</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Contract Title">
              <input
                className={inputCls}
                placeholder="e.g. Master Services Agreement"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Contract Type">
                <select
                  className={inputCls}
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as Contract["type"] })}
                >
                  <option value="Client Agreement">Client Agreement</option>
                  <option value="Employee Agreement">Employee Agreement</option>
                  <option value="Vendor Contract">Vendor Contract</option>
                  <option value="NDA">Non-Disclosure Agreement (NDA)</option>
                </select>
              </Field>
              <Field label="Party / Client Name">
                <input
                  className={inputCls}
                  placeholder="e.g. Spice Route Hospitality"
                  value={form.partyName}
                  onChange={(e) => setForm({ ...form, partyName: e.target.value })}
                />
              </Field>
              <Field label="Start Date">
                <input
                  type="date"
                  className={inputCls}
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </Field>
              <Field label="Expiry Date">
                <input
                  type="date"
                  className={inputCls}
                  value={form.expiryDate}
                  onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                />
              </Field>
              <Field label="Total Committed Value (₹)">
                <input
                  type="number"
                  className={inputCls}
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: Number(e.target.value) || 0 })}
                />
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
              <Button onClick={handleAddContract}>Save Contract</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
