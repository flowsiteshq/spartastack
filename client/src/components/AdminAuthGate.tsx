import { Button } from "@/components/ui/button";
import SpartanBrand, { SPARTAN_EMBLEM_URL } from "@/components/SpartanBrand";
import { startGoogleLogin } from "@/const";
import {
  AlertCircle,
  ArrowRight,
  LockKeyhole,
  Network,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

interface AdminAuthGateProps {
  errorCode?: string | null;
}

const authErrors: Record<string, { title: string; detail: string }> = {
  google_cancelled: {
    title: "Sign-in was cancelled",
    detail: "Choose an approved Google account to continue.",
  },
  access_denied: {
    title: "This Google account could not be verified",
    detail: "Use a verified Google account, then match your email or phone number to an existing network profile.",
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

const experienceCards = [
  {
    title: "Member management",
    detail: "Manage profiles, membership status, roles, and organization access.",
    Icon: UsersRound,
  },
  {
    title: "Connected organizations",
    detail: "Bring chapters, schools, teams, and affiliated organizations together.",
    Icon: Network,
  },
  {
    title: "Private & secure",
    detail: "Members only see the information and tools they are authorized to access.",
    Icon: ShieldCheck,
  },
];

export default function AdminAuthGate({ errorCode }: AdminAuthGateProps) {
  const message = errorCode ? authErrors[errorCode] : undefined;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0b0a09] p-0 sm:flex sm:items-center sm:justify-center sm:p-4 lg:p-5">
      {/* Warm brand glow around the desktop presentation surface */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-48 top-[14%] h-[32rem] w-[32rem] rounded-full bg-[#d3aa54]/10 blur-[120px]" />
        <div className="absolute -bottom-64 right-[8%] h-[38rem] w-[38rem] rounded-full bg-[#9d2025]/10 blur-[140px]" />
      </div>

      <section className="relative z-10 grid min-h-screen w-full overflow-hidden bg-white sm:min-h-0 sm:max-w-[1500px] sm:rounded-[1.65rem] sm:border sm:border-[#d3aa54]/70 sm:shadow-[0_30px_100px_-36px_rgba(0,0,0,0.92)] lg:grid-cols-[0.94fr_1.06fr]">
        {/* Auth action panel */}
        <div className="relative flex min-h-[640px] flex-col bg-[#fffefd] px-6 py-7 sm:min-h-[780px] sm:px-10 sm:py-9 lg:px-[10%] lg:py-[7.2%]">
          <div className="flex-1">
            <SpartanBrand tone="light" className="scale-[1.02] origin-left" />

            <div className="mt-12 max-w-[34rem] sm:mt-16">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#eadcbf] bg-[#faf4e7] px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.11em] text-[#755425]">
                <LockKeyhole className="h-3.5 w-3.5" />
                Secure member network
              </div>

              <h1 className="mt-6 text-[2.7rem] font-black leading-[0.99] tracking-[-0.06em] text-[#12110f] sm:text-5xl lg:text-[3.8rem]">
                One login.
                <br />
                Your entire <span className="bg-gradient-to-r from-[#a12625] via-[#b4812e] to-[#d7aa4d] bg-clip-text text-transparent">Spartan Nation.</span>
              </h1>

              <p className="mt-4 max-w-[29rem] text-[15px] leading-6 text-slate-500 sm:text-base sm:leading-7">
                Connect with your organization, manage your membership, and access everything available through Spartan Stack.
              </p>
            </div>

            {message && (
              <div role="alert" className="mt-7 flex max-w-[34rem] gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-950">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div>
                  <p className="font-bold">{message.title}</p>
                  <p className="mt-0.5 leading-5 text-amber-800">{message.detail}</p>
                </div>
              </div>
            )}

            <div className="mt-7 max-w-[34rem] sm:mt-9">
              <Button
                onClick={startGoogleLogin}
                className="group h-14 w-full rounded-xl border border-[#d7d2ca] bg-white px-5 text-[15px] font-extrabold text-[#191714] shadow-[0_3px_0_rgba(38,29,20,0.05),0_8px_20px_rgba(38,29,20,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#c79b46] hover:bg-[#fffdf8] hover:shadow-[0_5px_0_rgba(38,29,20,0.04),0_15px_25px_rgba(38,29,20,0.12)] active:translate-y-0 active:scale-[0.985] focus-visible:ring-[#9d2025]"
              >
                <GoogleMark />
                <span className="ml-4">Continue with Google</span>
                <ArrowRight className="ml-auto h-4 w-4 text-[#695d4d] transition-transform duration-200 group-hover:translate-x-1" />
              </Button>

              <p className="mt-4 text-center text-xs leading-5 text-slate-500">
                Sign in securely to access your Spartan Stack membership and organization.
              </p>

              <div className="mt-4 flex gap-3 rounded-xl border border-[#edf0f3] bg-[#f5f7f9] px-4 py-3 text-xs leading-5 text-slate-600">
                <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-[#6c7480]" />
                <p>Your organization controls access. Your profile information remains private unless you choose to share it.</p>
              </div>
            </div>
          </div>

          <div className="mt-10 border-t border-[#e8e4dc] pt-5 sm:mt-14">
            <p className="text-sm font-extrabold text-[#23201b]">New to Spartan Stack?</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">Your organization administrator will invite you.</p>
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              <span>Members</span>
              <span className="h-4 w-px bg-[#c79b46]" />
              <span>Organizations</span>
              <span className="h-4 w-px bg-[#c79b46]" />
              <span>Community</span>
              <span className="h-4 w-px bg-[#c79b46]" />
              <span>Opportunity</span>
            </div>
          </div>
        </div>

        {/* Brand and security story panel (desktop presentation) */}
        <aside className="relative hidden overflow-hidden border-l border-[#5d4227] bg-[#100d0b] px-8 py-9 text-white lg:flex lg:min-h-[780px] lg:flex-col lg:justify-between xl:px-[9%] xl:py-[7.2%]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_30%,rgba(173,112,38,0.42)_0%,rgba(53,30,18,0.18)_30%,rgba(10,9,8,0.12)_55%,rgba(10,9,8,0.9)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(8,8,8,0.97)_0%,rgba(13,11,10,0.78)_52%,rgba(31,18,12,0.26)_100%)]" />
          <div className="absolute -right-[10%] -top-[11%] h-[720px] w-[720px] rounded-full border border-[#d3aa54]/15" />
          <div className="absolute right-[8%] top-[12%] h-[500px] w-[500px] rounded-full border border-[#d3aa54]/10" />
          <img
            src={SPARTAN_EMBLEM_URL}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 top-3 h-[38rem] w-[38rem] object-contain opacity-[0.30] mix-blend-screen xl:-right-10 xl:h-[43rem] xl:w-[43rem]"
          />
          <div className="absolute bottom-0 right-0 h-[64%] w-full bg-[radial-gradient(ellipse_at_94%_70%,rgba(151,30,28,0.38)_0%,transparent_42%)]" />

          <div className="relative max-w-[38rem]">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d3aa54]/70 bg-[#150f0a]/65 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#f2e1ae] shadow-lg backdrop-blur-md">
              <img src={SPARTAN_EMBLEM_URL} alt="" aria-hidden="true" className="h-5 w-5 object-contain" />
              Powered by <span className="text-[#e3bd60]">Spartan Nation</span>
            </div>

            <h2 className="mt-10 max-w-[34rem] text-4xl font-black leading-[1.04] tracking-[-0.045em] text-white xl:text-[3.45rem]">
              Your organization.
              <br />
              Your members.
              <br />
              <span className="text-[#e0b653]">One powerful network.</span>
            </h2>
            <p className="mt-4 max-w-[34rem] text-base leading-7 text-slate-200">
              Everything your organization needs to connect, manage, and grow its community.
            </p>
          </div>

          <div className="relative space-y-3.5">
            {experienceCards.map(({ title, detail, Icon }) => (
              <div key={title} className="group flex items-center gap-4 rounded-2xl border border-[#c89b41]/85 bg-[#140f0c]/74 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-md transition-colors hover:bg-[#1c1510]/90">
                <div className="flex h-[68px] w-[76px] shrink-0 items-center justify-center rounded-xl border border-[#c89b41]/60 bg-[radial-gradient(circle_at_45%_40%,rgba(183,132,50,0.26),rgba(31,20,13,0.92)_75%)] text-[#e4bb5b]">
                  <Icon className="h-8 w-8" strokeWidth={1.65} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold uppercase tracking-[0.09em] text-[#f0ce79]">{title}</p>
                  <p className="mt-1 max-w-[25rem] text-sm leading-5 text-slate-100">{detail}</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#d3aa54]/50 text-[#efcf78] transition-transform duration-200 group-hover:translate-x-0.5">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            ))}
          </div>

          <div className="relative pt-4 text-center">
            <div className="flex items-center gap-4 text-[#d3aa54]">
              <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#d3aa54]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.52em]">Stronger together</span>
              <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#d3aa54]" />
            </div>
            <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.38em] text-slate-300">People&nbsp;&nbsp; | &nbsp;&nbsp;Purpose&nbsp;&nbsp; | &nbsp;&nbsp;Progress</p>
          </div>
        </aside>
      </section>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="h-6 w-6 shrink-0" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M21.8 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.5a4.7 4.7 0 0 1-2.04 3.08v2.52h3.31c1.94-1.79 3.03-4.42 3.03-7.43Z" />
      <path fill="#34A853" d="M12 22c2.75 0 5.06-.91 6.75-2.46l-3.31-2.52c-.92.62-2.09.99-3.44.99-2.65 0-4.9-1.79-5.7-4.2H2.88v2.6A10.2 10.2 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.3 13.81A6.13 6.13 0 0 1 5.98 12c0-.63.11-1.24.32-1.81v-2.6H2.88A10 10 0 0 0 1.8 12c0 1.61.39 3.13 1.08 4.41l3.42-2.6Z" />
      <path fill="#EA4335" d="M12 5.99c1.5 0 2.85.52 3.91 1.53l2.93-2.93C17.05 2.93 14.74 2 12 2a10.2 10.2 0 0 0-9.12 5.59l3.42 2.6c.8-2.41 3.05-4.2 5.7-4.2Z" />
    </svg>
  );
}
