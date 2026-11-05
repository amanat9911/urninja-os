// Login Screen — Multi-role authentication, simulated OTP password recovery, account lockout, and persona presets
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Lock, ShieldAlert, KeyRound, CheckCircle2, User, ArrowRight } from "lucide-react";
import { useDemo, update, recordSecurityAudit } from "@/store/demo-store";
import { DemoTag, Field, inputCls, Select } from "@/components/common";
import { Button } from "@/components/ui/button";
import { pageHead } from "@/lib/seo";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: pageHead("Sign in", "Sign in to UrNinja OS with your employee or client credentials."),
  component: Login,
});

export function Login() {
  const s = useDemo();
  const nav = useNavigate();
  const [selectedId, setSelectedId] = useState(s.employees[0]?.id ?? "UN-1001");
  const [password, setPassword] = useState("password123");
  const [mode, setMode] = useState<"login" | "forgot" | "otp">("login");
  const [resetEmail, setResetEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const emp = s.employees.find((x) => x.id === selectedId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emp) {
      toast.error("User account not found.");
      return;
    }

    // Check account lockout
    if (emp.isLocked) {
      toast.error("This account is locked due to repeated failed login attempts. Contact an Administrator or Owner.");
      recordSecurityAudit(emp.id, "Login Failed", "Attempted login on locked account", "Blocked", emp.id);
      return;
    }

    // Password validation (demo accepts stored password or "password123")
    const validPassword = emp.password || "password123";
    if (password !== validPassword && password !== "demo123") {
      const nextFailed = (emp.failedLoginAttempts || 0) + 1;
      const isNowLocked = nextFailed >= 5;

      update((state) => ({
        ...state,
        employees: state.employees.map((e) =>
          e.id === emp.id
            ? { ...e, failedLoginAttempts: nextFailed, isLocked: isNowLocked }
            : e
        ),
      }));

      recordSecurityAudit(emp.id, "Login Failed", `Invalid password (attempt ${nextFailed}/5)`, isNowLocked ? "Blocked" : "Warning", emp.id);

      if (isNowLocked) {
        toast.error("Account locked! 5 consecutive failed attempts exceeded.");
      } else {
        toast.error(`Invalid password. Attempt ${nextFailed} of 5 before lockout.`);
      }
      return;
    }

    // Successful login: reset failed attempts, update session
    update((state) => ({
      ...state,
      employees: state.employees.map((e) =>
        e.id === emp.id ? { ...e, failedLoginAttempts: 0 } : e
      ),
      session: {
        loggedIn: true,
        employeeId: emp.id,
        role: emp.role,
        clientId: undefined,
      },
    }), { action: `logged in as ${emp.name}`, module: "Auth" });

    recordSecurityAudit(emp.id, "Login Success", `Successful authentication as ${emp.role}`, "Success", emp.id);
    toast.success(`Welcome back, ${emp.name}!`);
    nav({ to: "/" });
  };

  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.includes("@")) {
      toast.error("Please enter a valid work email.");
      return;
    }
    toast.success("Simulated OTP sent to email: Use '1234'");
    setMode("otp");
  };

  const handleVerifyOtpAndReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode !== "1234" && otpCode.length < 4) {
      toast.error("Invalid verification code (Demo OTP: 1234)");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    // Update password for target email
    const target = s.employees.find((e) => e.email.toLowerCase() === resetEmail.toLowerCase()) || emp;
    if (target) {
      update((state) => ({
        ...state,
        employees: state.employees.map((e) =>
          e.id === target.id
            ? {
                ...e,
                password: newPassword,
                isLocked: false,
                failedLoginAttempts: 0,
                lastPasswordChange: new Date().toISOString().slice(0, 10),
              }
            : e
        ),
      }));
      recordSecurityAudit(target.id, "Password Reset", "Password reset verified via simulated OTP", "Success", target.id);
    }

    toast.success("Password reset successfully! You can now sign in.");
    setMode("login");
    setPassword(newPassword);
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background p-4">
      <div className="glass w-full max-w-lg p-8 rounded-3xl border shadow-glow">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-gradient-primary font-display text-2xl font-bold text-primary-foreground shadow-glow">
              U
            </span>
            <div>
              <h1 className="text-2xl font-bold leading-tight">UrNinja OS</h1>
              <p className="text-xs text-muted-foreground">{s.settings.tagline}</p>
            </div>
          </div>
          <DemoTag text="Secured Demo Gateway" />
        </div>

        {/* Quick Persona Buttons for instant testing */}
        <div className="mb-6 space-y-1.5 rounded-xl border bg-card/60 p-3 text-xs">
          <p className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
            Quick Persona Switcher:
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: "UN-1001", label: "Owner (Amanat)" },
              { id: "UN-1002", label: "Super Admin (Riya)" },
              { id: "UN-1003", label: "Admin (Siddharth)" },
              { id: "UN-1004", label: "Dept Head (Arjun)" },
              { id: "UN-1005", label: "HR (Neha)" },
              { id: "UN-1008", label: "Employee (Rahul)" },
            ].map((persona) => (
              <button
                key={persona.id}
                type="button"
                onClick={() => {
                  setSelectedId(persona.id);
                  const pEmp = s.employees.find((e) => e.id === persona.id);
                  setPassword(pEmp?.password || "password123");
                }}
                className={`rounded-lg border px-2 py-1.5 text-center font-medium transition-all ${
                  selectedId === persona.id
                    ? "border-primary bg-primary text-primary-foreground font-semibold shadow-glow"
                    : "border-border/60 bg-background/50 hover:bg-muted"
                }`}
              >
                {persona.label}
              </button>
            ))}
          </div>
        </div>

        {mode === "login" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Select Employee Account">
              <Select
                value={selectedId}
                onChange={(e) => {
                  setSelectedId(e.target.value);
                  const pEmp = s.employees.find((x) => x.id === e.target.value);
                  setPassword(pEmp?.password || "password123");
                }}
                className="w-full h-10 text-xs"
              >
                {s.employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.id} · {e.name} ({e.role} — {e.designation})
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Account Password">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls + " h-10 text-sm"}
                placeholder="Enter password..."
              />
            </Field>

            <Button type="submit" className="w-full h-10 text-sm font-semibold shadow-glow">
              Authenticate & Enter System
            </Button>

            <div className="flex items-center justify-between text-xs pt-2">
              <button
                type="button"
                className="text-primary hover:underline font-medium"
                onClick={() => {
                  setResetEmail(emp?.email || "rahul@urninja.in");
                  setMode("forgot");
                }}
              >
                Forgot Password?
              </button>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => nav({ to: "/portal" })}
              >
                Client Portal Sign In →
              </button>
            </div>
          </form>
        )}

        {mode === "forgot" && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div className="space-y-1">
              <p className="font-semibold text-sm">Reset Account Password</p>
              <p className="text-xs text-muted-foreground">
                Enter your registered corporate email to receive a simulated one-time passcode (OTP).
              </p>
            </div>
            <Field label="Work Email Address">
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className={inputCls}
                placeholder="name@urninja.in"
              />
            </Field>
            <Button type="submit" className="w-full">
              Send Simulated OTP Code
            </Button>
            <button
              type="button"
              className="w-full text-center text-xs text-primary hover:underline pt-2"
              onClick={() => setMode("login")}
            >
              Back to Sign In
            </button>
          </form>
        )}

        {mode === "otp" && (
          <form onSubmit={handleVerifyOtpAndReset} className="space-y-4">
            <div className="space-y-1">
              <p className="font-semibold text-sm">Verify OTP & Set New Password</p>
              <p className="text-xs text-muted-foreground">
                Enter the 4-digit verification code sent to {resetEmail} (Demo Code: <b>1234</b>).
              </p>
            </div>
            <Field label="Verification Code (OTP)">
              <input
                type="text"
                maxLength={4}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                className={inputCls + " text-center font-mono tracking-widest text-lg font-bold"}
                placeholder="1234"
              />
            </Field>
            <Field label="New Secure Password">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputCls}
                placeholder="Min 6 characters..."
              />
            </Field>
            <Button type="submit" className="w-full">
              Confirm & Save Password
            </Button>
            <button
              type="button"
              className="w-full text-center text-xs text-primary hover:underline pt-2"
              onClick={() => setMode("login")}
            >
              Back to Sign In
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
