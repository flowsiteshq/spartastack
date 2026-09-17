import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock,
  Cpu,
  Layers,
  PieChart,
  Shuffle,
  Sparkles,
  Users,
} from "lucide-react";
import { useState } from "react";
import RandomPlacementModal from "./RandomPlacementModal";

interface MatrixAnalyticsProps {
  orgId: number;
  onSwitchToTree: () => void;
}

export default function MatrixAnalytics({ orgId, onSwitchToTree }: MatrixAnalyticsProps) {
  const [randomModalOpen, setRandomModalOpen] = useState(false);

  const { data: treeData, isLoading } = trpc.matrix.getTree.useQuery({ orgId });
  const { data: openSlots } = trpc.matrix.getOpenSlots.useQuery({ orgId });
  const { data: orgData } = trpc.org.get.useQuery({ id: orgId });

  if (isLoading || !treeData) {
    return (
      <div className="p-12 text-center font-mono text-xs text-cyan-300">
        ANALYZING 3×5 MATRIX TELEMETRY & CAPACITY METRICS...
      </div>
    );
  }

  const { stats, allPlacedMembersCount, unplacedMembersCount, root } = treeData;

  // Leg breakdown from root
  const legStats = [0, 1, 2].map((legIdx) => {
    const child = root?.children[legIdx];
    if (!child) return { leg: legIdx + 1, leader: "Open", count: 0, pv: 0 };
    return {
      leg: legIdx + 1,
      leader: `${child.member.firstName} ${child.member.lastName}`,
      leaderRank: child.member.rank,
      count: 1 + child.totalDownlineCount,
      pv: child.member.personalVolume,
    };
  });

  const totalCapacity = stats.totalCapacity; // 364
  const overallFillRate = Math.min(
    100,
    Math.round((allPlacedMembersCount / totalCapacity) * 100)
  );

  return (
    <div className="space-y-6">
      {/* Top Telemetry Header */}
      <div className="bg-[#07172c] border border-cyan-400/30 p-4 rounded flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-300 uppercase tracking-wider">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Matrix Telemetry & Capacity Breakdown</span>
          </div>
          <h2 className="text-xl font-bold font-display text-white mt-0.5">
            3 × 5 Downline Capacity Diagnostics
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Theoretical capacity: 364 positions across 5 depth tiers (branching factor: 3).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setRandomModalOpen(true)}
            className="bg-cyan-500 hover:bg-cyan-400 text-[#07192f] font-bold text-xs uppercase tracking-wider font-mono px-3 h-8 flex items-center gap-1.5 shadow"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Execute Random Placement</span>
          </Button>
          <Button
            variant="outline"
            onClick={onSwitchToTree}
            className="border-white/20 hover:border-cyan-400 bg-[#0a203c] text-white text-xs font-mono px-3 h-8 flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Inspect Tree Blueprint</span>
          </Button>
        </div>
      </div>

      {/* Metric Counters Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-3.5 bg-[#0a1e38] border border-cyan-400/25 rounded relative">
          <span className="text-[10px] font-mono text-slate-400 block uppercase">
            TOTAL 3×5 CAPACITY
          </span>
          <div className="text-2xl font-bold font-display text-white mt-1">364</div>
          <span className="text-[10px] font-mono text-cyan-300 block mt-0.5">
            3^0 + 3^1 + ... + 3^5 Slots
          </span>
        </div>

        <div className="p-3.5 bg-[#0a1e38] border border-emerald-400/25 rounded relative">
          <span className="text-[10px] font-mono text-slate-400 block uppercase">
            OCCUPIED POSITIONS
          </span>
          <div className="text-2xl font-bold font-display text-emerald-400 mt-1">
            {allPlacedMembersCount}
          </div>
          <span className="text-[10px] font-mono text-emerald-300 block mt-0.5">
            {overallFillRate}% Matrix Utilization
          </span>
        </div>

        <div className="p-3.5 bg-[#0a1e38] border border-amber-400/25 rounded relative">
          <span className="text-[10px] font-mono text-slate-400 block uppercase">
            UNPLACED CANDIDATES
          </span>
          <div className="text-2xl font-bold font-display text-amber-300 mt-1">
            {unplacedMembersCount}
          </div>
          <span className="text-[10px] font-mono text-amber-200/80 block mt-0.5">
            Available in Directory
          </span>
        </div>

        <div className="p-3.5 bg-[#0a1e38] border border-cyan-400/25 rounded relative">
          <span className="text-[10px] font-mono text-slate-400 block uppercase">
            ATTACHABLE OPEN SLOTS
          </span>
          <div className="text-2xl font-bold font-display text-cyan-300 mt-1">
            {openSlots?.length || 0}
          </div>
          <span className="text-[10px] font-mono text-cyan-400 block mt-0.5">
            Immediate placement targets
          </span>
        </div>
      </div>

      {/* Level by Level Breakdown (3x5 Matrix Geometry) */}
      <div className="bg-[#0a1e38] border border-cyan-400/30 rounded p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold font-display text-white uppercase tracking-wider">
              Tier-by-Tier Capacity Utilization (Geometric Scale 3^N)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-cyan-300">
            BRANCHING: 3 // MAX DEPTH: 5
          </span>
        </div>

        <div className="space-y-3.5">
          {stats.levelBreakdown.map((lvl) => {
            const levelNames = [
              "Level 0 — Apex Organization Root",
              "Level 1 — Frontline Legs (3 Direct Slots)",
              "Level 2 — Second Tier Downlines (9 Slots)",
              "Level 3 — Third Tier Matrix (27 Slots)",
              "Level 4 — Fourth Tier Matrix (81 Slots)",
              "Level 5 — Fifth Tier Frontier Matrix (243 Slots)",
            ];

            return (
              <div key={lvl.level} className="space-y-1.5 p-2 rounded bg-[#07172c]/60 border border-white/5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-white font-semibold flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-[#0d274c] border border-cyan-400/40 text-[10px] flex items-center justify-center text-cyan-300 font-bold">
                      {lvl.level}
                    </span>
                    <span>{levelNames[lvl.level]}</span>
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400">
                      <span className="text-cyan-300 font-bold">{lvl.occupied}</span> / {lvl.capacity} slots
                    </span>
                    <span className="text-cyan-400 font-bold min-w-[36px] text-right">
                      {lvl.percentage}%
                    </span>
                  </div>
                </div>
                <Progress value={lvl.percentage} className="h-2 bg-[#091f3a]" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Frontline Leg Balance Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {legStats.map((leg) => (
          <div
            key={leg.leg}
            className="bg-[#0a1e38] border border-cyan-400/25 rounded p-4 relative space-y-2"
          >
            <div className="flex items-center justify-between text-[11px] font-mono border-b border-white/10 pb-2">
              <span className="text-cyan-300 font-bold">LEG {leg.leg} DISTRIBUTION</span>
              <span className="text-[10px] text-slate-400">FRONTLINE</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div>
                <div className="text-xs font-bold text-white font-sans">{leg.leader}</div>
                <div className="text-[10px] font-mono text-cyan-300">{leg.leaderRank || "Frontline Node"}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold font-display text-white">{leg.count}</div>
                <div className="text-[10px] font-mono text-slate-400">Total Downline</div>
              </div>
            </div>
            <div className="text-[10px] font-mono text-slate-400 pt-1 border-t border-white/5 flex items-center justify-between">
              <span>Volume: {leg.pv} PV</span>
              <span className="text-cyan-400">Leg Health: Active</span>
            </div>
          </div>
        ))}
      </div>

      {/* Blueprint Visual Architectural Stamp (photos on every page preference) */}
      <div className="border border-cyan-400/30 rounded bg-[#07172c] p-4 flex flex-col sm:flex-row items-center gap-4">
        <img
          src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=400&q=80"
          alt="Architectural Blueprint Blueprint"
          className="w-full sm:w-48 h-24 object-cover rounded border border-white/20 opacity-70"
        />
        <div className="space-y-1 text-xs font-mono text-slate-300">
          <div className="text-cyan-300 font-bold uppercase tracking-wider">
            ARCHITECTURAL SPECIFICATION: CAD-3X5-MATRIX
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
            The 3×5 downline structure guarantees exactly three child nodes per parent, strictly
            bounding organizational depth to 5 tiers to prevent structural over-extension while
            maximizing team spillover and frontline leverage.
          </p>
        </div>
      </div>

      {/* Random Placement Modal */}
      <RandomPlacementModal
        isOpen={randomModalOpen}
        onClose={() => setRandomModalOpen(false)}
        orgId={orgId}
        unplacedCount={unplacedMembersCount}
        openSlotsCount={openSlots?.length || 0}
        mode="random"
        onSuccess={() => {
          trpc.useUtils().matrix.getTree.invalidate();
          trpc.useUtils().matrix.getOpenSlots.invalidate();
        }}
      />
    </div>
  );
}
