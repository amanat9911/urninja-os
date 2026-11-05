// @ts-nocheck — demo seed generator
// UrNinja OS Centralized Mock & Seed Data

import { format, subDays, addDays } from "date-fns";
import type {
  Activity, Announcement, AppNotification, Applicant, Asset, AttendanceRecord, Audit,
  AutomationLog, AutomationRule, ChatChannel, ChatMessage, Client, ClientSubscription,
  Contract, DailyWorkReport, Department, DocumentItem, Employee, Expense, Invoice,
  JobOpening, KnowledgeArticle, Lead, LeadStage, LeaveRequest, Meeting, MonthlyAdjustment,
  OKRGoal, PayrollRun, SalaryStructure, SecurityAuditLog, Settings, Task, Ticket,
  UploadBatch, UserSession,
} from "@/types";
import { LEAD_STAGES, PERMISSIONS } from "@/types";

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}
const rnd = seeded(42);
const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)];
const d = (offset: number) => format(subDays(new Date(), offset), "yyyy-MM-dd");
const fwd = (offset: number) => format(addDays(new Date(), offset), "yyyy-MM-dd");
const today = () => d(0);

export const departments: Department[] = [
  { id: "D01", name: "Sales", color: "1", description: "Lead calling, meetings aur deal closing" },
  { id: "D02", name: "Digital Marketing", color: "2", description: "Paid ads aur campaigns" },
  { id: "D03", name: "SEO", parentId: "D02", color: "3", description: "Search ranking aur GBP" },
  { id: "D04", name: "Social Media", parentId: "D02", color: "4", description: "Content calendar aur posting" },
  { id: "D05", name: "Web Development", color: "5", description: "Websites aur landing pages" },
  { id: "D06", name: "App Development", parentId: "D05", color: "1", description: "Mobile apps" },
  { id: "D07", name: "Graphic Design", color: "2", description: "Creatives aur branding" },
  { id: "D08", name: "IT Support", color: "3", description: "Client tickets aur hosting" },
  { id: "D09", name: "Client Success", color: "4", description: "Onboarding aur retention" },
  { id: "D10", name: "HR", color: "5", description: "Hiring, attendance, leave" },
  { id: "D11", name: "Accounts", color: "1", description: "Invoices, payroll, expenses" },
  { id: "D12", name: "Operations", color: "2", description: "Company operations" },
];

const people: [string, Employee["role"], string, string, string?][] = [
  ["Amanat Khan", "Owner", "D12", "Founder & CEO"],
  ["Riya Sharma", "Super Admin", "D12", "Operations Head", "UN-1001"],
  ["Siddharth Joshi", "Admin", "D12", "System Administrator", "UN-1002"],
  ["Arjun Mehta", "Department Head", "D01", "Head of Sales", "UN-1001"],
  ["Neha Verma", "HR", "D10", "HR Manager", "UN-1002"],
  ["Karan Singh", "Manager", "D01", "Sales Manager", "UN-1004"],
  ["Pooja Iyer", "Team Leader", "D01", "Sales Team Lead", "UN-1006"],
  ["Rahul Gupta", "Employee", "D01", "Sales Executive", "UN-1007"],
  ["Sneha Patil", "Employee", "D01", "Sales Executive", "UN-1007"],
  ["Vikram Rao", "Department Head", "D05", "Head of Tech", "UN-1001"],
  ["Ananya Das", "Employee", "D05", "Frontend Developer", "UN-1010"],
  ["Imran Shaikh", "Employee", "D06", "App Developer", "UN-1010"],
  ["Meera Nair", "Manager", "D02", "Marketing Manager", "UN-1001"],
  ["Rohit Jain", "Employee", "D03", "SEO Specialist", "UN-1013"],
  ["Tanya Kapoor", "Employee", "D04", "Social Media Executive", "UN-1013"],
  ["Sahil Bhat", "Employee", "D07", "Graphic Designer", "UN-1013"],
  ["Farhan Ali", "Team Leader", "D08", "IT Support Lead", "UN-1010"],
  ["Divya Menon", "Employee", "D09", "Client Success Exec", "UN-1002"],
  ["Gaurav Joshi", "Employee", "D11", "Accountant", "UN-1002"],
];

export const employees: Employee[] = people.map(([name, role, dep, des, mgr], i) => {
  const id = `UN-${1001 + i}`;
  const first = name.split(" ")[0].toLowerCase();
  const userId = `${first}.${1001 + i}`;
  return {
    id,
    userId,
    name,
    email: `${first}@urninja.in`,
    phone: `+91 98${(10000000 + i * 734521).toString().slice(0, 8)}`,
    role,
    departmentId: dep,
    designation: des,
    managerId: mgr,
    parentUserId: mgr ? `user_${mgr}` : undefined,
    joiningDate: d(200 + i * 61),
    status: i === 14 ? "On Leave" : "Active",
    avatarSeed: i,
    dob: `199${i % 10}-0${(i % 9) + 1}-1${i % 9}`,
    address: `${pick(["Andheri", "Baner", "Indiranagar", "Salt Lake", "Gachibowli"])}, ${pick(["Mumbai", "Pune", "Bengaluru", "Kolkata", "Hyderabad"])}`,
    emergencyContact: `+91 97${(20000000 + i * 112233).toString().slice(0, 8)}`,
    qualification: pick(["B.Tech", "BBA", "MBA", "B.Com", "BCA", "B.Des"]),
    experienceYears: 1 + (i % 8),
    history: [{ date: d(200 + i * 61), note: `Joined as ${des}` }],
    password: "password123",
    isLocked: false,
    failedLoginAttempts: 0,
    lastPasswordChange: d(20 + i),
    temporaryPassword: false,
    directSubordinates: [],
  };
});

// Calculate directSubordinates
employees.forEach((emp) => {
  emp.directSubordinates = employees.filter((e) => e.managerId === emp.id).map((e) => e.id);
});

// Set department heads
departments.forEach((dep) => {
  const head = employees.find((e) => e.departmentId === dep.id && ["Department Head", "Manager", "HR", "Team Leader", "Super Admin", "Owner"].includes(e.role));
  if (head) dep.headId = head.id;
});

const salesTeam = ["UN-1006", "UN-1007", "UN-1008", "UN-1009"];
const cities: [string, string][] = [["Mumbai", "Bandra"], ["Pune", "Kothrud"], ["Bengaluru", "HSR"], ["Delhi", "Saket"], ["Jaipur", "C-Scheme"], ["Indore", "Vijay Nagar"]];
const categories = ["Restaurant", "Clinic", "Salon", "Gym", "Real Estate", "Coaching", "Boutique", "Cafe"];
const bizWords = ["Spice", "Urban", "Royal", "Green", "Bright", "Golden", "Prime", "Lotus", "Metro", "Crystal"];

export const uploads: UploadBatch[] = [
  { id: "UP-01", fileName: "mumbai_restaurants.xlsx", uploaderId: "UN-1004", date: d(12), source: "Google Maps", category: "Restaurant", count: 14, status: "Imported" },
  { id: "UP-02", fileName: "pune_clinics.csv", uploaderId: "UN-1006", date: d(5), source: "JustDial", category: "Clinic", count: 12, status: "Partial" },
  { id: "UP-03", fileName: "referrals_oct.csv", uploaderId: "UN-1002", date: d(1), source: "Referral", category: "Mixed", count: 10, status: "Imported" },
];

