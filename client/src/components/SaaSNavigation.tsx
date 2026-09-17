import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  BarChart3,
  Bell,
  Bookmark,
  ChevronDown,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Home,
  Layers,
  LogOut,
  Network,
  Search,
  Settings,
  Share2,
  Shield,
  Shuffle,
  Sliders,
  Sparkles,
  Upload,
  Users,
  Workflow,
  Wrench,
} from "lucide-react";
import { useState } from "react";

export type ActiveView =
  | "chart"
  | "dashboard"
  | "members"
  | "random-stack"
  | "autofill"
  | "saved-charts"
  | "import-export"
  | "settings";

interface SaaSNavigationProps {
  activeView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  onGlobalSearch?: (term: string) => void;
  onOpenRandomStack?: () => void;
  onOpenAutoFill?: () => void;
  onOpenActivityDrawer?: () => void;
  user?: any;
}

export default function SaaSNavigation({
  activeView,
  onSelectView,
  onGlobalSearch,
  onOpenRandomStack,
  onOpenAutoFill,
  onOpenActivityDrawer,
  user,
}: SaaSNavigationProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      window.location.reload();
    },
  });

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    onGlobalSearch?.(val);
  };

  return (
    <>
      {/* ======================================================== */}
      {/* Top Application Header */}
      {/* ======================================================== */}
      <header className="sticky top-0 z-40 bg-[#0c1626] border-b border-slate-800 text-white flex items-center justify-between px-4 sm:px-6 h-16 shadow-sm">
        {/* Left: Brand Monogram & Top Tabs */}
        <div className="flex items-center gap-6">
          {/* MS Logo in Top Nav */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onSelectView("chart")}>
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center shadow-md">
              <span className="font-extrabold text-slate-950 text-base tracking-tighter">MS</span>
            </div>
            <div className="hidden lg:block leading-none">
              <div className="font-extrabold text-sm tracking-wider text-white">MEMBERSTACK</div>
              <div className="text-[9px] text-slate-400 font-medium tracking-widest mt-0.5">
                PEOPLE • POWER • POSSIBILITIES
              </div>
            </div>
          </div>

          {/* Horizontal Top Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-[#132034] p-1 rounded-lg border border-slate-700/60 text-xs font-semibold">
            <button
              onClick={() => onSelectView("dashboard")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                activeView === "dashboard"
                  ? "bg-[#1d70f5] text-white shadow"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => onSelectView("chart")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                activeView === "chart"
                  ? "bg-[#1d70f5] text-white shadow"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Organization</span>
            </button>

            <button
              onClick={() => onSelectView("members")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                activeView === "members"
                  ? "bg-[#1d70f5] text-white shadow"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Members</span>
            </button>

            <button
              onClick={() => onSelectView("saved-charts")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                activeView === "saved-charts"
                  ? "bg-[#1d70f5] text-white shadow"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Tools</span>
            </button>

            <button
              onClick={() => onSelectView("import-export")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                activeView === "import-export"
                  ? "bg-[#1d70f5] text-white shadow"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Reports</span>
            </button>

            <button
              onClick={() => onSelectView("settings")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                activeView === "settings"
                  ? "bg-[#1d70f5] text-white shadow"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>
          </nav>
        </div>

        {/* Right: Global Member Search, Alerts & Administrator Profile */}
        <div className="flex items-center gap-3">
          {/* Global Search */}
          <div className="relative w-44 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <Input
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 pr-3 h-9 bg-white text-slate-800 placeholder:text-slate-400 rounded-full text-xs border border-slate-300 focus:border-blue-500 shadow-inner"
            />
          </div>

          {/* Notifications Icon with Badge 3 */}
          <button
            onClick={onOpenActivityDrawer}
            className="relative p-2 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="View Recent Activity"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              3
            </span>
          </button>

          {/* Administrator Profile Pill */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-2.5 pl-2 cursor-pointer group">
                <Avatar className="w-9 h-9 border-2 border-amber-400 shadow-sm">
                  <AvatarImage src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80" />
                  <AvatarFallback className="bg-amber-600 text-white font-bold text-xs">LM</AvatarFallback>
                </Avatar>
                <div className="hidden xl:block text-left leading-tight">
                  <div className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
                    Lead Matrix Architect
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">Administrator</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white border border-slate-200 text-slate-800 shadow-lg rounded-xl">
              <DropdownMenuLabel className="font-bold text-xs text-slate-500 uppercase tracking-wider">
                Lead Administrator
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onSelectView("dashboard")} className="cursor-pointer text-xs">
                <Home className="w-4 h-4 mr-2 text-blue-600" />
                Executive Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSelectView("settings")} className="cursor-pointer text-xs">
                <Sliders className="w-4 h-4 mr-2 text-slate-500" />
                Chart Configuration
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenActivityDrawer} className="cursor-pointer text-xs">
                <FileText className="w-4 h-4 mr-2 text-slate-500" />
                Audit Activity Log
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  logoutMutation.mutate();
                }}
                className="cursor-pointer text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </>
  );
}

