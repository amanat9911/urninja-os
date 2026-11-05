// UrNinja OS — Centralized TypeScript Types & Interfaces
// Har module yahin se types import karta hai taaki data consistent rahe.

export type Role =
  | "Super Owner"
  | "Owner"
  | "Super Admin"
  | "Admin"
  | "Department Head"
  | "HR"
  | "Manager"
  | "Team Leader"
  | "Employee"
  | "Client";

export const PERMISSIONS = [
  "View",
  "Create",
  "Edit",
  "Delete",
  "Assign",
  "Approve",
  "Reject",
  "Share",
  "Export",
  "Import",
  "Manage Users",
  "Manage Passwords",
  "Manage Roles",
  "Manage Settings",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

// Role hierarchy weight for upward authority protection (higher number = higher authority)
export const ROLE_WEIGHTS: Record<Role, number> = {
  "Super Owner": 9,
  Owner: 8,
  "Super Admin": 7,
  Admin: 6,
  "Department Head": 5,
  HR: 5,
  Manager: 4,
  "Team Leader": 3,
  Employee: 2,
  Client: 1,
};

// Department structure
export interface Department {
  id: string;
  name: string;
  headId?: string;
  parentId?: string;
  color: string;
  description: string;
}

// Complete Employee & Account Model
export interface Employee {
  id: string; // Employee ID e.g. UN-1001
  userId: string; // Login username/ID e.g. amanat.1001
  name: string;
  email: string;
  phone: string;
  role: Role;
  departmentId: string;
  designation: string;
  managerId?: string; // Reporting Manager ID
  parentUserId?: string; // Parent account ID for hierarchy
  directSubordinates?: string[];
  reportingChain?: string[];
  joiningDate: string;
  status: "Active" | "Inactive" | "On Leave" | "Suspended" | "Resigned" | "Archived";
  resignedDate?: string;
  exitReason?: string;
  exitNotes?: string;
  avatarSeed: number;
  dob: string;
  address: string;
  emergencyContact: string;
  qualification: string;
  experienceYears: number;
  history: { date: string; note: string }[];
  // Account & Password Management fields
  password?: string;
  isLocked?: boolean;
  failedLoginAttempts?: number;
  lastPasswordChange?: string;
  temporaryPassword?: boolean;
  tempPasswordExpiry?: string;
}

// Sales & Leads
export type LeadStage =
  | "New Lead"
  | "Contacted"
  | "Interested"
  | "Follow-up"
  | "Meeting"
  | "Proposal"
  | "Negotiation"
  | "Deal Won"
  | "Deal Lost";

export const LEAD_STAGES: LeadStage[] = [
  "New Lead",
  "Contacted",
  "Interested",
  "Follow-up",
  "Meeting",
  "Proposal",
  "Negotiation",
  "Deal Won",
  "Deal Lost",
];

export interface CallLog {
  id: string;
  date: string;
  employeeId: string;
  outcome: "Connected" | "No Answer" | "Busy" | "Wrong Number" | "Callback";
  remark: string;
}

export interface Lead {
  id: string;
  businessName: string;
  contactPerson: string;
  phone: string;
  whatsapp: string;
  email: string;
  city: string;
  area: string;
  category: string;
  website: string;
  instagram: string;
  gbp: string;
  source: string;
  priority: "Low" | "Medium" | "High";
  remarks: string;
  stage: LeadStage;
  assignedTo: string;
  sharedWith: string[];
  dealValue: number;
  received: number;
  followUp?: string;
  createdAt: string;
  calls: CallLog[];
  uploadId?: string;
  convertedClientId?: string;
  isPrivate?: boolean;
  updatedAt?: string;
  lastContactedAt?: string;
  history?: { date: string; by: string; fromStage: string; toStage: string; remark: string }[];
}

export interface UploadBatch {
  id: string;
  fileName: string;
  uploaderId: string;
  date: string;
  source: string;
  category: string;
  count: number;
  status: "Imported" | "Partial" | "Failed";
}

// Tasks & Workflows
export type TaskStatus = "To Do" | "In Progress" | "Submitted" | "Approved" | "Rejected" | "Correction";

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: "Low" | "Medium" | "High" | "Urgent";
  deadline: string;
  assignees: string[];
  type: "Daily" | "Recurring" | "Personal" | "Team" | "Project" | "Cross-department";
  status: TaskStatus;
  checklist: { text: string; done: boolean }[];
  comments: { by: string; text: string; date: string }[];
  completionNote?: string;
  completedAt?: string;
  clientId?: string;
  createdBy: string;
  createdAt: string;
  meetingId?: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: string; // "All" | dept id | employee id
  date: string;
  by: string;
  acknowledgedBy: string[];
}