export const leads: Lead[] = Array.from({ length: 36 }).map((_, i) => {
  const [city, area] = pick(cities);
  const cat = pick(categories);
  const biz = `${pick(bizWords)} ${cat}`;
  const stage: LeadStage = LEAD_STAGES[Math.floor(rnd() * LEAD_STAGES.length)];
  const value = stage === "New Lead" ? 0 : Math.round((15 + rnd() * 120) * 1000);
  const assigned = pick(salesTeam);
  const callsCount = stage === "New Lead" ? 0 : 1 + Math.floor(rnd() * 3);
  return {
    id: `LD-${2001 + i}`,
    businessName: `${biz} ${i + 1}`,
    contactPerson: pick(["Amit", "Suresh", "Priya", "Kavita", "Manoj", "Zoya", "Harsh", "Nisha"]) + " " + pick(["Shah", "Reddy", "Kumar", "Desai", "Bose"]),
    phone: `+91 9${(800000000 + i * 1234567).toString().slice(0, 9)}`,
    whatsapp: `+91 9${(800000000 + i * 1234567).toString().slice(0, 9)}`,
    email: `contact${i}@${biz.toLowerCase().replace(/\s/g, "")}.in`,
    city, area, category: cat,
    website: rnd() > 0.5 ? `www.${biz.toLowerCase().replace(/\s/g, "")}.in` : "",
    instagram: `@${biz.toLowerCase().replace(/\s/g, "_")}`,
    gbp: rnd() > 0.4 ? "Listed" : "Not claimed",
    source: pick(["Google Maps", "JustDial", "Referral", "Instagram", "Website"]),
    priority: pick(["Low", "Medium", "High"] as const),
    remarks: "",
    stage,
    assignedTo: assigned,
    sharedWith: [],
    dealValue: value,
    received: stage === "Deal Won" ? Math.round(value * (0.3 + rnd() * 0.7)) : 0,
    followUp: ["Follow-up", "Meeting", "Interested"].includes(stage) ? fwd(Math.floor(rnd() * 6)) : undefined,
    createdAt: d(Math.floor(rnd() * 25)),
    uploadId: pick(uploads).id,
    calls: Array.from({ length: callsCount }).map((__, c) => ({
      id: `CL-${i}-${c}`,
      date: d(Math.floor(rnd() * 10)),
      employeeId: assigned,
      outcome: pick(["Connected", "No Answer", "Busy", "Callback"] as const),
      remark: pick(["Interested in SEO", "Asked for pricing", "Call back next week", "Wants website revamp", "Busy, try later"]),
    })),
  };
});

export const clients: Client[] = [
  ["Spice Route Restaurant", "Amit Shah", "Mumbai"],
  ["Smile Dental Clinic", "Dr. Priya Reddy", "Pune"],
  ["FitZone Gym", "Harsh Desai", "Bengaluru"],
  ["Lotus Realty", "Manoj Kumar", "Delhi"],
  ["Crystal Salon", "Zoya Bose", "Jaipur"],
  ["BrightMinds Coaching", "Kavita Shah", "Indore"],
  ["Urban Brew Cafe", "Nisha Reddy", "Mumbai"],
  ["Royal Boutique", "Suresh Kumar", "Pune"],
].map(([name, cp, city], i) => {
  const id = `CL-${301 + i}`;
  const services = [
    { id: `${id}-S1`, name: pick(["SEO", "Social Media Management", "Google Business Profile"]), price: 15000 + i * 2500, billing: "Monthly" as const, discount: i % 3 === 0 ? 10 : 0, notes: "" },
    { id: `${id}-S2`, name: pick(["Website Development", "Paid Ads", "Graphic Design", "App Development"]), price: 40000 + i * 8000, billing: "One-time" as const, discount: 0, notes: "" },
  ];
  return {
    id, name, contactPerson: cp, city,
    phone: `+91 99${(30000000 + i * 551234).toString().slice(0, 8)}`,
    email: `hello@${name.toLowerCase().replace(/[^a-z]/g, "")}.in`,
    onboardedOn: d(30 + i * 20),
    accountManagerId: pick(["UN-1018", "UN-1013", "UN-1002"]),
    services,
    portalPassword: "clientpass123",
    deliverables: [
      { id: `${id}-DL1`, title: "Social media posts", serviceId: services[0].id, target: 30, done: Math.floor(rnd() * 30), status: pick(["In Progress", "Submitted", "Planned"] as const), assigneeId: "UN-1015", due: fwd(10 + i), submissionUrl: "https://drive.google.com/sample-creatives" },
      { id: `${id}-DL2`, title: "Blog articles", serviceId: services[0].id, target: 4, done: Math.floor(rnd() * 4), status: pick(["In Progress", "Approved", "Overdue"] as const), assigneeId: "UN-1014", due: fwd(i - 2), submissionUrl: "https://docs.google.com/sample-draft" },
      { id: `${id}-DL3`, title: services[1].name + " milestone", serviceId: services[1].id, target: 1, done: i % 2, status: i % 2 ? "Published" : "In Progress", assigneeId: "UN-1011", due: fwd(15), submissionUrl: "https://staging.clientdemo.in" },
    ],
    timeline: [{ date: d(30 + i * 20), text: "Client onboarded" }],
  };
});

export const tasks: Task[] = [
  ["Call 40 new restaurant leads", "UN-1008", "Daily", "High"],
  ["Prepare SEO audit for Smile Dental", "UN-1014", "Project", "Medium", "CL-302"],
  ["Design Diwali creatives (10)", "UN-1016", "Project", "High", "CL-301"],
  ["Fix contact form bug on FitZone site", "UN-1011", "Project", "Urgent", "CL-303"],
  ["Schedule 30 posts for Urban Brew", "UN-1015", "Recurring", "Medium", "CL-307"],
  ["Weekly sales report", "UN-1006", "Recurring", "Medium"],
  ["Onboarding call — Royal Boutique", "UN-1018", "Team", "High", "CL-308"],
  ["Payroll reconciliation", "UN-1019", "Personal", "High"],
  ["App store listing for Lotus Realty", "UN-1012", "Project", "Medium", "CL-304"],
  ["GBP optimization — Crystal Salon", "UN-1014", "Project", "Low", "CL-305"],
  ["Follow up pending invoices", "UN-1019", "Cross-department", "High"],
  ["Interview 3 sales candidates", "UN-1005", "Team", "Medium"],
  ["Server migration for BrightMinds", "UN-1017", "Project", "Urgent", "CL-306"],
  ["Call 30 clinic leads", "UN-1009", "Daily", "High"],
].map(([title, a, type, pr, client], i) => ({
  id: `TK-${501 + i}`,
  title: title as string,
  description: `${title} — details aur expectations demo ke liye.`,
  priority: pr as Task["priority"],
  deadline: i % 4 === 0 ? d(1) : fwd(i % 6),
  assignees: [a as string],
  type: type as Task["type"],
  status: (["To Do", "In Progress", "Submitted", "Approved", "In Progress", "To Do"] as const)[i % 6],
  checklist: [{ text: "Initial Setup", done: true }, { text: "Review & Quality Check", done: i % 2 === 0 }, { text: "Final Delivery", done: false }],
  comments: [{ by: "UN-1001", text: "Please ensure this is submitted before end of day.", date: d(1) }],
  clientId: client as string | undefined,
  createdBy: "UN-1001",
  createdAt: d(i % 7),
  completedAt: i % 6 === 3 ? d(i % 3) : undefined,
}));

