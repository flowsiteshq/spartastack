import { Button } from "@/components/ui/button";
import { CommunicationMember } from "@/components/MemberCommunicationDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  Crown,
  Eye,
  FileDown,
  Image as ImageIcon,
  Layers,
  Lock,
  Maximize2,
  Minus,
  MoreHorizontal,
  MoreVertical,
  Move,
  Network,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  Shuffle,
  Trash2,
  Undo2,
  Unlock,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  Workflow,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { Member } from "../../../drizzle/schema";
import { TreeNode } from "../../../server/db";

const DEFAULT_RANK_COLOR_PALETTE: Record<string, string> = {
  "crown director": "#f59e0b",
  "diamond executive": "#2563eb",
  "gold leader": "#eab308",
  "silver associate": "#64748b",
  "bronze builder": "#b45309",
  "associate": "#71717a",
  "emerald elite": "#10b981",
  "platinum ambassador": "#06b6d4",
  "ruby master": "#dc2626",
};

export function getRankBadgeColor(rankName: string): string {
  const normalized = (rankName || "").toLowerCase().trim();
  return DEFAULT_RANK_COLOR_PALETTE[normalized] || "#9d2025";
}

interface SaaSTreeCanvasProps {
  root: TreeNode | null;
  orgName: string;
  organizations: any[];
  currentOrgId: number;
  onSelectOrg: (id: number) => void;
  totalPlacedCount: number;
  unplacedCount: number;
  openSlotsCount: number;
  completionRate: number;
  searchHighlight?: string;
  onOpenRandomStack: () => void;
  onOpenAutoFill: () => void;
  onOpenSaveChart: () => void;
  onClearChart: () => void;
  onSelectSlotToAssign: (parentId: number | null, positionIndex: number, level: number) => void;
  onSelectMemberDetails: (memberId: number) => void;
  onOpenCommunication: (member: CommunicationMember) => void;
  onToggleLock: (placementId: number, isLocked?: boolean) => void;
  onUnstack: (placementId: number) => void;
  onAddNewMember: () => void;
  onExportPDF: () => void;
  onExportImage: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  highlightedPlacementId?: number | null;
}