/**
 * Dark Navy Persistent Left Sidebar
 */
export function SaaSSidebar({
  activeView,
  onSelectView,
  onOpenRandomStack,
  onOpenAutoFill,
}: {
  activeView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  onOpenRandomStack?: () => void;
  onOpenAutoFill?: () => void;
}) {
  return (
    <aside className="w-64 bg-[#0a121e] border-r border-slate-800/80 text-white flex flex-col justify-between min-h-[calc(100vh-4rem)] p-4 flex-shrink-0">
      {/* Top Menu Links */}
      <div className="space-y-6">
        <div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
            Organization
          </div>
          <nav className="space-y-1">
            {/* View Chart */}
            <button
              onClick={() => onSelectView("chart")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                activeView === "chart"
                  ? "bg-[#1d70f5] text-white shadow-md font-bold"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Network className="w-4 h-4" />
              <span>View Chart</span>
            </button>

            {/* Manage Members */}
            <button
              onClick={() => onSelectView("members")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                activeView === "members"
                  ? "bg-[#1d70f5] text-white shadow-md font-bold"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Manage Members</span>
            </button>

            {/* Random Stack */}
            <button
              onClick={() => {
                if (activeView !== "chart") onSelectView("chart");
                onOpenRandomStack?.();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all"
            >
              <Shuffle className="w-4 h-4 text-cyan-400" />
              <span>Random Stack</span>
            </button>

            {/* Auto-Fill */}
            <button
              onClick={() => {
                if (activeView !== "chart") onSelectView("chart");
                onOpenAutoFill?.();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all"
            >
              <Workflow className="w-4 h-4 text-emerald-400" />
              <span>Auto-Fill</span>
            </button>

            {/* Saved Charts */}
            <button
              onClick={() => onSelectView("saved-charts")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                activeView === "saved-charts"
                  ? "bg-[#1d70f5] text-white shadow-md font-bold"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Bookmark className="w-4 h-4" />
              <span>Saved Charts</span>
            </button>

            {/* Import / Export */}
            <button
              onClick={() => onSelectView("import-export")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                activeView === "import-export"
                  ? "bg-[#1d70f5] text-white shadow-md font-bold"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Share2 className="w-4 h-4" />
              <span>Import / Export</span>
            </button>

            {/* Chart Settings */}
            <button
              onClick={() => onSelectView("settings")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                activeView === "settings"
                  ? "bg-[#1d70f5] text-white shadow-md font-bold"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Chart Settings</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Bottom Mountain Graphic with Motivational Slogan (Matching Mockup exactly!) */}
      <div className="relative rounded-xl overflow-hidden mt-6 border border-slate-700/60 shadow-lg group">
        <img
          src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=80"
          alt="Build Lead Inspire Grow"
          className="w-full h-44 object-cover brightness-75 group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent flex flex-col justify-end p-3.5">
          <div className="font-extrabold text-sm tracking-wider text-white leading-tight">
            BUILD<br />
            LEAD<br />
            INSPIRE<br />
            GROW
          </div>
          <p className="text-[10px] text-amber-300 font-medium italic mt-2 leading-snug">
            "A STRONGER TOMORROW BUILDS TODAY."
          </p>
        </div>
      </div>
    </aside>
  );
}