export const announcements: Announcement[] = [
  { id: "AN-1", title: "Diwali holiday schedule", body: "Office 1-3 Nov band rahega. Client-critical teams on-call rahengi.", audience: "All", date: d(1), by: "UN-1001", acknowledgedBy: ["UN-1002", "UN-1005"] },
  { id: "AN-2", title: "Sales target: ₹25L this month", body: "Har executive ko daily 40 calls aur 2 meetings ka target.", audience: "D01", date: d(3), by: "UN-1004", acknowledgedBy: ["UN-1008"] },
];

export const dailyWorkReports: DailyWorkReport[] = [
  {
    id: "DWR-01",
    employeeId: "UN-1008",
    date: d(0),
    hoursWorked: 8.5,
    tasksCompleted: "Called 42 restaurant leads from Mumbai batch; scheduled 3 discovery meetings.",
    plansForTomorrow: "Follow up with interested leads from today; prepare commercial proposal for Spice Route.",
    blockersOrChallenges: "Need latest pricing deck for paid marketing packages.",
    submittedAt: `${d(0)} 18:30`,
    managerFeedback: "Great job on the meetings booked! Will share updated deck tomorrow morning.",
  },
  {
    id: "DWR-02",
    employeeId: "UN-1011",
    date: d(0),
    hoursWorked: 8.0,
    tasksCompleted: "Fixed contact form validation and email delivery endpoint for FitZone website.",
    plansForTomorrow: "Implement responsive checkout revamp for Lotus Realty client.",
    blockersOrChallenges: "None currently.",
    submittedAt: `${d(0)} 19:15`,
  },
  {
    id: "DWR-03",
    employeeId: "UN-1014",
    date: d(1),
    hoursWorked: 7.5,
    tasksCompleted: "Completed on-page SEO optimization for Smile Dental Clinic and published 2 blog posts.",
    plansForTomorrow: "Audit backlinks and fix broken URL redirects.",
    blockersOrChallenges: "Waiting for client's Google Search Console access.",
    submittedAt: `${d(1)} 18:00`,
  },
];

export const attendance: AttendanceRecord[] = employees.flatMap((e, ei) =>
  Array.from({ length: 30 }).map((_, k) => {
    const date = subDays(new Date(), k);
    const ds = format(date, "yyyy-MM-dd");
    if (date.getDay() === 0) return { employeeId: e.id, date: ds, status: "Weekly Off" as const };
    const r = rnd();
    if (k === 0 && ei % 5 === 0) return { employeeId: e.id, date: ds, status: "Present" as const, checkIn: undefined };
    if (r < 0.05) return { employeeId: e.id, date: ds, status: "Absent" as const };
    if (r < 0.09) return { employeeId: e.id, date: ds, status: "Leave" as const };
    const late = r > 0.85;
    return {
      employeeId: e.id, date: ds, status: late ? ("Late" as const) : ("Present" as const),
      checkIn: late ? `10:${String(10 + Math.floor(rnd() * 40)).padStart(2, "0")}` : `09:${String(40 + Math.floor(rnd() * 19)).padStart(2, "0")}`,
      checkOut: k === 0 ? undefined : `18:${String(Math.floor(rnd() * 59)).padStart(2, "0")}`,
    };
  }),
);

export const leaves: LeaveRequest[] = [
  { id: "LV-1", employeeId: "UN-1008", type: "Casual", from: fwd(3), to: fwd(4), days: 2, reason: "Family function", status: "Pending", currentLevel: 0, trail: [], appliedOn: d(1) },
  { id: "LV-2", employeeId: "UN-1015", type: "Sick", from: d(2), to: fwd(1), days: 4, reason: "Viral fever", status: "Approved", currentLevel: 4, trail: [{ level: "Team Leader", by: "UN-1013", action: "Approved", date: d(3) }, { level: "Manager", by: "UN-1013", action: "Approved", date: d(3) }, { level: "HR", by: "UN-1005", action: "Approved", date: d(2) }, { level: "Owner", by: "UN-1001", action: "Approved", date: d(2) }], appliedOn: d(3) },
  { id: "LV-3", employeeId: "UN-1011", type: "Earned", from: fwd(10), to: fwd(14), days: 5, reason: "Vacation", status: "Pending", currentLevel: 2, trail: [{ level: "Team Leader", by: "UN-1010", action: "Approved", date: d(1) }, { level: "Manager", by: "UN-1010", action: "Approved", date: d(1) }], appliedOn: d(2) },
  { id: "LV-4", employeeId: "UN-1009", type: "Unpaid", from: d(8), to: d(8), days: 1, reason: "Personal work", status: "Rejected", currentLevel: 0, trail: [{ level: "Team Leader", by: "UN-1007", action: "Rejected", date: d(9), note: "Month end rush" }], appliedOn: d(10) },
];

export const salaries: SalaryStructure[] = employees.map((e, i) => {
  const basic = [150000, 95000, 75000, 70000, 52000, 55000, 42000, 26000, 25000, 85000, 36000, 38000, 62000, 31000, 27000, 29000, 44000, 28000, 33000][i] || 30000;
  return { employeeId: e.id, basic, hra: Math.round(basic * 0.4), allowances: Math.round(basic * 0.15), pfPercent: 12, esi: basic < 21000 ? 300 : 0, professionalTax: 200, tdsPercent: basic > 60000 ? 10 : basic > 40000 ? 5 : 0, custom: [] };
});

export const currentMonth = format(new Date(), "yyyy-MM");
export const adjustments: MonthlyAdjustment[] = [
  { employeeId: "UN-1008", month: currentMonth, incentive: 6000, bonus: 0, reimbursement: 1200, advance: 0, loan: 0 },
  { employeeId: "UN-1009", month: currentMonth, incentive: 4500, bonus: 0, reimbursement: 0, advance: 3000, loan: 0 },
];
export const payrollRuns: PayrollRun[] = [
  { month: format(subDays(new Date(), 35), "yyyy-MM"), status: "Paid", audit: [{ by: "UN-1019", action: "Payroll generated", date: d(40) }, { by: "UN-1001", action: "Approved & paid", date: d(38) }] },
  { month: currentMonth, status: "Draft", audit: [] },
];

