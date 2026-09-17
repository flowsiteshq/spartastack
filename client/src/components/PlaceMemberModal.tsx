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
import {
  Check,
  Plus,
  Search,
  UserCheck,
  UserPlus,
  Users,
  Workflow,
} from "lucide-react";
import { useMemo, useState } from "react";
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
  onOpenCreateMemberModal?: () => void;
}

export default function PlaceMemberModal({
  isOpen,
  onClose,
  orgId,
  targetSlot,
  onPlacedSuccess,
  onOpenCreateMemberModal,
}: PlaceMemberModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: members, isLoading } = trpc.member.list.useQuery(
    {
      orgId,
      status: "unplaced",
    },
    { enabled: isOpen }
  );

  const placeMutation = trpc.matrix.place.useMutation({
    onSuccess: () => {
      toast.success("Member successfully placed into position");
      utils.matrix.getTree.invalidate();
      utils.matrix.getOpenSlots.invalidate();
      utils.member.list.invalidate();
      utils.activity.list.invalidate();
      onPlacedSuccess();
      onClose();
    },
    onError: (err) => {
      toast.error("Placement error", { description: err.message });
    },
  });

  const autoFillMutation = trpc.matrix.autoFill.useMutation({
    onSuccess: (res) => {
      toast.success(`Position auto-filled with ${res.placedMembers[0]?.name || "candidate"}`);
      utils.matrix.getTree.invalidate();
      utils.matrix.getOpenSlots.invalidate();
      utils.member.list.invalidate();
      utils.activity.list.invalidate();
      onPlacedSuccess();
      onClose();
    },
    onError: (err) => {
      toast.error("Auto-fill error", { description: err.message });
    },
  });

  const filteredMembers = useMemo(() => {
    if (!members) return [];
    if (!searchTerm.trim()) return members;
    const q = searchTerm.toLowerCase().trim();
    return members.filter(
      (m) =>
        m.firstName.toLowerCase().includes(q) ||
        m.lastName.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.rank.toLowerCase().includes(q)
    );
  }, [members, searchTerm]);

  if (!targetSlot) return null;

  const handleConfirmPlacement = () => {
    if (!selectedMemberId) {
      toast.error("Please select a candidate from the list.");
      return;
    }
    placeMutation.mutate({
      orgId,
      memberId: selectedMemberId,
      parentId: targetSlot.parentId,
      positionIndex: targetSlot.positionIndex,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg bg-white border border-slate-200 text-slate-800 p-6 shadow-2xl rounded-2xl">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider">
            <UserCheck className="w-4 h-4 text-blue-600" />
            <span>Position Assignment</span>
          </div>
          <DialogTitle className="text-xl font-bold font-sans text-slate-900 mt-1">
            Assign Position: LEVEL {targetSlot.level} - POS {targetSlot.positionIndex + 1}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 font-sans mt-0.5">
            {targetSlot.parentName
              ? `Direct sponsor: ${targetSlot.parentName}`
              : "Apex root position for the organization"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 3 Action Pathways Header */}
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="text-xs text-slate-600 font-medium">Quick Pathways:</div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  autoFillMutation.mutate({ orgId, count: 1 });
                }}
                disabled={autoFillMutation.isPending || !members || members.length === 0}
                className="h-7 text-xs font-bold text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <Workflow className="w-3.5 h-3.5 mr-1" />
                Auto-Fill Position
              </Button>
              {onOpenCreateMemberModal && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onClose();
                    onOpenCreateMemberModal();
                  }}
                  className="h-7 text-xs font-bold text-slate-700 border-slate-300 hover:bg-slate-100"
                >
                  <Plus className="w-3.5 h-3.5 mr-1 text-slate-500" />
                  Create New Member
                </Button>
              )}
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <Input
              placeholder="Search available candidates by name, email, rank..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 h-9 text-xs bg-slate-50 border-slate-200 rounded-lg"
            />
          </div>

          {/* Scrollable Members List */}
          <div className="max-h-60 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading master pool...</div>
            ) : filteredMembers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                <Users className="w-8 h-8 text-slate-300 mx-auto" />
                <p>No unplaced candidates found.</p>
                {onOpenCreateMemberModal && (
                  <Button
                    onClick={() => {
                      onClose();
                      onOpenCreateMemberModal();
                    }}
                    size="sm"
                    className="bg-[#1d70f5] text-white text-xs font-bold"
                  >
                    + Enroll Member
                  </Button>
                )}
              </div>
            ) : (
              filteredMembers.map((m) => {
                const isSelected = selectedMemberId === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMemberId(m.id)}
                    className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-blue-50 border-[#1d70f5] ring-2 ring-blue-100"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={
                          m.avatarUrl ||
                          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80"
                        }
                        alt={`${m.firstName} ${m.lastName}`}
                        className="w-9 h-9 rounded-full object-cover border border-slate-200 flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-xs truncate">
                          {m.firstName} {m.lastName}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-500 font-semibold">{m.rank}</span>
                          <span className="text-[10px] text-slate-400">PV: {m.personalVolume}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-[#1d70f5] text-white flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-slate-100 pt-4 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-sans"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmPlacement}
            disabled={!selectedMemberId || placeMutation.isPending}
            className="bg-[#1d70f5] hover:bg-blue-600 text-white font-bold text-xs uppercase tracking-wider font-sans px-5 h-9 flex items-center gap-2 shadow-sm"
          >
            <UserCheck className="w-4 h-4" />
            <span>{placeMutation.isPending ? "Assigning..." : "Assign to Position"}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
