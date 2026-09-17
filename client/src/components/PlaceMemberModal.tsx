import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Check, Search, Shield, User, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface PlaceMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: number;
  targetSlot: {
    parentId: number | null;
    positionIndex: number;
    level: number;
    parentName?: string;
    slotName?: string;
  } | null;
  onPlacedSuccess: () => void;
}

export default function PlaceMemberModal({
  isOpen,
  onClose,
  orgId,
  targetSlot,
  onPlacedSuccess,
}: PlaceMemberModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  // Fetch unplaced members
  const { data: unplacedMembers, isLoading } = trpc.member.list.useQuery(
    {
      orgId,
      status: "unplaced",
      search: searchTerm || undefined,
    },
    {
      enabled: isOpen && Boolean(orgId),
    }
  );

  const placeMutation = trpc.matrix.place.useMutation({
    onSuccess: () => {
      toast.success("Member placed successfully into matrix slot", {
        description: targetSlot?.slotName || `Level ${targetSlot?.level} Leg ${Number(targetSlot?.positionIndex) + 1}`,
      });
      utils.matrix.getTree.invalidate();
      utils.matrix.getOpenSlots.invalidate();
      utils.member.list.invalidate();
      onPlacedSuccess();
      onClose();
      setSelectedMemberId(null);
      setSearchTerm("");
    },
    onError: (err) => {
      toast.error("Placement error", { description: err.message });
    },
  });

  const handleConfirmPlacement = () => {
    if (!selectedMemberId || !targetSlot) return;
    placeMutation.mutate({
      orgId,
      memberId: selectedMemberId,
      parentId: targetSlot.parentId,
      positionIndex: targetSlot.positionIndex,
    });
  };

  if (!targetSlot) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl bg-[#0a1e38] border border-cyan-400/40 text-white p-6 shadow-2xl">
        <DialogHeader className="border-b border-white/10 pb-4">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-300 uppercase tracking-widest">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span>CAD Matrix Placement Directive</span>
          </div>
          <DialogTitle className="text-xl font-bold font-display text-white mt-1">
            Assign Member to Slot
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-300 font-mono mt-1">
            {targetSlot.parentId === null ? (
              <span className="text-amber-300">Target: Organization Root Leader (Level 0)</span>
            ) : (
              <span>
                Target: <span className="text-cyan-200">Level {targetSlot.level}</span> // Leg {targetSlot.positionIndex + 1} under{" "}
                <span className="text-white font-semibold">{targetSlot.parentName || "Parent Node"}</span>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Search Unplaced Pool */}
          <div className="relative">
            <Search className="w-4 h-4 text-cyan-400 absolute left-3 top-3" />
            <Input
              placeholder="Search unplaced members by name, email, or rank..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 bg-[#07172c] border-white/20 text-white placeholder:text-slate-400 focus:border-cyan-400 text-xs font-sans"
            />
          </div>

          {/* List of unplaced members */}
          <div className="border border-white/10 rounded max-h-64 overflow-y-auto divide-y divide-white/5 bg-[#07172c]/80 p-1">
            {isLoading ? (
              <div className="p-8 text-center text-xs font-mono text-slate-400">
                Loading available candidates...
              </div>
            ) : !unplacedMembers || unplacedMembers.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <p className="text-xs text-slate-400 font-mono">
                  No unplaced members found matching criteria.
                </p>
                <p className="text-[11px] text-cyan-300">
                  All members are currently stacked or you need to enroll new recruits in the Master Directory.
                </p>
              </div>
            ) : (
              unplacedMembers.map((member) => (
                <div
                  key={member.id}
                  onClick={() => setSelectedMemberId(member.id)}
                  className={`p-2.5 flex items-center justify-between cursor-pointer rounded transition-colors ${
                    selectedMemberId === member.id
                      ? "bg-cyan-500/20 border border-cyan-400/50"
                      : "hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        member.avatarUrl ||
                        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&h=100&q=80"
                      }
                      alt={`${member.firstName} ${member.lastName}`}
                      className="w-9 h-9 rounded object-cover border border-white/20"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">
                          {member.firstName} {member.lastName}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950/80 border border-cyan-400/30 text-cyan-300">
                          {member.rank}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono block">
                        {member.email} • PV: {member.personalVolume}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedMemberId === member.id && (
                      <span className="flex items-center gap-1 text-[11px] font-mono text-cyan-300 font-semibold bg-cyan-500/30 px-2 py-1 rounded">
                        <Check className="w-3.5 h-3.5" /> Selected
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Architectural Coordinate Stamp */}
          <div className="p-2.5 rounded bg-[#07172c] border border-cyan-400/20 flex items-center justify-between text-[10px] font-mono text-slate-300">
            <span>MATRIX CONSTRAINT: 3 LEGS MAX</span>
            <span>DEPTH LIMIT: TIER 5</span>
            <span className="text-cyan-400">DUPLICATE PREVENT: ACTIVE</span>
          </div>
        </div>

        <DialogFooter className="border-t border-white/10 pt-4 flex items-center justify-between gap-3 sm:justify-between">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-white/20 hover:bg-white/10 text-slate-300 text-xs font-mono"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmPlacement}
            disabled={!selectedMemberId || placeMutation.isPending}
            className="bg-cyan-500 hover:bg-cyan-400 text-[#07192f] font-bold text-xs uppercase tracking-wider font-mono px-4 h-9 flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            {placeMutation.isPending ? "Assigning..." : "Confirm Matrix Placement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
