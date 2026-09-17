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
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Bookmark, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface SaveChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: number;
  defaultName?: string;
  onSavedSuccess: () => void;
}

export default function SaveChartModal({
  isOpen,
  onClose,
  orgId,
  defaultName = "",
  onSavedSuccess,
}: SaveChartModalProps) {
  const [chartName, setChartName] = useState(defaultName || `Chart Snapshot - ${new Date().toLocaleDateString()}`);
  const [description, setDescription] = useState("");
  const utils = trpc.useUtils();

  const saveChartMutation = trpc.charts.save.useMutation({
    onSuccess: (saved) => {
      toast.success(`Chart snapshot "${saved.name}" saved successfully`);
      utils.charts.list.invalidate();
      utils.activity.list.invalidate();
      onSavedSuccess();
      onClose();
    },
    onError: (err) => {
      toast.error("Failed to save chart snapshot", { description: err.message });
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chartName.trim()) {
      toast.error("Please enter a chart snapshot name");
      return;
    }
    saveChartMutation.mutate({
      orgId,
      name: chartName,
      description,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-white border border-slate-200 text-slate-800 p-6 shadow-2xl rounded-xl">
        <form onSubmit={handleSave}>
          <DialogHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 uppercase tracking-wider">
              <Bookmark className="w-4 h-4 text-amber-500" />
              <span>Version Control & Snapshot</span>
            </div>
            <DialogTitle className="text-xl font-bold font-sans text-slate-900 mt-1">
              Save Organization Chart Snapshot
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-sans mt-0.5">
              Persist the current downline configuration, positions, and locked states.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                SNAPSHOT NAME *
              </label>
              <Input
                required
                value={chartName}
                onChange={(e) => setChartName(e.target.value)}
                placeholder="e.g. Q4 Executive Leadership Downline"
                className="h-9 text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                NOTES / DESCRIPTION
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Milestone context, compensation qualifications, or regional notes..."
                className="text-xs resize-none h-18"
              />
            </div>
          </div>

          <DialogFooter className="border-t border-slate-100 pt-4 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-sans"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saveChartMutation.isPending}
              className="bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold text-xs uppercase tracking-wider font-sans px-4 h-9 flex items-center gap-1.5 shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>{saveChartMutation.isPending ? "Saving..." : "Save Chart Snapshot"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
