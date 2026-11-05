// Meeting Management — Schedule meetings, record notes, and convert action items into tasks
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Calendar, Clock, Users, Plus, CheckSquare, Video, ArrowRight, CheckCircle2
} from "lucide-react";
import { useDemo, update, empName, notify } from "@/store/demo-store";
import { PageHeader, Panel, StatusBadge, Avatar, Field, inputCls, textareaCls, TableWrap, DemoTag } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Meeting, MeetingActionItem, Task } from "@/types";
import { pageHead } from "@/lib/seo";
import { toast } from "sonner";
import { fmtDate, today } from "@/utils/format";

export const Route = createFileRoute("/meetings")({
  head: pageHead("Meeting Management", "Schedule meetings, record action items, and link to task boards."),
  component: MeetingsPage,
});

export function MeetingsPage() {
  const s = useDemo();
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [isScheduling, setIsScheduling] = useState(false);
  const [newActionTitle, setNewActionTitle] = useState("");
  const [newActionAssignee, setNewActionAssignee] = useState(s.employees[0]?.id || "UN-1001");
  const [newActionDue, setNewActionDue] = useState(today());

  const [form, setForm] = useState({
    title: "",
    date: today(),
    time: "11:00 AM",
    durationMinutes: 45,
    participants: [s.session.employeeId || "UN-1001"],
    agenda: "",
    notes: "",
    meetingLink: "https://meet.google.com/urninja-meeting",
  });

  const handleScheduleMeeting = () => {
    if (!form.title.trim()) {
      toast.error("Please enter meeting title.");
      return;
    }
    const newMeeting: Meeting = {
      id: `MTG-${Date.now()}`,
      title: form.title,
      organizerId: s.session.employeeId || "UN-1001",
      date: form.date,
      time: form.time,
      durationMinutes: Number(form.durationMinutes) || 45,
      participants: form.participants,
      agenda: form.agenda,
      notes: form.notes,
      meetingLink: form.meetingLink,
      status: "Scheduled",
      actionItems: [],
    };

    update((state) => ({
      ...state,
      meetings: [newMeeting, ...state.meetings],
    }), { action: `scheduled meeting "${newMeeting.title}"`, module: "Meetings" });

    notify("New Meeting Scheduled 📅", `${newMeeting.title} on ${fmtDate(newMeeting.date)} at ${newMeeting.time}`, "/meetings");
    toast.success("Meeting scheduled successfully.");
    setIsScheduling(false);
  };

  const handleAddActionItem = () => {
    if (!selectedMeeting || !newActionTitle.trim()) return;
    const newItem: MeetingActionItem = {
      id: `ACT-${Date.now()}`,
      title: newActionTitle,
      assigneeId: newActionAssignee,
      dueDate: newActionDue,
      completed: false,
    };

    update((state) => ({
      ...state,
      meetings: state.meetings.map((m) =>
        m.id === selectedMeeting.id
          ? { ...m, actionItems: [...m.actionItems, newItem] }
          : m
      ),
    }), { action: `added action item to meeting`, module: "Meetings" });

    setSelectedMeeting((prev) => prev ? { ...prev, actionItems: [...prev.actionItems, newItem] } : null);
    setNewActionTitle("");
    toast.success("Action item added.");
  };

  // Convert action item into a real Task!
  const handleConvertActionToTask = (item: MeetingActionItem) => {
    if (item.convertedToTaskId) {
      toast.info("Already converted to task.");
      return;
    }
    const newTaskId = `TK-MTG-${Date.now()}`;
    const newTask: Task = {
      id: newTaskId,
      title: item.title,
      description: `Action item from meeting: ${selectedMeeting?.title}`,
      priority: "High",
      deadline: item.dueDate,
      assignees: [item.assigneeId],
      type: "Team",
      status: "To Do",
      checklist: [{ text: "Initial execution", done: false }, { text: "Review with organizer", done: false }],
      comments: [],
      createdBy: s.session.employeeId,
      createdAt: today(),
      meetingId: selectedMeeting?.id,
    };

    update((state) => ({
      ...state,
      tasks: [newTask, ...state.tasks],
      meetings: state.meetings.map((m) =>
        m.id === selectedMeeting?.id
          ? {
              ...m,
              actionItems: m.actionItems.map((act) =>
                act.id === item.id ? { ...act, convertedToTaskId: newTaskId } : act
              ),
            }
          : m
      ),
    }), { action: `converted action item to Task ${newTaskId}`, module: "Tasks" });

    setSelectedMeeting((prev) =>
      prev
        ? {
            ...prev,
            actionItems: prev.actionItems.map((act) =>
              act.id === item.id ? { ...act, convertedToTaskId: newTaskId } : act
            ),
          }
        : null
    );

    notify("New Task From Meeting 📋", item.title, "/tasks", item.assigneeId);
    toast.success(`Action item converted into official Task (${newTaskId}).`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meeting Management"
        subtitle="Schedule synchronizations, log discussion notes, and convert action items into tracked tasks"
        actions={
          <Button onClick={() => setIsScheduling(true)} className="gap-1.5">
            <Plus className="size-4" /> Schedule Meeting
          </Button>
        }
      />

      {/* Meetings Grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          <Panel title={`Scheduled & Past Meetings (${s.meetings.length})`}>
            <div className="space-y-3">
              {s.meetings.map((mtg) => {
                const isSelected = selectedMeeting?.id === mtg.id;
                return (
                  <div
                    key={mtg.id}
                    onClick={() => setSelectedMeeting(mtg)}
                    className={`rounded-xl border p-4 transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-glow"
                        : "border-border/60 bg-card/60 hover:border-primary/40 hover:bg-accent/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{mtg.title}</p>
                          <StatusBadge status={mtg.status} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Organizer: {empName(s, mtg.organizerId)} · {mtg.durationMinutes} mins
                        </p>
                      </div>
                      <div className="text-right text-xs">
                        <p className="font-semibold text-primary">{fmtDate(mtg.date)}</p>
                        <p className="text-muted-foreground">{mtg.time}</p>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{mtg.agenda}</p>

                    <div className="mt-3 flex items-center justify-between border-t pt-2 text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Users className="size-3.5" />
                        <span>{mtg.participants.length} participants</span>
                      </div>
                      {mtg.actionItems.length > 0 && (
                        <span className="font-medium text-primary">
                          {mtg.actionItems.filter((a) => a.completed).length}/{mtg.actionItems.length} Actions Done
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>

        {/* Right Column: Meeting Detail & Action Items */}
        <div className="space-y-4 lg:col-span-5">
          {selectedMeeting ? (
            <Panel title={selectedMeeting.title}>
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-3">
                  <div>Date: <b>{fmtDate(selectedMeeting.date)}</b></div>
                  <div>Time: <b>{selectedMeeting.time}</b></div>
                  <div>Organizer: <b>{empName(s, selectedMeeting.organizerId)}</b></div>
                  <div>Status: <StatusBadge status={selectedMeeting.status} /></div>
                </div>

                {selectedMeeting.meetingLink && (
                  <a
                    href={selectedMeeting.meetingLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground shadow-glow hover:bg-primary/90"
                  >
                    <Video className="size-3.5" /> Join Video Meeting
                  </a>
                )}

                <div>
                  <p className="font-semibold uppercase tracking-wider text-muted-foreground">Agenda</p>
                  <p className="mt-1 rounded bg-card/60 p-2.5 border">{selectedMeeting.agenda || "No agenda specified."}</p>
                </div>

                {selectedMeeting.notes && (
                  <div>
                    <p className="font-semibold uppercase tracking-wider text-muted-foreground">Meeting Minutes & Notes</p>
                    <p className="mt-1 rounded bg-card/60 p-2.5 border whitespace-pre-wrap">{selectedMeeting.notes}</p>
                  </div>
                )}

                {/* Action Items List */}
                <div className="space-y-2 pt-2 border-t">
                  <p className="font-semibold uppercase tracking-wider text-muted-foreground">
                    Action Items ({selectedMeeting.actionItems.length})
                  </p>
                  {selectedMeeting.actionItems.length === 0 ? (
                    <p className="text-muted-foreground italic">No action items recorded.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedMeeting.actionItems.map((act) => (
                        <div key={act.id} className="flex items-center justify-between rounded-lg border p-2.5 bg-background/50">
                          <div>
                            <p className="font-medium">{act.title}</p>
                            <p className="text-[11px] text-muted-foreground">
                              Assignee: {empName(s, act.assigneeId)} · Due: {fmtDate(act.dueDate)}
                            </p>
                          </div>
                          <div>
                            {act.convertedToTaskId ? (
                              <span className="text-[11px] font-semibold text-success flex items-center gap-1">
                                <CheckCircle2 className="size-3" /> In Tasks
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[11px] gap-1"
                                onClick={() => handleConvertActionToTask(act)}
                              >
                                Convert to Task <ArrowRight className="size-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Action Item Mini-form */}
                  <div className="mt-3 rounded-lg border bg-card/40 p-3 space-y-2">
                    <p className="font-semibold text-foreground">Add New Action Item:</p>
                    <input
                      className={inputCls}
                      placeholder="e.g. Share revised pricing document"
                      value={newActionTitle}
                      onChange={(e) => setNewActionTitle(e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        className={inputCls}
                        value={newActionAssignee}
                        onChange={(e) => setNewActionAssignee(e.target.value)}
                      >
                        {s.employees.map((e) => (
                          <option key={e.id} value={e.id}>{e.name}</option>
                        ))}
                      </select>
                      <input
                        type="date"
                        className={inputCls}
                        value={newActionDue}
                        onChange={(e) => setNewActionDue(e.target.value)}
                      />
                    </div>
                    <Button size="sm" onClick={handleAddActionItem} className="w-full">
                      Add Item
                    </Button>
                  </div>
                </div>
              </div>
            </Panel>
          ) : (
            <Panel>
              <div className="grid h-64 place-items-center text-xs text-muted-foreground">
                Select a meeting to view discussion notes, participants, and action items.
              </div>
            </Panel>
          )}
        </div>
      </div>

      {/* Schedule Meeting Dialog */}
      <Dialog open={isScheduling} onOpenChange={setIsScheduling}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Team Meeting</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Meeting Title">
              <input
                className={inputCls}
                placeholder="e.g. Sales Pipeline Strategy Sync"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Date">
                <input
                  type="date"
                  className={inputCls}
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </Field>
              <Field label="Time">
                <input
                  className={inputCls}
                  placeholder="11:00 AM"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                />
              </Field>
              <Field label="Duration (Mins)">
                <input
                  type="number"
                  className={inputCls}
                  value={form.durationMinutes}
                  onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) || 30 })}
                />
              </Field>
            </div>
            <Field label="Agenda">
              <textarea
                rows={2}
                className={textareaCls}
                placeholder="Key points of discussion..."
                value={form.agenda}
                onChange={(e) => setForm({ ...form, agenda: e.target.value })}
              />
            </Field>
            <Field label="Meeting Link / Location">
              <input
                className={inputCls}
                value={form.meetingLink}
                onChange={(e) => setForm({ ...form, meetingLink: e.target.value })}
              />
            </Field>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setIsScheduling(false)}>Cancel</Button>
              <Button onClick={handleScheduleMeeting}>Schedule</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
