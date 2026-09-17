import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import {
  Bookmark,
  Calendar,
  CheckCircle2,
  Copy,
  Edit2,
  Layers,
  Network,
  RotateCcw,
  Save,
  Trash2,
  UploadCloud,
  Users,
} from "lucide-react";
import { toast } from "sonner";

interface SavedChartsManagerProps {
  orgId: number;
  onOpenSaveModal: () => void;
  onChartLoaded: () => void;
}

export default function SavedChartsManager({
  orgId,
  onOpenSaveModal,
  onChartLoaded,
}: SavedChartsManagerProps) {
  const utils = trpc.useUtils();
  const { data: charts, isLoading } = trpc.charts.list.useQuery({ orgId });

  const renameMutation = trpc.charts.rename.useMutation({
    onSuccess: (updated) => {
      toast.success(`Renamed chart snapshot to "${updated.name}"`);
      utils.charts.list.invalidate();
    },
    onError: (err) => {
      toast.error("Failed to rename chart", { description: err.message });
    },
  });

  const loadMutation = trpc.charts.load.useMutation({
    onSuccess: () => {
      toast.success("Chart snapshot successfully restored into active workspace");
      utils.matrix.getTree.invalidate();
      utils.matrix.getOpenSlots.invalidate();
      utils.member.list.invalidate();
      utils.activity.list.invalidate();
      onChartLoaded();
    },
    onError: (err) => {
      toast.error("Failed to load chart snapshot", { description: err.message });
    },
  });

  const duplicateMutation = trpc.charts.duplicate.useMutation({
    onSuccess: (dupe) => {
      toast.success(`Duplicated snapshot "${dupe.name}"`);
      utils.charts.list.invalidate();
    },
  });

  const deleteMutation = trpc.charts.delete.useMutation({
    onSuccess: () => {
      toast.info("Chart snapshot deleted");
      utils.charts.list.invalidate();
    },
  });

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-600 uppercase tracking-wider">
            <Bookmark className="w-4 h-4 text-amber-500" />
            <span>Version Control & Snapshots</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 mt-1">Saved Organization Charts</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Restore previous downline placements, compare structural iterations, or branch into new scenarios.
          </p>
        </div>
        <Button
          onClick={onOpenSaveModal}
          className="bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold text-xs uppercase tracking-wider px-4 h-9 rounded-lg shadow-sm flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          <span>Save Current Chart</span>
        </Button>
      </div>

      {/* Charts Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading saved charts...</div>
      ) : !charts || charts.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200/80 space-y-3">
          <Layers className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No Saved Charts Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Save a snapshot of your current 3×5 downline configuration to preserve it before testing major randomizations.
          </p>
          <Button
            onClick={onOpenSaveModal}
            className="bg-[#1d70f5] hover:bg-blue-600 text-white text-xs font-bold"
          >
            Save First Snapshot
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {charts.map((chart) => (
            <div
              key={chart.id}
              className="bg-white rounded-xl border border-slate-200/90 hover:border-blue-400 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full uppercase">
                    Snapshot #{chart.id}
                  </span>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                    <Calendar className="w-3 h-3" />
                    {new Date(chart.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">{chart.name}</h3>
                  {chart.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{chart.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs font-medium">
                  <div className="p-2 rounded bg-slate-50">
                    <span className="text-slate-400 text-[10px] block uppercase">FILLED POSITIONS</span>
                    <span className="font-bold text-slate-900">{chart.filledPositions}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-50">
                    <span className="text-slate-400 text-[10px] block uppercase">COMPLETION</span>
                    <span className="font-bold text-emerald-600">{chart.completionRate}%</span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const newName = prompt("Enter new snapshot name:", chart.name);
                      if (newName && newName.trim() && newName !== chart.name) {
                        renameMutation.mutate({ chartId: chart.id, name: newName.trim() });
                      }
                    }}
                    className="h-8 text-xs text-slate-600 hover:text-slate-900 px-2"
                    title="Rename Snapshot"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => duplicateMutation.mutate({ chartId: chart.id })}
                    className="h-8 text-xs text-slate-600 hover:text-slate-900 px-2"
                    title="Duplicate Snapshot"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`Delete snapshot "${chart.name}"?`)) {
                        deleteMutation.mutate({ chartId: chart.id });
                      }
                    }}
                    className="h-8 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2"
                    title="Delete Snapshot"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <Button
                  size="sm"
                  onClick={() => {
                    if (
                      confirm(
                        `Restore snapshot "${chart.name}"? This will replace the active workspace downlines with this version.`
                      )
                    ) {
                      loadMutation.mutate({ chartId: chart.id });
                    }
                  }}
                  disabled={loadMutation.isPending}
                  className="bg-[#1d70f5] hover:bg-blue-600 text-white font-bold text-xs h-8 px-3 rounded-lg shadow-sm flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Load into Chart</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