export const tickets: Ticket[] = [
  ["CL-303", "Bug", "Contact form not sending emails", "High", "Development", "Website Development", "In Progress", "UN-1011"],
  ["CL-301", "Content", "Change menu prices on website", "Low", "Development", "Website Development", "New"],
  ["CL-306", "Hosting", "Website down intermittently", "Critical", "IT Support", "Website Development", "Escalated", "UN-1017"],
  ["CL-302", "SEO", "Ranking dropped for 'dentist pune'", "Medium", "SEO", "SEO", "Waiting for Client", "UN-1014"],
  ["CL-307", "Billing", "GST missing on invoice", "Medium", "Billing", "Social Media Management", "Resolved", "UN-1019"],
  ["CL-305", "Social", "Wrong logo on Instagram post", "Low", "Social Media", "Social Media Management", "Closed", "UN-1015"],
].map(([c, cat, title, pr, team, svc, st, a], i) => ({
  id: `TKT-${7001 + i}`, clientId: c as string, category: cat as string, title: title as string,
  description: `${title}. Client ne demo ke liye report kiya.`, priority: pr as Ticket["priority"], team: team as string, service: svc as string,
  status: st as Ticket["status"], assigneeId: a as string | undefined, createdAt: d(i), slaHours: pr === "Critical" ? 4 : pr === "High" ? 24 : 72,
  notes: [{ by: "UN-1018", text: "Client se baat ho gayi, details le li.", internal: true, date: d(i) }],
}));

export const invoices: Invoice[] = clients.flatMap((c, i) => [
  { id: `INV-${9001 + i * 2}`, clientId: c.id, date: d(40), due: d(25), items: c.services.map((s) => ({ label: s.name, amount: s.price })), paid: c.services.reduce((a, s) => a + s.price, 0), status: "Paid" as const },
  { id: `INV-${9002 + i * 2}`, clientId: c.id, date: d(8), due: fwd(7 - i * 2), items: [{ label: c.services[0].name, amount: c.services[0].price }], paid: i % 3 === 0 ? Math.round(c.services[0].price / 2) : 0, status: (i % 3 === 0 ? "Partially Paid" : 7 - i * 2 < 0 ? "Overdue" : "Sent") as Invoice["status"] },
]);

export const expenses: Expense[] = [
  ["Office rent", 85000, "Operations", "D12", 5], ["Meta Ads (internal)", 22000, "Marketing", "D02", 3], ["Software licenses", 18000, "Tools", "D05", 9],
  ["Team lunch", 6500, "Welfare", "D10", 2], ["Travel — client visit", 4200, "Travel", "D01", 1], ["Internet & phone", 7800, "Utilities", "D12", 12],
].map(([note, amount, category, dep, off], i) => ({ id: `EX-${i + 1}`, note: note as string, amount: amount as number, category: category as string, departmentId: dep as string, date: d(off as number) }));

export const subscriptions: ClientSubscription[] = [
  {
    id: "SUB-101",
    clientId: "CL-301",
    planName: "Growth Retainer (SEO + Social Media)",
    amount: 25000,
    frequency: "Monthly",
    startDate: d(90),
    nextBillingDate: fwd(5),
    status: "Active",
    autoGenerateInvoice: true,
    history: [
      { date: d(60), invoiceId: "INV-9001", amount: 25000, status: "Paid" },
      { date: d(30), invoiceId: "INV-9002", amount: 25000, status: "Paid" },
    ],
  },
  {
    id: "SUB-102",
    clientId: "CL-302",
    planName: "Healthcare Local Dominance",
    amount: 18500,
    frequency: "Monthly",
    startDate: d(120),
    nextBillingDate: fwd(12),
    status: "Active",
    autoGenerateInvoice: true,
    history: [
      { date: d(30), invoiceId: "INV-9003", amount: 18500, status: "Paid" },
    ],
  },
  {
    id: "SUB-103",
    clientId: "CL-303",
    planName: "Performance Ads Management",
    amount: 35000,
    frequency: "Monthly",
    startDate: d(45),
    nextBillingDate: fwd(2),
    status: "Past Due",
    autoGenerateInvoice: true,
    history: [
      { date: d(15), invoiceId: "INV-9005", amount: 35000, status: "Overdue" },
    ],
  },
];

export const chatChannels: ChatChannel[] = [
  { id: "general", name: "📣 Announcements", type: "announcement", members: employees.map((e) => e.id), lastMessage: "Diwali holiday schedule updated.", lastMessageDate: d(1) },
  { id: "dept_D01", name: "💼 Sales Team", type: "department", departmentId: "D01", members: ["UN-1004", "UN-1006", "UN-1007", "UN-1008", "UN-1009"], lastMessage: "Spice Route meeting went great!", lastMessageDate: d(0) },
  { id: "dept_D05", name: "💻 Web & Tech", type: "department", departmentId: "D05", members: ["UN-1010", "UN-1011", "UN-1012", "UN-1017"], lastMessage: "PR ready for review on FitZone repo.", lastMessageDate: d(0) },
  { id: "direct_UN-1001_UN-1002", name: "Amanat & Riya", type: "direct", members: ["UN-1001", "UN-1002"], lastMessage: "Q4 planning session scheduled for Wednesday.", lastMessageDate: d(0) },
  { id: "direct_UN-1001_UN-1005", name: "Amanat & Neha (HR)", type: "direct", members: ["UN-1001", "UN-1005"], lastMessage: "Review candidate profiles for frontend role.", lastMessageDate: d(1) },
];

export const chatMessages: ChatMessage[] = [
  { id: "MSG-1", channelId: "general", senderId: "UN-1001", text: "Welcome to UrNinja OS! Let's hit our Q4 milestones together.", date: `${d(2)} 09:30`, readBy: ["UN-1002", "UN-1005", "UN-1008"] },
  { id: "MSG-2", channelId: "dept_D01", senderId: "UN-1006", text: "Team, we have 40 fresh restaurant leads in the CRM today. Let's make sure initial calls are done before 3 PM.", date: `${d(0)} 10:15`, readBy: ["UN-1007", "UN-1008"] },
  { id: "MSG-3", channelId: "dept_D01", senderId: "UN-1008", text: "On it! Already connected with 5 clients, 2 booked meetings for tomorrow.", date: `${d(0)} 11:20`, readBy: ["UN-1006"] },
  { id: "MSG-4", channelId: "dept_D05", senderId: "UN-1011", text: "Deployed fix for the contact form bug. Verification staging link is live.", date: `${d(0)} 14:40`, readBy: ["UN-1010"] },
  { id: "MSG-5", channelId: "direct_UN-1001_UN-1002", senderId: "UN-1001", text: "Riya, check the resource allocation dashboard when free. Looks like Tech team is at 90% capacity.", date: `${d(0)} 16:10`, readBy: ["UN-1002"] },
];

