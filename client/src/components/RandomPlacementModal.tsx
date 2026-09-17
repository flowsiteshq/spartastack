import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { trpc } from "@/lib/trpc";
import { AlertCircle, Lock, Shuffle, Workflow } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface RandomPlacementModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: number;
  unplacedCount: number;
  openSlotsCount: number;
  mode: "random" | "autofill";
  onSuccess: () => void;
}

export default function RandomPlacementModal({
  isOpen,
  onClose,
  orgId,
  unplacedCount,
  openSlotsCount,
  mode,
  onSuccess,
}: RandomPlacementModalProps) {
  const [scope, setScope] = useState<"all" | "open_only" | "level" | "subtree">("open_only");
  const [targetLevel, setTargetLevel] = useState<number>(2);
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const { data: placedMembers } = trpc.member.list.useQuery(
    { orgId, status: "placed" },
    { enabled: isOpen && mode === "random" }
  );

  const randomStackMutation = trpc.matrix.randomStack.useMutation({
    onSuccess: (res) => {
      toast.success(res.message || `Successfully placed ${res.placedCount} members at random`);
      utils.matrix.getTree.invalidate();
      utils.matrix.getOpenSlots.invalidate();
      utils.member.list.invalidate();
      utils.activity.list.invalidate();
      onSuccess();
      onClose();
    },
    onError: (err) => {
      toast.error("Random placement error", { description: err.message });
    },
  });

  const autoFillMutation = trpc.matrix.autoFill.useMutation({
    onSuccess: (res) => {
      toast.success(`Systematically stacked ${res.placedCount} members in order`, {
        description: res.placedMembers.map((m) => `${m.name} → ${m.coordinate}`).join(", "),
      });
      utils.matrix.getTree.invalidate();
      utils.matrix.getOpenSlots.invalidate();
      utils.member.list.invalidate();
      utils.activity.list.invalidate();
      onSuccess();
      onClose();
    },
    onError: (err) => {
      toast.error("Auto-fill error", { description: err.message });
    },
  });

  const handleExecute = () => {
    if (mode === "random") {
      randomStackMutation.mutate({
        orgId,
        scope,
        level: scope === "level" ? targetLevel : undefined,
        rootPlacementId: scope === "subtree" && selectedParentId ? selectedParentId : undefined,
      });
    } else {
      autoFillMutation.mutate({ orgId, count: 1 });
    }
  };

  const isPending = randomStackMutation.isPending || autoFillMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-white border border-slate-200 text-slate-800 p-6 shadow-2xl rounded-xl">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider">
            {mode === "random" ? (
              <>
                <Shuffle className="w-4 h-4 text-blue-600" />
                <span>Random Placement Engine</span>
              </>
            ) : (
              <>
                <Workflow className="w-4 h-4 text-blue-600" />
                <span>Top-Down Matrix Auto-Fill</span>
              </>
            )}
          </div>
          <DialogTitle className="text-xl font-bold font-sans text-slate-900 mt-1">
            {mode === "random" ? "Random Stack Configuration" : "Auto-Fill Next Open Position"}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 font-sans mt-0.5">
            {mode === "random"
              ? "Choose how to randomly distribute members into available 3×5 matrix slots."
              : "Automatically locate the next eligible open slot and stack the next candidate."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Telemetry counters */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg">
              <span className="text-[11px] font-medium text-slate-500 uppercase block">UNPLACED MEMBERS</span>
              <span className="text-xl font-bold text-slate-900 font-sans">{unplacedCount}</span>
              <span className="text-[11px] text-slate-500 block">In master list</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg">
              <span className="text-[11px] font-medium text-slate-500 uppercase block">OPEN POSITIONS</span>
              <span className="text-xl font-bold text-blue-600 font-sans">{openSlotsCount}</span>
              <span className="text-[11px] text-slate-500 block">Ready to attach</span>
            </div>
          </div>

          {mode === "random" && (
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-700 block">
                RANDOMIZATION SCOPE:
              </label>
              <RadioGroup
                value={scope}
                onValueChange={(val: any) => setScope(val)}
                className="space-y-2 text-xs"
              >
                <label className="flex items-start gap-3 p-2.5 rounded-lg border border-slate-200 hover:border-blue-400 bg-slate-50/50 cursor-pointer">
                  <RadioGroupItem value="open_only" className="mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-900 block">Randomize Open Positions Only</span>
                    <span className="text-[11px] text-slate-500 block">
                      Preserves all placed members and assigns unplaced members into current open slots.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-2.5 rounded-lg border border-slate-200 hover:border-blue-400 bg-slate-50/50 cursor-pointer">
                  <RadioGroupItem value="all" className="mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-900 block">Randomize Entire Chart</span>
                    <span className="text-[11px] text-slate-500 block">
                      Shuffles all unlocked positions while strictly preserving locked members.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-2.5 rounded-lg border border-slate-200 hover:border-blue-400 bg-slate-50/50 cursor-pointer">
                  <RadioGroupItem value="level" className="mt-0.5" />
                  <div className="flex-1">
                    <span className="font-semibold text-slate-900 block">Randomize Specific Level</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-slate-500">Target Level:</span>
                      {[1, 2, 3, 4, 5].map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setTargetLevel(lvl)}
                          className={`w-6 h-6 rounded text-xs font-bold transition-colors ${
                            targetLevel === lvl
                              ? "bg-blue-600 text-white shadow-sm"
                              : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-2.5 rounded-lg border border-slate-200 hover:border-blue-400 bg-slate-50/50 cursor-pointer">
                  <RadioGroupItem value="subtree" className="mt-0.5" />
                  <div className="flex-1">
                    <span className="font-semibold text-slate-900 block">Beneath Selected Member (Subtree)</span>
                    <span className="text-[11px] text-slate-500 block mb-1">
                      Target only open downline positions under a specific leader.
                    </span>
                    {scope === "subtree" && (
                      <select
                        value={selectedParentId || ""}
                        onChange={(e) => setSelectedParentId(Number(e.target.value) || null)}
                        className="w-full text-xs h-8 border border-slate-200 rounded bg-white px-2 mt-1"
                      >
                        <option value="">Select a Leader / Upline...</option>
                        {(placedMembers || []).map((m) => (
                          <option key={m.id} value={m.placementId || ""}>
                            {m.firstName} {m.lastName} ({m.rank})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </label>
              </RadioGroup>
            </div>
          )}

          {/* Critical Lock Guarantee Callout */}
          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200/80 text-amber-900 text-xs">
            <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <div className="leading-tight">
              <span className="font-bold block">Lock Protection Active</span>
              Members with position locks (🔒) will remain fixed in their current positions.
            </div>
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
            onClick={handleExecute}
            disabled={openSlotsCount === 0 || isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider font-sans px-4 h-9 flex items-center gap-2 shadow-sm"
          >
            {mode === "random" ? (
              <>
                <Shuffle className="w-4 h-4" />
                {isPending ? "Randomizing..." : "Execute Random Stack"}
              </>
            ) : (
              <>
                <Workflow className="w-4 h-4" />
                {isPending ? "Auto-Filling..." : "Auto-Fill Next Open Slot"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
