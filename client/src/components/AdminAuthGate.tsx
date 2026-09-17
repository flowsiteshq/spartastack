import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { Cpu, Lock, Shield, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface AdminAuthGateProps {
  onAuthenticated?: () => void;
}

export default function AdminAuthGate({ onAuthenticated }: AdminAuthGateProps) {
  const [loadingDemo, setLoadingDemo] = useState(false);
  const utils = trpc.useUtils();

  const loginAsAdminMutation = trpc.auth.loginAsAdmin.useMutation({
    onSuccess: (data) => {
      toast.success("Administrator clearance granted", {
        description: `Logged in as ${data.user?.name || "System Administrator"}`,
      });
      utils.auth.me.invalidate();
      if (onAuthenticated) onAuthenticated();
    },
    onError: (err) => {
      toast.error("Authentication failed", { description: err.message });
    },
  });

  const handleAdminQuickLogin = async () => {
    setLoadingDemo(true);
    try {
      await loginAsAdminMutation.mutateAsync({
        adminName: "Lead Matrix Architect",
      });
    } finally {
      setLoadingDemo(false);
    }
  };

  return (
    <div className="min-h-screen blueprint-canvas flex items-center justify-center p-4">
      {/* Ambient CAD Corner Markers */}
      <div className="fixed top-6 left-6 text-cyan-400/60 font-mono text-xs tracking-wider">
        SEC-00 // AUTH_GATEWAY // ARCH_3X5
      </div>
      <div className="fixed top-6 right-6 text-cyan-400/60 font-mono text-xs tracking-wider">
        CAD_SPEC: MIL-STD-3X5 // REV-4.2
      </div>
      <div className="fixed bottom-6 left-6 text-cyan-400/60 font-mono text-xs tracking-wider">
        GRID: 24MM / SCALE: 1:1
      </div>
      <div className="fixed bottom-6 right-6 text-cyan-400/60 font-mono text-xs tracking-wider">
        CLEARANCE: LVL-5 ADMINISTRATOR
      </div>

      <div className="max-w-md w-full relative">
        {/* Outer CAD Border with Corner Crosshairs */}
        <div className="border border-cyan-400/40 bg-[#0a1e38]/95 p-8 shadow-2xl relative">
          {/* Corner Crosshairs */}
          <span className="absolute -top-2.5 -left-2.5 text-cyan-400 font-mono text-sm">+</span>
          <span className="absolute -top-2.5 -right-2.5 text-cyan-400 font-mono text-sm">+</span>
          <span className="absolute -bottom-2.5 -left-2.5 text-cyan-400 font-mono text-sm">+</span>
          <span className="absolute -bottom-2.5 -right-2.5 text-cyan-400 font-mono text-sm">+</span>

          {/* Technical Blueprint Header Stamp */}
          <div className="border-b border-cyan-400/20 pb-4 mb-6">
            <div className="flex items-center justify-between text-[11px] font-mono text-cyan-300 uppercase tracking-widest mb-1">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-cyan-400" /> Secure Admin Workspace
              </span>
              <span>SPEC-3X5</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white font-display">
              MemberStack Planner
            </h1>
            <p className="text-xs text-slate-300 mt-1 font-mono">
              MLM Downline Architecture & Matrix Placement Engine
            </p>
          </div>

          {/* Blueprint Photo Visual (photos on every page preference) */}
          <div className="relative mb-6 border border-white/20 overflow-hidden rounded bg-[#07172c]">
            <img
              src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80"
              alt="Architectural Blueprint Organization Planning"
              className="w-full h-36 object-cover opacity-60 mix-blend-luminosity hover:opacity-80 transition-opacity"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#091a30] via-transparent to-transparent" />
            <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[10px] font-mono text-cyan-300">
              <span>SYSTEM ACCESS: RESTRICTED</span>
              <span className="border border-cyan-400/40 px-1.5 py-0.5 bg-[#091a30]/80">
                VERIFIED ADMINS ONLY
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              This system governs organization hierarchies, master member directories, and
              cryptographically validated 3-leg × 5-level matrix placements. Please authorize to enter
              the workspace.
            </p>

            {/* Instant Admin Login Button */}
            <Button
              onClick={handleAdminQuickLogin}
              disabled={loadingDemo}
              className="w-full h-11 bg-cyan-500 hover:bg-cyan-400 text-[#07192f] font-semibold text-xs tracking-wider uppercase flex items-center justify-center gap-2 border border-cyan-300 shadow-[0_0_15px_rgba(56,189,248,0.3)]"
            >
              <Shield className="w-4 h-4" />
              {loadingDemo ? "Validating Admin Credentials..." : "Enter Workspace as Administrator"}
            </Button>

            <div className="relative my-4 flex items-center justify-center">
              <div className="border-t border-white/15 w-full absolute" />
              <span className="bg-[#0a1e38] px-3 text-[10px] font-mono text-slate-400 uppercase relative">
                OR VIA SINGLE SIGN-ON
              </span>
            </div>

            {/* OAuth Sign-In */}
            <Button
              onClick={() => startLogin()}
              variant="outline"
              className="w-full h-10 border-white/25 hover:border-cyan-400 bg-transparent text-white hover:text-cyan-200 text-xs font-mono tracking-wider uppercase flex items-center justify-center gap-2"
            >
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              Manus OAuth Portal
            </Button>
          </div>

          {/* Blueprint Title Block Footer */}
          <div className="mt-8 pt-4 border-t border-white/10 grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400">
            <div>
              <span className="text-slate-500 block">AUTH POLICY</span>
              <span>ADMINISTRATOR</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block">TOPOLOGY</span>
              <span>3-LEG / 5-LEVEL</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