export interface DailyWorkReport {
  id: string;
  employeeId: string;
  date: string;
  hoursWorked: number;
  tasksCompleted: string;
  plansForTomorrow: string;
  blockersOrChallenges: string;
  submittedAt: string;
  managerFeedback?: string;
}

// Attendance & Leave
export interface AttendanceRecord {
  employeeId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: "Present" | "Late" | "Absent" | "Leave" | "Holiday" | "Weekly Off";
}

export type ApprovalLevel = "Team Leader" | "Manager" | "HR" | "Owner";

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: "Casual" | "Sick" | "Earned" | "Unpaid";
  from: string;
  to: string;
  days: number;
  reason: string;
  status: "Pending" | "Approved" | "Rejected" | "Returned";
  currentLevel: number;
  trail: { level: ApprovalLevel; by: string; action: string; date: string; note?: string }[];
  appliedOn: string;
}

// Payroll & Dynamic Salary Components
export interface SalaryComponent {
  id: string;
  name: string;
  kind: "earning" | "deduction";
  amount: number;
  frequency: "Monthly" | "Yearly" | "Weekly" | "One-time";
  mode: "Fixed" | "Calculated";
  calculationPercent?: number;
  active: boolean;
  employeeId?: string; // if undefined, applies globally
}

export interface SalaryStructure {
  employeeId: string;
  basic: number;
  hra: number;
  allowances: number;
  pfPercent: number;
  esi: number;
  professionalTax: number;
  tdsPercent: number;
  custom: { label: string; amount: number; kind: "earning" | "deduction" }[];
  components?: SalaryComponent[];
}

export interface MonthlyAdjustment {
  employeeId: string;
  month: string; // yyyy-MM
  incentive: number;
  bonus: number;
  reimbursement: number;
  advance: number;
  loan: number;
  overrideNet?: number;
  overrideReason?: string;
}

export interface PayrollSnapshot {
  employeeId: string;
  employeeName: string;
  departmentId: string;
  designation: string;
  basic: number;
  gross: number;
  earnings: { label: string; amount: number }[];
  deductions: { label: string; amount: number }[];
  totalDeductions: number;
  net: number;
  unpaidDays: number;
  overridden?: boolean;
  overrideNote?: string;
}

export interface PayrollRun {
  month: string;
  status: "Draft" | "Pending Approval" | "Approved" | "Paid" | "Locked";
  finalizedAt?: string;
  audit: { by: string; action: string; date: string; note?: string }[];
  snapshots?: PayrollSnapshot[];
}

// Client & Services
export interface ServiceItem {
  id: string;
  name: string;
  price: number;
  billing: "One-time" | "Monthly" | "Quarterly" | "Yearly";
  discount: number;
  notes: string;
}

export interface Deliverable {
  id: string;
  title: string;
  serviceId: string;
  target: number;
  done: number;
  status: "Planned" | "In Progress" | "Submitted" | "Approved" | "Published" | "Pending" | "Overdue";
  assigneeId: string;
  due: string;
  submissionUrl?: string;
  clientFeedback?: string;
}

export interface Client {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  city: string;
  onboardedOn: string;
  accountManagerId: string;
  services: ServiceItem[];
  deliverables: Deliverable[];
  timeline: { date: string; text: string }[];
  leadId?: string;
  portalPassword?: string;
}

// Support Tickets
export type TicketStatus = "New" | "Assigned" | "In Progress" | "Waiting for Client" | "Escalated" | "Resolved" | "Closed";
export const TICKET_STATUSES: TicketStatus[] = [
  "New",
  "Assigned",
  "In Progress",
  "Waiting for Client",
  "Escalated",
  "Resolved",
  "Closed",
];

