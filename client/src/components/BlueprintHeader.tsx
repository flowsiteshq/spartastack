import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Organization } from "../../../drizzle/schema";
import { trpc } from "@/lib/trpc";
import {
  Building2,
  ChevronDown,
  Layers,
  LogOut,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  UserCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";

interface BlueprintHeaderProps {
  organizations: Organization[];
  selectedOrg: Organization | null;
  onSelectOrg: (org: Organization) => void;
  onOpenCreateOrg: () => void;
  activeTab: "tree" | "members" | "analytics";
  onChangeTab: (tab: "tree" | "members" | "analytics") => void;
  user: any;
}

export default function BlueprintHeader({
  organizations,
  selectedOrg,
  onSelectOrg,
  onOpenCreateOrg,
  activeTab,
  onChangeTab,
  user,
}: BlueprintHeaderProps) {
  const utils = trpc.useUtils();
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      toast.info("Logged out from administrator workspace");
    },
  });

  return (
    <header className="border-b border-cyan-400/30 bg-[#07172c]/95 backdrop-blur sticky top-0 z-40">
      {/* Technical Top Dimension Bar */}
      <div className="border-b border-white/10 px-4 py-1 flex items-center justify-between text-[10px] font-mono text-cyan-300/80">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            CAD SYSTEM: ONLINE
          </span>
          <span className="hidden sm:inline text-slate-400">|</span>
          <span className="hidden sm:inline">
            PROJECT: <span className="text-white">MEMBERSTACK_MLM_CAD</span>
          </span>
          <span className="hidden md:inline text-slate-400">|</span>
          <span className="hidden md:inline text-slate-400">
            GEOMETRY: <span className="text-cyan-200">3-LEG TREE × 5 TIERS</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-emerald-400 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            ADMIN_ROLE: VERIFIED
          </span>
          <span className="text-slate-400 hidden sm:inline">|</span>
          <span className="text-slate-300 font-mono hidden sm:inline">SCALE 1:1</span>
        </div>
      </div>

      {/* Main Bar */}
      <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Organization Switcher & Blueprint Title */}
        <div className="flex items-center gap-4">
          {/* Logo / CAD Stamp */}
          <div className="border border-cyan-400/50 bg-[#0d274c] p-1.5 px-2.5 rounded flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <div>
              <span className="text-[10px] block leading-none font-mono text-cyan-300 tracking-wider">
                BLUEPRINT
              </span>
              <span className="text-sm font-bold text-white tracking-wide font-display">
                STACK 3×5
              </span>
            </div>
          </div>

          {/* Org Switcher Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-10 border-white/20 hover:border-cyan-400 bg-[#0a203c] text-white hover:bg-[#0e2a4f] flex items-center gap-2 px-3 text-left font-sans"
              >
                <Building2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <div className="flex flex-col text-left">
                  <span className="text-[10px] text-slate-400 font-mono leading-none">
                    ACTIVE ORGANIZATION
                  </span>
                  <span className="text-xs font-semibold text-white truncate max-w-[170px] sm:max-w-[220px]">
                    {selectedOrg?.name || "Select Organization"}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-72 bg-[#0a203c] border-cyan-400/40 text-white p-1"
            >
              <DropdownMenuLabel className="text-[10px] font-mono text-cyan-300 uppercase tracking-wider">
                Available MLM Networks
              </DropdownMenuLabel>
              {organizations.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => onSelectOrg(org)}
                  className={`cursor-pointer px-3 py-2 text-xs flex items-center justify-between ${
                    selectedOrg?.id === org.id
                      ? "bg-cyan-500/20 text-cyan-200 border-l-2 border-cyan-400"
                      : "hover:bg-[#0e2d53] text-slate-200"
                  }`}
                >
                  <div className="truncate pr-2">
                    <span className="font-medium block truncate">{org.name}</span>
                    <span className="text-[10px] font-mono text-slate-400">{org.code}</span>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#07172c] border border-white/10 text-cyan-300">
                    3×5
                  </span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onClick={onOpenCreateOrg}
                className="cursor-pointer text-xs text-cyan-300 hover:text-cyan-100 hover:bg-cyan-500/20 flex items-center gap-2 px-3 py-2"
              >
                <Plus className="w-3.5 h-3.5" />
                Create New Organization
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Blueprint Code Tag */}
          {selectedOrg?.blueprintCode && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0a203c] border border-cyan-400/25 text-[11px] font-mono text-cyan-300">
              <span className="text-slate-500">SPEC:</span>
              <span>{selectedOrg.blueprintCode}</span>
            </div>
          )}
        </div>

        {/* Center: Navigation Tabs */}
        <div className="flex items-center bg-[#0a203c] border border-white/15 p-0.5 rounded">
          <button
            onClick={() => onChangeTab("tree")}
            className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 rounded ${
              activeTab === "tree"
                ? "bg-cyan-500 text-[#07192f] font-bold shadow"
                : "text-slate-300 hover:text-white hover:bg-white/5"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>3×5 Tree Blueprint</span>
          </button>

          <button
            onClick={() => onChangeTab("members")}
            className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 rounded ${
              activeTab === "members"
                ? "bg-cyan-500 text-[#07192f] font-bold shadow"
                : "text-slate-300 hover:text-white hover:bg-white/5"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Master Directory</span>
          </button>

          <button
            onClick={() => onChangeTab("analytics")}
            className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 rounded ${
              activeTab === "analytics"
                ? "bg-cyan-500 text-[#07192f] font-bold shadow"
                : "text-slate-300 hover:text-white hover:bg-white/5"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Capacity Metrics</span>
          </button>
        </div>

        {/* Right: Administrator Profile & Logout */}
        <div className="flex items-center gap-3">
          {/* Admin Identity Card with Photo */}
          <div className="flex items-center gap-2.5 px-2.5 py-1 rounded bg-[#0a203c] border border-cyan-400/30">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&h=80&q=80"
              alt="Administrator Avatar"
              className="w-7 h-7 rounded object-cover border border-cyan-400/40"
            />
            <div className="hidden sm:block text-left">
              <span className="text-xs font-bold text-white block leading-tight">
                {user?.name || "System Admin"}
              </span>
              <span className="text-[9px] font-mono text-cyan-300 block uppercase">
                ADMINISTRATOR // AUTH
              </span>
            </div>
          </div>

          <Button
            onClick={() => logoutMutation.mutate()}
            variant="outline"
            size="sm"
            className="h-8 border-white/20 hover:border-red-400 hover:bg-red-950/40 text-slate-300 hover:text-red-200 text-xs font-mono px-2"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline ml-1">Sign Out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
