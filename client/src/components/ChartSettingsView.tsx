import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Award, Plus, RotateCcw, Save, Settings, Sliders, Trash2 } from "lucide-react";
import { ArrowDown, ArrowUp, Check, Edit, X } from "lucide-react";
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
  const [newRankName, setNewRankName] = useState("");
  const [newRankColor, setNewRankColor] = useState("#1d70f5");
  const [newRankMinPV, setNewRankMinPV] = useState(100);
  const [editingRankId, setEditingRankId] = useState<string | null>(null);
  const [editRankName, setEditRankName] = useState("");
  const [editRankColor, setEditRankColor] = useState("");
  const [editRankMinPV, setEditRankMinPV] = useState(100);

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

  const { data: ranksList } = trpc.rank.list.useQuery({ orgId });

  const createRankMutation = trpc.rank.create.useMutation({
    onSuccess: (newRank) => {
      toast.success(`Added custom rank "${newRank.name}"`);
      utils.rank.list.invalidate({ orgId });
      setNewRankName("");
      setNewRankMinPV(100);
    },
    onError: (err) => {
      toast.error("Failed to add rank", { description: err.message });
    },
  });

  const deleteRankMutation = trpc.rank.delete.useMutation({
    onSuccess: () => {
      toast.success("Rank removed");
      utils.rank.list.invalidate({ orgId });
    },
    onError: (err) => {
      toast.error("Cannot delete rank", { description: err.message });
    },
  });

  const updateRankMutation = trpc.rank.update.useMutation({
    onSuccess: (updated) => {
      toast.success(`Updated rank "${updated.name}"`);
      utils.rank.list.invalidate({ orgId });
      setEditingRankId(null);
    },
    onError: (err) => {
      toast.error("Failed to update rank", { description: err.message });
    },
  });

  const reorderRankMutation = trpc.rank.reorder.useMutation({
    onSuccess: () => {
      toast.success("Rank hierarchy reordered");
      utils.rank.list.invalidate({ orgId });
    },
  });

  const handleMoveRank = (index: number, direction: "up" | "down") => {
    if (!ranksList) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= ranksList.length) return;
    const newRanks = [...ranksList];
    const temp = newRanks[index];
    newRanks[index] = newRanks[targetIndex];
    newRanks[targetIndex] = temp;
    reorderRankMutation.mutate({
      orgId,
      rankIds: newRanks.map((r) => r.id),
    });
  };

  const resetRanksMutation = trpc.rank.saveAll.useMutation({
    onSuccess: () => {
      toast.success("Reset ranks to standard MLM hierarchy");
      utils.rank.list.invalidate({ orgId });
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    let currentCustomRanks = ranksList || [];
    if (org?.settings) {
      try {
        const parsed = JSON.parse(org.settings);
        if (parsed.customRanks) currentCustomRanks = parsed.customRanks;
      } catch (err) {}
    }
    updateMutation.mutate({
      id: orgId,
      name,
      description,
      settings: JSON.stringify({
        pvLabel,
        positionTerminology,
        customRanks: currentCustomRanks,
      }),
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

      {/* Custom Organization Ranks Hierarchy Manager */}
      <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#1d70f5] uppercase tracking-wider">
              <Award className="w-4 h-4 text-[#1d70f5]" />
              <span>Custom Rank Hierarchy</span>
            </div>
            <h2 className="text-base font-extrabold text-slate-900 mt-1">
              Organization Leadership Ranks
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Define custom distributor titles, badge colors, and minimum personal volume qualifications.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (confirm("Reset ranks to standard 6-tier MLM defaults?")) {
                resetRanksMutation.mutate({
                  orgId,
                  ranks: [
                    { id: "crown-director", name: "Crown Director", color: "#f59e0b", minPV: 500, tierLevel: 6 },
                    { id: "diamond-executive", name: "Diamond Executive", color: "#2563eb", minPV: 350, tierLevel: 5 },
                    { id: "gold-leader", name: "Gold Leader", color: "#eab308", minPV: 250, tierLevel: 4 },
                    { id: "silver-associate", name: "Silver Associate", color: "#64748b", minPV: 150, tierLevel: 3 },
                    { id: "bronze-builder", name: "Bronze Builder", color: "#b45309", minPV: 100, tierLevel: 2 },
                    { id: "associate", name: "Associate", color: "#71717a", minPV: 50, tierLevel: 1 },
                  ],
                });
              }
            }}
            className="text-xs border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 h-8"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </Button>
        </div>

        {/* Add New Rank Bar */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
          <span className="text-xs font-bold text-slate-800 block">CREATE NEW CUSTOM RANK</span>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div className="sm:col-span-2">
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Rank Title</label>
              <Input
                value={newRankName}
                onChange={(e) => setNewRankName(e.target.value)}
                placeholder="e.g. Platinum Ambassador, Emerald Elite"
                className="h-8 text-xs bg-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Min. PV Target</label>
              <Input
                type="number"
                value={newRankMinPV}
                onChange={(e) => setNewRankMinPV(Number(e.target.value))}
                className="h-8 text-xs bg-white"
              />
            </div>
            <div>
              <Button
                type="button"
                onClick={() => {
                  if (!newRankName.trim()) {
                    toast.error("Please enter a rank name");
                    return;
                  }
                  createRankMutation.mutate({
                    orgId,
                    name: newRankName.trim(),
                    color: newRankColor,
                    minPV: newRankMinPV,
                    tierLevel: (ranksList?.length || 0) + 1,
                  });
                }}
                disabled={createRankMutation.isPending}
                className="w-full h-8 text-xs font-bold bg-[#1d70f5] text-white hover:bg-blue-600 flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Rank</span>
              </Button>
            </div>
          </div>

          {/* Color Palette Selector */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[11px] text-slate-500 font-medium">Badge Color:</span>
            <div className="flex items-center gap-1.5">
              {[
                { hex: "#1d70f5", name: "Royal Blue" },
                { hex: "#10b981", name: "Emerald" },
                { hex: "#f59e0b", name: "Amber Gold" },
                { hex: "#8b5cf6", name: "Purple" },
                { hex: "#ec4899", name: "Pink" },
                { hex: "#06b6d4", name: "Cyan" },
                { hex: "#b45309", name: "Bronze" },
                { hex: "#64748b", name: "Silver" },
                { hex: "#dc2626", name: "Ruby" },
              ].map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  title={c.name}
                  onClick={() => setNewRankColor(c.hex)}
                  className={`w-5 h-5 rounded-full border-2 border-white shadow-xs transition-transform ${
                    newRankColor === c.hex ? "scale-125 ring-2 ring-blue-500" : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Existing Ranks List */}
        <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden bg-white">
          {(ranksList || []).map((r, idx) => (
            <div
              key={r.id}
              className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50/50 transition-colors"
            >
              {editingRankId === r.id ? (
                <div className="flex-1 flex flex-wrap items-center gap-3 mr-3">
                  <Input
                    value={editRankName}
                    onChange={(e) => setEditRankName(e.target.value)}
                    className="h-8 text-xs bg-white w-48"
                  />
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-500">Min PV:</span>
                    <Input
                      type="number"
                      value={editRankMinPV}
                      onChange={(e) => setEditRankMinPV(Number(e.target.value))}
                      className="h-8 text-xs bg-white w-24"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    {["#1d70f5", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#dc2626", "#64748b"].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditRankColor(c)}
                        className={`w-4 h-4 rounded-full border border-white ${
                          editRankColor === c ? "ring-2 ring-blue-500 scale-110" : ""
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-1 ml-auto">
                    <Button
                      size="sm"
                      onClick={() => {
                        updateRankMutation.mutate({
                          orgId,
                          rankId: r.id,
                          name: editRankName.trim() || r.name,
                          color: editRankColor,
                          minPV: editRankMinPV,
                        });
                      }}
                      className="h-7 px-2 text-xs font-bold bg-[#1d70f5] text-white"
                    >
                      <Check className="w-3.5 h-3.5 mr-1" /> Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingRankId(null)}
                      className="h-7 px-2 text-xs text-slate-500"
                    >
                      <X className="w-3.5 h-3.5 mr-1" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    {/* Reorder Buttons */}
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveRank(idx, "up")}
                        className="p-0.5 text-slate-400 hover:text-blue-600 disabled:opacity-20 disabled:hover:text-slate-400"
                        title="Move Rank Up (Higher Tier)"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === (ranksList?.length || 0) - 1}
                        onClick={() => handleMoveRank(idx, "down")}
                        className="p-0.5 text-slate-400 hover:text-blue-600 disabled:opacity-20 disabled:hover:text-slate-400"
                        title="Move Rank Down (Lower Tier)"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>
                    <span
                      className="w-4 h-4 rounded-full flex-shrink-0 border border-white shadow-xs"
                      style={{ backgroundColor: r.color }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900">{r.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">Tier #{r.tierLevel}</span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        Requires {r.minPV} {pvLabel || "PV"} minimum
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border"
                      style={{
                        backgroundColor: `${r.color}15`,
                        borderColor: `${r.color}40`,
                        color: r.color,
                      }}
                    >
                      {r.name}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingRankId(r.id);
                        setEditRankName(r.name);
                        setEditRankColor(r.color);
                        setEditRankMinPV(r.minPV);
                      }}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                      title="Edit Rank"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Remove custom rank "${r.name}"?`)) {
                          deleteRankMutation.mutate({ orgId, rankId: r.id });
                        }
                      }}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Delete Rank"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
