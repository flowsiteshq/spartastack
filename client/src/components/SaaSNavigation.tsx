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
import SpartanBrand from "@/components/SpartanBrand";
import {
  BarChart3,
  Bell,
  Bookmark,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
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
  MessageSquare,
} from "lucide-react";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type ActiveView =
  | "chart"
  | "dashboard"
  | "members"
  | "messages"
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
      <header className="hidden md:flex sticky top-0 z-40 bg-[#100e0e] border-b border-[#3d3325] text-white items-center justify-between px-4 sm:px-6 h-16 shadow-sm">
        {/* Left: Brand Monogram & Top Tabs */}
        <div className="flex items-center gap-6">
          <SpartanBrand className="hidden sm:flex" onClick={() => onSelectView("chart")} />
          <SpartanBrand compact className="sm:hidden" onClick={() => onSelectView("chart")} />

          {/* Horizontal Top Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-[#211c19] p-1 rounded-lg border border-[#463a2c] text-xs font-semibold">
            <button
              onClick={() => onSelectView("dashboard")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                activeView === "dashboard"
                  ? "bg-[#9d2025] text-white shadow"
                  : "text-slate-300 hover:text-white hover:bg-[#322a25]"
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => onSelectView("chart")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                activeView === "chart"
                  ? "bg-[#9d2025] text-white shadow"
                  : "text-slate-300 hover:text-white hover:bg-[#322a25]"
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Organization</span>
            </button>

            <button
              onClick={() => onSelectView("members")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                activeView === "members"
                  ? "bg-[#9d2025] text-white shadow"
                  : "text-slate-300 hover:text-white hover:bg-[#322a25]"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Members</span>
            </button>

            <button
              onClick={() => onSelectView("messages")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                activeView === "messages"
                  ? "bg-[#9d2025] text-white shadow"
                  : "text-slate-300 hover:text-white hover:bg-[#322a25]"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Messages</span>
            </button>

            <button
              onClick={() => onSelectView("saved-charts")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                activeView === "saved-charts"
                  ? "bg-[#9d2025] text-white shadow"
                  : "text-slate-300 hover:text-white hover:bg-[#322a25]"
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Tools</span>
            </button>

            <button
              onClick={() => onSelectView("import-export")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                activeView === "import-export"
                  ? "bg-[#9d2025] text-white shadow"
                  : "text-slate-300 hover:text-white hover:bg-[#322a25]"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Reports</span>
            </button>

            <button
              onClick={() => onSelectView("settings")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                activeView === "settings"
                  ? "bg-[#9d2025] text-white shadow"
                  : "text-slate-300 hover:text-white hover:bg-[#322a25]"
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
              className="pl-9 pr-3 h-9 bg-white text-slate-800 placeholder:text-slate-400 rounded-full text-xs border border-slate-300 focus:border-[#9d2025] shadow-inner"
            />
          </div>

          {/* Notifications Icon with Badge 3 */}
          <button
            onClick={onOpenActivityDrawer}
            className="relative p-2 rounded-full hover:bg-[#322a25] text-slate-300 hover:text-white transition-colors"
            title="View Recent Activity"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#9d2025] text-white text-[10px] font-bold flex items-center justify-center">
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
                  <div className="text-xs font-bold text-white group-hover:text-[#e3c578] transition-colors">
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
                <Home className="w-4 h-4 mr-2 text-[#9d2025]" />
                Executive Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSelectView("messages")} className="cursor-pointer text-xs">
                <MessageSquare className="w-4 h-4 mr-2 text-[#9d2025]" />
                Messages & Outreach
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
  isCollapsed = false,
  onToggleCollapsed,
}: {
  activeView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  onOpenRandomStack?: () => void;
  onOpenAutoFill?: () => void;
  isCollapsed?: boolean;
  onToggleCollapsed?: () => void;
}) {
  const navItemClass = (isActive: boolean) =>
    `group relative flex w-full items-center rounded-lg py-2.5 text-xs font-semibold transition-[background-color,color,padding] duration-200 ease-out ${
      isCollapsed ? "justify-center px-2" : "gap-3 px-3"
    } ${
      isActive
        ? "bg-gradient-to-r from-[#9d2025] to-[#74171b] text-white shadow-md font-bold ring-1 ring-[#d3aa54]/35"
        : "text-slate-300 hover:text-white hover:bg-[#292321]"
    }`;

  const actionItemClass =
    `group relative flex w-full items-center rounded-lg py-2.5 text-xs font-semibold text-slate-300 transition-[background-color,color,padding] duration-200 ease-out hover:text-white hover:bg-[#292321] ${
      isCollapsed ? "justify-center px-2" : "gap-3 px-3"
    }`;

  const SidebarItem = ({
    label,
    icon,
    active = false,
    onClick,
    action = false,
  }: {
    label: string;
    icon: React.ReactNode;
    active?: boolean;
    onClick: () => void;
    action?: boolean;
  }) => {
    const button = (
      <button onClick={onClick} className={action ? actionItemClass : navItemClass(active)} aria-label={label}>
        <span className="flex h-4 w-4 shrink-0 items-center justify-center">{icon}</span>
        <span
          className={`whitespace-nowrap overflow-hidden transition-[max-width,opacity,margin] duration-200 ease-out ${
            isCollapsed ? "max-w-0 opacity-0" : "max-w-[150px] opacity-100"
          }`}
        >
          {label}
        </span>
      </button>
    );

    if (!isCollapsed) return button;

    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={12} className="bg-[#211c19] text-white border border-[#5a4934]">
          {label}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <aside
      className={`relative bg-[#0d0d0e] border-r border-[#3d3325] text-white hidden md:flex flex-col justify-between min-h-[calc(100vh-4rem)] p-4 flex-shrink-0 transition-[width] duration-300 ease-out ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      <button
        type="button"
        onClick={onToggleCollapsed}
        className="absolute -right-3 top-5 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-[#79613a] bg-[#211c19] text-[#e5c677] shadow-md transition-colors hover:bg-[#9d2025] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d3aa54]"
        aria-label={isCollapsed ? "Expand navigation" : "Collapse navigation"}
        title={isCollapsed ? "Expand navigation" : "Collapse navigation"}
      >
        {isCollapsed ? <ChevronsRight className="h-3.5 w-3.5" /> : <ChevronsLeft className="h-3.5 w-3.5" />}
      </button>

      {/* Top Menu Links */}
      <div className="space-y-6">
        <div>
          <div
            className={`text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 transition-[max-width,opacity,padding] duration-200 ease-out overflow-hidden ${
              isCollapsed ? "max-w-0 opacity-0 px-0" : "max-w-[180px] opacity-100 px-3"
            }`}
          >
            Organization
          </div>
          <nav className="space-y-1">
            <SidebarItem label="View Chart" icon={<Network className="w-4 h-4" />} active={activeView === "chart"} onClick={() => onSelectView("chart")} />
            <SidebarItem label="Manage Members" icon={<Users className="w-4 h-4" />} active={activeView === "members"} onClick={() => onSelectView("members")} />
            <SidebarItem label="Messages" icon={<MessageSquare className="w-4 h-4" />} active={activeView === "messages"} onClick={() => onSelectView("messages")} />
            <SidebarItem
              label="Random Stack"
              icon={<Shuffle className="w-4 h-4 text-[#d3aa54]" />}
              action
              onClick={() => {
                if (activeView !== "chart") onSelectView("chart");
                onOpenRandomStack?.();
              }}
            />
            <SidebarItem
              label="Auto-Fill"
              icon={<Workflow className="w-4 h-4 text-[#c9c9c9]" />}
              action
              onClick={() => {
                if (activeView !== "chart") onSelectView("chart");
                onOpenAutoFill?.();
              }}
            />
            <SidebarItem label="Saved Charts" icon={<Bookmark className="w-4 h-4" />} active={activeView === "saved-charts"} onClick={() => onSelectView("saved-charts")} />
            <SidebarItem label="Import / Export" icon={<Share2 className="w-4 h-4" />} active={activeView === "import-export"} onClick={() => onSelectView("import-export")} />
            <SidebarItem label="Chart Settings" icon={<Settings className="w-4 h-4" />} active={activeView === "settings"} onClick={() => onSelectView("settings")} />
          </nav>
        </div>
      </div>

      {/* Bottom leadership message */}
      <div className={`relative rounded-xl overflow-hidden mt-6 border border-[#6e5529]/70 shadow-lg group transition-[max-height,opacity,padding] duration-200 ease-out ${isCollapsed ? "max-h-0 opacity-0 border-transparent" : "max-h-52 opacity-100"}`}>
        <img
          src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=80"
          alt="Spartan leadership and growth"
          className="w-full h-44 object-cover brightness-75 group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#100e0e] via-[#100e0e]/65 to-transparent flex flex-col justify-end p-3.5">
          <div className="font-extrabold text-sm tracking-wider text-white leading-tight">
            BUILD<br />
            LEAD<br />
            INSPIRE<br />
            GROW
          </div>
          <p className="text-[10px] text-[#d8b865] font-medium italic mt-2 leading-snug">
            "DISCIPLINE CREATES LEGACY."
          </p>
        </div>
      </div>
    </aside>
  );
}