export const meetings: Meeting[] = [
  {
    id: "MTG-101",
    title: "Weekly Leadership Sync",
    organizerId: "UN-1001",
    date: today(),
    time: "11:00 AM",
    durationMinutes: 45,
    participants: ["UN-1001", "UN-1002", "UN-1004", "UN-1005", "UN-1010"],
    agenda: "Review agency revenue targets, pipeline health and hiring bottlenecks.",
    notes: "Sales pipeline stands at ₹18L. HR needs approval to close senior fullstack offer.",
    meetingLink: "https://meet.google.com/urninja-leadership",
    status: "Completed",
    actionItems: [
      { id: "ACT-1", title: "Finalize compensation for Lead Developer candidate", assigneeId: "UN-1005", dueDate: fwd(2), completed: true },
      { id: "ACT-2", title: "Review Q4 marketing spend vs lead CAC", assigneeId: "UN-1013", dueDate: fwd(4), completed: false },
    ],
  },
  {
    id: "MTG-102",
    title: "Client Deliverable Review — FitZone",
    organizerId: "UN-1018",
    date: fwd(1),
    time: "03:30 PM",
    durationMinutes: 30,
    participants: ["UN-1018", "UN-1011", "UN-1015"],
    agenda: "Walkthrough of upcoming landing page redesign and lead capture setup.",
    notes: "Present prototype and gather signoff for production push.",
    meetingLink: "https://meet.google.com/fitzone-review",
    status: "Scheduled",
    actionItems: [
      { id: "ACT-3", title: "Prepare staging demo link with test data", assigneeId: "UN-1011", dueDate: fwd(1), completed: false },
    ],
  },
  {
    id: "MTG-103",
    title: "Sprint Planning — Tech & Product",
    organizerId: "UN-1010",
    date: fwd(3),
    time: "02:00 PM",
    durationMinutes: 60,
    participants: ["UN-1010", "UN-1011", "UN-1012", "UN-1017"],
    agenda: "Backlog grooming, client feature requests, and server infrastructure scaling.",
    notes: "",
    meetingLink: "https://meet.google.com/tech-sprint",
    status: "Scheduled",
    actionItems: [],
  },
];

export const assets: Asset[] = [
  {
    id: "AST-101",
    name: "MacBook Pro M2 16GB",
    category: "Laptop",
    serialNumber: "C02XYZ123456",
    purchaseDate: d(365),
    cost: 145000,
    assignedEmployeeId: "UN-1011",
    condition: "Good",
    warrantyExpiry: fwd(300),
    status: "In Use",
    issueHistory: [{ date: d(360), employeeId: "UN-1011", action: "Assigned", note: "Handover with charger and protective sleeve" }],
  },
  {
    id: "AST-102",
    name: "Dell UltraSharp 27-inch 4K",
    category: "Monitor",
    serialNumber: "DL-MN-99238",
    purchaseDate: d(240),
    cost: 32000,
    assignedEmployeeId: "UN-1016",
    condition: "Brand New",
    warrantyExpiry: fwd(450),
    status: "In Use",
    issueHistory: [{ date: d(230), employeeId: "UN-1016", action: "Assigned", note: "Primary display for UI design" }],
  },
  {
    id: "AST-103",
    name: "Lenovo ThinkPad E14",
    category: "Laptop",
    serialNumber: "LN-TP-45120",
    purchaseDate: d(180),
    cost: 65000,
    assignedEmployeeId: "UN-1008",
    condition: "Good",
    warrantyExpiry: fwd(185),
    status: "In Use",
    issueHistory: [{ date: d(175), employeeId: "UN-1008", action: "Assigned", note: "Sales calling setup" }],
  },
  {
    id: "AST-104",
    name: "Samsung Galaxy A54 5G (Work Phone)",
    category: "Mobile Phone",
    serialNumber: "SM-G998B",
    purchaseDate: d(120),
    cost: 28000,
    assignedEmployeeId: "UN-1006",
    condition: "Good",
    warrantyExpiry: fwd(245),
    status: "In Use",
    issueHistory: [{ date: d(110), employeeId: "UN-1006", action: "Assigned", note: "Official WhatsApp Business device" }],
  },
  {
    id: "AST-105",
    name: "Apple iMac 24-inch M3",
    category: "Desktop",
    serialNumber: "IM-M3-88219",
    purchaseDate: d(60),
    cost: 139000,
    assignedEmployeeId: undefined,
    condition: "Brand New",
    warrantyExpiry: fwd(600),
    status: "Available",
    issueHistory: [],
  },
];

export const jobOpenings: JobOpening[] = [
  { id: "JOB-01", title: "Senior Full Stack Engineer (React/Node)", departmentId: "D05", openings: 2, type: "Full-time", experienceRequired: "3-5 years", status: "Interviewing", postedDate: d(25) },
  { id: "JOB-02", title: "Performance Marketing Specialist (Meta & Google)", departmentId: "D02", openings: 1, type: "Full-time", experienceRequired: "2-4 years", status: "Open", postedDate: d(14) },
  { id: "JOB-03", title: "B2B Sales Executive", departmentId: "D01", openings: 3, type: "Full-time", experienceRequired: "1-3 years", status: "Open", postedDate: d(7) },
  { id: "JOB-04", title: "Motion Graphics & Reel Creator", departmentId: "D07", openings: 1, type: "Full-time", experienceRequired: "1-2 years", status: "Closed", postedDate: d(45) },
];

export const applicants: Applicant[] = [
  {
    id: "APP-501",
    jobId: "JOB-01",
    name: "Kunal Mehra",
    email: "kunal.mehra@gmail.com",
    phone: "+91 98201 44552",
    resumeFileName: "Kunal_Mehra_Resume_2026.pdf",
    experienceYears: 4.5,
    currentStage: "Selected",
    appliedDate: d(18),
    interviewDate: d(5),
    interviewFeedback: "Strong expertise in React 19, TypeScript and API design. Cleared technical challenge with top marks.",
    interviewerId: "UN-1010",
    rating: 5,
  },
  {
    id: "APP-502",
    jobId: "JOB-02",
    name: "Shreya Sen",
    email: "shreya.sen@outlook.com",
    phone: "+91 97112 88990",
    resumeFileName: "Shreya_Sen_MetaAds.pdf",
    experienceYears: 3.0,
    currentStage: "Interview Scheduled",
    appliedDate: d(10),
    interviewDate: fwd(2),
    interviewFeedback: "Managed monthly ad spend > ₹15L with ROAS > 3.8x. Round 2 scheduled with Marketing Head.",
    interviewerId: "UN-1013",
    rating: 4,
  },
  {
    id: "APP-503",
    jobId: "JOB-03",
    name: "Varun Bajaj",
    email: "varun.bajaj@gmail.com",
    phone: "+91 99880 11223",
    resumeFileName: "Varun_Bajaj_Sales_CV.pdf",
    experienceYears: 2.0,
    currentStage: "Offered",
    appliedDate: d(12),
    interviewDate: d(4),
    interviewFeedback: "Energetic, clear communicator with proven local agency sales record. Offer letter rolled out.",
    interviewerId: "UN-1004",
    rating: 4,
  },
  {
    id: "APP-504",
    jobId: "JOB-01",
    name: "Rohan Deshmukh",
    email: "rohan.d@yahoo.com",
    phone: "+91 94220 55667",
    resumeFileName: "Rohan_Deshmukh_Dev.pdf",
    experienceYears: 1.5,
    currentStage: "Rejected",
    appliedDate: d(20),
    interviewDate: d(14),
    interviewFeedback: "Junior skillset does not match senior architect requirements.",
    interviewerId: "UN-1010",
    rating: 2,
  },
];

