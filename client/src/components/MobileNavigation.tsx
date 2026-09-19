import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import SpartanBrand from "@/components/SpartanBrand";
import { trpc } from "@/lib/trpc";
import {
  BarChart3,
  Bell,
  Bookmark,
  ChevronRight,
  FileText,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  Network,
  Search,
  Settings,
  Share2,
  Shield,
  Shuffle,
  Sliders,
  Users,
  Workflow,
  Wrench,
  X,
} from "lucide-react";
import React, { useState } from "react";
import { ActiveView } from "./SaaSNavigation";

interface MobileNavigationProps {
  activeView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  onGlobalSearch?: (term: string) => void;
  onOpenRandomStack?: () => void;
  onOpenAutoFill?: () => void;
  onOpenActivityDrawer?: () => void;
  user?: any;
}

export default function MobileNavigation({
  activeView,
  onSelectView,
  onGlobalSearch,
  onOpenRandomStack,
  onOpenAutoFill,
  onOpenActivityDrawer,
  user,
}: MobileNavigationProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      window.location.reload();
    },
  });

  const handleSelect = (view: ActiveView) => {
    onSelectView(view);
    setDrawerOpen(false);
  };

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    onGlobalSearch?.(val);
  };

  return (
    <>
      {/* Mobile Sticky Top Header */}
      <header className="sticky top-0 z-40 bg-[#100e0e] border-b border-[#3d3325] text-white flex items-center justify-between px-3 h-14 shadow-sm md:hidden">
        <div className="flex items-center gap-2">
          {/* Hamburger Drawer Button */}
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="p-2 -ml-1 text-slate-300 hover:text-white rounded-lg active:bg-[#251f1c]"
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5 text-[#d3aa54]" />
              </button>
            </SheetTrigger>

            <SheetContent side="left" className="w-[84vw] max-w-xs bg-[#0d0d0e] border-r border-[#3d3325] p-0 text-white flex flex-col justify-between">
              <div>
                <SheetHeader className="p-4 border-b border-[#2d251d] text-left">
                  <div className="flex items-center justify-between">
                    <SpartanBrand compact={false} tone="dark" onClick={() => handleSelect("chart")} />
                  </div>
                  <SheetTitle className="sr-only">Spartan Stack Menu</SheetTitle>
                </SheetHeader>

                {/* Navigation items list */}
                <div className="p-3 space-y-6">
                  <div>
                    <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Organization
                    </div>
                    <nav className="space-y-1">
                      <button
                        type="button"
                        onClick={() => handleSelect("chart")}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold ${
                          activeView === "chart"
                            ? "bg-[#9d2025] text-white shadow font-bold"
                            : "text-slate-300 hover:bg-[#231d1a]"
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <Network className="w-4 h-4 text-[#d3aa54]" />
                          <span>View Chart</span>
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelect("members")}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold ${
                          activeView === "members"
                            ? "bg-[#9d2025] text-white shadow font-bold"
                            : "text-slate-300 hover:bg-[#231d1a]"
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <Users className="w-4 h-4 text-[#d3aa54]" />
                          <span>Manage Members</span>
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelect("messages")}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold ${
                          activeView === "messages"
                            ? "bg-[#9d2025] text-white shadow font-bold"
                            : "text-slate-300 hover:bg-[#231d1a]"
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <MessageSquare className="w-4 h-4 text-[#d3aa54]" />
                          <span>Messages & Outreach</span>
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelect("dashboard")}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold ${
                          activeView === "dashboard"
                            ? "bg-[#9d2025] text-white shadow font-bold"
                            : "text-slate-300 hover:bg-[#231d1a]"
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <Home className="w-4 h-4 text-[#d3aa54]" />
                          <span>Executive Dashboard</span>
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDrawerOpen(false);
                          if (activeView !== "chart") onSelectView("chart");
                          onOpenRandomStack?.();
                        }}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-300 hover:bg-[#231d1a]"
                      >
                        <span className="flex items-center gap-2.5">
                          <Shuffle className="w-4 h-4 text-[#d3aa54]" />
                          <span>Random Stack</span>
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDrawerOpen(false);
                          if (activeView !== "chart") onSelectView("chart");
                          onOpenAutoFill?.();
                        }}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-300 hover:bg-[#231d1a]"
                      >
                        <span className="flex items-center gap-2.5">
                          <Workflow className="w-4 h-4 text-slate-300" />
                          <span>Auto-Fill Next</span>
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelect("saved-charts")}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold ${
                          activeView === "saved-charts"
                            ? "bg-[#9d2025] text-white shadow font-bold"
                            : "text-slate-300 hover:bg-[#231d1a]"
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <Bookmark className="w-4 h-4 text-[#d3aa54]" />
                          <span>Saved Charts</span>
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelect("import-export")}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold ${
                          activeView === "import-export"
                            ? "bg-[#9d2025] text-white shadow font-bold"
                            : "text-slate-300 hover:bg-[#231d1a]"
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <Share2 className="w-4 h-4 text-[#d3aa54]" />
                          <span>Import / Export Hub</span>
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelect("settings")}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold ${
                          activeView === "settings"
                            ? "bg-[#9d2025] text-white shadow font-bold"
                            : "text-slate-300 hover:bg-[#231d1a]"
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <Settings className="w-4 h-4 text-[#d3aa54]" />
                          <span>Chart Settings</span>
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>

              {/* Bottom Drawer User Status */}
              <div className="p-4 border-t border-[#2d251d] bg-[#12100f] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="w-8 h-8 border border-[#d3aa54]">
                      <AvatarImage src={user?.avatarUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80"} />
                      <AvatarFallback className="bg-amber-600 text-white text-[10px]">{user?.name?.slice(0, 2).toUpperCase() || "SS"}</AvatarFallback>
                    </Avatar>
                    <div className="text-left leading-tight">
                      <div className="text-xs font-bold text-white truncate max-w-[130px]">
                        {user?.name || "Lead Matrix Architect"}
                      </div>
                      <div className="text-[10px] text-slate-400">{user?.role === "admin" ? "Administrator" : "Member"}</div>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => logoutMutation.mutate()}
                    className="h-8 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40 p-2"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo Mark for Mobile */}
          <SpartanBrand compact tone="dark" onClick={() => onSelectView("chart")} />
        </div>

        {/* Header Right Actions: Search Toggle, Notifications, Avatar */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSearchOpen(!searchOpen)}
            className="p-2 text-slate-300 hover:text-white rounded-lg active:bg-[#251f1c]"
            aria-label="Toggle Search"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onOpenActivityDrawer}
            className="relative p-2 text-slate-300 hover:text-white rounded-lg active:bg-[#251f1c]"
            aria-label="Activity logs"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-[#9d2025] text-white text-[9px] font-bold flex items-center justify-center">
              3
            </span>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="p-1 rounded-full outline-none">
                <Avatar className="w-7 h-7 border border-[#d3aa54]">
                  <AvatarImage src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80" />
                  <AvatarFallback className="bg-amber-600 text-white text-[10px]">LM</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 bg-white text-slate-800 border border-slate-200 shadow-xl rounded-xl">
              <DropdownMenuLabel className="text-xs font-bold text-slate-500 uppercase">Administrator</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onSelectView("dashboard")} className="text-xs">
                <Home className="w-3.5 h-3.5 mr-2 text-[#9d2025]" /> Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSelectView("messages")} className="text-xs">
                <MessageSquare className="w-3.5 h-3.5 mr-2 text-[#9d2025]" /> Messages
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSelectView("settings")} className="text-xs">
                <Settings className="w-3.5 h-3.5 mr-2 text-slate-500" /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logoutMutation.mutate()} className="text-xs text-red-600 font-bold">
                <LogOut className="w-3.5 h-3.5 mr-2" /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Expandable Mobile Search Bar */}
      {searchOpen && (
        <div className="bg-[#181412] px-3 py-2 border-b border-[#3d3325] md:hidden">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <Input
              autoFocus
              placeholder="Search member name, rank, email..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-8 pr-8 h-8 text-xs bg-white text-slate-900 border-none rounded-lg"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mobile Floating / Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#100e0e]/95 backdrop-blur-md border-t border-[#3d3325] text-white flex items-center justify-around py-1.5 px-2 shadow-2xl md:hidden">
        <button
          type="button"
          onClick={() => onSelectView("chart")}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-lg transition-colors ${
            activeView === "chart" ? "text-[#d3aa54] font-bold" : "text-slate-400 hover:text-white"
          }`}
        >
          <Network className="w-4 h-4" />
          <span className="text-[10px] tracking-tight">Chart</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectView("members")}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-lg transition-colors ${
            activeView === "members" ? "text-[#d3aa54] font-bold" : "text-slate-400 hover:text-white"
          }`}
        >
          <Users className="w-4 h-4" />
          <span className="text-[10px] tracking-tight">Members</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectView("messages")}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-lg transition-colors ${
            activeView === "messages" ? "text-[#d3aa54] font-bold" : "text-slate-400 hover:text-white"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span className="text-[10px] tracking-tight">Messages</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectView("dashboard")}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-lg transition-colors ${
            activeView === "dashboard" ? "text-[#d3aa54] font-bold" : "text-slate-400 hover:text-white"
          }`}
        >
          <Home className="w-4 h-4" />
          <span className="text-[10px] tracking-tight">Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectView("settings")}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-lg transition-colors ${
            activeView === "settings" ? "text-[#d3aa54] font-bold" : "text-slate-400 hover:text-white"
          }`}
        >
          <Settings className="w-4 h-4" />
          <span className="text-[10px] tracking-tight">Settings</span>
        </button>
      </nav>
    </>
  );
}
