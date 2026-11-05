// Backup and Restore — Export state JSON, import data, local snapshot snapshots, and system reset
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Download, Upload, RotateCcw, Save, ShieldCheck, Database, AlertCircle, FileCheck
} from "lucide-react";
import { useDemo, update, resetDemo } from "@/store/demo-store";
import { PageHeader, Panel, StatCard, StatusBadge, DemoTag } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtDate, today } from "@/utils/format";
import { pageHead } from "@/lib/seo";
import { toast } from "sonner";

export const Route = createFileRoute("/backup")({
  head: pageHead("Backup & Restore", "Export system state, import data, create snapshots, and restore demo persistence."),
  component: BackupPage,
});

interface LocalSnapshot {
  id: string;
  timestamp: string;
  recordsCount: {
    employees: number;
    clients: number;
    leads: number;
    tasks: number;
  };
  data: any;
}

export function BackupPage() {
  const s = useDemo();
  const [snapshots, setSnapshots] = useState<LocalSnapshot[]>([]);
  const [restoreConfirmSnapshot, setRestoreConfirmSnapshot] = useState<LocalSnapshot | null>(null);

  // Export current state as a downloadable JSON
  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(s, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `urninja_backup_${today()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    toast.success("System data exported successfully.");
  };

  // Import JSON file
  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (parsed.employees && parsed.departments && parsed.clients) {
          update(() => parsed, { action: "restored data from imported JSON", module: "Backup" });
          toast.success("System state restored from file.");
        } else {
          toast.error("Invalid backup schema. Required collections missing.");
        }
      } catch (err) {
        toast.error("Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
  };

  // Create Snapshot in memory
  const handleCreateSnapshot = () => {
    const newSnapshot: LocalSnapshot = {
      id: `SNP-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      recordsCount: {
        employees: s.employees.length,
        clients: s.clients.length,
        leads: s.leads.length,
        tasks: s.tasks.length,
      },
      data: structuredClone(s),
    };
    setSnapshots([newSnapshot, ...snapshots]);
    toast.success(`Snapshot ${newSnapshot.id} created.`);
  };

  const handleConfirmRestore = (snap: LocalSnapshot) => {
    update(() => snap.data, { action: `restored snapshot ${snap.id}`, module: "Backup" });
    toast.success(`Restored system to snapshot ${snap.id}.`);
    setRestoreConfirmSnapshot(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Backup & Restore Management"
        subtitle="Export full agency operational state, import demo datasets, create live snapshots, and manage persistence"
        actions={<DemoTag text="Client-Side Persistence Demo" />}
      />

      {/* Production Disclaimer Notice */}
      <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-xs text-warning-foreground flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="size-5 text-warning shrink-0" />
          <div>
            <p className="font-semibold text-sm">Demo State Notice</p>
            <p className="opacity-90">
              This interface demonstrates client-side schema serialization and local recovery. In production, tamper-resistant
              PostgreSQL backups and point-in-time WAL recovery must be enforced on the server.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Total Database Records"
          value={s.employees.length + s.clients.length + s.leads.length + s.tasks.length}
          hint="Across primary collections"
          icon={<Database className="size-4" />}
          tone="primary"
        />
        <StatCard
          label="Employees Tracked"
          value={s.employees.length}
          hint="Profiles & user accounts"
          icon={<FileCheck className="size-4" />}
          tone="info"
        />
        <StatCard
          label="Invoices & Finance"
          value={s.invoices.length}
          hint="Billing ledger records"
          icon={<FileCheck className="size-4" />}
          tone="success"
        />
        <StatCard
          label="Local Snapshots"
          value={snapshots.length}
          hint="In-memory restore points"
          icon={<Save className="size-4" />}
          tone="warning"
        />
      </div>

      {/* Actions Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Export / Import Panel */}
        <Panel title="Export & Import Operational Data">
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Download the entire agency database schema, including users, permissions, leads, tasks, and finance records into a JSON backup file.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleExportData} className="gap-2">
                <Download className="size-4" /> Download JSON Backup
              </Button>
              <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-muted">
                <Upload className="size-4" /> Import JSON Backup
                <input
                  type="file"
                  accept=".json"
                  hidden
                  onChange={(e) => e.target.files?.[0] && handleImportFile(e.target.files[0])}
                />
              </label>
            </div>
          </div>
        </Panel>

        {/* Snapshot Panel */}
        <Panel title="Local Restore Snapshots">
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Create an instant checkpoint in browser memory to test large operations or roll back changes safely.
            </p>
            <div className="flex gap-2">
              <Button onClick={handleCreateSnapshot} variant="outline" className="gap-2">
                <Save className="size-4" /> Take Snapshot Now
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (confirm("Reset all data to default mock seed?")) {
                    resetDemo();
                    toast.success("System reset to seed data.");
                  }
                }}
                className="gap-2"
              >
                <RotateCcw className="size-4" /> Reset to Initial Seed
              </Button>
            </div>
          </div>
        </Panel>
      </div>

      {/* Snapshots Table */}
      {snapshots.length > 0 && (
        <Panel title="Saved Recovery Snapshots">
          <div className="space-y-2">
            {snapshots.map((snap) => (
              <div key={snap.id} className="flex items-center justify-between rounded-lg border p-3 text-xs bg-card/60">
                <div>
                  <span className="font-semibold text-sm">{snap.id}</span>
                  <p className="text-muted-foreground">
                    Captured at {snap.timestamp} · {snap.recordsCount.employees} Employees, {snap.recordsCount.clients} Clients, {snap.recordsCount.tasks} Tasks
                  </p>
                </div>
                <Button size="sm" onClick={() => setRestoreConfirmSnapshot(snap)}>
                  Restore Checkpoint
                </Button>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={!!restoreConfirmSnapshot} onOpenChange={() => setRestoreConfirmSnapshot(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm State Restore</DialogTitle>
          </DialogHeader>
          {restoreConfirmSnapshot && (
            <div className="space-y-4 text-xs">
              <p className="text-muted-foreground">
                Are you sure you want to restore the system state to snapshot <b>{restoreConfirmSnapshot.id}</b> captured at {restoreConfirmSnapshot.timestamp}? Current unsaved edits will be replaced.
              </p>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setRestoreConfirmSnapshot(null)}>Cancel</Button>
                <Button onClick={() => handleConfirmRestore(restoreConfirmSnapshot)}>Confirm Restore</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
