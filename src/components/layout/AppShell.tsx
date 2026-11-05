// AppShell — Main application layout with categorized navigation, role-based visibility, dark mode, notifications, global search, and presence
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo, type ReactNode } from "react";
import {
  LayoutDashboard, Users, Building2, ShieldCheck, Target, ListChecks, CalendarCheck, Wallet, Briefcase,
  LifeBuoy, Receipt, TrendingUp, FileSearch, History, Settings, Bell, Moon, Sun, Menu, RotateCcw, LogOut, X,
  Sparkles, GitFork, UserCheck, MessageSquare, Calendar, BookOpen, Laptop, Zap, FileCheck, ShieldAlert,
  Repeat, Database, BarChart3, ChevronDown, ExternalLink, Search, Command
} from "lucide-react";
import { useDemo, update, resetDemo, hydrateFromStorage, empName } from "@/store/demo-store";
import { Avatar, DemoTag } from "@/components/common";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";
import { toast } from "sonner";

export interface NavSection {
  title: string;
  items: {
    to: string;
    label: string;
    icon: any;
    roles?: Role[];
    badge?: string;
  }[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard },
      { to: "/ai-assistant", label: "AI Assistant", icon: Sparkles, badge: "AI" },
      { to: "/activity", label: "Activity Log", icon: History },
    ],
  },
  {
    title: "Organization & HR",
    items: [
      { to: "/employees", label: "Employees", icon: Users, roles: ["Super Owner", "Owner", "Super Admin", "Admin", "HR", "Department Head", "Manager"] },
      { to: "/hierarchy", label: "Org Hierarchy", icon: GitFork, roles: ["Super Owner", "Owner", "Super Admin", "Admin", "HR", "Department Head", "Manager", "Team Leader"] },
      { to: "/departments", label: "Departments", icon: Building2 },
      { to: "/recruitment", label: "Recruitment & ATS", icon: Briefcase, roles: ["Super Owner", "Owner", "Super Admin", "Admin", "HR", "Department Head"] },
      { to: "/attendance", label: "Attendance & Leave", icon: CalendarCheck },
      { to: "/payroll", label: "Payroll", icon: Wallet, roles: ["Super Owner", "Owner", "Super Admin", "Admin", "HR"] },
      { to: "/self-service", label: "Employee Portal", icon: UserCheck },
    ],
  },
  {
    title: "Operations & Work",
    items: [
      { to: "/tasks", label: "Tasks & Notices", icon: ListChecks },
      { to: "/chat", label: "Internal Chat", icon: MessageSquare },
      { to: "/meetings", label: "Meetings", icon: Calendar },
      { to: "/knowledge-base", label: "Knowledge & SOP", icon: BookOpen },
      { to: "/okrs", label: "OKRs & Goals", icon: Target },
      { to: "/resources", label: "Resource Planning", icon: BarChart3, roles: ["Super Owner", "Owner", "Super Admin", "Admin", "Department Head", "Manager"] },
      { to: "/assets", label: "Hardware Assets", icon: Laptop, roles: ["Super Owner", "Owner", "Super Admin", "Admin", "HR", "Department Head"] },
    ],
  },
  {
    title: "Sales & Clients",
    items: [
      { to: "/leads", label: "Leads & Pipeline", icon: Target, roles: ["Super Owner", "Owner", "Super Admin", "Admin", "Department Head", "Manager", "Team Leader", "Employee"] },
      { to: "/clients", label: "Clients", icon: Briefcase, roles: ["Super Owner", "Owner", "Super Admin", "Admin", "Department Head", "Manager", "Team Leader", "Employee"] },
      { to: "/portal", label: "Client Portal", icon: ExternalLink, badge: "Portal" },
      { to: "/contracts", label: "Contracts", icon: FileCheck, roles: ["Super Owner", "Owner", "Super Admin", "Admin", "Department Head", "HR"] },
      { to: "/tickets", label: "Support Tickets", icon: LifeBuoy },
    ],
  },
  {
    title: "Finance & Growth",
    items: [
      { to: "/finance", label: "Finance & Profit", icon: Receipt, roles: ["Super Owner", "Owner", "Super Admin", "Admin"] },
      { to: "/subscriptions", label: "Recurring Billing", icon: Repeat, roles: ["Super Owner", "Owner", "Super Admin", "Admin"] },
      { to: "/performance", label: "Performance", icon: TrendingUp },
      { to: "/documents", label: "Audits & Docs", icon: FileSearch },
    ],
  },
  {
    title: "Governance & System",
    items: [
      { to: "/roles", label: "Roles & Permissions", icon: ShieldCheck, roles: ["Super Owner", "Owner", "Super Admin", "Admin"] },
      { to: "/automations", label: "Automations", icon: Zap, roles: ["Super Owner", "Owner", "Super Admin", "Admin"] },
      { to: "/security", label: "Security & Audit", icon: ShieldAlert, roles: ["Super Owner", "Owner", "Super Admin", "Admin"] },
      { to: "/backup", label: "Backup & Restore", icon: Database, roles: ["Super Owner", "Owner", "Super Admin", "Admin"] },
      { to: "/settings", label: "Settings", icon: Settings, roles: ["Super Owner", "Owner", "Super Admin", "Admin", "HR"] },
    ],
  },
];

