// Internal Chat System — 1-to-1 direct messaging, department channels, announcements, attachments and presence
import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import {
  MessageSquare, Send, Paperclip, Search, Users, Hash, Megaphone,
  Check, CheckCheck, Circle, Smile
} from "lucide-react";
import { useDemo, update, empName, deptName } from "@/store/demo-store";
import { PageHeader, Panel, Avatar, DemoTag, inputCls } from "@/components/common";
import { Button } from "@/components/ui/button";
import type { ChatChannel, ChatMessage, Employee } from "@/types";
import { pageHead } from "@/lib/seo";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/chat")({
  head: pageHead("Internal Chat", "Team channels, direct messages, and company-wide discussions."),
  component: ChatPage,
});

export function ChatPage() {
  const s = useDemo();
  const currentUserId = s.session.employeeId || "UN-1001";
  const [activeChannelId, setActiveChannelId] = useState<string>("general");
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [attachedFile, setAttachedFile] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeChannel = s.chatChannels.find((c) => c.id === activeChannelId) || s.chatChannels[0];
  const channelMessages = s.chatMessages.filter((m) => m.channelId === activeChannelId);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [channelMessages.length, activeChannelId]);

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() && !attachedFile) return;

    const newMsg: ChatMessage = {
      id: `MSG-${Date.now()}`,
      channelId: activeChannelId,
      senderId: currentUserId,
      text: inputText,
      date: `${format(new Date(), "yyyy-MM-dd HH:mm")}`,
      attachmentName: attachedFile || undefined,
      readBy: [currentUserId],
    };

    update((state) => ({
      ...state,
      chatMessages: [...state.chatMessages, newMsg],
      chatChannels: state.chatChannels.map((c) =>
        c.id === activeChannelId ? { ...c, lastMessage: inputText || "Sent an attachment", lastMessageDate: newMsg.date } : c
      ),
    }));

    setInputText("");
    setAttachedFile(null);
  };

  const startDirectChat = (targetEmp: Employee) => {
    const sorted = [currentUserId, targetEmp.id].sort();
    const channelId = `direct_${sorted[0]}_${sorted[1]}`;
    const exists = s.chatChannels.find((c) => c.id === channelId);

    if (!exists) {
      const newChannel: ChatChannel = {
        id: channelId,
        name: targetEmp.name,
        type: "direct",
        members: [currentUserId, targetEmp.id],
        lastMessage: "Conversation started",
        lastMessageDate: format(new Date(), "yyyy-MM-dd HH:mm"),
      };
      update((state) => ({
        ...state,
        chatChannels: [newChannel, ...state.chatChannels],
      }));
    }
    setActiveChannelId(channelId);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Internal Communication & Chat"
        subtitle="Real-time agency channels, department discussions, and direct messages"
        actions={<DemoTag text="Real-time simulation" />}
      />

      <div className="grid h-[680px] grid-cols-12 overflow-hidden rounded-2xl border bg-card shadow-card">
        {/* Left Sidebar: Channels & Users */}
        <div className="col-span-12 flex flex-col border-r bg-muted/20 md:col-span-4 lg:col-span-4">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search channels & colleagues..."
                className={inputCls + " pl-8 text-xs"}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-4">
            {/* Announcement & Department Channels */}
            <div>
              <p className="px-2 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Channels
              </p>
              <div className="space-y-0.5">
                {s.chatChannels
                  .filter((c) => c.type !== "direct")
                  .map((ch) => {
                    const isActive = ch.id === activeChannelId;
                    return (
                      <button
                        key={ch.id}
                        onClick={() => setActiveChannelId(ch.id)}
                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                          isActive
                            ? "bg-primary text-primary-foreground font-semibold shadow-glow"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {ch.type === "announcement" ? <Megaphone className="size-3.5 shrink-0" /> : <Hash className="size-3.5 shrink-0" />}
                          <span className="truncate">{ch.name}</span>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Direct Messages */}
            <div>
              <p className="px-2 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Direct Messages
              </p>
              <div className="space-y-0.5">
                {s.employees
                  .filter((e) => e.id !== currentUserId)
                  .filter((e) => !searchQuery || e.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((e, idx) => {
                    const isOnline = idx % 3 !== 2;
                    return (
                      <button
                        key={e.id}
                        onClick={() => startDirectChat(e)}
                        className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-muted"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <div className="relative">
                            <Avatar name={e.name} size={24} />
                            <Circle
                              className={`absolute -bottom-0.5 -right-0.5 size-2.5 fill-current ${
                                isOnline ? "text-success fill-success" : "text-muted-foreground fill-muted-foreground"
                              }`}
                            />
                          </div>
                          <span className="truncate">{e.name}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{e.role}</span>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Chat Area */}
        <div className="col-span-12 flex flex-col md:col-span-8 lg:col-span-8 bg-background/50">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{activeChannel?.name}</span>
              <span className="text-xs text-muted-foreground">
                ({activeChannel?.members?.length || s.employees.length} participants)
              </span>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {channelMessages.length === 0 ? (
              <div className="grid h-full place-items-center text-xs text-muted-foreground">
                No messages yet. Start the conversation!
              </div>
            ) : (
              channelMessages.map((msg) => {
                const isMe = msg.senderId === currentUserId;
                return (
                  <div key={msg.id} className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : ""}`}>
                    {!isMe && <Avatar name={empName(s, msg.senderId)} size={28} className="mt-1" />}
                    <div className={`max-w-[70%] space-y-1 ${isMe ? "items-end text-right" : ""}`}>
                      {!isMe && (
                        <p className="text-[11px] font-medium text-muted-foreground">
                          {empName(s, msg.senderId)}
                        </p>
                      )}
                      <div
                        className={`rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-sm ${
                          isMe
                            ? "bg-gradient-primary text-primary-foreground rounded-tr-none"
                            : "bg-card border border-border/70 text-foreground rounded-tl-none"
                        }`}
                      >
                        {msg.text}
                        {msg.attachmentName && (
                          <div className="mt-1.5 flex items-center gap-1.5 rounded bg-background/20 p-1.5 text-[11px] font-semibold">
                            <Paperclip className="size-3" /> {msg.attachmentName}
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground px-1">{msg.date}</p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <form onSubmit={handleSendMessage} className="border-t p-3 bg-card/60">
            {attachedFile && (
              <div className="mb-2 flex items-center justify-between rounded bg-accent/40 px-3 py-1 text-xs">
                <span className="flex items-center gap-1.5">
                  <Paperclip className="size-3 text-primary" /> {attachedFile}
                </span>
                <button type="button" onClick={() => setAttachedFile(null)} className="text-destructive font-bold">
                  ×
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <label className="cursor-pointer rounded-lg p-2 hover:bg-muted text-muted-foreground">
                <Paperclip className="size-4" />
                <input
                  type="file"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setAttachedFile(f.name);
                      toast.success(`Attached ${f.name}`);
                    }
                  }}
                />
              </label>
              <input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Message ${activeChannel?.name}...`}
                className={inputCls + " flex-1 text-xs"}
              />
              <Button type="submit" size="sm" className="h-9 px-3 gap-1">
                <Send className="size-3.5" /> Send
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
