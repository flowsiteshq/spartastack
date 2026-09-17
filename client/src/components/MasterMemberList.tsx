import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  CheckCircle2,
  Clock,
  Edit,
  ExternalLink,
  Filter,
  Layers,
  Mail,
  MoreVertical,
  Phone,
  Plus,
  Search,
  Shuffle,
  Sparkles,
  Trash2,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Member } from "../../../drizzle/schema";
import { MemberWithPlacement } from "../../../server/db";
import MemberModal from "./MemberModal";
import PlaceMemberModal from "./PlaceMemberModal";
import RandomPlacementModal from "./RandomPlacementModal";

interface MasterMemberListProps {
  orgId: number;
  onSwitchToTree: () => void;
}

export default function MasterMemberList({ orgId, onSwitchToTree }: MasterMemberListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "unplaced" | "placed">("all");
  const [rankFilter, setRankFilter] = useState("all");

  // Modals
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const [placeModalOpen, setPlaceModalOpen] = useState(false);
  const [selectedSlotForPlacement, setSelectedSlotForPlacement] = useState<{
    parentId: number | null;
    positionIndex: number;
    level: number;
    parentName?: string;
    slotName?: string;
  } | null>(null);
  const [memberToPlaceDirectly, setMemberToPlaceDirectly] = useState<MemberWithPlacement | null>(null);

  const [randomModalOpen, setRandomModalOpen] = useState(false);

  const utils = trpc.useUtils();

  // Queries
  const { data: membersList, isLoading } = trpc.member.list.useQuery({
    orgId,
    search: searchTerm || undefined,
    status: statusFilter,
    rank: rankFilter !== "all" ? rankFilter : undefined,
  });

  const { data: openSlots } = trpc.matrix.getOpenSlots.useQuery({ orgId });

  // Mutations
  const batchGenerateMutation = trpc.member.batchGenerate.useMutation({
    onSuccess: (res) => {
      toast.success(`Generated ${res.count} realistic test candidates with photo portraits`);
      utils.member.list.invalidate();
      utils.matrix.getTree.invalidate();
    },
  });

  const deleteMutation = trpc.member.delete.useMutation({
    onSuccess: () => {
      toast.info("Member record deleted from directory");
      utils.member.list.invalidate();
      utils.matrix.getTree.invalidate();
      utils.matrix.getOpenSlots.invalidate();
    },
  });

  const unstackMutation = trpc.matrix.unstack.useMutation({
    onSuccess: (res) => {
      toast.success(`Unstacked ${res.unstackedCount} member(s) back to available pool`);
      utils.member.list.invalidate();
      utils.matrix.getTree.invalidate();
      utils.matrix.getOpenSlots.invalidate();
    },
  });

  const quickPlaceMutation = trpc.matrix.place.useMutation({
    onSuccess: () => {
      toast.success("Candidate successfully stacked into next available open slot");
      utils.member.list.invalidate();
      utils.matrix.getTree.invalidate();
      utils.matrix.getOpenSlots.invalidate();
    },
    onError: (err) => {
      toast.error("Placement error", { description: err.message });
    },
  });

  const counts = useMemo(() => {
    if (!membersList) return { total: 0, unplaced: 0, placed: 0 };
    // We can count from query result or separate
    const total = membersList.length;
    const placed = membersList.filter((m) => m.isPlaced).length;
    const unplaced = total - placed;
    return { total, unplaced, placed };
  }, [membersList]);

  const handleQuickPlaceFirstSlot = (member: MemberWithPlacement) => {
    if (!openSlots || openSlots.length === 0) {
      toast.error("No open slots available in the current matrix tree.");
      return;
    }
    const slot = openSlots[0];
    quickPlaceMutation.mutate({
      orgId,
      memberId: member.id,
      parentId: slot.parentId,
      positionIndex: slot.positionIndex,
    });
  };

  return (
    <div className="space-y-4">
      {/* Directory Header Toolbar */}
      <div className="bg-[#07172c] border border-cyan-400/30 p-4 rounded space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-300 uppercase tracking-wider">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>Central Master Directory</span>
            </div>
            <h2 className="text-xl font-bold font-display text-white mt-0.5">
              Member Profiles & Placement Ledger
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Maintain distributor identities and control placement into the 3×5 downline tree.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={() => {
                setEditingMember(null);
                setMemberModalOpen(true);
              }}
              className="bg-cyan-500 hover:bg-cyan-400 text-[#07192f] font-bold text-xs uppercase tracking-wider font-mono px-3 h-8 flex items-center gap-1.5 shadow"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Enroll Member</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => batchGenerateMutation.mutate({ orgId, count: 5 })}
              disabled={batchGenerateMutation.isPending}
              className="border-white/20 hover:border-cyan-400 bg-[#0a203c] text-cyan-300 hover:text-white text-xs font-mono px-3 h-8 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>+5 Test Recruits</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => setRandomModalOpen(true)}
              className="border-cyan-400/40 hover:border-cyan-400 bg-[#0a203c] text-white text-xs font-mono px-3 h-8 flex items-center gap-1.5"
            >
              <Shuffle className="w-3.5 h-3.5 text-cyan-400" />
              <span>Random Stacking</span>
            </Button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="border-t border-white/10 pt-3 flex flex-wrap items-center justify-between gap-3">
          {/* Left: Filter by Status Tabs (User Requirement: Available vs Already-Placed) */}
          <div className="flex items-center bg-[#0a203c] border border-white/15 p-0.5 rounded text-xs font-mono">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1 rounded uppercase tracking-wider transition-colors ${
                statusFilter === "all"
                  ? "bg-cyan-500 text-[#07192f] font-bold"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              All Directory
            </button>

            <button
              onClick={() => setStatusFilter("unplaced")}
              className={`px-3 py-1 rounded uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
                statusFilter === "unplaced"
                  ? "bg-amber-400 text-[#07192f] font-bold"
                  : "text-amber-300/80 hover:text-amber-200"
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Available (Unplaced)</span>
            </button>

            <button
              onClick={() => setStatusFilter("placed")}
              className={`px-3 py-1 rounded uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
                statusFilter === "placed"
                  ? "bg-emerald-400 text-[#07192f] font-bold"
                  : "text-emerald-300/80 hover:text-emerald-200"
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Stacked in Tree</span>
            </button>
          </div>

          {/* Right: Search & Rank Filter */}
          <div className="flex items-center gap-2 flex-1 sm:flex-initial min-w-[240px]">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <Input
                placeholder="Search by name, email, rank..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 bg-[#0a203c] border-white/20 text-white placeholder:text-slate-500 text-xs font-mono"
              />
            </div>

            <Select value={rankFilter} onValueChange={(val) => setRankFilter(val)}>
              <SelectTrigger className="w-36 h-8 bg-[#0a203c] border-white/20 text-white text-xs font-mono">
                <SelectValue placeholder="All Ranks" />
              </SelectTrigger>
              <SelectContent className="bg-[#0a203c] border-white/20 text-white font-mono text-xs">
                <SelectItem value="all">All Ranks</SelectItem>
                <SelectItem value="Associate">Associate</SelectItem>
                <SelectItem value="Bronze Builder">Bronze Builder</SelectItem>
                <SelectItem value="Silver Associate">Silver Associate</SelectItem>
                <SelectItem value="Gold Leader">Gold Leader</SelectItem>
                <SelectItem value="Diamond Executive">Diamond Executive</SelectItem>
                <SelectItem value="Crown Director">Crown Director</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Member Cards Grid (Visual richness with photos on every page!) */}
      {isLoading ? (
        <div className="p-12 text-center font-mono text-xs text-cyan-300">
          QUERYING MASTER DIRECTORY LEDGER...
        </div>
      ) : !membersList || membersList.length === 0 ? (
        <div className="bg-[#07172c] border border-white/10 rounded p-12 text-center space-y-3">
          <Users className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="text-sm font-bold text-white font-display">No Members Found</h3>
          <p className="text-xs text-slate-400 font-mono max-w-sm mx-auto">
            No directory entries match the current search or status filter. Enroll a new member or generate test recruits.
          </p>
          <Button
            onClick={() => batchGenerateMutation.mutate({ orgId, count: 5 })}
            className="bg-cyan-500 hover:bg-cyan-400 text-[#07192f] text-xs font-mono font-bold"
          >
            + Generate 5 Test Candidates
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {membersList.map((member) => (
            <div
              key={member.id}
              className="bg-[#0a1e38] border border-cyan-400/25 hover:border-cyan-400 rounded p-3.5 flex flex-col justify-between transition-all hover:shadow-[0_0_15px_rgba(56,189,248,0.15)] relative group"
            >
              {/* Corner crosshairs */}
              <span className="absolute -top-1.5 -left-1.5 text-cyan-400/60 font-mono text-[9px]">+</span>
              <span className="absolute -top-1.5 -right-1.5 text-cyan-400/60 font-mono text-[9px]">+</span>

              <div>
                {/* Status Bar */}
                <div className="flex items-center justify-between text-[10px] font-mono border-b border-white/10 pb-1.5 mb-2.5">
                  {member.isPlaced ? (
                    <span className="flex items-center gap-1 text-emerald-300 font-semibold bg-emerald-950/60 border border-emerald-400/30 px-1.5 py-0.5 rounded">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      STACKED: LVL {member.placementLevel} // LEG {(member.placementPosition ?? 0) + 1}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-amber-300 font-semibold bg-amber-950/60 border border-amber-400/30 px-1.5 py-0.5 rounded">
                      <Clock className="w-3 h-3 text-amber-400" />
                      AVAILABLE (UNPLACED)
                    </span>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="opacity-60 hover:opacity-100 p-0.5 text-slate-300">
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-[#0a203c] border-white/20 text-white text-xs">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditingMember(member);
                          setMemberModalOpen(true);
                        }}
                        className="cursor-pointer flex items-center gap-2"
                      >
                        <Edit className="w-3.5 h-3.5 text-cyan-300" />
                        Edit Profile
                      </DropdownMenuItem>

                      {member.isPlaced && member.placementId && (
                        <DropdownMenuItem
                          onClick={() => {
                            if (confirm(`Unstack ${member.firstName} ${member.lastName} from downline tree?`)) {
                              unstackMutation.mutate({ placementId: member.placementId! });
                            }
                          }}
                          className="cursor-pointer text-amber-400 flex items-center gap-2"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                          Unstack from Tree
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuItem
                        onClick={() => {
                          if (confirm(`Delete ${member.firstName} ${member.lastName} permanently from directory?`)) {
                            deleteMutation.mutate({ id: member.id });
                          }
                        }}
                        className="cursor-pointer text-red-400 flex items-center gap-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Member
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Member Identity & Portrait Photo */}
                <div className="flex items-center gap-3 mb-2.5">
                  <img
                    src={
                      member.avatarUrl ||
                      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80"
                    }
                    alt={`${member.firstName} ${member.lastName}`}
                    className="w-12 h-12 rounded object-cover border-2 border-cyan-400/40 shadow flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <h4 className="font-bold font-sans text-sm text-white truncate leading-tight">
                      {member.firstName} {member.lastName}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#07172c] border border-cyan-400/30 text-cyan-300">
                        {member.rank}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        PV: {member.personalVolume}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact & Placement Details */}
                <div className="space-y-1 text-[11px] font-mono text-slate-300 border-t border-white/5 pt-2">
                  <div className="flex items-center gap-1.5 truncate text-slate-400">
                    <Mail className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                    <span className="truncate">{member.email}</span>
                  </div>
                  {member.phone && (
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Phone className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                      <span>{member.phone}</span>
                    </div>
                  )}
                  {member.parentMemberName && (
                    <div className="text-[10px] text-cyan-200 mt-1 font-mono">
                      Sponsor Node: <span className="font-bold text-white">{member.parentMemberName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button at bottom of card */}
              <div className="mt-3 pt-2 border-t border-white/10">
                {member.isPlaced ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onSwitchToTree}
                    className="w-full h-7 text-[11px] font-mono border-cyan-400/30 hover:border-cyan-400 bg-[#07172c] text-cyan-300 hover:text-white flex items-center justify-center gap-1.5"
                  >
                    <Layers className="w-3 h-3" />
                    <span>View in 3×5 Tree</span>
                  </Button>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5">
                    <Button
                      size="sm"
                      onClick={() => handleQuickPlaceFirstSlot(member)}
                      disabled={quickPlaceMutation.isPending}
                      className="h-7 text-[10px] font-mono font-bold bg-cyan-500 hover:bg-cyan-400 text-[#07192f] uppercase tracking-wider flex items-center justify-center gap-1"
                      title="Place into next available open slot in tree"
                    >
                      <UserPlus className="w-3 h-3" />
                      <span>Auto-Stack</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onSwitchToTree}
                      className="h-7 text-[10px] font-mono border-white/20 hover:border-cyan-400 bg-transparent text-slate-300 hover:text-white flex items-center justify-center gap-1"
                      title="Open tree view to select custom slot"
                    >
                      <span>Pick Slot</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Member Modal */}
      <MemberModal
        isOpen={memberModalOpen}
        onClose={() => setMemberModalOpen(false)}
        orgId={orgId}
        memberToEdit={editingMember}
        onSuccess={() => utils.member.list.invalidate()}
      />

      {/* Random Placement Modal */}
      <RandomPlacementModal
        isOpen={randomModalOpen}
        onClose={() => setRandomModalOpen(false)}
        orgId={orgId}
        unplacedCount={counts.unplaced}
        openSlotsCount={openSlots?.length || 0}
        mode="random"
        onSuccess={() => {
          utils.member.list.invalidate();
          utils.matrix.getTree.invalidate();
          utils.matrix.getOpenSlots.invalidate();
        }}
      />
    </div>
  );
}