export const knowledgeArticles: KnowledgeArticle[] = [
  {
    id: "KB-01",
    title: "UrNinja Company Handbook & Core Values",
    category: "Policy",
    content: "Our mission is to help 500+ homegrown businesses dominate digital markets. Principles: Extreme Ownership, Speed with Quality, Radical Candor, and Client First.",
    authorId: "UN-1001",
    lastUpdated: d(30),
    views: 142,
    status: "Published",
  },
  {
    id: "KB-02",
    title: "Standard Operating Procedure: B2B Lead Qualification & Calling",
    category: "SOP",
    departmentId: "D01",
    content: "1. Review lead's website and GBP before dialing.\n2. Open with value: 'Noticed your GBP has 15 unanswered reviews...'\n3. Pitch discovery meeting within 4 minutes.\n4. Log all call outcomes in CRM immediately.",
    authorId: "UN-1004",
    lastUpdated: d(15),
    views: 89,
    status: "Published",
  },
  {
    id: "KB-03",
    title: "New Employee Onboarding 30-60-90 Day Framework",
    category: "Onboarding",
    departmentId: "D10",
    content: "Week 1: System setup, tool credentials, company culture orientation, buddy assignment.\nMonth 1: Shadowing seniors and first independent deliverable.\nMonth 2: Full operational autonomy.",
    authorId: "UN-1005",
    lastUpdated: d(45),
    views: 110,
    status: "Published",
  },
  {
    id: "KB-04",
    title: "Engineering Coding Standards & Git Flow Guidelines",
    category: "Guide",
    departmentId: "D05",
    content: "All features branch off `main`. PRs require min 1 approval from Tech Lead. Strict TypeScript typing, no `any`, unit test coverage > 80% for business logic.",
    authorId: "UN-1010",
    lastUpdated: d(10),
    views: 74,
    status: "Published",
  },
];

export const automationRules: AutomationRule[] = [
  { id: "AUT-1", name: "New Employee Onboarding Setup", trigger: "employee_created", description: "When a new employee account is created, automatically trigger onboarding task checklist and email welcome credentials.", condition: "Account status is Active", action: "Create 4 onboarding tasks & send welcome notification", enabled: true, lastExecuted: d(2) },
  { id: "AUT-2", name: "Task Overdue Manager Escalation", trigger: "task_overdue", description: "When a task crosses deadline without submitted status, notify reporting manager immediately.", condition: "Deadline < Today and status != Approved", action: "Notify reporting manager and mark urgency to High", enabled: true, lastExecuted: d(0) },
  { id: "AUT-3", name: "Leave Approval Attendance & Payroll Sync", trigger: "leave_approved", description: "When leave receives final approval, automatically update attendance record and adjust payroll preview.", condition: "Leave status == Approved", action: "Update Attendance table to 'Leave' and log payroll deduction", enabled: true, lastExecuted: d(3) },
  { id: "AUT-4", name: "Overdue Invoice Finance Alert", trigger: "invoice_overdue", description: "When an invoice is unpaid after due date, alert Accounts team and send reminder to Client Account Manager.", condition: "Due date < Today and status != Paid", action: "Create High-priority finance notification and draft reminder", enabled: true, lastExecuted: d(1) },
  { id: "AUT-5", name: "Critical Ticket Auto-Escalation", trigger: "ticket_unresolved", description: "When a Critical ticket is unresolved for > 4 hours, escalate directly to Tech Lead and Founder.", condition: "Priority == Critical and SLA breached", action: "Send priority notification to UN-1001 & UN-1010", enabled: true, lastExecuted: d(0) },
  { id: "AUT-6", name: "Deal Won Client Onboarding Pipeline", trigger: "deal_won", description: "When a sales lead reaches Deal Won, automatically create Client record and draft initial invoice.", condition: "Stage == Deal Won", action: "Create Client record, add services, and generate invoice", enabled: true, lastExecuted: d(5) },
  { id: "AUT-7", name: "Contract Expiry 30-Day Reminder", trigger: "contract_expiring", description: "When a client agreement has < 30 days remaining, trigger contract renewal workflow.", condition: "Days to expiry <= 30", action: "Notify Account Manager with renewal proposal template", enabled: true, lastExecuted: d(4) },
];

export const automationLogs: AutomationLog[] = [
  { id: "LOG-01", ruleId: "AUT-3", ruleName: "Leave Approval Attendance & Payroll Sync", triggeredAt: `${d(3)} 14:20`, status: "Success", details: "Leave LV-2 approved for UN-1015. Updated 4 calendar days in attendance ledger." },
  { id: "LOG-02", ruleId: "AUT-5", ruleName: "Critical Ticket Auto-Escalation", triggeredAt: `${d(0)} 15:45`, status: "Success", details: "Ticket TKT-7003 BrightMinds server down escalated to Vikram Rao (Head of Tech)." },
  { id: "LOG-03", ruleId: "AUT-2", ruleName: "Task Overdue Manager Escalation", triggeredAt: `${d(1)} 09:00`, status: "Success", details: "Task TK-502 flagged overdue. Notification dispatched to manager UN-1013." },
  { id: "LOG-04", ruleId: "AUT-4", ruleName: "Overdue Invoice Finance Alert", triggeredAt: `${d(2)} 10:00`, status: "Success", details: "INV-9004 for FitZone is 8 days overdue. Alert sent to Accounts team (UN-1019)." },
];

export const contracts: Contract[] = [
  {
    id: "CTR-201",
    title: "Master Services Agreement — Spice Route Hospitality",
    type: "Client Agreement",
    partyName: "Spice Route Restaurant",
    relatedId: "CL-301",
    startDate: d(90),
    expiryDate: fwd(275),
    renewalDate: fwd(245),
    value: 300000,
    status: "Active",
    version: 2,
    documentName: "Spice_Route_MSA_Signed.pdf",
    autoRenew: true,
  },
  {
    id: "CTR-202",
    title: "Digital Marketing Retainer — Smile Dental Clinic",
    type: "Client Agreement",
    partyName: "Smile Dental Clinic",
    relatedId: "CL-302",
    startDate: d(180),
    expiryDate: fwd(15),
    renewalDate: d(5),
    value: 222000,
    status: "Active",
    version: 1,
    documentName: "Smile_Dental_Retainer_2026.pdf",
    autoRenew: false,
  },
  {
    id: "CTR-203",
    title: "Employment Agreement & Confidentiality NDA",
    type: "Employee Agreement",
    partyName: "Ananya Das",
    relatedId: "UN-1011",
    startDate: d(300),
    expiryDate: fwd(430),
    value: 480000,
    status: "Active",
    version: 1,
    documentName: "Ananya_Das_Employment_Contract.pdf",
    autoRenew: true,
  },
  {
    id: "CTR-204",
    title: "Dedicated Cloud Hosting & CDN SLA Agreement",
    type: "Vendor Contract",
    partyName: "AWS Cloud Services",
    startDate: d(365),
    expiryDate: fwd(180),
    value: 180000,
    status: "Active",
    version: 3,
    documentName: "AWS_Enterprise_Agreement.pdf",
    autoRenew: true,
  },
];

