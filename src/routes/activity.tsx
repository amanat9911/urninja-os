// Activity Log — app mein kisne kya kiya, sab yahan record hota hai
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useDemo, empName } from "@/store/demo-store";
import { PageHeader, Panel, Avatar, Select, Empty } from "@/components/common";
import { pageHead } from "@/lib/seo";
import { format, parseISO } from "date-fns";

export const Route = createFileRoute("/activity")({
  head: pageHead("Activity Log", "Audit trail of every action taken across UrNinja OS."),
  component: ActivityLog,
});

function ActivityLog() {
  const s = useDemo();
  const [mod, setMod] = useState("");
  const mods = [...new Set(s.activity.map((a) => a.module))];
  const list = s.activity.filter((a) => !mod || a.module === mod);
  return (
    <div>
      <PageHeader title="Activity Log" actions={<Select value={mod} onChange={(e) => setMod(e.target.value)}><option value="">All modules</option>{mods.map((m) => <option key={m}>{m}</option>)}</Select>} />
      <Panel>
        {list.length === 0 ? <Empty text="Koi activity nahi" /> : <ul className="divide-y">{list.map((a) => <li key={a.id} className="flex items-center gap-3 py-2.5"><Avatar name={empName(s, a.by)} size={30} /><div className="flex-1 text-sm"><b className="font-medium">{empName(s, a.by)}</b> {a.action}</div><span className="rounded-full bg-muted px-2 py-0.5 text-xs">{a.module}</span><span className="w-32 text-right text-xs text-muted-foreground">{format(parseISO(a.date), "dd MMM, HH:mm")}</span></li>)}</ul>}
      </Panel>
    </div>
  );
}
