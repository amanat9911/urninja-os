# UrNinja OS — README (Hinglish)

UrNinja OS ek **agency operating system** ka complete frontend prototype hai — team, sales, tasks, attendance, payroll, clients, tickets aur finance, sab ek jagah.

> ⚠️ **Important:** Ye abhi ek **demo prototype** hai. Ismein real backend, real login ya production payroll engine **nahi** hai. Saara data sample hai aur aapke browser mein save hota hai.

## Kaise chalayein

```sh
npm i
npm run dev
```

## Demo login
- Login page par koi bhi employee chuno, password mein 4+ characters likho — login ho jayega.
- Ye sirf **simulation** hai, real authentication nahi. Topbar ka dropdown se Owner/HR/Employee waghera ban kar dekh sakte ho.

## Demo data
- Saara sample data `src/data/mock.ts` mein hai — ek interconnected company (employees, departments, leads, clients, tasks, attendance, salaries, tickets, invoices…).
- Aapke changes browser ke localStorage mein save hote hain.
- Sidebar ke neeche **"Reset Demo Data"** button se sab kuch original sample par wapas.

## Zaroori files
| File | Kaam |
| --- | --- |
| `docs/GUIDE.md` | Kaise use karein — chhota user guide |
| `docs/FEATURE_MAP.md` | Har screen ka feature-by-feature map |
| `docs/BACKEND_INTEGRATION_PLAN.md` | Backend lagane ka step-by-step plan (future) |
| `src/types/index.ts` | Saare TypeScript types (employees, leads, payroll, tickets…) |
| `src/data/mock.ts` | Sample company ka data |
| `src/store/demo-store.ts` | Shared frontend state layer (localStorage persistence) |
| `src/utils/payroll.ts` | Salary calculation (sirf demo — CA verification zaroori) |

## Known demo-only limitations
- Login sirf simulation hai — koi security nahi.
- Permissions matrix sirf dikhawa hai, enforce nahi hota.
- File uploads sirf metadata add karte hain, asli file store nahi hoti.
- Payroll/tax calculations illustrative hain — real use se pehle CA se verify karao.
- Notifications app ke andar hi hain — koi email/real delivery nahi.

Backend lagane ka plan `docs/BACKEND_INTEGRATION_PLAN.md` mein detail se hai.