export interface Ticket {
  id: string;
  clientId: string;
  category: string;
  title: string;
  description: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  team: string;
  service: string;
  status: TicketStatus;
  assigneeId?: string;
  createdAt: string;
  slaHours: number;
  notes: { by: string; text: string; internal: boolean; date: string }[];
  resolution?: string;
}

// Finance & Recurring Subscriptions
export interface Invoice {
  id: string;
  clientId: string;
  date: string;
  due: string;
  items: { label: string; amount: number }[];
  paid: number;
  status: "Draft" | "Sent" | "Partially Paid" | "Paid" | "Overdue";
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  amount: number;
  note: string;
  departmentId?: string;
}

export interface ClientSubscription {
  id: string;
  clientId: string;
  planName: string;
  amount: number;
  frequency: "Monthly" | "Quarterly" | "Annual";
  startDate: string;
  nextBillingDate: string;
  status: "Active" | "Past Due" | "Paused" | "Cancelled";
  autoGenerateInvoice: boolean;
  history: { date: string; invoiceId: string; amount: number; status: string }[];
}

// Notifications & Activity Log
export interface AppNotification {
  id: string;
  title: string;
  body: string;
  date: string;
  priority: "Low" | "Normal" | "High";
  read: boolean;
  link: string;
  target: string;
}

export interface Activity {
  id: string;
  date: string;
  by: string;
  action: string;
  module: string;
}

// Documents & Audits
export interface DocumentItem {
  id: string;
  name: string;
  category: "Resume" | "Agreement" | "Invoice" | "Salary Slip" | "Audit" | "Attachment" | "Policy";
  ownerId: string;
  date: string;
  versions: number;
  access: "Private" | "Department" | "Company" | "Client";
  url?: string;
}

export interface Audit {
  id: string;
  businessName: string;
  date: string;
  scores: { website: number; gbp: number; seo: number; reviews: number; social: number };
  findings: string;
  opportunities: string;
  recommendations: string;
  services: string[];
}

// Internal Chat System
export interface ChatMessage {
  id: string;
  channelId: string; // e.g. "direct_UN-1001_UN-1002" or "dept_D01" or "general"
  senderId: string;
  text: string;
  date: string;
  attachmentName?: string;
  readBy: string[];
}

export interface ChatChannel {
  id: string;
  name: string;
  type: "direct" | "department" | "team" | "announcement";
  departmentId?: string;
  members: string[];
  lastMessage?: string;
  lastMessageDate?: string;
}

// Meeting Management
export interface MeetingActionItem {
  id: string;
  title: string;
  assigneeId: string;
  dueDate: string;
  convertedToTaskId?: string;
  completed: boolean;
}

export interface Meeting {
  id: string;
  title: string;
  organizerId: string;
  date: string;
  time: string;
  durationMinutes: number;
  participants: string[];
  agenda: string;
  notes: string;
  meetingLink?: string;
  status: "Scheduled" | "In Progress" | "Completed" | "Cancelled";
  actionItems: MeetingActionItem[];
}

// Asset Management
export type AssetCategory =
  | "Laptop"
  | "Desktop"
  | "Mobile Phone"
  | "SIM Card"
  | "Monitor"
  | "Accessories"
  | "ID Card"
  | "Other Equipment";

export interface Asset {
  id: string; // e.g. AST-101
  name: string;
  category: AssetCategory;
  serialNumber: string;
  purchaseDate: string;
  cost: number;
  assignedEmployeeId?: string;
  condition: "Brand New" | "Good" | "Fair" | "Needs Repair";
  warrantyExpiry: string;
  status: "In Use" | "Available" | "Maintenance" | "Retired";
  issueHistory: { date: string; employeeId: string; action: "Assigned" | "Returned" | "Repaired"; note: string }[];
}

// Recruitment and ATS
export interface JobOpening {
  id: string;
  title: string;
  departmentId: string;
  openings: number;
  type: "Full-time" | "Part-time" | "Internship" | "Remote";
  experienceRequired: string;
  status: "Open" | "Interviewing" | "Closed";
  postedDate: string;
}

export type ApplicantStage = "Applied" | "Screening" | "Interview Scheduled" | "Offered" | "Selected" | "Rejected";

