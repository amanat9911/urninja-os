# UrNinja OS — Feature Map (Hinglish)

Har screen kya-kya kar sakti hai, ek nazar mein. Saare screens `src/routes/` mein hain aur shared state `src/store/demo-store.ts` se aata hai.

## Completed screens (15)

| # | Screen (route) | Features |
| --- | --- | --- |
| 1 | **Dashboard** (`/`) | KPI cards (employees, leads, deals, collection, attendance, tickets), pipeline bar chart, task status pie, upcoming tasks, announcements, recent activity. Date-range filter (today/week/month…) sab numbers par apply hota hai. |
| 2 | **Login** (`/login`) | Employee chuno + 4+ character password. Sirf demo simulation — real auth nahi. |
| 3 | **Employees** (`/employees`) | Directory + search + department filter, naya employee add karne ka dialog, employee profile (tasks, attendance, salary sab ek jagah), printable ID card. |
| 4 | **Departments** (`/departments`) | Hierarchy view, per-department team count, naya department add. |
| 5 | **Roles & Access** (`/roles`) | Role × permission matrix. Abhi sirf dikhawa hai — enforce nahi hota (demo limitation). |
| 6 | **Leads & Pipeline** (`/leads`) | Kanban board (stages), naya lead, CSV import, call log, reassignment, deal value tracking, won lead ko client convert. |
| 7 | **Tasks & Notices** (`/tasks`) | Task assign → Start → Submit → Approve/Reject workflow, comments aur checklist, announcements, acknowledgement. |
| 8 | **Attendance & Leave** (`/attendance`) | Check-in/check-out, daily attendance table, leave apply, 4-level approval flow. Leave approve hone par attendance/payroll preview update hota hai. |
| 9 | **Payroll** (`/payroll`) | Monthly salary sheet, adjustments, run approval flow, printable salary slip. Calculations illustrative hain — CA verification zaroori. |
| 10 | **Clients** (`/clients`) | Client list, services, deliverable progress, account timeline (tickets, invoices sab consistent ID se linked). |
| 11 | **Support Tickets** (`/tickets`) | Ticket assign, status change, SLA indicator, internal notes. Status change client timeline mein bhi dikhata hai. |
| 12 | **Finance** (`/finance`) | Invoices, payment record karna, expenses add, profit summary. |
| 13 | **Performance** (`/performance`) | Leaderboard — score = 40% task approval + 40% attendance + 20% sales share (demo formula). |
| 14 | **Audits & Docs** (`/documents`) | Audit scores, document list. Upload sirf metadata add karta hai (demo limitation). |
| 15 | **Activity Log** (`/activity`) | Har action ka record, filter ke saath. |

## Global (har screen par)
- **Sidebar navigation** — 15 screens, mobile par drawer.
- **Role switcher** (topbar) — Owner/HR/Employee waghera demo simulation.
- **Dark mode** — chaand/suraj icon, preference save hoti hai.
- **Notifications** — unread badge, mark all read, click par related page khulti hai.
- **Reset Demo Data** — sidebar ke neeche, sab original sample par wapas.

## Cross-module demo consistency
Employee profile mein uske hi tasks/attendance/salary dikhte hain; won lead client banta hai aur finance mein invoice jodta hai; ticket status client timeline + ticket dashboard dono mein update hota hai; salary adjustment payroll preview aur salary slip dono mein reflect hoti hai.

## Known demo-only limitations
- Real login/database/files/permissions/email nahi hai.
- Payroll rules illustrative hain.
- Uploads asli file store nahi karte.
