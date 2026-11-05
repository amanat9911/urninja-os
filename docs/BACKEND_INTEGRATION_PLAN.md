# UrNinja OS — Backend Integration Plan (Hinglish)

Ye prototype pure frontend hai. Baad mein secure backend lagane ka step-by-step plan niche hai. Har jagah jahan backend chahiye wahan code mein `TODO: Backend` comment already laga hua hai.

## Step 0 — Kyun pehle demo?
Demo data se UI aur flows pehle hi validate ho jate hain. Backend aane par sirf data layer replace hogi, screens waisi hi rahengi.

## Step 1 — Real database
- **Lovable Cloud** enable karo — PostgreSQL database, auth, storage aur serverless functions sab setup ke saath milte hain.
- Tables banao: `employees`, `departments`, `leads`, `clients`, `tasks`, `task_comments`, `announcements`, `attendance`, `leaves`, `salaries`, `payroll_adjustments`, `payroll_runs`, `tickets`, `ticket_notes`, `invoices`, `expenses`, `notifications`, `activity_log`, `documents`, `audits`, `settings`.
- Har table ke liye RLS policies — kaun kya dekh/edit kar sakta hai, role-based.

## Step 2 — Real authentication
- Demo store ka `session` replace hoga: real signup/login (email ya Google), password reset.
- Employee record ko auth user se link karo (`employee.authUserId`).
- Role `employees.role` se aayega, topbar ka dropdown hata do (ya admin-only ban jaye).

## Step 3 — State layer replace karna
- `src/store/demo-store.ts` ke read functions ko React Query (`useQuery`) se replace karo.
- Har `update()` call ek server function / mutation ban jayegi (createTask, approveLeave, recordPayment…).
- Yehi isliye saara state ek hi store se aata hai — replace karna ek jagah center ho jayega.

## Step 4 — Permissions enforce karna
- Roles matrix (`/roles`) ko real policy banao: server functions mein role check, database mein RLS.
- Sirf UI chhupana kaafi nahi — server-side verify zaroori hai.

## Step 5 — Files ka asli storage
- Document uploads ko storage bucket mein bhejo (PDF, images…), metadata + URL database mein save karo.
- Salary slip aur ID card print-ready PDF bana sakte hain server par.

## Step 6 — Payroll ko real banana
- `src/utils/payroll.ts` abhi illustrative hai. Real engine ke liye:
  - Salary components, tax slab config, holidays/leave policy database se.
  - Approval workflow ke baad hi payroll "run" lock ho.
- **Rules ko CA se verify karwana zaroori hai** — tax, PF, incentives sab.

## Step 7 — Notifications real banana
- In-app notifications database table se aayenge.
- Email/push bhejna ho to serverless function + email service jodo.

## Step 8 — Verification checklist
- Har form server par validate ho.
- RLS test karo: ek employee doosre employee ka payroll na dekh sake.
- Activity log server par bane (client tamper-proof).
- Demo tag ("Demo data — no real backend") hatao jab sab real ho jaye.

## Integration points (code mein already marked)
- `src/store/demo-store.ts` — poora state layer (TODO comment top par).
- `src/data/mock.ts` — schema ke table columns isi se match karo.
- `src/utils/payroll.ts` — salary engine.
- File upload dialogs (`documents`, `employees`) — real storage.