export const okrs: OKRGoal[] = [
  {
    id: "OKR-01",
    title: "Scale Monthly Recurring Revenue to ₹35 Lakhs",
    level: "Company",
    ownerId: "UN-1001",
    quarter: "Q4 2026",
    status: "On Track",
    keyResults: [
      { id: "KR-1", title: "Close ₹12L in new retainer client contracts", target: 1200000, current: 950000, unit: "₹" },
      { id: "KR-2", title: "Maintain monthly client churn below 3%", target: 97, current: 98, unit: "%" },
      { id: "KR-3", title: "Collect 90% of billed revenue within 15 days", target: 90, current: 82, unit: "%" },
    ],
  },
  {
    id: "OKR-02",
    title: "Supercharge Outbound Sales Velocity",
    level: "Department",
    departmentId: "D01",
    ownerId: "UN-1004",
    quarter: "Q4 2026",
    status: "On Track",
    keyResults: [
      { id: "KR-4", title: "Generate 150 qualified discovery meetings", target: 150, current: 114, unit: "meetings" },
      { id: "KR-5", title: "Improve Lead-to-Meeting conversion rate to 18%", target: 18, current: 15.2, unit: "%" },
      { id: "KR-6", title: "Onboard 8 new agency clients", target: 8, current: 6, unit: "clients" },
    ],
  },
  {
    id: "OKR-03",
    title: "Engineering Excellence & Zero Downtime",
    level: "Department",
    departmentId: "D05",
    ownerId: "UN-1010",
    quarter: "Q4 2026",
    status: "Achieved",
    keyResults: [
      { id: "KR-7", title: "Maintain 99.9% uptime across all client sites", target: 99.9, current: 99.95, unit: "%" },
      { id: "KR-8", title: "Resolve Critical SLA tickets within 4 hours", target: 100, current: 100, unit: "%" },
      { id: "KR-9", title: "Deliver 100% of client milestones on schedule", target: 100, current: 92, unit: "%" },
    ],
  },
];

export const securityAuditLogs: SecurityAuditLog[] = [
  { id: "SEC-01", timestamp: `${d(0)} 09:42:12`, actorId: "UN-1001", action: "Login Success", ipAddress: "152.58.12.94", details: "Authenticated via web console", status: "Success" },
  { id: "SEC-02", timestamp: `${d(0)} 10:15:33`, actorId: "UN-1008", action: "Password Changed", targetUserId: "UN-1008", ipAddress: "103.21.144.12", details: "Self-service password update verified", status: "Success" },
  { id: "SEC-03", timestamp: `${d(1)} 14:02:18`, actorId: "UN-1002", action: "Role Changed", targetUserId: "UN-1003", ipAddress: "152.58.12.94", details: "Promoted Siddharth Joshi to Admin", status: "Success" },
  { id: "SEC-04", timestamp: `${d(1)} 23:19:40`, actorId: "UN-1009", action: "Login Failed", ipAddress: "45.112.89.21", details: "Invalid password attempt (attempt 1/5)", status: "Warning" },
  { id: "SEC-05", timestamp: `${d(2)} 11:30:00`, actorId: "UN-1005", action: "Account Created", targetUserId: "UN-1019", ipAddress: "152.58.12.94", details: "Created employee Gaurav Joshi in Accounts dept", status: "Success" },
  { id: "SEC-06", timestamp: `${d(3)} 16:45:10`, actorId: "UN-1001", action: "Permission Modified", ipAddress: "152.58.12.94", details: "Updated Department Head role permissions matrix", status: "Success" },
];

export const userSessions: UserSession[] = [
  { id: "SES-1", employeeId: "UN-1001", role: "Owner", startedAt: `${d(0)} 09:42`, device: "MacBook Pro (Chrome 128 / macOS)", ip: "152.58.12.94", active: true },
  { id: "SES-2", employeeId: "UN-1002", role: "Super Admin", startedAt: `${d(0)} 09:45`, device: "Windows 11 (Edge / PC)", ip: "152.58.12.94", active: true },
  { id: "SES-3", employeeId: "UN-1008", role: "Employee", startedAt: `${d(0)} 09:50`, device: "Windows 11 (Chrome / Laptop)", ip: "103.21.144.12", active: true },
  { id: "SES-4", employeeId: "UN-1011", role: "Employee", startedAt: `${d(0)} 10:02`, device: "MacBook Pro (Arc / macOS)", ip: "103.21.144.15", active: true },
];

export const notifications: AppNotification[] = [
  { id: "N1", title: "Leave request pending", body: "Rahul Gupta ne 2 din ki casual leave maangi hai.", date: d(0), priority: "High", read: false, link: "/attendance", target: "UN-1001" },
  { id: "N2", title: "Ticket escalated", body: "TKT-7003 BrightMinds website down — Critical.", date: d(0), priority: "High", read: false, link: "/tickets", target: "All" },
  { id: "N3", title: "Task submitted", body: "Ananya ne 'Fix contact form bug' review ke liye submit kiya.", date: d(1), priority: "Normal", read: false, link: "/tasks", target: "UN-1001" },
  { id: "N4", title: "Invoice overdue", body: "INV-9004 overdue ho gaya hai.", date: d(2), priority: "Normal", read: true, link: "/finance", target: "D11" },
  { id: "N5", title: "Candidate Selected", body: "Kunal Mehra selected for Full Stack Engineer position.", date: d(1), priority: "Normal", read: false, link: "/recruitment", target: "UN-1005" },
];

export const activity: Activity[] = [
  { id: "A1", date: new Date().toISOString(), by: "UN-1008", action: "Lead LD-2004 ko 'Interested' stage mein move kiya", module: "Leads" },
  { id: "A2", date: subDays(new Date(), 0.1).toISOString(), by: "UN-1011", action: "Task TK-504 submit kiya", module: "Tasks" },
  { id: "A3", date: subDays(new Date(), 0.5).toISOString(), by: "UN-1017", action: "Ticket TKT-7003 escalate kiya", module: "Tickets" },
  { id: "A4", date: subDays(new Date(), 1).toISOString(), by: "UN-1019", action: "INV-9001 par ₹25,000 payment record kiya", module: "Finance" },
  { id: "A5", date: subDays(new Date(), 1.5).toISOString(), by: "UN-1005", action: "Candidate Kunal Mehra ko 'Selected' mark kiya", module: "Recruitment" },
];

export const documents: DocumentItem[] = [
  { id: "DOC-1", name: "Rahul_Gupta_Resume.pdf", category: "Resume", ownerId: "UN-1008", date: d(200), versions: 1, access: "Private" },
  { id: "DOC-2", name: "Spice_Route_Agreement.pdf", category: "Agreement", ownerId: "UN-1018", date: d(60), versions: 3, access: "Department" },
  { id: "DOC-3", name: "INV-9001.pdf", category: "Invoice", ownerId: "UN-1019", date: d(40), versions: 1, access: "Company" },
  { id: "DOC-4", name: "Salary_Slip_UN-1011.pdf", category: "Salary Slip", ownerId: "UN-1011", date: d(35), versions: 1, access: "Private" },
  { id: "DOC-5", name: "Smile_Dental_Audit.pdf", category: "Audit", ownerId: "UN-1014", date: d(15), versions: 2, access: "Department" },
  { id: "DOC-6", name: "fitzone_bug_screenshot.png", category: "Attachment", ownerId: "UN-1017", date: d(2), versions: 1, access: "Department" },
  { id: "DOC-7", name: "UrNinja_Leave_Policy_2026.pdf", category: "Policy", ownerId: "UN-1005", date: d(90), versions: 2, access: "Company" },
];

