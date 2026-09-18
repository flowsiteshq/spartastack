import { Button } from "@/components/ui/button";
import SpartanBrand from "@/components/SpartanBrand";
import { startGoogleLogin } from "@/const";
import { AlertCircle, ArrowRight, CheckCircle2, LockKeyhole, ShieldCheck, UsersRound } from "lucide-react";

interface AdminAuthGateProps {
  errorCode?: string | null;
}

const authErrors: Record<string, { title: string; detail: string }> = {
  google_cancelled: {
    title: "Sign-in was cancelled",
    detail: "Choose an approved Google account to continue.",
  },
  access_denied: {
    title: "This Google account is not authorized",
    detail: "Use an administrator account or ask an existing administrator to add your email.",
  },
  invalid_google_state: {
    title: "Your sign-in session expired",
    detail: "For your security, please start the Google sign-in process again.",
  },
  google_signin_failed: {
    title: "Google sign-in could not be completed",
    detail: "Please try again. If the issue continues, review the Google OAuth configuration.",
  },
  google_not_configured: {
    title: "Google sign-in is still being configured",
    detail: "The administrator needs to finish the secure Google OAuth setup before access can be granted.",
  },
};

export default function AdminAuthGate({ errorCode }: AdminAuthGateProps) {
  const message = errorCode ? authErrors[errorCode] : undefined;

  return (
    <main className="min-h-screen bg-[#f7f6f3] p-4 sm:p-6 lg:p-8 flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-36 right-[20%] h-[30rem] w-[30rem] rounded-full bg-[#d3aa54]/15 blur-3xl" />
        <div className="absolute -bottom-48 left-[8%] h-[32rem] w-[32rem] rounded-full bg-[#9d2025]/10 blur-3xl" />
      </div>

      <section className="relative z-10 w-full max-w-6xl overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_28px_80px_-32px_rgba(15,23,42,0.32)] grid lg:grid-cols-[0.97fr_1.03fr]">
        <div className="p-7 sm:p-10 lg:p-14 flex flex-col justify-between min-h-[560px]">
          <div>
            <SpartanBrand tone="light" className="mb-4" />

            <div className="mt-14 max-w-md">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#f6edda] px-3 py-1.5 text-xs font-bold text-[#76521d]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Secure administrator workspace
              </div>
              <h1 className="text-4xl font-extrabold leading-[1.08] tracking-[-0.045em] text-slate-950 sm:text-5xl">
                Your organization, clearly connected.
              </h1>
              <p className="mt-5 text-base leading-7 text-slate-500">
                Sign in to manage your member directory, place teams in the 3 × 5 chart, and preserve every planning decision.
              </p>
            </div>

            {message && (
              <div role="alert" className="mt-7 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-950">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div>
                  <p className="font-bold">{message.title}</p>
                  <p className="mt-0.5 leading-5 text-amber-800">{message.detail}</p>
                </div>
              </div>
            )}

            <div className="mt-8 max-w-md">
              <Button
                onClick={startGoogleLogin}
                className="group h-13 w-full rounded-xl border border-[#d7d0c5] bg-white px-5 text-[15px] font-bold text-[#1d1b18] shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#d3aa54] hover:bg-[#fffdf9] hover:shadow-md focus-visible:ring-[#a02025]"
              >
                <GoogleMark />
                Continue with Google
                <ArrowRight className="ml-auto h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5" />
              </Button>
              <p className="mt-4 flex items-start gap-2 px-1 text-xs leading-5 text-slate-400">
                <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Access is limited to verified Google accounts approved by your organization’s administrator.
              </p>
            </div>
          </div>

          <div className="mt-12 flex items-center gap-3 border-t border-slate-100 pt-6 text-xs text-slate-400">
            <LockKeyhole className="h-4 w-4 text-slate-400" />
            <span>Protected access for authorized organization administrators.</span>
          </div>
        </div>

        <aside className="relative hidden overflow-hidden bg-[#100e0e] px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between">
          <img
            src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1500&q=85"
            alt="Colleagues collaborating around a shared plan"
            className="absolute inset-0 h-full w-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(16,14,14,0.94)_0%,rgba(57,25,17,0.88)_56%,rgba(16,14,14,0.97)_100%)]" />
          <div className="absolute -right-24 top-20 h-72 w-72 rounded-full border border-[#d3aa54]/20" />
          <div className="absolute -right-8 top-36 h-48 w-48 rounded-full border border-[#d3aa54]/20" />

          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#d3aa54]/35 bg-[#d3aa54]/10 px-3 py-1.5 text-xs font-semibold text-[#f0deb4] backdrop-blur-sm">
              <UsersRound className="h-3.5 w-3.5" />
              Built for connected teams
            </span>
            <h2 className="mt-7 max-w-sm text-3xl font-bold leading-tight tracking-[-0.035em]">
              See the whole team. Make every placement count.
            </h2>
          </div>

          <div className="relative space-y-4">
            {[
              ["Live organization chart", "See placements, openings, and lock states at a glance."],
              ["Controlled planning", "Save versions before trying a new stacking strategy."],
              ["Administrator safeguards", "Only assigned administrators can make changes."],
            ].map(([title, detail]) => (
              <div key={title} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#d3aa54]" />
                <div>
                  <p className="text-sm font-bold text-white">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-300">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M21.8 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.5a4.7 4.7 0 0 1-2.04 3.08v2.52h3.31c1.94-1.79 3.03-4.42 3.03-7.43Z" />
      <path fill="#34A853" d="M12 22c2.75 0 5.06-.91 6.75-2.46l-3.31-2.52c-.92.62-2.09.99-3.44.99-2.65 0-4.9-1.79-5.7-4.2H2.88v2.6A10.2 10.2 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.3 13.81A6.13 6.13 0 0 1 5.98 12c0-.63.11-1.24.32-1.81v-2.6H2.88A10 10 0 0 0 1.8 12c0 1.61.39 3.13 1.08 4.41l3.42-2.6Z" />
      <path fill="#EA4335" d="M12 5.99c1.5 0 2.85.52 3.91 1.53l2.93-2.93C17.05 2.93 14.74 2 12 2a10.2 10.2 0 0 0-9.12 5.59l3.42 2.6c.8-2.41 3.05-4.2 5.7-4.2Z" />
    </svg>
  );
}
