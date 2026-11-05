// AI Business Assistant — Connected to UrNinja data layer for intelligence queries, analytics, and operational answers
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Sparkles, Send, Bot, User, CheckCircle2, TrendingUp, AlertCircle, ArrowRight
} from "lucide-react";
import { useDemo, empName, deptName, clientName } from "@/store/demo-store";
import { PageHeader, Panel, Avatar, DemoTag, inputCls } from "@/components/common";
import { Button } from "@/components/ui/button";
import { inr, fmtDate, today } from "@/utils/format";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/ai-assistant")({
  head: pageHead("AI Business Assistant", "Natural intelligence assistant connected to live UrNinja agency data."),
  component: AIAssistantPage,
});

interface QA {
  id: string;
  question: string;
  answer: string;
  highlights?: { label: string; value: string }[];
  date: string;
}

const PRESET_QUESTIONS = [
  "Which employees have the highest workload?",
  "Which clients have pending payments?",
  "Which leads need follow-up?",
  "Which projects and tasks are overdue?",
  "Which department is performing best?",
  "What approvals are pending right now?",
  "How much revenue was collected this month?",
];

export function AIAssistantPage() {
  const s = useDemo();
  const [inputQuestion, setInputQuestion] = useState("");
  const [history, setHistory] = useState<QA[]>([
    {
      id: "Q1",
      question: "Which employees have the highest workload?",
      answer: "Based on active tasks assigned across the agency:",
      highlights: [
        { label: "Ananya Das (Frontend)", value: "3 Active Tasks" },
        { label: "Rohit Jain (SEO)", value: "3 Active Tasks" },
        { label: "Rahul Gupta (Sales)", value: "2 Active Tasks" },
      ],
      date: "Just now",
    },
  ]);

  const runQuery = (q: string) => {
    const qLower = q.toLowerCase();
    let answer = "";
    let highlights: { label: string; value: string }[] | undefined = undefined;

    if (qLower.includes("workload") || qLower.includes("busy") || qLower.includes("highest")) {
      const counts: Record<string, number> = {};
      s.tasks.forEach((t) => {
        if (t.status !== "Approved") {
          t.assignees.forEach((a) => {
            counts[a] = (counts[a] || 0) + 1;
          });
        }
      });
      const top = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4);
      answer = `Here is the current task allocation across your team. Employees with the heaviest active queues:`;
      highlights = top.map(([id, count]) => ({
        label: `${empName(s, id)} (${s.employees.find((e) => e.id === id)?.designation || "Staff"})`,
        value: `${count} Active Tasks`,
      }));
    } else if (qLower.includes("pending payment") || qLower.includes("payment") || qLower.includes("owing") || qLower.includes("balance")) {
      const unpaid = s.invoices.filter((i) => i.status !== "Paid");
      const totalDue = unpaid.reduce((acc, i) => acc + (i.items.reduce((s, it) => s + it.amount, 0) - i.paid), 0);
      answer = `You have ${unpaid.length} invoices with outstanding amounts totaling ${inr(totalDue)}. Top pending clients:`;
      highlights = unpaid.slice(0, 4).map((i) => {
        const total = i.items.reduce((s, it) => s + it.amount, 0);
        return {
          label: `${clientName(s, i.clientId)} (${i.id})`,
          value: inr(total - i.paid),
        };
      });
    } else if (qLower.includes("lead") || qLower.includes("follow")) {
      const followups = s.leads.filter((l) => ["Interested", "Follow-up", "Meeting"].includes(l.stage));
      answer = `There are ${followups.length} priority leads requiring immediate sales engagement:`;
      highlights = followups.slice(0, 4).map((l) => ({
        label: `${l.businessName} · ${l.stage}`,
        value: `Value: ${inr(l.dealValue)} (Owner: ${empName(s, l.assignedTo)})`,
      }));
    } else if (qLower.includes("overdue") || qLower.includes("late") || qLower.includes("deadline")) {
      const overdueTasks = s.tasks.filter((t) => t.deadline < today() && t.status !== "Approved");
      answer = `Found ${overdueTasks.length} tasks past deadline without approval:`;
      highlights = overdueTasks.slice(0, 4).map((t) => ({
        label: `${t.title} (${empName(s, t.assignees[0])})`,
        value: `Due ${fmtDate(t.deadline)}`,
      }));
    } else if (qLower.includes("department") || qLower.includes("best") || qLower.includes("performing")) {
      answer = `Department performance is evaluated across sales deal value, task completion rates, and attendance:`;
      highlights = [
        { label: "Sales (D01)", value: "Leading Revenue: ₹18.5L pipeline closed" },
        { label: "Web Development (D05)", value: "95% Task Approval Rate" },
        { label: "SEO & Content (D03)", value: "Zero SLA escalations this month" },
      ];
    } else if (qLower.includes("approval") || qLower.includes("pending approval")) {
      const pendingLeaves = s.leaves.filter((l) => l.status === "Pending").length;
      const submittedTasks = s.tasks.filter((t) => t.status === "Submitted").length;
      answer = `Here are the operational approvals awaiting decision:`;
      highlights = [
        { label: "Leave Requests", value: `${pendingLeaves} Pending Decisions` },
        { label: "Tasks Awaiting Review", value: `${submittedTasks} Submitted for Approval` },
        { label: "Draft Payroll Run", value: `${s.payrollRuns.find((r) => r.status === "Draft")?.month || "Current"} Draft Status` },
      ];
    } else if (qLower.includes("revenue") || qLower.includes("collected") || qLower.includes("money")) {
      const paid = s.invoices.reduce((acc, i) => acc + i.paid, 0);
      const billed = s.invoices.reduce((acc, i) => acc + i.items.reduce((s, it) => s + it.amount, 0), 0);
      answer = `Financial collection summary from live invoices:`;
      highlights = [
        { label: "Total Revenue Collected", value: inr(paid) },
        { label: "Total Invoiced Gross", value: inr(billed) },
        { label: "Collection Efficiency", value: `${Math.round((paid / billed) * 100)}%` },
      ];
    } else {
      answer = `I analyzed your query across UrNinja OS records (${s.employees.length} employees, ${s.clients.length} clients, ${s.leads.length} leads). System health is optimal, with ₹${Math.round(s.invoices.reduce((a, i) => a + i.paid, 0) / 1000)}k collected and ${s.tasks.filter((t) => t.status === "Approved").length} approved deliverables.`;
    }

    const newQA: QA = {
      id: `QA-${Date.now()}`,
      question: q,
      answer,
      highlights,
      date: "Just now",
    };

    setHistory((prev) => [newQA, ...prev]);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuestion.trim()) return;
    runQuery(inputQuestion);
    setInputQuestion("");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Business Assistant"
        subtitle="Conversational operational intelligence directly connected to UrNinja's centralized state"
        actions={<DemoTag text="In-Memory Analytics Connected" />}
      />

      {/* Preset Question Pills */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Quick Intelligence Queries:
        </p>
        <div className="flex flex-wrap gap-2">
          {PRESET_QUESTIONS.map((pq, i) => (
            <button
              key={i}
              onClick={() => runQuery(pq)}
              className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-primary hover:text-primary-foreground shadow-sm"
            >
              {pq}
            </button>
          ))}
        </div>
      </div>

      {/* Query Input Bar */}
      <form onSubmit={handleFormSubmit} className="flex gap-2">
        <input
          value={inputQuestion}
          onChange={(e) => setInputQuestion(e.target.value)}
          placeholder="Ask anything about employees, clients, overdue tasks, pending payments, or revenue..."
          className={inputCls + " flex-1 text-sm h-11"}
        />
        <Button type="submit" className="h-11 px-5 gap-2 shadow-glow">
          <Sparkles className="size-4" /> Ask Assistant
        </Button>
      </form>

      {/* Q&A Stream */}
      <div className="space-y-4">
        {history.map((qa) => (
          <Panel key={qa.id}>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="grid size-8 place-items-center rounded-xl bg-accent text-accent-foreground shrink-0 mt-0.5">
                  <User className="size-4" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{qa.question}</p>
                  <p className="text-[11px] text-muted-foreground">{qa.date}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 pl-2 pt-2 border-t">
                <div className="grid size-8 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shrink-0 shadow-glow mt-0.5">
                  <Bot className="size-4" />
                </div>
                <div className="space-y-2 flex-1">
                  <p className="text-sm leading-relaxed text-foreground">{qa.answer}</p>
                  {qa.highlights && (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 pt-1">
                      {qa.highlights.map((h, idx) => (
                        <div key={idx} className="rounded-lg border bg-card/60 p-3 text-xs">
                          <p className="text-muted-foreground">{h.label}</p>
                          <p className="font-display font-semibold text-sm text-primary mt-0.5">{h.value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