export const audits: Audit[] = [
  {
    id: "AU-1",
    businessName: "Smile Dental Clinic",
    date: d(15),
    scores: { website: 55, gbp: 40, seo: 35, reviews: 70, social: 45 },
    findings: "Website mobile par slow hai (4.8s). GBP par photos aur services incomplete hain.",
    opportunities: "'Dentist near me' searches Pune mein high volume par hain.",
    recommendations: "GBP optimization, local SEO, monthly 12 posts, review request flow.",
    services: ["SEO", "Google Business Profile", "Social Media Management"],
  },
  {
    id: "AU-2",
    businessName: "Spice Route Restaurant",
    date: d(28),
    scores: { website: 72, gbp: 85, seo: 60, reviews: 90, social: 78 },
    findings: "Strong GBP ratings and high engagement on Instagram Reels. Menu page lacks structured SEO schema.",
    opportunities: "High intent keywords 'best butter chicken bandra' can be easily captured.",
    recommendations: "Schema markup, seasonal influencer campaigns, direct Zomato integration.",
    services: ["Social Media Management", "Paid Ads", "Website Revamp"],
  },
];

const allPerms = [...PERMISSIONS];
export const settings: Settings = {
  companyName: "UrNinja",
  tagline: "Digital Growth Agency Operating System",
  workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  officeStart: "10:00",
  holidays: [
    { date: fwd(18), name: "Diwali" },
    { date: fwd(19), name: "Govardhan Puja" },
    { date: fwd(70), name: "Christmas" },
    { date: fwd(85), name: "New Year's Day" },
  ],
  leavePolicy: [
    { type: "Casual", perYear: 12, paid: true },
    { type: "Sick", perYear: 8, paid: true },
    { type: "Earned", perYear: 15, paid: true },
    { type: "Unpaid", perYear: 0, paid: false },
  ],
  leaveRules: [
    { id: "LR-1", type: "Casual Leave", perYear: 12, paid: true, active: true, description: "Personal leave for emergency or short breaks" },
    { id: "LR-2", type: "Sick Leave", perYear: 8, paid: true, active: true, description: "Medical leaves for health recovery" },
    { id: "LR-3", type: "Earned Leave", perYear: 15, paid: true, active: true, description: "Annual privilege leave credited quarterly" },
    { id: "LR-4", type: "Unpaid Leave", perYear: 30, paid: false, active: true, description: "Leave without pay approved by HR" },
    { id: "LR-5", type: "Maternity / Paternity", perYear: 90, paid: true, active: true, description: "Parental leave policy" },
  ],
  salaryComponents: [
    { id: "SC-1", name: "Monthly Performance Bonus", kind: "earning", amount: 5000, frequency: "Monthly", mode: "Fixed", active: true },
    { id: "SC-2", name: "Travel Allowance", kind: "earning", amount: 2500, frequency: "Monthly", mode: "Fixed", active: true },
    { id: "SC-3", name: "Food Allowance", kind: "earning", amount: 2000, frequency: "Monthly", mode: "Fixed", active: true },
    { id: "SC-4", name: "Internet Reimbursement", kind: "earning", amount: 1000, frequency: "Monthly", mode: "Fixed", active: true },
    { id: "SC-5", name: "Health Insurance Deductible", kind: "deduction", amount: 750, frequency: "Monthly", mode: "Fixed", active: true },
    { id: "SC-6", name: "Special Festival Bonus", kind: "earning", amount: 10000, frequency: "Yearly", mode: "Fixed", active: false },
  ],
  servicesCatalogue: [
    { id: "SVC-101", name: "Social Media Marketing Suite", category: "Digital Marketing", price: 35000, billing: "Monthly", description: "12 creatives, 4 reels, ad management & community moderation", active: true },
    { id: "SVC-102", name: "Google & Meta Paid Ads", category: "Performance Marketing", price: 40000, billing: "Monthly", description: "Campaign management, A/B testing, pixel tracking & ROI optimization", active: true },
    { id: "SVC-103", name: "SEO & Google Business Profile (GBP)", category: "SEO", price: 25000, billing: "Monthly", description: "On-page, backlink building, local ranking & monthly keyword audit", active: true },
    { id: "SVC-104", name: "Custom Web Application Development", category: "Web Development", price: 120000, billing: "One-time", description: "Full-stack React / Node application with database & deployment", active: true },
    { id: "SVC-105", name: "Mobile App Development (Flutter/React Native)", category: "App Development", price: 180000, billing: "One-time", description: "Cross-platform iOS and Android application with Play Store launch", active: true },
    { id: "SVC-106", name: "Brand Identity & Graphic Design", category: "Design", price: 30000, billing: "One-time", description: "Logo, brand guidelines, stationery & digital collateral design", active: true },
    { id: "SVC-107", name: "Enterprise IT Support & Hosting Maintenance", category: "IT Support", price: 15000, billing: "Monthly", description: "Server monitoring, SSL, automated daily backups & uptime SLA", active: true },
  ],
  approvalChain: ["Team Leader", "Manager", "HR", "Owner"],
  leadSources: ["Google Maps", "JustDial", "Referral", "Instagram", "Website", "LinkedIn", "Cold Call"],
  ticketCategories: ["Bug", "Content", "Hosting", "SEO", "Billing", "Social", "Feature Request"],
  taskPriorities: ["Low", "Medium", "High", "Urgent"],
  rolePermissions: {
    "Super Owner": allPerms,
    Owner: allPerms,
    "Super Admin": allPerms,
    Admin: [
      "View", "Create", "Edit", "Delete", "Assign", "Approve", "Reject", "Share", "Export", "Import",
      "Manage Users", "Manage Passwords", "Manage Roles",
    ],
    "Department Head": [
      "View", "Create", "Edit", "Assign", "Approve", "Reject", "Share", "Export", "Manage Passwords",
    ],
    HR: [
      "View", "Create", "Edit", "Assign", "Approve", "Reject", "Export", "Import",
      "Manage Users", "Manage Passwords",
    ],
    Manager: [
      "View", "Create", "Edit", "Assign", "Approve", "Reject", "Share",
    ],
    "Team Leader": [
      "View", "Create", "Edit", "Assign", "Approve",
    ],
    Employee: [
      "View", "Create",
    ],
    Client: [
      "View", "Approve", "Reject", "Create",
    ],
  },
  customRoles: [],
  taxNote: "Demo tax rules — TDS % har employee ke structure mein editable hai. Real slabs CA se verify karke config karein.",
  securityPolicies: {
    maxFailedAttempts: 5,
    passwordExpiryDays: 90,
    sessionTimeoutMinutes: 60,
  },
};
