// Knowledge Base and SOP — Company policies, department SOPs, training materials, and employee guides
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  BookOpen, Search, Plus, FileText, Bookmark, Eye, CheckCircle2, Filter
} from "lucide-react";
import { useDemo, update, empName, deptName } from "@/store/demo-store";
import { PageHeader, Panel, StatusBadge, Select, Field, inputCls, textareaCls, DemoTag } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { KnowledgeArticle } from "@/types";
import { fmtDate, today } from "@/utils/format";
import { pageHead } from "@/lib/seo";
import { toast } from "sonner";

export const Route = createFileRoute("/knowledge-base")({
  head: pageHead("Knowledge Base & SOP", "Company operational documentation, department SOPs, policies, and training materials."),
  component: KnowledgeBasePage,
});

const CATEGORIES: KnowledgeArticle["category"][] = [
  "Policy", "SOP", "Training", "Guide", "Process", "Onboarding"
];

export function KnowledgeBasePage() {
  const s = useDemo();
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(s.knowledgeArticles[0] || null);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [form, setForm] = useState({
    title: "",
    category: "SOP" as KnowledgeArticle["category"],
    departmentId: s.departments[0]?.id || "D01",
    content: "",
  });

  const filteredArticles = s.knowledgeArticles.filter((art) => {
    const matchCat = !categoryFilter || art.category === categoryFilter;
    const matchQuery = !searchQuery || (art.title + art.content).toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchQuery;
  });

  const handleCreateArticle = () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Please fill in article title and content.");
      return;
    }
    const newArticle: KnowledgeArticle = {
      id: `KB-${10 + s.knowledgeArticles.length + 1}`,
      title: form.title,
      category: form.category,
      departmentId: form.departmentId,
      content: form.content,
      authorId: s.session.employeeId || "UN-1001",
      lastUpdated: today(),
      views: 1,
      status: "Published",
    };

    update((state) => ({
      ...state,
      knowledgeArticles: [newArticle, ...state.knowledgeArticles],
    }), { action: `published knowledge article "${newArticle.title}"`, module: "Knowledge Base" });

    toast.success("Knowledge document published.");
    setIsCreating(false);
    setSelectedArticle(newArticle);
    setForm({ title: "", category: "SOP", departmentId: s.departments[0]?.id || "D01", content: "" });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge Base & SOP Library"
        subtitle="Standard operating procedures, governance policies, onboarding handbooks, and operational guides"
        actions={
          <Button onClick={() => setIsCreating(true)} className="gap-1.5">
            <Plus className="size-4" /> Publish New Document
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Search & Article List */}
        <div className="space-y-4 lg:col-span-5">
          <Panel>
            <div className="mb-4 space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search articles, keywords, policies..."
                  className={inputCls + " pl-8 text-xs"}
                />
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  onClick={() => setCategoryFilter("")}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                    !categoryFilter ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent"
                  }`}
                >
                  All ({s.knowledgeArticles.length})
                </button>
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategoryFilter(c)}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                      categoryFilter === c ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
              {filteredArticles.map((art) => {
                const isSelected = selectedArticle?.id === art.id;
                return (
                  <div
                    key={art.id}
                    onClick={() => setSelectedArticle(art)}
                    className={`rounded-xl border p-3.5 transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-glow"
                        : "border-border/60 bg-card/60 hover:border-primary/40 hover:bg-accent/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm leading-snug">{art.title}</p>
                      <StatusBadge status={art.category} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{art.content}</p>
                    <div className="flex items-center justify-between pt-2 mt-2 border-t text-[11px] text-muted-foreground">
                      <span>{art.departmentId ? deptName(s, art.departmentId) : "Company-wide"}</span>
                      <span className="flex items-center gap-1">
                        <Eye className="size-3" /> {art.views} reads
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>

        {/* Right Column: Article Reader */}
        <div className="space-y-4 lg:col-span-7">
          {selectedArticle ? (
            <Panel>
              <div className="space-y-4">
                <div className="pb-4 border-b">
                  <div className="flex items-center justify-between gap-2">
                    <StatusBadge status={selectedArticle.category} />
                    <span className="text-xs text-muted-foreground">Updated {fmtDate(selectedArticle.lastUpdated)}</span>
                  </div>
                  <h2 className="font-display text-xl font-bold mt-2 text-foreground">{selectedArticle.title}</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Author: <b>{empName(s, selectedArticle.authorId)}</b> · Department:{" "}
                    <b>{selectedArticle.departmentId ? deptName(s, selectedArticle.departmentId) : "All Departments"}</b>
                  </p>
                </div>

                {/* Article Body */}
                <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap rounded-xl border bg-card/40 p-4">
                  {selectedArticle.content}
                </div>

                <div className="flex items-center justify-between pt-3 border-t text-xs text-muted-foreground">
                  <span>Document ID: {selectedArticle.id}</span>
                  <span className="flex items-center gap-1 text-success">
                    <CheckCircle2 className="size-3.5" /> Verified Operational SOP
                  </span>
                </div>
              </div>
            </Panel>
          ) : (
            <Panel>
              <div className="grid h-64 place-items-center text-xs text-muted-foreground">
                Select an article to review standard operating procedure details.
              </div>
            </Panel>
          )}
        </div>
      </div>

      {/* Publish Document Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Publish Standard Operating Procedure / Guide</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Document Title">
              <input
                className={inputCls}
                placeholder="e.g. Sales Discovery Call Script & Qualification Rules"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Category">
                <select
                  className={inputCls}
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as KnowledgeArticle["category"] })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Target Department">
                <select
                  className={inputCls}
                  value={form.departmentId}
                  onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                >
                  <option value="">Company-Wide (All)</option>
                  {s.departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Document Content (Guidelines, Checklist & Instructions)">
              <textarea
                rows={8}
                className={textareaCls}
                placeholder="Write structured procedure, step 1, step 2, step 3..."
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
            </Field>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
              <Button onClick={handleCreateArticle}>Publish Document</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
