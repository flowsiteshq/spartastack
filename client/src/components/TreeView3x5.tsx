import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Eye,
  Layers,
  Maximize2,
  Minus,
  MoreVertical,
  MoveLeft,
  Plus,
  RotateCcw,
  Search,
  Shuffle,
  Sparkles,
  Trash2,
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
import { TreeNode } from "../../../server/db";
import PlaceMemberModal from "./PlaceMemberModal";
import RandomPlacementModal from "./RandomPlacementModal";

interface TreeView3x5Props {
  orgId: number;
  onViewMemberDetails?: (memberId: number) => void;
}

export default function TreeView3x5({ orgId, onViewMemberDetails }: TreeView3x5Props) {
  const [focusRootId, setFocusRootId] = useState<number | undefined>(undefined);
  const [breadcrumbPath, setBreadcrumbPath] = useState<{ id?: number; name: string }[]>([
    { name: "Apex Root" },
  ]);
  const [zoomLevel, setZoomLevel] = useState<number>(0.95);
  const [searchHighlight, setSearchHighlight] = useState<string>("");

  // Modal states
  const [placeSlotModalOpen, setPlaceSlotModalOpen] = useState(false);
  const [selectedSlotForPlacement, setSelectedSlotForPlacement] = useState<{
    parentId: number | null;
    positionIndex: number;
    level: number;
    parentName?: string;
    slotName?: string;
  } | null>(null);

  const [randomModalOpen, setRandomModalOpen] = useState(false);
  const [randomModalMode, setRandomModalMode] = useState<"random" | "autofill">("random");

  const utils = trpc.useUtils();

  // Queries
  const { data: treeData, isLoading: isTreeLoading } = trpc.matrix.getTree.useQuery({
    orgId,
    rootPlacementId: focusRootId,
  });

  const { data: openSlotsData } = trpc.matrix.getOpenSlots.useQuery({ orgId });

  // Mutations
  const unstackMutation = trpc.matrix.unstack.useMutation({
    onSuccess: (res) => {
      toast.success(`Unstacked ${res.unstackedCount} member(s) back to available pool`);
      utils.matrix.getTree.invalidate();
      utils.matrix.getOpenSlots.invalidate();
      utils.member.list.invalidate();
    },
    onError: (err) => {
      toast.error("Failed to unstack member", { description: err.message });
    },
  });

  const clearTreeMutation = trpc.matrix.clear.useMutation({
    onSuccess: (res) => {
      toast.info(`Cleared downlines (${res.clearedCount} positions reset to available pool)`);
      setFocusRootId(undefined);
      setBreadcrumbPath([{ name: "Apex Root" }]);
      utils.matrix.getTree.invalidate();
      utils.matrix.getOpenSlots.invalidate();
      utils.member.list.invalidate();
    },
  });

  const handleDrillDown = (node: TreeNode) => {
    setFocusRootId(node.placementId);
    setBreadcrumbPath((prev) => [
      ...prev,
      { id: node.placementId, name: `${node.member.firstName} ${node.member.lastName}` },
    ]);
  };

  const handleResetToApex = () => {
    setFocusRootId(undefined);
    setBreadcrumbPath([{ name: "Apex Root" }]);
  };

  const handleOpenPlaceModal = (
    parentId: number | null,
    positionIndex: number,
    level: number,
    parentName?: string
  ) => {
    setSelectedSlotForPlacement({
      parentId,
      positionIndex,
      level,
      parentName,
      slotName: `Level ${level} Leg ${positionIndex + 1}`,
    });
    setPlaceSlotModalOpen(true);
  };

  const isMatchingSearch = (name: string, email: string) => {
    if (!searchHighlight.trim()) return false;
    const q = searchHighlight.toLowerCase().trim();
    return name.toLowerCase().includes(q) || email.toLowerCase().includes(q);
  };

  if (isTreeLoading) {
    return (
      <div className="p-12 text-center space-y-4">
        <div className="inline-block w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <p className="font-mono text-xs text-cyan-300">CALCULATING 3×5 BLUEPRINT TOPOLOGY...</p>
      </div>
    );
  }

  const root = treeData?.root;
  const stats = treeData?.stats;

  return (
    <div className="space-y-4">
      {/* Interactive Blueprint Toolbar */}
      <div className="bg-[#07172c] border border-cyan-400/30 p-3 rounded flex flex-wrap items-center justify-between gap-3 shadow-md">
        {/* Left: Breadcrumbs & Focus trail */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-500 uppercase">FOCUS:</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {breadcrumbPath.map((item, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
                <button
                  onClick={() => {
                    if (idx === 0) {
                      handleResetToApex();
                    } else if (item.id) {
                      setFocusRootId(item.id);
                      setBreadcrumbPath((p) => p.slice(0, idx + 1));
                    }
                  }}
                  className={`px-2 py-0.5 rounded text-xs transition-colors ${
                    idx === breadcrumbPath.length - 1
                      ? "bg-cyan-500/20 text-cyan-200 border border-cyan-400/50 font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {item.name}
                </button>
              </React.Fragment>
            ))}
            {focusRootId && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetToApex}
                className="h-6 text-[10px] font-mono border-white/20 hover:border-cyan-400 bg-transparent text-cyan-300 px-2 ml-1"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset Apex Root
              </Button>
            )}
          </div>
        </div>

        {/* Right: Quick Stacking Actions & Zoom */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search Highlight in Tree */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Highlight member..."
              value={searchHighlight}
              onChange={(e) => setSearchHighlight(e.target.value)}
              className="pl-8 pr-2 h-8 text-xs font-mono bg-[#0a1e38] border border-white/20 rounded text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none w-36 sm:w-44"
            />
          </div>

          {/* Random Placement Action (User Requirement) */}
          <Button
            size="sm"
            onClick={() => {
              setRandomModalMode("random");
              setRandomModalOpen(true);
            }}
            className="h-8 bg-cyan-500 hover:bg-cyan-400 text-[#07192f] font-bold text-xs uppercase tracking-wider font-mono px-3 flex items-center gap-1.5 shadow"
            title="Place names from master list at random"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Random Stack</span>
          </Button>

          {/* Auto-Fill Next (Spillover) */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setRandomModalMode("autofill");
              setRandomModalOpen(true);
            }}
            className="h-8 border-cyan-400/40 hover:border-cyan-400 bg-[#0a1e38] text-cyan-300 hover:text-white text-xs font-mono px-3 flex items-center gap-1.5"
            title="Fill next available open slots sequentially"
          >
            <Workflow className="w-3.5 h-3.5 text-cyan-400" />
            <span>Auto-Fill Next</span>
          </Button>

          {/* Zoom controls */}
          <div className="flex items-center border border-white/20 rounded bg-[#0a1e38] p-0.5">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.6, Number((z - 0.1).toFixed(2))))}
              className="p-1 hover:bg-white/10 rounded text-slate-300 hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono px-1.5 text-cyan-300 min-w-[38px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(1.4, Number((z + 0.1).toFixed(2))))}
              className="p-1 hover:bg-white/10 rounded text-slate-300 hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(0.95)}
              className="p-1 hover:bg-white/10 rounded text-slate-300 hover:text-white ml-0.5"
              title="Reset Zoom"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Clear Tree Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-white/20 hover:border-red-400 hover:bg-red-950/30 text-slate-400 hover:text-red-300 px-2"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#0a203c] border-white/20 text-white">
              <DropdownMenuItem
                onClick={() => {
                  if (
                    confirm(
                      "Are you sure you want to clear all downlines? All members will be returned to the unplaced master list."
                    )
                  ) {
                    clearTreeMutation.mutate({ orgId });
                  }
                }}
                className="cursor-pointer text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40 font-mono flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Reset All Placements to Master Pool
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Interactive CAD Blueprint Canvas */}
      <div className="relative border border-cyan-400/30 rounded bg-[#061426] overflow-x-auto min-h-[580px] p-6 blueprint-canvas">
        {/* Blueprint Corner Registration Marks */}
        <div className="absolute top-2 left-2 text-[10px] font-mono text-cyan-400/50 hidden sm:block">
          SEC-A // 3X5_MATRIX_ORTHOGONAL_LAYOUT
        </div>
        <div className="absolute top-2 right-2 text-[10px] font-mono text-cyan-400/50 hidden sm:block">
          CAD_REF: #3X5-DWG-001
        </div>
        <div className="absolute bottom-2 left-2 text-[10px] font-mono text-cyan-400/50">
          BRANCHING: 3 LEGS (POS 0, 1, 2)
        </div>
        <div className="absolute bottom-2 right-2 text-[10px] font-mono text-cyan-400/50">
          DEPTH LIMIT: 5 TIERS
        </div>

        {/* Level Legend Stamp */}
        <div className="absolute top-8 left-3 z-10 hidden xl:block bg-[#091f3a]/90 border border-cyan-400/30 p-2.5 rounded text-[10px] font-mono text-slate-300 space-y-1 shadow">
          <div className="text-cyan-300 font-bold uppercase tracking-wider border-b border-white/10 pb-1">
            MATRIX TIERS
          </div>
          <div className="flex items-center justify-between gap-4">
            <span>LVL 0 (ROOT):</span> <span className="text-white">1/1</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span>LVL 1 (FRONTLINE):</span>{" "}
            <span className="text-cyan-300">{stats?.levelBreakdown[1]?.occupied || 0}/3</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span>LVL 2 (TIER 2):</span>{" "}
            <span className="text-cyan-300">{stats?.levelBreakdown[2]?.occupied || 0}/9</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span>LVL 3 (TIER 3):</span>{" "}
            <span className="text-cyan-300">{stats?.levelBreakdown[3]?.occupied || 0}/27</span>
          </div>
        </div>

        {/* Scalable Canvas Container with min width for 3 branches */}
        <div
          className="min-w-[1180px] flex justify-center py-4 px-6 transition-transform duration-150 origin-top"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          {!root ? (
            /* Empty Tree State */
            <div className="text-center py-16 max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-full border border-dashed border-cyan-400/60 bg-[#0d2a4f]/50 flex items-center justify-center mx-auto text-cyan-300">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-display">Apex Root Position Open</h3>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  Assign the primary organization leader (Level 0) to initialize the 3×5 downline tree.
                </p>
              </div>
              <Button
                onClick={() => handleOpenPlaceModal(null, 0, 0, undefined)}
                className="bg-cyan-500 hover:bg-cyan-400 text-[#07192f] font-bold text-xs uppercase tracking-wider font-mono px-4 h-9"
              >
                <UserPlus className="w-4 h-4 mr-1.5" />
                Assign Apex Root Leader
              </Button>
            </div>
          ) : (
            /* Render the 3x5 Tree Starting from Root */
            <div className="flex flex-col items-center">
              {/* Root Card (Level 0) */}
              <MemberCard
                node={root}
                isRoot={true}
                isHighlighted={isMatchingSearch(
                  `${root.member.firstName} ${root.member.lastName}`,
                  root.member.email
                )}
                onDrillDown={() => handleDrillDown(root)}
                onViewDetails={() => onViewMemberDetails?.(root.memberId)}
                onUnstack={() => unstackMutation.mutate({ placementId: root.placementId })}
              />

              {/* Branch to Level 1 (3 Leg Positions) */}
              <Level1Branch
                parentNode={root}
                isMatchingSearch={isMatchingSearch}
                onDrillDown={handleDrillDown}
                onViewDetails={(mId) => onViewMemberDetails?.(mId)}
                onUnstack={(pId) => unstackMutation.mutate({ placementId: pId })}
                onOpenPlaceModal={handleOpenPlaceModal}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <PlaceMemberModal
        isOpen={placeSlotModalOpen}
        onClose={() => setPlaceSlotModalOpen(false)}
        orgId={orgId}
        targetSlot={selectedSlotForPlacement}
        onPlacedSuccess={() => {
          utils.matrix.getTree.invalidate();
          utils.matrix.getOpenSlots.invalidate();
        }}
      />

      <RandomPlacementModal
        isOpen={randomModalOpen}
        onClose={() => setRandomModalOpen(false)}
        orgId={orgId}
        unplacedCount={treeData?.unplacedMembersCount || 0}
        openSlotsCount={openSlotsData?.length || 0}
        mode={randomModalMode}
        onSuccess={() => {
          utils.matrix.getTree.invalidate();
          utils.matrix.getOpenSlots.invalidate();
        }}
      />
    </div>
  );
}

/**
 * Level 1 Branch Renderer: exactly matches user's screenshot showing 3 frontline legs
 * and their respective Level 2 children!
 */
function Level1Branch({
  parentNode,
  isMatchingSearch,
  onDrillDown,
  onViewDetails,
  onUnstack,
  onOpenPlaceModal,
}: {
  parentNode: TreeNode;
  isMatchingSearch: (name: string, email: string) => boolean;
  onDrillDown: (node: TreeNode) => void;
  onViewDetails: (memberId: number) => void;
  onUnstack: (placementId: number) => void;
  onOpenPlaceModal: (
    parentId: number | null,
    positionIndex: number,
    level: number,
    parentName?: string
  ) => void;
}) {
  const children = parentNode.children; // length 3: [Leg 0, Leg 1, Leg 2]

  return (
    <div className="flex flex-col items-center w-full">
      {/* Vertical trunk line down from Root */}
      <div className="w-0.5 h-6 bg-cyan-400/80 relative">
        <div className="w-1.5 h-1.5 rounded-full bg-cyan-300 absolute -bottom-0.5 -left-0.5" />
      </div>

      {/* 3 Leg Distribution Columns */}
      <div className="relative pt-6 flex items-start justify-center gap-6 sm:gap-8 md:gap-10">
        {/* Horizontal Distribution Bus Bar connecting the 3 legs */}
        <div className="absolute top-0 left-20 right-20 h-0.5 bg-cyan-400/70" />

        {[0, 1, 2].map((legIndex) => {
          const childNode = children[legIndex];

          return (
            <div key={legIndex} className="flex flex-col items-center relative">
              {/* Vertical connector drop from horizontal bus to Leg Card */}
              <div className="w-0.5 h-6 bg-cyan-400/70 absolute -top-6">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-300 absolute -top-0.5 -left-0.5" />
              </div>

              {childNode ? (
                /* Occupied Frontline Node (Level 1) */
                <div className="flex flex-col items-center">
                  <MemberCard
                    node={childNode}
                    legIndex={legIndex}
                    isHighlighted={isMatchingSearch(
                      `${childNode.member.firstName} ${childNode.member.lastName}`,
                      childNode.member.email
                    )}
                    onDrillDown={() => onDrillDown(childNode)}
                    onViewDetails={() => onViewDetails(childNode.memberId)}
                    onUnstack={() => onUnstack(childNode.placementId)}
                  />

                  {/* Children of this Level 1 Node (Level 2) */}
                  <Level2Branch
                    level1Node={childNode}
                    isMatchingSearch={isMatchingSearch}
                    onDrillDown={onDrillDown}
                    onViewDetails={onViewDetails}
                    onUnstack={onUnstack}
                    onOpenPlaceModal={onOpenPlaceModal}
                  />
                </div>
              ) : (
                /* Open Slot at Level 1 */
                <OpenSlotCard
                  legIndex={legIndex}
                  level={parentNode.level + 1}
                  parentName={`${parentNode.member.firstName} ${parentNode.member.lastName}`}
                  onAssign={() =>
                    onOpenPlaceModal(
                      parentNode.placementId,
                      legIndex,
                      parentNode.level + 1,
                      `${parentNode.member.firstName} ${parentNode.member.lastName}`
                    )
                  }
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Level 2 Branch Renderer: each Level 1 child has 3 leg slots (Level 2)
 */
function Level2Branch({
  level1Node,
  isMatchingSearch,
  onDrillDown,
  onViewDetails,
  onUnstack,
  onOpenPlaceModal,
}: {
  level1Node: TreeNode;
  isMatchingSearch: (name: string, email: string) => boolean;
  onDrillDown: (node: TreeNode) => void;
  onViewDetails: (memberId: number) => void;
  onUnstack: (placementId: number) => void;
  onOpenPlaceModal: (
    parentId: number | null,
    positionIndex: number,
    level: number,
    parentName?: string
  ) => void;
}) {
  const children = level1Node.children;

  return (
    <div className="flex flex-col items-center mt-2">
      {/* Vertical trunk line from Level 1 node */}
      <div className="w-0.5 h-5 bg-cyan-400/60 relative">
        <div className="w-1.5 h-1.5 rounded-full bg-cyan-300 absolute -bottom-0.5 -left-0.5" />
      </div>

      {/* Horizontal connector bar */}
      <div className="relative pt-5 flex items-start justify-center gap-2.5 sm:gap-3">
        <div className="absolute top-0 left-6 right-6 h-0.5 bg-cyan-400/50" />

        {[0, 1, 2].map((posIndex) => {
          const child = children[posIndex];

          return (
            <div key={posIndex} className="flex flex-col items-center relative">
              <div className="w-0.5 h-5 bg-cyan-400/50 absolute -top-5">
                <div className="w-1 h-1 rounded-full bg-cyan-300 absolute -top-0.5 -left-0.5" />
              </div>

              {child ? (
                <div className="flex flex-col items-center">
                  <MemberCard
                    node={child}
                    legIndex={posIndex}
                    compact={true}
                    isHighlighted={isMatchingSearch(
                      `${child.member.firstName} ${child.member.lastName}`,
                      child.member.email
                    )}
                    onDrillDown={() => onDrillDown(child)}
                    onViewDetails={() => onViewDetails(child.memberId)}
                    onUnstack={() => onUnstack(child.placementId)}
                  />
                  {/* Downline indicator if has children at level 3 */}
                  {child.totalDownlineCount > 0 && (
                    <button
                      onClick={() => onDrillDown(child)}
                      className="mt-1 px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/40 text-[9px] font-mono text-cyan-200 hover:bg-cyan-500/30 flex items-center gap-1"
                    >
                      <span>+{child.totalDownlineCount} Downline</span>
                      <ChevronRight className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              ) : (
                <OpenSlotCard
                  legIndex={posIndex}
                  level={level1Node.level + 1}
                  compact={true}
                  parentName={`${level1Node.member.firstName} ${level1Node.member.lastName}`}
                  onAssign={() =>
                    onOpenPlaceModal(
                      level1Node.placementId,
                      posIndex,
                      level1Node.level + 1,
                      `${level1Node.member.firstName} ${level1Node.member.lastName}`
                    )
                  }
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Member Card on Tree: Architectural CAD Card with Photo Avatar, Rank, and Coordinates
 */
function MemberCard({
  node,
  legIndex,
  isRoot = false,
  compact = false,
  isHighlighted = false,
  onDrillDown,
  onViewDetails,
  onUnstack,
}: {
  node: TreeNode;
  legIndex?: number;
  isRoot?: boolean;
  compact?: boolean;
  isHighlighted?: boolean;
  onDrillDown?: () => void;
  onViewDetails?: () => void;
  onUnstack?: () => void;
}) {
  const m = node.member;

  return (
    <div
      className={`relative group transition-all duration-200 ${
        compact ? "w-28 sm:w-32" : "w-44 sm:w-50"
      } ${
        isHighlighted
          ? "ring-2 ring-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.5)]"
          : "hover:shadow-[0_0_15px_rgba(56,189,248,0.25)]"
      }`}
    >
      {/* Card Body */}
      <div
        className={`rounded border ${
          isRoot
            ? "bg-[#0c2b52] border-cyan-300 shadow-lg"
            : "bg-[#092242] border-cyan-400/40 hover:border-cyan-400"
        } p-2 text-white relative`}
      >
        {/* Technical Corner crosshair */}
        <span className="absolute -top-1.5 -left-1.5 text-cyan-400/80 font-mono text-[9px]">+</span>
        <span className="absolute -top-1.5 -right-1.5 text-cyan-400/80 font-mono text-[9px]">+</span>

        {/* Top Coordinate Stamp */}
        <div className="flex items-center justify-between text-[9px] font-mono text-cyan-300 border-b border-white/10 pb-1 mb-1">
          <span className="truncate">
            {isRoot ? "LVL 0 // APEX" : `L${node.level}-P${Number(node.positionIndex) + 1}`}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="opacity-60 hover:opacity-100 p-0.5 rounded hover:bg-white/10 text-slate-300">
                <MoreVertical className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#0a203c] border-white/20 text-white text-xs">
              <DropdownMenuItem onClick={onViewDetails} className="cursor-pointer flex items-center gap-2">
                <Eye className="w-3.5 h-3.5 text-cyan-300" />
                View Member Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDrillDown} className="cursor-pointer flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-cyan-300" />
                Focus Subtree from Here
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onClick={() => {
                  if (
                    confirm(
                      `Remove ${m.firstName} ${m.lastName} and any downline members from the tree back to available pool?`
                    )
                  ) {
                    onUnstack?.();
                  }
                }}
                className="cursor-pointer text-red-400 hover:text-red-300 hover:bg-red-950/30 flex items-center gap-2"
              >
                <UserMinus className="w-3.5 h-3.5" />
                Unstack Member
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Avatar Photo + Identity */}
        <div className="flex items-center gap-1.5">
          <img
            src={
              m.avatarUrl ||
              "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80"
            }
            alt={`${m.firstName} ${m.lastName}`}
            className={`${
              compact ? "w-7 h-7" : "w-9 h-9"
            } rounded object-cover border border-cyan-400/50 flex-shrink-0`}
          />
          <div className="min-w-0 flex-1">
            <div
              className={`font-bold font-sans truncate text-white leading-tight ${
                compact ? "text-[10px]" : "text-xs"
              }`}
              title={`${m.firstName} ${m.lastName}`}
            >
              {m.firstName} {m.lastName}
            </div>
            <div
              className={`font-mono truncate text-cyan-300 ${
                compact ? "text-[8px]" : "text-[9px]"
              }`}
            >
              {m.rank}
            </div>
          </div>
        </div>

        {/* Card Footer Metrics */}
        <div className="mt-1.5 pt-1 border-t border-white/10 flex items-center justify-between text-[8px] sm:text-[9px] font-mono text-slate-300">
          <span>PV:{m.personalVolume}</span>
          <span className="text-emerald-300">
            {node.children.filter(Boolean).length}/3 LEGS
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Open Slot Card: Technical Dashed CAD Frame for available leg positions
 */
function OpenSlotCard({
  legIndex,
  level,
  compact = false,
  parentName,
  onAssign,
}: {
  legIndex: number;
  level: number;
  compact?: boolean;
  parentName?: string;
  onAssign: () => void;
}) {
  return (
    <div
      onClick={onAssign}
      className={`cursor-pointer group rounded border border-dashed border-cyan-400/40 hover:border-cyan-300 bg-[#07192f]/70 hover:bg-[#0a2342] p-1.5 text-center transition-all ${
        compact ? "w-28 sm:w-32 py-2.5" : "w-44 sm:w-50 py-3.5"
      }`}
      title={`Click to place an unplaced member into Leg ${legIndex + 1}`}
    >
      <div className="text-[8px] font-mono text-slate-400 uppercase tracking-wider mb-0.5">
        LEG {legIndex + 1}
      </div>
      <div className="flex items-center justify-center my-1">
        <div className="w-5 h-5 rounded-full border border-dashed border-cyan-400/50 group-hover:border-cyan-300 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
          <Plus className="w-3 h-3" />
        </div>
      </div>
      <div className="text-[10px] font-mono font-bold text-cyan-300 group-hover:text-white uppercase tracking-wider">
        + ASSIGN
      </div>
      <div className="text-[8px] font-mono text-slate-500 mt-0.5 truncate max-w-full">
        LVL {level}
      </div>
    </div>
  );
}
