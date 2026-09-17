import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { trpc } from "@/lib/trpc";
import { Shuffle, Sparkles, Workflow } from "lucide-react";
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
  const maxAvailable = Math.min(unplacedCount, openSlotsCount, 25);
  const [count, setCount] = useState<number>(Math.max(1, Math.min(3, maxAvailable)));
  const utils = trpc.useUtils();

  const randomFillMutation = trpc.matrix.randomFill.useMutation({
    onSuccess: (res) => {
      toast.success(`Successfully placed ${res.placedCount} members at random`, {
        description: res.placedMembers.slice(0, 3).join(", ") + (res.placedMembers.length > 3 ? "..." : ""),
      });
      utils.matrix.getTree.invalidate();
      utils.matrix.getOpenSlots.invalidate();
      utils.member.list.invalidate();
      onSuccess();
      onClose();
    },
    onError: (err) => {
      toast.error("Random placement error", { description: err.message });
    },
  });

  const autoFillMutation = trpc.matrix.autoFill.useMutation({
    onSuccess: (res) => {
      toast.success(`Systematically stacked ${res.placedCount} members in matrix order`, {
        description: res.placedMembers.slice(0, 3).join(", ") + (res.placedMembers.length > 3 ? "..." : ""),
      });
      utils.matrix.getTree.invalidate();
      utils.matrix.getOpenSlots.invalidate();
      utils.member.list.invalidate();
      onSuccess();
      onClose();
    },
    onError: (err) => {
      toast.error("Auto-fill error", { description: err.message });
    },
  });

  const handleExecute = () => {
    if (mode === "random") {
      randomFillMutation.mutate({ orgId, count });
    } else {
      autoFillMutation.mutate({ orgId, count });
    }
  };

  const isPending = randomFillMutation.isPending || autoFillMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-[#0a1e38] border border-cyan-400/40 text-white p-6 shadow-2xl">
        <DialogHeader className="border-b border-white/10 pb-4">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-300 uppercase tracking-widest">
            {mode === "random" ? (
              <>
                <Shuffle className="w-3.5 h-3.5 text-cyan-400" />
                <span>Stochastic Matrix Placement</span>
              </>
            ) : (
              <>
                <Workflow className="w-3.5 h-3.5 text-cyan-400" />
                <span>Top-Down BFS Spillover Stacking</span>
              </>
            )}
          </div>
          <DialogTitle className="text-xl font-bold font-display text-white mt-1">
            {mode === "random" ? "Random Slot Stacking" : "Auto-Fill Next Open Slots"}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-300 font-mono mt-1">
            {mode === "random"
              ? "Select unplaced members from master directory and assign them to available matrix open slots at random."
              : "Place candidates into open slots systematically level-by-level, left-to-right (standard MLM spillover)."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Blueprint Telemetry Metrics */}
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 bg-[#07172c] border border-white/10 rounded">
              <span className="text-slate-400 text-[10px] block uppercase">UNPLACED CANDIDATES</span>
              <span className="text-lg font-bold text-cyan-300 font-display">{unplacedCount}</span>
              <span className="text-[10px] text-slate-500 block">Available in directory</span>
            </div>
            <div className="p-3 bg-[#07172c] border border-white/10 rounded">
              <span className="text-slate-400 text-[10px] block uppercase">ATTACHABLE OPEN SLOTS</span>
              <span className="text-lg font-bold text-emerald-400 font-display">{openSlotsCount}</span>
              <span className="text-[10px] text-slate-500 block">Legs 1, 2, or 3</span>
            </div>
          </div>

          {maxAvailable === 0 ? (
            <div className="p-4 bg-amber-950/30 border border-amber-500/30 rounded text-center space-y-1">
              <p className="text-xs font-mono text-amber-300 font-semibold">
                No candidates or open slots available.
              </p>
              <p className="text-[11px] text-slate-400">
                {unplacedCount === 0
                  ? "Generate or enroll new members in the Master Directory first."
                  : "The matrix has no attachable open slots under current placed nodes."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-slate-300">CANDIDATES TO STACK:</span>
                <span className="text-cyan-300 font-bold bg-[#07172c] px-2.5 py-0.5 border border-cyan-400/30 rounded">
                  {count} member{count > 1 ? "s" : ""}
                </span>
              </div>
              <Slider
                min={1}
                max={maxAvailable}
                step={1}
                value={[count]}
                onValueChange={(val) => setCount(val[0])}
                className="py-2"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>1 MIN</span>
                <span>{maxAvailable} MAX BATCH</span>
              </div>
            </div>
          )}

          {/* Blueprint Photo Stamp (photos on every page preference) */}
          <div className="flex items-center gap-3 p-2.5 rounded bg-[#07172c] border border-white/10">
            <img
              src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=120&h=80&q=80"
              alt="Team Matrix Collaboration"
              className="w-14 h-10 object-cover rounded border border-white/15 opacity-70"
            />
            <div className="text-[11px] font-mono text-slate-300 leading-tight">
              <span className="text-cyan-400 font-bold block">VALIDATION CHECK</span>
              Ensures 3-child branching limit and preserves tree integrity without cycles.
            </div>
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
            onClick={handleExecute}
            disabled={maxAvailable === 0 || isPending}
            className="bg-cyan-500 hover:bg-cyan-400 text-[#07192f] font-bold text-xs uppercase tracking-wider font-mono px-4 h-9 flex items-center gap-2"
          >
            {mode === "random" ? (
              <>
                <Shuffle className="w-4 h-4" />
                {isPending ? "Executing Random Placement..." : `Place ${count} Members at Random`}
              </>
            ) : (
              <>
                <Workflow className="w-4 h-4" />
                {isPending ? "Executing Auto-Fill..." : `Auto-Stack Next ${count} Open Slots`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
