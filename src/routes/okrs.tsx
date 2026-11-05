// OKR and Goal Management — Company-wide strategic objectives, key results, and quarterly targets
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Target, Plus, TrendingUp, CheckCircle2, Award, Flag
} from "lucide-react";
import { useDemo, update, empName, deptName } from "@/store/demo-store";
import { PageHeader, Panel, StatCard, StatusBadge, Select, Field, inputCls, Bar, DemoTag } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { OKRGoal } from "@/types";
import { pageHead } from "@/lib/seo";
import { toast } from "sonner";

export const Route = createFileRoute("/okrs")({
  head: pageHead("OKR & Goal Management", "Strategic objectives, quarterly key results, and department milestones."),
  component: OKRsPage,
});

export function OKRsPage() {
  const s = useDemo();
  const [levelFilter, setLevelFilter] = useState("");
  const [isAddingGoal, setIsAddingGoal] = useState(false);

  const [form, setForm] = useState({
    title: "",
    level: "Department" as OKRGoal["level"],
    departmentId: s.departments[0]?.id || "D01",
    quarter: "Q4 2026",
    kr1Title: "",
    kr1Target: 100,
    kr1Unit: "%",
  });

  const filteredGoals = s.okrs.filter((g) => !levelFilter || g.level === levelFilter);

  const handleUpdateProgress = (goalId: string, krId: string, delta: number) => {
    update((state) => ({
      ...state,
      okrs: state.okrs.map((g) => {
        if (g.id !== goalId) return g;
        return {
          ...g,
          keyResults: g.keyResults.map((kr) => {
            if (kr.id !== krId) return kr;
            const nextVal = Math.max(0, Math.min(kr.target, kr.current + delta));
            return { ...kr, current: nextVal };
          }),
        };
      }),
    }), { action: `updated key result progress`, module: "OKRs" });

    toast.success("Progress updated.");
  };

  const handleCreateGoal = () => {
    if (!form.title.trim() || !form.kr1Title.trim()) {
      toast.error("Please fill goal title and key result.");
      return;
    }
    const newGoal: OKRGoal = {
      id: `OKR-${s.okrs.length + 1}`,
      title: form.title,
      level: form.level,
      departmentId: form.level === "Department" ? form.departmentId : undefined,
      ownerId: s.session.employeeId || "UN-1001",
      quarter: form.quarter,
      status: "On Track",
      keyResults: [
        {
          id: `KR-${Date.now()}`,
          title: form.kr1Title,
          target: Number(form.kr1Target) || 100,
          current: 0,
          unit: form.kr1Unit,
        },
      ],
    };

    update((state) => ({
      ...state,
      okrs: [newGoal, ...state.okrs],
    }), { action: `created OKR objective ${newGoal.title}`, module: "OKRs" });

    toast.success(`Objective "${newGoal.title}" created.`);
    setIsAddingGoal(false);
    setForm({ title: "", level: "Department", departmentId: s.departments[0]?.id || "D01", quarter: "Q4 2026", kr1Title: "", kr1Target: 100, kr1Unit: "%" });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Objectives & Key Results (OKRs)"
        subtitle="Align agency strategy, department priorities, quarterly targets, and measurable results"
        actions={
          <Button onClick={() => setIsAddingGoal(true)} className="gap-1.5">
            <Plus className="size-4" /> Add Objective
          </Button>
        }
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Total Objectives"
          value={s.okrs.length}
          hint="Quarterly goals"
          icon={<Target className="size-4" />}
          tone="primary"
        />
        <StatCard
          label="On Track"
          value={s.okrs.filter((g) => g.status === "On Track" || g.status === "Achieved").length}
          hint="Healthy progression"
          icon={<TrendingUp className="size-4" />}
          tone="success"
        />
        <StatCard
          label="Active Quarter"
          value="Q4 2026"
          hint="Oct - Dec"
          icon={<Flag className="size-4" />}
          tone="info"
        />
        <StatCard
          label="Key Results Tracked"
          value={s.okrs.reduce((acc, g) => acc + g.keyResults.length, 0)}
          hint="Measurable metrics"
          icon={<Award className="size-4" />}
          tone="warning"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
          <option value="">All Goal Levels</option>
          <option value="Company">Company Goals</option>
          <option value="Department">Department Goals</option>
          <option value="Individual">Individual Goals</option>
        </Select>
      </div>

      {/* OKR Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {filteredGoals.map((goal) => {
          const totalProgress = Math.round(
            goal.keyResults.reduce((acc, kr) => acc + (kr.current / kr.target) * 100, 0) /
              (goal.keyResults.length || 1)
          );

          return (
            <Panel key={goal.id} title={goal.title} action={<StatusBadge status={goal.status} />}>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center text-muted-foreground pb-2 border-b">
                  <span>
                    Level: <b>{goal.level}</b>
                    {goal.departmentId && ` · ${deptName(s, goal.departmentId)}`}
                  </span>
                  <span>Quarter: <b>{goal.quarter}</b></span>
                </div>

                {/* Overall Progress */}
                <div className="space-y-1">
                  <div className="flex justify-between font-semibold">
                    <span>Overall Goal Progress</span>
                    <span className="text-primary">{totalProgress}%</span>
                  </div>
                  <Bar value={Math.min(100, totalProgress)} />
                </div>

                {/* Key Results List */}
                <div className="space-y-2.5 pt-2">
                  <p className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
                    Measurable Key Results:
                  </p>
                  {goal.keyResults.map((kr) => {
                    const krPct = Math.round((kr.current / kr.target) * 100);
                    return (
                      <div key={kr.id} className="rounded-lg border bg-card/60 p-2.5 space-y-1.5">
                        <div className="flex justify-between items-start">
                          <p className="font-medium text-xs">{kr.title}</p>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs">
                              {kr.current} / {kr.target} {kr.unit}
                            </span>
                            <div className="flex gap-0.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 w-6 p-0 text-xs"
                                onClick={() => handleUpdateProgress(goal.id, kr.id, kr.unit === "%" ? 5 : 1)}
                              >
                                +
                              </Button>
                            </div>
                          </div>
                        </div>
                        <Bar value={Math.min(100, krPct)} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </Panel>
          );
        })}
      </div>

      {/* Create OKR Modal */}
      <Dialog open={isAddingGoal} onOpenChange={setIsAddingGoal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Strategic Objective (OKR)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Objective Title">
              <input
                className={inputCls}
                placeholder="e.g. Scale Client Retention to 98%"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Scope Level">
                <select
                  className={inputCls}
                  value={form.level}
                  onChange={(e) => setForm({ ...form, level: e.target.value as OKRGoal["level"] })}
                >
                  <option value="Company">Company</option>
                  <option value="Department">Department</option>
                  <option value="Individual">Individual</option>
                </select>
              </Field>
              <Field label="Department (if applicable)">
                <select
                  className={inputCls}
                  value={form.departmentId}
                  onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                >
                  {s.departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Primary Key Result Title">
              <input
                className={inputCls}
                placeholder="e.g. Conduct monthly QBR reviews with all 8 clients"
                value={form.kr1Title}
                onChange={(e) => setForm({ ...form, kr1Title: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Target Metric">
                <input
                  type="number"
                  className={inputCls}
                  value={form.kr1Target}
                  onChange={(e) => setForm({ ...form, kr1Target: Number(e.target.value) || 100 })}
                />
              </Field>
              <Field label="Metric Unit">
                <input
                  className={inputCls}
                  placeholder="e.g. %, clients, ₹"
                  value={form.kr1Unit}
                  onChange={(e) => setForm({ ...form, kr1Unit: e.target.value })}
                />
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setIsAddingGoal(false)}>Cancel</Button>
              <Button onClick={handleCreateGoal}>Save Objective</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
