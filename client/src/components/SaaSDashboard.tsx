import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CommunicationMember } from "@/components/MemberCommunicationDialog";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  Award,
  ArrowRight,
  BarChart3,
  Bookmark,
  Calendar,
  CheckCircle2,
  Clock,
  Crown,
  Layers,
  Network,
  Plus,
  Shield,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  Workflow,
} from "lucide-react";
import { toast } from "sonner";
import { useMemo } from "react";

interface SaaSDashboardProps {
  orgId: number;
  orgName: string;
  onOpenChart: () => void;
  onOpenMembers: () => void;
  onOpenSavedCharts: () => void;
  onOpenCommunication: (member: CommunicationMember) => void;
}

export default function SaaSDashboard({
  orgId,
  orgName,
  onOpenChart,
  onOpenMembers,
  onOpenSavedCharts,
  onOpenCommunication,
}: SaaSDashboardProps) {
  const { data: treeData, isLoading } = trpc.matrix.getTree.useQuery({ orgId });
  const { data: membersList } = trpc.member.list.useQuery({ orgId });
  const { data: savedChartsList } = trpc.charts.list.useQuery({ orgId });
  const { data: activityList } = trpc.activity.list.useQuery({ orgId, limit: 6 });
  const { data: ranksList } = trpc.rank.list.useQuery({ orgId });

  const rankCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of membersList || []) {
      counts[m.rank] = (counts[m.rank] || 0) + 1;
    }
    return counts;
  }, [membersList]);

  if (isLoading || !treeData) {
    return (
      <div className="p-12 text-center text-xs font-semibold text-slate-400">
        Loading executive dashboard...
      </div>
    );
  }

  const totalMembers = (membersList?.length || 0);
  const placedCount = treeData.allPlacedMembersCount;
  const openCount = treeData.stats.totalCapacity - placedCount;
  const completionRate = treeData.stats.completionRate;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      {/* Hero Welcome Banner */}
      <div className="bg-gradient-to-r from-[#100e0e] via-[#2b1715] to-[#100e0e] text-white rounded-2xl p-6 sm:p-8 shadow-md border border-[#4a3827] flex flex-wrap items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2 text-xs font-bold text-[#d8b865] uppercase tracking-widest">
            <Crown className="w-4 h-4 text-[#d8b865]" />
            <span>Spartan Stack Overview</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {orgName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
            Smart 3×5 downline matrix hierarchy. Monitor capacity utilization, frontline leg distribution, and distributor placements in real time.
          </p>
        </div>

        {/* Big CTA Button matching requirements: "OPEN ORGANIZATION CHART" */}
        <Button
          onClick={onOpenChart}
          className="bg-[#9d2025] hover:bg-[#74171b] text-white font-extrabold text-sm px-6 h-12 rounded-xl shadow-lg flex items-center gap-2"
        >
          <Network className="w-5 h-5" />
          <span>OPEN ORGANIZATION CHART</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Top 4 KPI Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">TOTAL MEMBERS</span>
            <div className="w-7 h-7 rounded-lg bg-[#f8ebe9] text-[#9d2025] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{totalMembers}</div>
          <div className="text-xs text-slate-500 font-medium mt-1">Directory roster</div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">FILLED POSITIONS</span>
            <div className="w-7 h-7 rounded-lg bg-[#f6edda] text-[#b3832e] flex items-center justify-center">
              <Network className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{placedCount}</div>
          <div className="text-xs text-[#76521d] font-medium mt-1">Active downlines</div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">OPEN POSITIONS</span>
            <div className="w-7 h-7 rounded-lg bg-[#f1f1ef] text-[#73736f] flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">4</div>
          <div className="text-xs text-[#73736f] font-medium mt-1">Immediate frontline targets</div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">COMPLETION RATE</span>
            <div className="w-7 h-7 rounded-lg bg-[#f8ebe9] text-[#9d2025] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{completionRate}%</div>
          <div className="text-xs text-[#9d2025] font-medium mt-1">Tiers 0 - 2 active</div>
        </div>
      </div>

      {/* Main Grid: Tier Breakdown & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tier-by-tier capacity breakdown */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">3×5 Matrix Tier Utilization</h3>
              <p className="text-xs text-slate-500 mt-0.5">Geometric branching ratio 1:3 down to 5 tiers</p>
            </div>
            <span className="text-xs font-bold text-[#9d2025] bg-[#f8ebe9] px-2.5 py-1 rounded-full border border-[#ecd0cf]">
              Max Depth: 5 Levels
            </span>
          </div>

          <div className="space-y-3.5">
            {treeData.stats.levelBreakdown.slice(0, 4).map((lvl) => {
              const names = [
                "Level 0 — Apex Leader",
                "Level 1 — Frontline Legs",
                "Level 2 — Second Tier",
                "Level 3 — Third Tier Matrix",
              ];
              return (
                <div key={lvl.level} className="space-y-1.5 p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-800">{names[lvl.level]}</span>
                    <span className="text-slate-500">
                      <span className="text-slate-900 font-extrabold">{lvl.occupied}</span> / {lvl.capacity} slots ({lvl.percentage}%)
                    </span>
                  </div>
                  <Progress value={lvl.percentage} className="h-2 bg-slate-200" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity Timeline */}
        <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">Recent Activity</h3>
              <Activity className="w-4 h-4 text-slate-400" />
            </div>
            <div className="space-y-3 mt-3">
              {!activityList || activityList.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">No recent activity recorded.</div>
              ) : (
                activityList.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-start gap-3 text-xs">
                    <div className="w-2 h-2 rounded-full bg-[#9d2025] mt-1.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1 leading-snug">
                      <span className="font-semibold text-slate-800">{log.action}</span>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • {log.user}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <Button
            variant="outline"
            onClick={onOpenChart}
            className="w-full text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-50"
          >
            View Live Downline Tree
          </Button>
        </div>
      </div>

      {/* Saved Charts Quick Access & Roster Preview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Rank Distribution Card */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Rank Distribution</span>
            </h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase">ROSTER BREAKDOWN</span>
          </div>
          <div className="space-y-2 pt-1">
            {(ranksList || []).map((item) => {
              const count = rankCounts[item.name] || 0;
              const pct = totalMembers > 0 ? Math.round((count / totalMembers) * 100) : 0;
              return (
                <div key={item.id} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-700">{item.name}</span>
                    </div>
                    <span className="text-slate-500 font-bold">{count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: item.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Saved Snapshots */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-extrabold text-slate-900">Saved Chart Snapshots</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenSavedCharts}
              className="text-xs text-[#9d2025] font-bold h-7 hover:bg-[#f8ebe9]"
            >
              Manage All
            </Button>
          </div>
          <div className="space-y-2">
            {!savedChartsList || savedChartsList.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">No saved charts yet.</div>
            ) : (
              savedChartsList.slice(0, 3).map((chart) => (
                <div
                  key={chart.id}
                  className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900">{chart.name}</span>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {chart.filledPositions} filled • {chart.completionRate}% completion
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {new Date(chart.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recently Added Members */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-extrabold text-slate-900">Distributor Directory</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenMembers}
              className="text-xs text-[#9d2025] font-bold h-7 hover:bg-[#f8ebe9]"
            >
              View Directory
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(membersList || []).slice(0, 4).map((m) => (
              <div
                key={m.id}
                className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center gap-2.5 text-xs"
              >
                <button
                  type="button"
                  onClick={() => onOpenCommunication(m)}
                  className="group relative shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#9d2025]"
                  title={`Message ${m.firstName} ${m.lastName}`}
                >
                  <img
                    src={
                      m.avatarUrl ||
                      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&h=100&q=80"
                    }
                    alt={`Message ${m.firstName} ${m.lastName}`}
                    className="w-8 h-8 rounded-full object-cover border border-slate-200 transition-transform duration-200 group-hover:scale-105"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white bg-[#9d2025] text-[8px] font-bold text-white shadow-sm">+</span>
                </button>
                <div className="min-w-0 flex-1 truncate">
                  <div className="font-bold text-slate-900 truncate">
                    {m.firstName} {m.lastName}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">{m.rank}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