export interface Applicant {
  id: string;
  jobId: string;
  name: string;
  email: string;
  phone: string;
  resumeFileName: string;
  experienceYears: number;
  currentStage: ApplicantStage;
  appliedDate: string;
  interviewDate?: string;
  interviewFeedback?: string;
  interviewerId?: string;
  rating?: number; // 1-5
  convertedToEmployeeId?: string;
}

// Knowledge Base and SOP
export interface KnowledgeArticle {
  id: string;
  title: string;
  category: "Policy" | "SOP" | "Training" | "Guide" | "Process" | "Onboarding";
  departmentId?: string;
  content: string;
  authorId: string;
  lastUpdated: string;
  views: number;
  status: "Published" | "Draft";
}

// Workflow Automations
export interface AutomationRule {
  id: string;
  name: string;
  trigger:
    | "employee_created"
    | "task_deadline_near"
    | "task_overdue"
    | "leave_approved"
    | "invoice_overdue"
    | "ticket_unresolved"
    | "deal_won"
    | "contract_expiring";
  description: string;
  condition: string;
  action: string;
  enabled: boolean;
  lastExecuted?: string;
}

export interface AutomationLog {
  id: string;
  ruleId: string;
  ruleName: string;
  triggeredAt: string;
  status: "Success" | "Skipped" | "Failed";
  details: string;
}

// Contract Management
export interface Contract {
  id: string;
  title: string;
  type: "Client Agreement" | "Employee Agreement" | "Vendor Contract" | "NDA";
  partyName: string;
  relatedId?: string; // Client ID or Employee ID
  startDate: string;
  expiryDate: string;
  renewalDate?: string;
  value: number;
  status: "Draft" | "Active" | "Pending Signature" | "Renewed" | "Expired";
  version: number;
  documentName?: string;
  autoRenew: boolean;
}

// OKRs and Goals
export interface KeyResult {
  id: string;
  title: string;
  target: number;
  current: number;
  unit: string;
}

export interface OKRGoal {
  id: string;
  title: string;
  level: "Company" | "Department" | "Individual";
  departmentId?: string;
  ownerId: string;
  quarter: string; // e.g. "Q4 2026"
  status: "On Track" | "At Risk" | "Behind" | "Achieved";
  keyResults: KeyResult[];
}

// Security, Audit & Sessions
export interface SecurityAuditLog {
  id: string;
  timestamp: string;
  actorId: string;
  action:
    | "Login Success"
    | "Login Failed"
    | "Password Changed"
    | "Password Reset"
    | "Role Changed"
    | "Account Created"
    | "Account Locked"
    | "Account Unlocked"
    | "Permission Modified"
    | "Sensitive Data Exported";
  targetUserId?: string;
  ipAddress: string;
  details: string;
  status: "Success" | "Warning" | "Blocked";
}

export interface UserSession {
  id: string;
  employeeId: string;
  role: Role;
  startedAt: string;
  device: string;
  ip: string;
  active: boolean;
}

export interface LeavePolicyRule {
  id: string;
  type: string;
  perYear: number;
  paid: boolean;
  applicableDepartments?: string[];
  active: boolean;
  description?: string;
}

export interface ServiceCatalogueItem {
  id: string;
  name: string;
  category: string;
  price: number;
  billing: "One-time" | "Monthly" | "Quarterly" | "Yearly";
  description: string;
  active: boolean;
}

// Company Settings
export interface Settings {
  companyName: string;
  tagline: string;
  workingDays: string[];
  officeStart: string;
  holidays: { date: string; name: string }[];
  leavePolicy: { type: string; perYear: number; paid: boolean }[];
  leaveRules?: LeavePolicyRule[];
  salaryComponents?: SalaryComponent[];
  servicesCatalogue?: ServiceCatalogueItem[];
  approvalChain: ApprovalLevel[];
  leadSources: string[];
  ticketCategories: string[];
  taskPriorities: string[];
  rolePermissions: Record<string, Permission[]>;
  customRoles: string[];
  taxNote: string;
  securityPolicies: {
    maxFailedAttempts: number;
    passwordExpiryDays: number;
    sessionTimeoutMinutes: number;
  };
}
