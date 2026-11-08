"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Utensils } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase/client";

type Mode = "signin" | "signup" | "otp" | "forgot";
type Step = "form" | "code" | "newpass";

const check = (error: { message: string } | null) => {
  if (error) throw new Error(error.message);
};

export default function LoginPage() {
  const router = useRouter();
  const supabase = getBrowserSupabase();
  const [mode, setMode] = useState<Mode>("signin");
  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  // already signed in? go straight to the app
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace("/app");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // support /login?mode=signup from the landing page
  useEffect(() => {
    const m = new URLSearchParams(window.location.search).get("mode");
    if (m === "signup" || m === "otp") setMode(m);
  }, []);

  const go = (m: Mode) => {
    setMode(m); setStep("form"); setErr(""); setInfo(""); setCode(""); setPassword("");
  };
  const done = () => { router.replace("/app"); router.refresh(); };

  async function run(fn: () => Promise<void>) {
    setBusy(true); setErr(""); setInfo("");
    try { await fn(); }
    catch (e: any) { setErr(e.message ?? "Something went wrong"); }
    finally { setBusy(false); }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    run(async () => {
      const token = code.trim();
      if (mode === "signin") {
        check((await supabase.auth.signInWithPassword({ email, password })).error);
        done();
      } else if (mode === "signup" && step === "form") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        check(error);
        if (data.session) return done(); // email confirmation is off
        setStep("code");
        setInfo("Already have an account? Go back and sign in instead.");
      } else if (mode === "signup" && step === "code") {
        check((await supabase.auth.verifyOtp({ email, token, type: "signup" })).error);
        done();
      } else if (mode === "otp" && step === "form") {
        check((await supabase.auth.signInWithOtp({ email })).error);
        setStep("code");
      } else if (mode === "otp" && step === "code") {
        check((await supabase.auth.verifyOtp({ email, token, type: "email" })).error);
        done();
      } else if (mode === "forgot" && step === "form") {
        check((await supabase.auth.resetPasswordForEmail(email)).error);
        setStep("code");
        setInfo("If that email has an account, a reset code is on its way.");
      } else if (mode === "forgot" && step === "code") {
        check((await supabase.auth.verifyOtp({ email, token, type: "recovery" })).error);
        setStep("newpass");
      } else if (mode === "forgot" && step === "newpass") {
        check((await supabase.auth.updateUser({ password })).error);
        done();
      }
    });
  }

  const copy =
    step === "code"
      ? { h: "Check your email.", p: `Enter the code we sent to ${email}.` }
      : step === "newpass"
        ? { h: "Choose a new password.", p: "Pick something you'll remember." }
        : {
            signin: { h: "Welcome back.", p: "Sign in to pick up where you left off." },
            signup: { h: "Create your account.", p: "Log meals by just typing what you ate." },
            otp: { h: "Get a sign-in code.", p: "We'll email you a code. No password needed." },
            forgot: { h: "Reset your password.", p: "We'll email you a code to set a new one." },
          }[mode];

  const cta =
    step === "code" ? "Verify code"
    : step === "newpass" ? "Save new password"
    : { signin: "Sign in", signup: "Create account", otp: "Email me a code", forgot: "Send reset code" }[mode];

  const showEmail = step === "form";
  const showPassword = ((mode === "signin" || mode === "signup") && step === "form") || step === "newpass";
  const showCode = step === "code";
  const showToggle = step === "form" && (mode === "signin" || mode === "otp");
  const showTerms = step === "form" && (mode === "signup" || mode === "otp");

  const field =
    "h-12 w-full rounded-xl border border-[#dce7de] bg-white px-4 text-base text-[#17231e] outline-none placeholder:text-[#9ca8a0] focus:border-[#28a866]";
  const linkBtn = "min-h-11 text-sm font-medium text-[#208850]";

  return (
    <main className="min-h-dvh bg-[#f6f8f6] px-5 py-8 text-[#17231e]" style={{ colorScheme: "light" }}>
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md flex-col">
        <Link href="/" className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-xl bg-[#d9f5df] text-[#167a46]">
            <Utensils size={16} />
          </div>
          <span className="text-xl font-semibold tracking-tight">
            fork<span className="text-[#28a866]">8</span>
          </span>
        </Link>

        <div className="flex flex-1 flex-col justify-center py-10">
          <h1 className="text-4xl font-semibold tracking-tight">{copy.h}</h1>
          <p className="mt-3 text-[#718078]">{copy.p}</p>

          {showToggle && (
            <div className="mt-7 flex rounded-xl bg-white p-1 text-sm shadow-sm">
              {([["signin", "Password"], ["otp", "Email code"]] as const).map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => go(m)}
                  className={`min-h-10 flex-1 rounded-lg py-2 font-medium ${mode === m ? "bg-[#e2f5e7] text-[#208850]" : "text-[#89968e]"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={submit}
            className={`${showToggle ? "mt-4" : "mt-7"} space-y-3 rounded-3xl bg-white p-5 shadow-[0_4px_20px_-18px_#19352a]`}
          >
            {showEmail && (
              <label className="block text-sm text-[#718078]">
                Email
                <input
                  type="email" required autoComplete="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" className={`mt-2 ${field}`}
                />
              </label>
            )}

            {showPassword && (
              <label className="block text-sm text-[#718078]">
                {step === "newpass" ? "New password" : "Password"}
                <div className="relative mt-2">
                  <input
                    type={showPw ? "text" : "password"} required minLength={8}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters" className={`${field} pr-12`}
                  />
                  <button
                    type="button" onClick={() => setShowPw(!showPw)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                    className="absolute right-1 top-1 grid size-10 place-items-center rounded-lg text-[#89968e]"
                  >
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>
            )}

            {showCode && (
              <label className="block text-sm text-[#718078]">
                Code
                <input
                  inputMode="numeric" autoComplete="one-time-code" required autoFocus maxLength={10}
                  value={code} onChange={(e) => setCode(e.target.value)}
                  placeholder="······" className={`mt-2 ${field} text-center text-xl font-semibold tabular-nums tracking-[0.3em]`}
                />
              </label>
            )}

            {info && <p className="rounded-xl bg-[#eff8f0] px-3 py-2 text-sm text-[#3f5a49]">{info}</p>}
            {err && <p className="rounded-xl bg-[#fdeceb] px-3 py-2 text-sm text-[#b42318]">{err}</p>}

            <button
              disabled={busy}
              className="min-h-14 w-full rounded-2xl bg-[#1e9b59] font-semibold text-white shadow-lg shadow-[#1e9b59]/20 disabled:opacity-60"
            >
              {busy ? "Please wait…" : cta}
            </button>

            {showTerms && (
              <p className="text-center text-xs text-[#89968e]">
                By continuing you agree to our{" "}
                <Link href="/terms" className="underline">Terms</Link> and{" "}
                <Link href="/privacy" className="underline">Privacy Policy</Link>.
              </p>
            )}
          </form>

          <div className="mt-4 flex flex-col items-center">
            {step !== "form" && (
              <button type="button" onClick={() => go(mode)} className={linkBtn}>
                Use a different email
              </button>
            )}
            {step === "form" && mode === "signin" && (
              <button type="button" onClick={() => go("forgot")} className={linkBtn}>Forgot password?</button>
            )}
            {step === "form" && (mode === "signin" || mode === "otp") && (
              <button type="button" onClick={() => go("signup")} className="min-h-11 text-sm text-[#718078]">
                New here? <span className="font-medium text-[#208850]">Create an account</span>
              </button>
            )}
            {step === "form" && (mode === "signup" || mode === "forgot") && (
              <button type="button" onClick={() => go("signin")} className="min-h-11 text-sm text-[#718078]">
                {mode === "signup" ? "Already have an account? " : ""}
                <span className="font-medium text-[#208850]">{mode === "signup" ? "Sign in" : "Back to sign in"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}