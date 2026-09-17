import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Check, Network, Save, Settings, Sliders } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface ChartSettingsViewProps {
  orgId: number;
}

export default function ChartSettingsView({ orgId }: ChartSettingsViewProps) {
  const utils = trpc.useUtils();
  const { data: org, isLoading } = trpc.org.get.useQuery({ id: orgId });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [matrixWidth, setMatrixWidth] = useState(3);
  const [matrixDepth, setMatrixDepth] = useState(5);
  const [pvLabel, setPvLabel] = useState("PV (Personal Volume)");
  const [positionTerminology, setPositionTerminology] = useState("Level / Leg");

  useEffect(() => {
    if (org) {
      setName(org.name);
      setDescription(org.description || "");
      setMatrixWidth(org.matrixWidth || 3);
      setMatrixDepth(org.matrixDepth || 5);
      if (org.settings) {
        try {
          const parsed = JSON.parse(org.settings);
          if (parsed.pvLabel) setPvLabel(parsed.pvLabel);
          if (parsed.positionTerminology) setPositionTerminology(parsed.positionTerminology);
        } catch (e) {}
      }
    }
  }, [org]);

  const updateMutation = trpc.org.update.useMutation({
    onSuccess: () => {
      toast.success("Organization chart settings updated successfully");
      utils.org.list.invalidate();
      utils.org.get.invalidate({ id: orgId });
    },
    onError: (err) => {
      toast.error("Failed to update settings", { description: err.message });
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      id: orgId,
      name,
      description,
      settings: JSON.stringify({ pvLabel, positionTerminology }),
    });
  };

  if (isLoading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading settings...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-[#1d70f5] uppercase tracking-wider">
          <Settings className="w-4 h-4 text-[#1d70f5]" />
          <span>System Configuration</span>
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 mt-1">Chart & Network Settings</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure matrix dimensions, compensation terminology, and placement rules.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm space-y-5">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              ORGANIZATION DISPLAY NAME *
            </label>
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              MISSION & DESCRIPTION
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-xs resize-none h-20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                BRANCHING FACTOR (LEGS PER NODE)
              </label>
              <Input
                type="number"
                value={matrixWidth}
                disabled
                className="h-9 text-xs bg-slate-50 text-slate-500"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Configured to 3 legs</span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                MAXIMUM DOWNLINE DEPTH (TIERS)
              </label>
              <Input
                type="number"
                value={matrixDepth}
                disabled
                className="h-9 text-xs bg-slate-50 text-slate-500"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Configured to 5 tiers (364 capacity)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                VOLUME TERMINOLOGY LABEL
              </label>
              <Input
                value={pvLabel}
                onChange={(e) => setPvLabel(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                POSITION NAMING PATTERN
              </label>
              <Input
                value={positionTerminology}
                onChange={(e) => setPositionTerminology(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
          <Button
            type="submit"
            disabled={updateMutation.isPending}
            className="bg-[#1d70f5] hover:bg-blue-600 text-white font-bold text-xs px-5 h-9 rounded-lg shadow-sm flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{updateMutation.isPending ? "Saving..." : "Save Settings"}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