export default function SaaSTreeCanvas({
  root,
  orgName,
  organizations,
  currentOrgId,
  onSelectOrg,
  totalPlacedCount,
  unplacedCount,
  openSlotsCount,
  completionRate,
  searchHighlight = "",
  onOpenRandomStack,
  onOpenAutoFill,
  onOpenSaveChart,
  onClearChart,
  onSelectSlotToAssign,
  onSelectMemberDetails,
  onOpenCommunication,
  onToggleLock,
  onUnstack,
  onAddNewMember,
  onExportPDF,
  onExportImage,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  highlightedPlacementId,
}: SaaSTreeCanvasProps) {
  const [activeLevels, setActiveLevels] = useState<number[]>([1, 2]);
  const [zoomLevel, setZoomLevel] = useState<number>(0.85);
  const [isLockMode, setIsLockMode] = useState<boolean>(false);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (scrollContainerRef.current) {
        const el = scrollContainerRef.current;
        const target = (el.scrollWidth - el.clientWidth) / 2;
        el.scrollLeft = Math.max(0, target);
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [root, currentOrgId, activeLevels]);

  const toggleLevelFilter = (lvl: number) => {
    setActiveLevels((prev) =>
      prev.includes(lvl) ? prev.filter((l) => l !== lvl) : [...prev, lvl].sort()
    );
  };

  const isMatchingSearch = (name: string, email: string) => {
    if (!searchHighlight.trim()) return false;
    const q = searchHighlight.toLowerCase().trim();
    return name.toLowerCase().includes(q) || email.toLowerCase().includes(q);
  };

  return (
    <div className="space-y-5">
      {/* ======================================================== */}
      {/* Top Organization Header Card matching mockup */}
      {/* ======================================================== */}
      <div className="bg-white rounded-xl p-3.5 sm:p-5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        {/* Left title with Spartan gold accent */}
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-10 rounded-full bg-[#d3aa54]" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-2xl font-extrabold text-slate-900 tracking-tight truncate max-w-[200px] sm:max-w-none">
                {orgName}
              </h1>
              {/* Organization Switcher Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 px-3 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors">
                    <span className="truncate max-w-[160px]">{orgName}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 bg-white border border-slate-200 shadow-lg rounded-xl">
                  {organizations.map((org) => (
                    <DropdownMenuItem
                      key={org.id}
                      onClick={() => onSelectOrg(org.id)}
                      className="cursor-pointer text-xs font-medium"
                    >
                      <span className={org.id === currentOrgId ? "font-bold text-[#9d2025]" : ""}>
                        {org.name}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">3 × 5 Organization Chart</p>
          </div>
        </div>

        {/* Right Stats & Save Chart Button */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* 11 Members Badge */}
          <div className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-[#f8ebe9] border border-[#ecd0cf]">
            <div className="w-6 h-6 rounded-full bg-[#9d2025] text-white flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
            <div className="leading-tight">
              <span className="font-extrabold text-slate-900 text-sm">{totalPlacedCount}</span>
              <span className="text-[11px] text-slate-500 font-medium ml-1.5">Members</span>
            </div>
          </div>

          {/* 4 Open Positions Badge */}
          <div className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-[#f6edda] border border-[#e8d6aa]">
            <div className="w-6 h-6 rounded-full bg-[#b3832e] text-white flex items-center justify-center">
              <UserPlus className="w-3.5 h-3.5" />
            </div>
            <div className="leading-tight">
              <span className="font-extrabold text-slate-900 text-sm">{openSlotsCount}</span>
              <span className="text-[11px] text-slate-500 font-medium ml-1.5">Open Positions</span>
            </div>
          </div>

          {/* 73% Completion Badge */}
          <div className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-[#f1f1ef] border border-[#d8d8d3]">
            <div className="relative w-6 h-6 flex items-center justify-center font-bold text-[10px] text-[#595956]">
              <svg className="w-6 h-6 transform -rotate-90">
                <circle cx="12" cy="12" r="9" stroke="#d8d8d3" strokeWidth="2.5" fill="none" />
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="#9d2025"
                  strokeWidth="2.5"
                  strokeDasharray="56.5"
                  strokeDashoffset={56.5 - (56.5 * completionRate) / 100}
                  fill="none"
                />
              </svg>
            </div>
            <div className="leading-tight">
              <span className="font-extrabold text-slate-900 text-sm">{completionRate}%</span>
              <span className="text-[11px] text-slate-500 font-medium ml-1.5">Completion</span>
            </div>
          </div>

          {/* Three dot actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border border-slate-200 shadow-lg rounded-xl text-xs">
              <DropdownMenuItem onClick={onExportPDF} className="cursor-pointer">
                <FileDown className="w-4 h-4 mr-2 text-rose-500" />
                Export PDF Presentation
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExportImage} className="cursor-pointer">
                <ImageIcon className="w-4 h-4 mr-2 text-[#b3832e]" />
                Export Clean PNG
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onClearChart} className="cursor-pointer text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Chart Downlines
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Save Chart Button (Golden Amber Button matching mockup) */}
          <Button
            onClick={onOpenSaveChart}
            className="bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold text-xs uppercase tracking-wider px-4 h-9 rounded-lg shadow-sm flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>Save Chart</span>
          </Button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* Action Controls Bar directly above Chart */}
      {/* ======================================================== */}
      <div className="bg-white rounded-xl p-2.5 sm:p-3 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        {/* Left: Levels: [1] [2] [3] [4] [5] selector pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-semibold text-slate-600 mr-1">Levels:</span>
          {[1, 2, 3, 4, 5].map((lvl) => {
            const isActive = activeLevels.includes(lvl);
            return (
              <button
                key={lvl}
                onClick={() => toggleLevelFilter(lvl)}
                className={`w-7 h-7 rounded-md text-xs font-bold transition-all ${
                  isActive
                    ? "bg-[#9d2025] text-white shadow-sm"
                    : "bg-[#f1efea] text-slate-600 hover:bg-[#e5dfd4]"
                }`}
                title={`Toggle visibility for Level ${lvl}`}
              >
                {lvl}
              </button>
            );
          })}
        </div>

        {/* Right: Actions [Random Stack], [Auto-Fill Next], [Lock Positions], [Clear Chart], Undo/Redo */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {/* Random Stack */}
          <Button
            onClick={onOpenRandomStack}
            className="bg-[#9d2025] hover:bg-[#74171b] text-white font-bold text-xs px-3.5 h-8 rounded-lg shadow-sm flex items-center gap-1.5"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Random Stack</span>
          </Button>

          {/* Auto-Fill Next */}
          <Button
            variant="outline"
            onClick={onOpenAutoFill}
            className="border-[#b3832e] text-[#76521d] hover:bg-[#f6edda] font-bold text-xs px-3.5 h-8 rounded-lg flex items-center gap-1.5"
          >
            <Workflow className="w-3.5 h-3.5 text-[#b3832e]" />
            <span>Auto-Fill Next</span>
          </Button>

          {/* Lock Positions toggle button */}
          <Button
            variant="outline"
            onClick={() => {
              setIsLockMode(!isLockMode);
              toast.info(
                !isLockMode
                  ? "Lock Mode Enabled: Click any member card to lock or unlock their position."
                  : "Lock Mode Disabled."
              );
            }}
            className={`font-semibold text-xs px-3.5 h-8 rounded-lg flex items-center gap-1.5 transition-colors ${
              isLockMode
                ? "bg-[#f6edda] border-[#d3aa54] text-[#76521d]"
                : "border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Lock className={`w-3.5 h-3.5 ${isLockMode ? "text-[#b3832e]" : "text-slate-500"}`} />
            <span>Lock Positions</span>
          </Button>

          {/* Clear Chart */}
          <Button
            variant="outline"
            onClick={() => {
              if (
                confirm(
                  "Reset downlines? All unlocked members will be returned to the Master List pool."
                )
              ) {
                onClearChart();
              }
            }}
            className="border-slate-300 text-slate-700 hover:text-red-600 hover:border-red-300 hover:bg-red-50 font-semibold text-xs px-3 h-8 rounded-lg flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Clear Chart</span>
          </Button>

          {/* Undo / Redo */}
          <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className={`p-1 rounded transition-colors ${canUndo ? "hover:bg-slate-200 text-slate-700 cursor-pointer" : "opacity-40 text-slate-400 cursor-not-allowed"}`}
              title="Undo last placement change"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className={`p-1 rounded transition-colors ${canRedo ? "hover:bg-slate-200 text-slate-700 cursor-pointer" : "opacity-40 text-slate-400 cursor-not-allowed"}`}
              title="Redo placement change"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.6, Number((z - 0.1).toFixed(2))))}
              className="p-1 hover:bg-slate-200 text-slate-600 rounded"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-bold text-slate-700 px-1 min-w-[36px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(1.4, Number((z + 0.1).toFixed(2))))}
              className="p-1 hover:bg-slate-200 text-slate-600 rounded"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1 hover:bg-slate-200 text-slate-600 rounded ml-0.5"
              title="Reset Zoom"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3×5 Visual Tree Canvas matching reference mockup */}
      {/* ======================================================== */}
      <div
        ref={scrollContainerRef}
        className="relative bg-[#fcfbf8] border border-[#e0d8cc] rounded-xl overflow-x-auto min-h-[620px] p-4 sm:p-6 shadow-inner org-chart-canvas"
      >
        <div
          className="w-fit min-w-full mx-auto flex flex-col items-center py-4 transition-transform duration-200 origin-top"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          {!root ? (
            <div className="text-center py-20 max-w-sm mx-auto space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#f6edda] text-[#9d2025] flex items-center justify-center mx-auto">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Apex Root Position Open</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Assign the primary organization leader (Level 0) to initialize your 3×5 downline tree.
                </p>
              </div>
              <Button
                onClick={() => onSelectSlotToAssign(null, 0, 0)}
                className="bg-[#9d2025] hover:bg-[#74171b] text-white font-bold text-xs px-4 h-9 rounded-lg shadow-sm"
              >
                <UserPlus className="w-4 h-4 mr-1.5" />
                Assign Apex Leader
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              {/* ======================================================== */}
              {/* LEVEL 0 - APEX (Gold Treatment matching mockup) */}
              {/* ======================================================== */}
              <div className="relative flex flex-col items-center">
                <ApexCard
                  node={root}
                  isLockMode={isLockMode}
                  isHighlighted={
                    highlightedPlacementId === root.placementId ||
                    isMatchingSearch(`${root.member.firstName} ${root.member.lastName}`, root.member.email)
                  }
                  onToggleLock={() => onToggleLock(root.placementId, !root.isLocked)}
                  onViewDetails={() => onSelectMemberDetails(root.memberId)}
                  onOpenCommunication={() => onOpenCommunication(root.member)}
                  onUnstack={() => onUnstack(root.placementId)}
                />

                {/* Gold vertical connector line down to distribution bar */}
                <div className="w-0.5 h-8 bg-[#d3aa54] relative">
                  <div className="w-2 h-2 rounded-full bg-[#b3832e] absolute -bottom-1 -left-[3px]" />
                </div>
              </div>

              {/* ======================================================== */}
              {/* LEVEL 1 - FRONTLINE (3 Positions matching mockup) */}
              {/* ======================================================== */}
              {activeLevels.includes(1) && (
                <div className="relative pt-6 flex items-start justify-center gap-6 sm:gap-8 lg:gap-10">
                  {/* Horizontal Spartan red connector bus */}
                  <div className="absolute top-0 left-20 right-20 h-0.5 bg-[#9d2025]" />

                  {[0, 1, 2].map((legIndex) => {
                    const legNode = root.children[legIndex];

                    return (
                      <div key={legIndex} className="flex flex-col items-center relative">
                        {/* Vertical Drop from connector bus */}
                        <div className="w-0.5 h-6 bg-[#9d2025] absolute -top-6">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#9d2025] absolute -top-0.5 -left-[2px]" />
                        </div>

                        {legNode ? (
                          <div className="flex flex-col items-center">
                            <Level1Card
                              node={legNode}
                              positionIndex={legIndex}
                              isLockMode={isLockMode}
                              isHighlighted={
                                highlightedPlacementId === legNode.placementId ||
                                isMatchingSearch(
                                  `${legNode.member.firstName} ${legNode.member.lastName}`,
                                  legNode.member.email
                                )
                              }
                              onToggleLock={() => onToggleLock(legNode.placementId, !legNode.isLocked)}
                              onViewDetails={() => onSelectMemberDetails(legNode.memberId)}
                              onOpenCommunication={() => onOpenCommunication(legNode.member)}
                              onUnstack={() => onUnstack(legNode.placementId)}
                            />

                            {/* ======================================================== */}
                            {/* LEVEL 2 - DOWNLINES (3 slots per Level 1 leg) */}
                            {/* ======================================================== */}
                            {activeLevels.includes(2) && (
                              <Level2Subtree
                                parentNode={legNode}
                                isLockMode={isLockMode}
                                searchHighlight={searchHighlight}
                                highlightedPlacementId={highlightedPlacementId}
                                onToggleLock={onToggleLock}
                                onViewDetails={onSelectMemberDetails}
                                onOpenCommunication={onOpenCommunication}
                                onUnstack={onUnstack}
                                onAssignSlot={(pos) => onSelectSlotToAssign(legNode.placementId, pos, 2)}
                              />
                            )}
                          </div>
                        ) : (
                          <EmptySlotCard
                            level={1}
                            position={legIndex + 1}
                            onAssign={() => onSelectSlotToAssign(root.placementId, legIndex, 1)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* Bottom Summary Cards (Organization Metrics, Quick Actions, Chart Info) */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Organization Metrics */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm">
          <h3 className="text-sm font-extrabold text-slate-900 mb-4">Organization Metrics</h3>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-2.5 rounded-lg bg-[#f8ebe9] border border-[#ecd0cf]">
              <div className="w-7 h-7 rounded-full bg-[#9d2025] text-white flex items-center justify-center mx-auto mb-1.5">
                <Users className="w-3.5 h-3.5" />
              </div>
              <div className="text-lg font-extrabold text-slate-900 font-sans leading-none">
                {totalPlacedCount}
              </div>
              <div className="text-[10px] text-slate-500 font-medium mt-1">Total Members</div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#f6edda] border border-[#e8d6aa]">
              <div className="w-7 h-7 rounded-full bg-[#b3832e] text-white flex items-center justify-center mx-auto mb-1.5">
                <Network className="w-3.5 h-3.5" />
              </div>
              <div className="text-lg font-extrabold text-slate-900 font-sans leading-none">
                {totalPlacedCount}
              </div>
              <div className="text-[10px] text-slate-500 font-medium mt-1">Filled Positions</div>
            </div>

            <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-100/80">
              <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center mx-auto mb-1.5">
                <UserPlus className="w-3.5 h-3.5" />
              </div>
              <div className="text-lg font-extrabold text-slate-900 font-sans leading-none">
                {openSlotsCount}
              </div>
              <div className="text-[10px] text-slate-500 font-medium mt-1">Open Positions</div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#f1f1ef] border border-[#d8d8d3]">
              <div className="w-7 h-7 rounded-full bg-[#73736f] text-white flex items-center justify-center mx-auto mb-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div className="text-lg font-extrabold text-slate-900 font-sans leading-none">
                {completionRate}%
              </div>
              <div className="text-[10px] text-slate-500 font-medium mt-1">Completion</div>
            </div>
          </div>
        </div>

        {/* Card 2: Quick Actions */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <h3 className="text-sm font-extrabold text-slate-900 mb-3">Quick Actions</h3>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={onAddNewMember}
              variant="outline"
              size="sm"
              className="text-xs font-semibold border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-[#9d2025]" />
              <span>Add Member</span>
            </Button>
            <Button
              onClick={onOpenRandomStack}
              variant="outline"
              size="sm"
              className="text-xs font-semibold border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
            >
              <Shuffle className="w-3.5 h-3.5 text-[#b3832e]" />
              <span>Random Stack</span>
            </Button>
            <Button
              onClick={onOpenAutoFill}
              variant="outline"
              size="sm"
              className="text-xs font-semibold border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
            >
              <Workflow className="w-3.5 h-3.5 text-[#73736f]" />
              <span>Auto-Fill</span>
            </Button>
            <Button
              onClick={onExportPDF}
              variant="outline"
              size="sm"
              className="text-xs font-semibold border-slate-200 text-slate-700 hover:bg-rose-50 hover:text-rose-700 flex items-center gap-1.5"
            >
              <FileDown className="w-3.5 h-3.5 text-rose-500" />
              <span>Export PDF</span>
            </Button>
            <Button
              onClick={onExportImage}
              variant="outline"
              size="sm"
              className="text-xs font-semibold border-slate-200 text-slate-700 hover:bg-[#f6edda] hover:text-[#76521d] flex items-center gap-1.5"
            >
              <ImageIcon className="w-3.5 h-3.5 text-[#b3832e]" />
              <span>Export Image</span>
            </Button>
          </div>
        </div>

        {/* Card 3: Chart Information */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm text-xs font-medium space-y-1.5">
          <h3 className="text-sm font-extrabold text-slate-900 mb-2">Chart Information</h3>
          <div className="flex justify-between py-0.5 border-b border-slate-100">
            <span className="text-slate-500">Chart Name:</span>
            <span className="font-bold text-slate-900 truncate max-w-[170px]">{orgName}</span>
          </div>
          <div className="flex justify-between py-0.5 border-b border-slate-100">
            <span className="text-slate-500">Structure:</span>
            <span className="font-bold text-slate-900">3 Legs × 5 Tiers</span>
          </div>
          <div className="flex justify-between py-0.5 border-b border-slate-100">
            <span className="text-slate-500">Current View:</span>
            <span className="font-bold text-slate-900">Levels 0 - 2</span>
          </div>
          <div className="flex justify-between py-0.5 border-b border-slate-100">
            <span className="text-slate-500">Total Members:</span>
            <span className="font-bold text-[#9d2025]">{totalPlacedCount}</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500">Last Updated:</span>
            <span className="text-slate-600">Sep 17, 2026</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* LEVEL 0 - APEX CARD (Gold Theme matching Mockup)                           */
/* ========================================================================= */
function ApexCard({
  node,
  isLockMode,
  isHighlighted,
  onToggleLock,
  onViewDetails,
  onOpenCommunication,
  onUnstack,
}: {
  node: TreeNode;
  isLockMode: boolean;
  isHighlighted: boolean;
  onToggleLock: () => void;
  onViewDetails: () => void;
  onOpenCommunication: () => void;
  onUnstack: () => void;
}) {
  const m = node.member;

  return (
    <div
      className={`w-60 bg-white rounded-xl border-2 transition-all saas-card-shadow ${
        isHighlighted ? "border-[#9d2025] ring-4 ring-[#f0d9d8] newly-placed-pulse" : "border-[#d3aa54]"
      } ${isLockMode ? "cursor-pointer hover:border-[#b3832e]" : ""}`}
      onClick={isLockMode ? onToggleLock : undefined}
    >
      {/* Gold Header Bar */}
      <div className="bg-[#b3832e] text-white px-3 py-1 rounded-t-[10px] flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-extrabold text-[11px] tracking-wider uppercase">
          <Crown className="w-3.5 h-3.5 text-[#fff2cc]" />
          <span>LEVEL 0 - APEX</span>
        </div>
        <div className="flex items-center gap-1">
          {node.isLocked && <span title="Position Locked"><Lock className="w-3 h-3 text-white" /></span>}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-white/80 hover:text-white p-0.5">
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border border-slate-200 text-xs">
              <DropdownMenuItem onClick={onViewDetails} className="cursor-pointer">
                <Eye className="w-3.5 h-3.5 mr-2 text-blue-600" />
                View Member Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleLock} className="cursor-pointer">
                {node.isLocked ? (
                  <>
                    <Unlock className="w-3.5 h-3.5 mr-2 text-slate-500" />
                    Unlock Position
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 mr-2 text-amber-600" />
                    Lock Position
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onUnstack} className="cursor-pointer text-red-600">
                <UserMinus className="w-3.5 h-3.5 mr-2" />
                Remove from Chart
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Card Content with Photo, Name, Crown, PV, Legs */}
      <div className="p-3.5 flex items-center gap-3">
        <button type="button" onClick={(event) => { event.stopPropagation(); onOpenCommunication(); }} className="group relative shrink-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#9d2025]" title={`Message ${m.firstName} ${m.lastName}`}>
          <img
            src={
              m.avatarUrl ||
              "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80"
            }
            alt={`Message ${m.firstName} ${m.lastName}`}
            className="w-12 h-12 rounded-lg object-cover border-2 border-[#d3aa54] shadow-sm transition-transform duration-200 group-hover:scale-[1.03]"
          />
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border border-white bg-[#9d2025] text-[9px] font-bold text-white shadow-sm">+</span>
        </button>
        <div className="min-w-0 flex-1">
          <div className="font-extrabold text-slate-900 text-sm truncate leading-tight">
            {m.firstName} {m.lastName}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px] font-semibold text-slate-600 truncate">{m.rank}</span>
            <Crown className="w-3.5 h-3.5 text-[#b3832e] flex-shrink-0" />
          </div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mt-1 pt-1 border-t border-slate-100">
            <span>ID: PV{m.personalVolume}</span>
            <span className="text-[#b3832e] font-bold">
              {node.children.filter(Boolean).length} / 3
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* LEVEL 1 - FRONTLINE CARD (Spartan red header)                               */
/* ========================================================================= */
function Level1Card({
  node,
  positionIndex,
  isLockMode,
  isHighlighted,
  onToggleLock,
  onViewDetails,
  onOpenCommunication,
  onUnstack,
}: {
  node: TreeNode;
  positionIndex: number;
  isLockMode: boolean;
  isHighlighted: boolean;
  onToggleLock: () => void;
  onViewDetails: () => void;
  onOpenCommunication: () => void;
  onUnstack: () => void;
}) {
  const m = node.member;

  return (
    <div
      className={`w-56 bg-white rounded-xl border-2 transition-all saas-card-shadow ${
        isHighlighted ? "border-[#9d2025] ring-4 ring-[#f0d9d8] newly-placed-pulse" : "border-[#9d2025]/60"
      } ${isLockMode ? "cursor-pointer hover:border-[#b3832e]" : ""}`}
      onClick={isLockMode ? onToggleLock : undefined}
    >
      {/* Spartan Red Header Bar */}
      <div className="bg-[#9d2025] text-white px-3 py-1 rounded-t-[10px] flex items-center justify-between">
        <span className="font-extrabold text-[10px] tracking-wider uppercase">
          LEVEL 1 - POSITION {positionIndex + 1}
        </span>
        <div className="flex items-center gap-1">
          {node.isLocked && <span title="Position Locked"><Lock className="w-3 h-3 text-[#f0d38d]" /></span>}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-white/80 hover:text-white p-0.5">
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border border-slate-200 text-xs">
              <DropdownMenuItem onClick={onViewDetails} className="cursor-pointer">
                <Eye className="w-3.5 h-3.5 mr-2 text-blue-600" />
                View Member Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleLock} className="cursor-pointer">
                {node.isLocked ? (
                  <>
                    <Unlock className="w-3.5 h-3.5 mr-2 text-slate-500" />
                    Unlock Position
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 mr-2 text-amber-600" />
                    Lock Position
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onUnstack} className="cursor-pointer text-red-600">
                <UserMinus className="w-3.5 h-3.5 mr-2" />
                Remove from Chart
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Card Content with Photo, Name, Title, PV, Legs */}
      <div className="p-3 flex items-center gap-3">
        <button type="button" onClick={(event) => { event.stopPropagation(); onOpenCommunication(); }} className="group relative shrink-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#9d2025]" title={`Message ${m.firstName} ${m.lastName}`}>
          <img
            src={
              m.avatarUrl ||
              "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80"
            }
            alt={`Message ${m.firstName} ${m.lastName}`}
            className="w-11 h-11 rounded-lg object-cover border-2 border-[#e6caca] shadow-sm transition-transform duration-200 group-hover:scale-[1.03]"
          />
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border border-white bg-[#9d2025] text-[9px] font-bold text-white shadow-sm">+</span>
        </button>
        <div className="min-w-0 flex-1">
          <div className="font-extrabold text-slate-900 text-xs truncate leading-tight">
            {m.firstName} {m.lastName}
          </div>
          <div
            className="text-[11px] font-semibold truncate mt-0.5"
            style={{ color: getRankBadgeColor(m.rank) }}
          >
            {m.rank}
          </div>
          <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 mt-1 pt-1 border-t border-slate-100">
            <span>ID: PV{m.personalVolume}</span>
            <span className="text-[#9d2025] font-bold">
              {node.children.filter(Boolean).length} / 3
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* LEVEL 2 SUBTREE (3 Positions per frontline parent)                         */
/* ========================================================================= */
function Level2Subtree({
  parentNode,
  isLockMode,
  searchHighlight,
  highlightedPlacementId,
  onToggleLock,
  onViewDetails,
  onOpenCommunication,
  onUnstack,
  onAssignSlot,
}: {
  parentNode: TreeNode;
  isLockMode: boolean;
  searchHighlight: string;
  highlightedPlacementId?: number | null;
  onToggleLock: (placementId: number, isLocked?: boolean) => void;
  onViewDetails: (memberId: number) => void;
  onOpenCommunication: (member: CommunicationMember) => void;
  onUnstack: (placementId: number) => void;
  onAssignSlot: (pos: number) => void;
}) {
  const children = parentNode.children; // 3 slots

  return (
    <div className="flex flex-col items-center mt-2">
      {/* Vertical trunk line from Level 1 */}
      <div className="w-0.5 h-6 bg-[#9d2025]/70 relative">
        <div className="w-1.5 h-1.5 rounded-full bg-[#9d2025] absolute -bottom-0.5 -left-[2px]" />
      </div>

      {/* Horizontal connector bar connecting 3 children */}
      <div className="relative pt-6 flex items-start justify-center gap-3">
        <div className="absolute top-0 left-6 right-6 h-0.5 bg-[#9d2025]/60" />

        {[0, 1, 2].map((posIndex) => {
          const child = children[posIndex];

          return (
            <div key={posIndex} className="flex flex-col items-center relative">
              {/* Drop line from horizontal bar */}
              <div className="w-0.5 h-6 bg-[#9d2025]/60 absolute -top-6">
                <div className="w-1.5 h-1.5 rounded-full bg-[#9d2025] absolute -top-0.5 -left-[2px]" />
              </div>

              {child ? (
                <Level2Card
                  node={child}
                  isLockMode={isLockMode}
                  isHighlighted={
                    highlightedPlacementId === child.placementId ||
                    (Boolean(searchHighlight.trim()) &&
                      `${child.member.firstName} ${child.member.lastName}`
                        .toLowerCase()
                        .includes(searchHighlight.toLowerCase().trim()))
                  }
                  onToggleLock={() => onToggleLock(child.placementId, !child.isLocked)}
                  onViewDetails={() => onViewDetails(child.memberId)}
                  onOpenCommunication={() => onOpenCommunication(child.member)}
                  onUnstack={() => onUnstack(child.placementId)}
                />
              ) : (
                <EmptySlotCard
                  level={2}
                  position={posIndex + 1}
                  onAssign={() => onAssignSlot(posIndex)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ========================================================================= */
/* LEVEL 2 CARD (Matching Mockup: Emily Watson, Chris Evans, etc.)            */
/* ========================================================================= */
function Level2Card({
  node,
  isLockMode,
  isHighlighted,
  onToggleLock,
  onViewDetails,
  onOpenCommunication,
  onUnstack,
}: {
  node: TreeNode;
  isLockMode: boolean;
  isHighlighted: boolean;
  onToggleLock: () => void;
  onViewDetails: () => void;
  onOpenCommunication: () => void;
  onUnstack: () => void;
}) {
  const m = node.member;

  return (
    <div
      className={`w-32 sm:w-34 bg-white rounded-xl border transition-all saas-card-shadow ${
        isHighlighted ? "border-[#9d2025] ring-2 ring-[#f0d9d8] newly-placed-pulse" : "border-slate-200"
      } ${isLockMode ? "cursor-pointer hover:border-[#b3832e]" : ""}`}
      onClick={isLockMode ? onToggleLock : undefined}
    >
      {/* Card Header with Lock/Menu */}
      <div className="px-2 pt-1.5 pb-0 flex items-center justify-between text-slate-400">
        {node.isLocked ? (
          <span title="Position Locked"><Lock className="w-3 h-3 text-amber-500" /></span>
        ) : (
          <span className="w-3" />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="text-slate-400 hover:text-slate-700 p-0.5">
              <MoreVertical className="w-3 h-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white border border-slate-200 text-xs">
            <DropdownMenuItem onClick={onViewDetails} className="cursor-pointer">
              <Eye className="w-3.5 h-3.5 mr-2 text-[#9d2025]" />
              View Member Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleLock} className="cursor-pointer">
              {node.isLocked ? (
                <>
                  <Unlock className="w-3.5 h-3.5 mr-2 text-slate-500" />
                  Unlock Position
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 mr-2 text-amber-600" />
                  Lock Position
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onUnstack} className="cursor-pointer text-red-600">
              <UserMinus className="w-3.5 h-3.5 mr-2" />
              Remove from Chart
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Photo Avatar centered */}
      <div className="flex flex-col items-center px-2 pb-2.5">
        <button type="button" onClick={(event) => { event.stopPropagation(); onOpenCommunication(); }} className="group relative rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#9d2025]" title={`Message ${m.firstName} ${m.lastName}`}>
          <img
            src={
              m.avatarUrl ||
              "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&h=120&q=80"
            }
            alt={`Message ${m.firstName} ${m.lastName}`}
            className="w-10 h-10 rounded-lg object-cover border border-slate-200 shadow-sm transition-transform duration-200 group-hover:scale-[1.04]"
          />
          <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white bg-[#9d2025] text-[8px] font-bold text-white shadow-sm">+</span>
        </button>
        <div className="font-extrabold text-slate-900 text-xs truncate max-w-full text-center mt-1.5 leading-tight">
          {m.firstName} {m.lastName}
        </div>
        <div
          className="text-[10px] font-semibold truncate max-w-full text-center mt-0.5"
          style={{ color: getRankBadgeColor(m.rank) }}
        >
          {m.rank}
        </div>
        <div className="text-[10px] font-bold text-slate-600 mt-1 pt-1 border-t border-slate-100 w-full text-center">
          PV: {m.personalVolume}
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* EMPTY SLOT CARD (Dashed Spartan red border)                                 */
/* ========================================================================= */
function EmptySlotCard({
  level,
  position,
  onAssign,
}: {
  level: number;
  position: number;
  onAssign: () => void;
}) {
  return (
    <div
      onClick={onAssign}
      className="w-32 sm:w-34 bg-white/70 hover:bg-white rounded-xl border-2 border-dashed border-[#9d2025]/40 hover:border-[#9d2025] p-3 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 shadow-sm group min-h-[110px]"
      title={`Click to place a member into Level ${level} Position ${position}`}
    >
      <div className="w-7 h-7 rounded-full border border-[#9d2025]/60 group-hover:bg-[#9d2025] group-hover:text-white flex items-center justify-center text-[#9d2025] transition-colors">
        <Plus className="w-4 h-4" />
      </div>
      <div className="font-extrabold text-[11px] text-[#9d2025] uppercase tracking-wider">
        Add Member
      </div>
      <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">
        LEVEL {level} - POS {position}
      </div>
    </div>
  );
}