const ROLES: Role[] = [
  "Super Owner", "Owner", "Super Admin", "Admin", "Department Head", "HR", "Manager", "Team Leader", "Employee", "Client"
];

export function AppShell({ children }: { children: ReactNode }) {
  const s = useDemo();
  const loc = useLocation();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [bell, setBell] = useState(false);
  const [dark, setDark] = useState(false);

  // Global Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");

  useEffect(() => {
    hydrateFromStorage();
    setDark(localStorage.getItem("urninja-theme") === "dark");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("urninja-theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => setOpen(false), [loc.pathname]);

  useEffect(() => {
    if (!s.session.loggedIn) nav({ to: "/login" });
  }, [s.session.loggedIn, nav]);

  // Global Ctrl+K / Cmd+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const unread = s.notifications.filter((n) => !n.read).length;
  const currentRole = s.session.role;

  // Global Search Results Indexer
  const searchResults = useMemo(() => {
    if (!searchQ.trim()) return [];
    const query = searchQ.toLowerCase().trim();

    const emps = s.employees
      .filter((e) => (e.name + e.id + e.designation + e.role).toLowerCase().includes(query))
      .slice(0, 4)
      .map((e) => ({
        type: "Employee",
        title: `${e.name} (${e.id})`,
        subtitle: `${e.designation} · ${e.role}`,
        to: "/employees",
      }));

    const depts = s.departments
      .filter((d) => d.name.toLowerCase().includes(query))
      .slice(0, 3)
      .map((d) => ({
        type: "Department",
        title: d.name,
        subtitle: d.description || "Operational department",
        to: "/departments",
      }));

    const leads = s.leads
      .filter((l) => (l.businessName + l.contactPerson + l.city).toLowerCase().includes(query))
      .slice(0, 4)
      .map((l) => ({
        type: "CRM Lead",
        title: l.businessName,
        subtitle: `${l.contactPerson} · ${l.city} (${l.stage})`,
        to: "/leads",
      }));

    const clients = s.clients
      .filter((c) => (c.name + c.contactPerson + c.city).toLowerCase().includes(query))
      .slice(0, 3)
      .map((c) => ({
        type: "Client",
        title: c.name,
        subtitle: `${c.contactPerson} · ${c.city}`,
        to: "/clients",
      }));

    const tasks = s.tasks
      .filter((t) => t.title.toLowerCase().includes(query))
      .slice(0, 3)
      .map((t) => ({
        type: "Task",
        title: t.title,
        subtitle: `Priority: ${t.priority} · Status: ${t.status}`,
        to: "/tasks",
      }));

    const invoices = s.invoices
      .filter((i) => i.id.toLowerCase().includes(query))
      .slice(0, 3)
      .map((i) => ({
        type: "Invoice",
        title: `Invoice ${i.id}`,
        subtitle: `Status: ${i.status} · Paid: ₹${i.paid.toLocaleString("en-IN")}`,
        to: "/finance",
      }));

    return [...emps, ...depts, ...leads, ...clients, ...tasks, ...invoices];
  }, [searchQ, s]);

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 p-3">
      {/* Brand Header */}
      <div className="mb-3 flex items-center gap-2.5 px-2 pt-1 pb-2 border-b border-sidebar-border">
        <span className="grid size-9 place-items-center rounded-xl bg-gradient-primary font-display text-lg font-bold text-primary-foreground shadow-glow">
          U
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-display text-base font-bold leading-none truncate">UrNinja OS</p>
          <p className="text-[10px] text-muted-foreground truncate mt-0.5">{s.settings.companyName} Operating System</p>
        </div>
      </div>

      {/* Nav Sections */}
      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {NAV_SECTIONS.map((sec) => {
          // Filter items by role visibility (Super Owner sees everything)
          const visibleItems = sec.items.filter((item) => {
            if (currentRole === "Super Owner") return true;
            if (!item.roles) return true;
            return item.roles.includes(currentRole);
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={sec.title} className="space-y-0.5">
              <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                {sec.title}
              </p>
              {visibleItems.map((n) => {
                const active = n.to === "/" ? loc.pathname === "/" : loc.pathname.startsWith(n.to);
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={cn(
                      "flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                      active
                        ? "bg-gradient-primary text-primary-foreground shadow-glow font-semibold"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <n.icon className="size-4 shrink-0" />
                      <span className="truncate">{n.label}</span>
                    </div>
                    {n.badge && (
                      <span className="rounded bg-accent/60 px-1.5 py-0.2 text-[9px] font-bold text-accent-foreground">
                        {n.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Sidebar Footer Controls */}
      <div className="pt-2 border-t border-sidebar-border space-y-1">
        <button
          onClick={() => {
            if (confirm("Reset demo data to default?")) {
              resetDemo();
              toast.success("Demo data reset to seed state.");
            }
          }}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <RotateCcw className="size-3.5" /> Reset Demo State
        </button>
        <button
          onClick={() => update((x) => ({ ...x, session: { ...x.session, loggedIn: false } }))}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <LogOut className="size-3.5" /> Sign Out
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-card/80 backdrop-blur lg:block">
        {sidebar}
      </aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-card shadow-2xl">{sidebar}</aside>
        </div>
      )}
      <div className="lg:pl-64">
        {/* Sticky Top Bar */}
        <header className="sticky top-0 z-20 flex items-center gap-2 border-b bg-background/80 px-4 py-2.5 backdrop-blur sm:px-6">
          <button
            className="rounded-md p-2 hover:bg-muted lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
          
          <div className="hidden sm:flex items-center gap-2">
            <DemoTag text="UrNinja OS v2.0" />
            <span className="text-xs text-muted-foreground font-medium">Enterprise Edition</span>
          </div>

          {/* Global Search Quick Trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden md:flex items-center gap-2 ml-4 rounded-lg border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
          >
            <Search className="size-3.5" />
            <span>Search UrNinja OS...</span>
            <kbd className="rounded border bg-background px-1.5 py-0.5 text-[10px] font-mono">⌘K</kbd>
          </button>

          <div className="ml-auto flex items-center gap-1.5">
            {/* Mobile search button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="rounded-md p-2 hover:bg-muted md:hidden"
              aria-label="Search"
            >
              <Search className="size-4" />
            </button>

            {/* Role Switcher */}
            <div className="flex items-center gap-1 bg-muted/60 rounded-lg p-1">
              <span className="text-[11px] font-semibold text-muted-foreground pl-1 hidden md:inline">Role:</span>
              <select
                aria-label="Switch role"
                value={s.session.role}
                onChange={(e) => {
                  const newRole = e.target.value as Role;
                  update((x) => ({ ...x, session: { ...x.session, role: newRole } }));
                  toast.success(`Switched active view to ${newRole}`);
                }}
                className="h-7 rounded-md border-0 bg-background px-2 text-xs font-semibold focus:ring-1 focus:ring-primary shadow-sm"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Dark mode */}
            <button
              onClick={() => setDark((d) => !d)}
              className="rounded-md p-2 hover:bg-muted"
              aria-label="Toggle theme"
            >
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setBell((b) => !b)}
                className="relative rounded-md p-2 hover:bg-muted"
                aria-label="Notifications"
              >
                <Bell className="size-4" />
                {unread > 0 && (
                  <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                    {unread}
                  </span>
                )}
              </button>
              {bell && (
                <div className="glass absolute right-0 top-11 z-50 w-80 p-3 shadow-xl rounded-2xl">
                  <div className="mb-2 flex items-center justify-between pb-2 border-b">
                    <p className="text-sm font-semibold">Notifications</p>
                    <div className="flex gap-2">
                      <button
                        className="text-xs text-primary font-medium hover:underline"
                        onClick={() =>
                          update((x) => ({
                            ...x,
                            notifications: x.notifications.map((n) => ({ ...n, read: true })),
                          }))
                        }
                      >
                        Mark all read
                      </button>
                      <button onClick={() => setBell(false)} aria-label="Close">
                        <X className="size-4" />
                      </button>
                    </div>
                  </div>
                  <div className="max-h-80 space-y-1 overflow-y-auto">
                    {s.notifications.slice(0, 12).map((n) => (
                      <button
                        key={n.id}
                        onClick={() => {
                          update((x) => ({
                            ...x,
                            notifications: x.notifications.map((m) =>
                              m.id === n.id ? { ...m, read: true } : m
                            ),
                          }));
                          setBell(false);
                          nav({ to: n.link });
                        }}
                        className={cn(
                          "w-full rounded-lg p-2 text-left hover:bg-muted transition-colors",
                          !n.read && "bg-accent/40"
                        )}
                      >
                        <p className="text-xs font-semibold leading-tight">{n.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{n.body}</p>
                        <span className="text-[10px] text-muted-foreground/70">{n.date}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Capsule */}
            <div className="ml-1 flex items-center gap-2 pl-2 border-l">
              <Avatar name={empName(s, s.session.employeeId)} size={30} />
              <div className="hidden text-xs leading-tight md:block">
                <p className="font-semibold text-xs">{empName(s, s.session.employeeId)}</p>
                <p className="text-[10px] text-muted-foreground">{s.session.role}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="mx-auto max-w-7xl p-4 sm:p-6 page-enter">{children}</main>
      </div>

      {/* ========================================================================= */}
      {/* GLOBAL SEARCH DIALOG (CMD+K / CTRL+K) */}
      {/* ========================================================================= */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden">
          <div className="p-3 border-b flex items-center gap-2.5">
            <Search className="size-4 text-muted-foreground" />
            <input
              autoFocus
              className="w-full bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
              placeholder="Search across employees, departments, leads, clients, invoices, tasks..."
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
            />
            <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              ESC
            </kbd>
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {!searchQ.trim() ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                Type anything to search across the entire UrNinja OS database in real-time.
              </div>
            ) : searchResults.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No matching records found for "{searchQ}".
              </div>
            ) : (
              <div className="space-y-1">
                {searchResults.map((res, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSearchOpen(false);
                      setSearchQ("");
                      nav({ to: res.to });
                    }}
                    className="flex w-full items-center justify-between rounded-lg p-2.5 text-left text-xs hover:bg-muted transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-foreground">{res.title}</p>
                      <p className="text-muted-foreground text-[11px]">{res.subtitle}</p>
                    </div>
                    <span className="rounded bg-primary/10 px-2 py-0.5 font-bold text-[10px] text-primary">
                      {res.type}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
