// Asset Management — Hardware, company equipment, mobile devices, assignment and warranty tracking
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Laptop, Monitor, Smartphone, Cpu, Plus, UserCheck, Shield, AlertTriangle, ArrowUpDown, History
} from "lucide-react";
import { useDemo, update, empName } from "@/store/demo-store";
import { PageHeader, Panel, StatCard, StatusBadge, Select, Field, inputCls, TableWrap, DemoTag } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Asset, AssetCategory } from "@/types";
import { inr, fmtDate, today } from "@/utils/format";
import { pageHead } from "@/lib/seo";
import { toast } from "sonner";

export const Route = createFileRoute("/assets")({
  head: pageHead("Asset Management", "Company equipment, laptops, workstations, mobile inventory and warranties."),
  component: AssetsPage,
});

const CATEGORIES: AssetCategory[] = [
  "Laptop", "Desktop", "Mobile Phone", "SIM Card", "Monitor", "Accessories", "ID Card", "Other Equipment"
];

export function AssetsPage() {
  const s = useDemo();
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isAddingAsset, setIsAddingAsset] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Assign dialog
  const [isAssigning, setIsAssigning] = useState(false);
  const [assigneeId, setAssigneeId] = useState("");

  const [form, setForm] = useState({
    name: "",
    category: "Laptop" as AssetCategory,
    serialNumber: "",
    cost: 50000,
    condition: "Brand New" as Asset["condition"],
    warrantyExpiry: today(),
  });

  const filteredAssets = s.assets.filter((a) => {
    const matchCat = !categoryFilter || a.category === categoryFilter;
    const matchStatus = !statusFilter || a.status === statusFilter;
    return matchCat && matchStatus;
  });

  const totalValue = s.assets.reduce((acc, a) => acc + a.cost, 0);
  const inUseCount = s.assets.filter((a) => a.status === "In Use").length;
  const availableCount = s.assets.filter((a) => a.status === "Available").length;

  const handleAddAsset = () => {
    if (!form.name || !form.serialNumber) {
      toast.error("Please enter asset name and serial number.");
      return;
    }
    const newAsset: Asset = {
      id: `AST-${100 + s.assets.length + 1}`,
      name: form.name,
      category: form.category,
      serialNumber: form.serialNumber,
      purchaseDate: today(),
      cost: Number(form.cost) || 0,
      condition: form.condition,
      warrantyExpiry: form.warrantyExpiry,
      status: "Available",
      issueHistory: [],
    };

    update((state) => ({
      ...state,
      assets: [newAsset, ...state.assets],
    }), { action: `registered asset ${newAsset.name}`, module: "Assets" });

    toast.success(`Asset ${newAsset.id} added to inventory.`);
    setIsAddingAsset(false);
    setForm({ name: "", category: "Laptop", serialNumber: "", cost: 50000, condition: "Brand New", warrantyExpiry: today() });
  };

  const handleAssignAsset = () => {
    if (!selectedAsset) return;
    const isReturning = !assigneeId;

    update((state) => ({
      ...state,
      assets: state.assets.map((a) =>
        a.id === selectedAsset.id
          ? {
              ...a,
              assignedEmployeeId: isReturning ? undefined : assigneeId,
              status: isReturning ? "Available" : "In Use",
              issueHistory: [
                {
                  date: today(),
                  employeeId: isReturning ? (a.assignedEmployeeId || "UN-1001") : assigneeId,
                  action: isReturning ? "Returned" : "Assigned",
                  note: isReturning ? "Returned to IT inventory" : `Assigned to ${empName(s, assigneeId)}`,
                },
                ...a.issueHistory,
              ],
            }
          : a
      ),
    }), { action: `${isReturning ? "returned" : "assigned"} asset ${selectedAsset.id}`, module: "Assets" });

    toast.success(isReturning ? "Asset returned to pool." : `Asset assigned to ${empName(s, assigneeId)}.`);
    setIsAssigning(false);
    setSelectedAsset(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asset & Hardware Management"
        subtitle="Manage company laptops, workstations, mobile SIMs, and hardware assignment lifecycle"
        actions={
          <Button onClick={() => setIsAddingAsset(true)} className="gap-1.5">
            <Plus className="size-4" /> Add Asset
          </Button>
        }
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Total Inventory"
          value={s.assets.length}
          hint="Hardware & Equipment"
          icon={<Cpu className="size-4" />}
          tone="primary"
        />
        <StatCard
          label="Currently In Use"
          value={inUseCount}
          hint="Assigned to staff"
          icon={<Laptop className="size-4" />}
          tone="success"
        />
        <StatCard
          label="Available in Pool"
          value={availableCount}
          hint="Ready for deployment"
          icon={<Monitor className="size-4" />}
          tone="info"
        />
        <StatCard
          label="Total Asset Value"
          value={inr(totalValue)}
          hint="Purchase cost total"
          icon={<Shield className="size-4" />}
          tone="warning"
        />
      </div>

      {/* Asset Table */}
      <Panel>
        <div className="mb-4 flex flex-wrap gap-2">
          <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="In Use">In Use</option>
            <option value="Available">Available</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Retired">Retired</option>
          </Select>
        </div>

        <TableWrap>
          <thead>
            <tr>
              <th>Asset ID</th>
              <th>Name & Model</th>
              <th>Category</th>
              <th>Serial Number</th>
              <th>Assigned To</th>
              <th>Condition</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filteredAssets.map((asset) => (
              <tr key={asset.id} className="cursor-pointer" onClick={() => setSelectedAsset(asset)}>
                <td className="font-mono text-xs font-semibold">{asset.id}</td>
                <td className="font-medium text-sm">{asset.name}</td>
                <td>{asset.category}</td>
                <td className="font-mono text-xs text-muted-foreground">{asset.serialNumber}</td>
                <td>
                  {asset.assignedEmployeeId ? (
                    <span className="font-medium text-xs">{empName(s, asset.assignedEmployeeId)}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Unassigned</span>
                  )}
                </td>
                <td><StatusBadge status={asset.condition} /></td>
                <td><StatusBadge status={asset.status} /></td>
                <td>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      setSelectedAsset(asset);
                      setAssigneeId(asset.assignedEmployeeId || "");
                      setIsAssigning(true);
                    }}
                  >
                    {asset.assignedEmployeeId ? "Reassign/Return" : "Assign"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Panel>

      {/* Asset Detail & History Dialog */}
      <Dialog open={!!selectedAsset && !isAssigning} onOpenChange={() => setSelectedAsset(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedAsset?.name}</DialogTitle>
          </DialogHeader>
          {selectedAsset && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-3">
                <div>Asset ID: <b>{selectedAsset.id}</b></div>
                <div>Category: <b>{selectedAsset.category}</b></div>
                <div>Serial: <b className="font-mono">{selectedAsset.serialNumber}</b></div>
                <div>Purchase Cost: <b>{inr(selectedAsset.cost)}</b></div>
                <div>Condition: <StatusBadge status={selectedAsset.condition} /></div>
                <div>Status: <StatusBadge status={selectedAsset.status} /></div>
                <div>Warranty Expiry: <b>{fmtDate(selectedAsset.warrantyExpiry)}</b></div>
                <div>Assigned To: <b>{empName(s, selectedAsset.assignedEmployeeId)}</b></div>
              </div>

              {/* Issue & Assignment History */}
              <div>
                <p className="font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <History className="size-3.5" /> Chain of Custody & Service Logs
                </p>
                {selectedAsset.issueHistory.length === 0 ? (
                  <p className="text-muted-foreground italic">No past assignments logged.</p>
                ) : (
                  <div className="space-y-1.5 border-l-2 border-primary/30 pl-3">
                    {selectedAsset.issueHistory.map((h, idx) => (
                      <div key={idx} className="space-y-0.5">
                        <div className="flex justify-between font-medium">
                          <span>{h.action} · {empName(s, h.employeeId)}</span>
                          <span className="text-[11px] text-muted-foreground">{fmtDate(h.date)}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{h.note}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setSelectedAsset(null)}>Close</Button>
                <Button
                  onClick={() => {
                    setAssigneeId(selectedAsset.assignedEmployeeId || "");
                    setIsAssigning(true);
                  }}
                >
                  Manage Assignment
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign / Return Modal */}
      <Dialog open={isAssigning} onOpenChange={setIsAssigning}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign or Return Asset</DialogTitle>
          </DialogHeader>
          {selectedAsset && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Set employee custodian for <b>{selectedAsset.name}</b> ({selectedAsset.id}).
              </p>
              <Field label="Assign To Employee">
                <Select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="w-full">
                  <option value="">Return to Inventory (Unassigned)</option>
                  {s.employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                  ))}
                </Select>
              </Field>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setIsAssigning(false)}>Cancel</Button>
                <Button onClick={handleAssignAsset}>Save Assignment</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Asset Modal */}
      <Dialog open={isAddingAsset} onOpenChange={setIsAddingAsset}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Asset to Inventory</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Asset Name / Model">
              <input
                className={inputCls}
                placeholder="e.g. MacBook Pro M3 16GB"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Category">
                <select
                  className={inputCls}
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as AssetCategory })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Serial Number">
                <input
                  className={inputCls}
                  placeholder="Unique Hardware S/N"
                  value={form.serialNumber}
                  onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                />
              </Field>
              <Field label="Purchase Cost (₹)">
                <input
                  type="number"
                  className={inputCls}
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: Number(e.target.value) || 0 })}
                />
              </Field>
              <Field label="Warranty Expiry">
                <input
                  type="date"
                  className={inputCls}
                  value={form.warrantyExpiry}
                  onChange={(e) => setForm({ ...form, warrantyExpiry: e.target.value })}
                />
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setIsAddingAsset(false)}>Cancel</Button>
              <Button onClick={handleAddAsset}>Register Asset</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
