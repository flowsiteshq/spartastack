import { Button } from "@/components/ui/button";
import SpartanBrand from "@/components/SpartanBrand";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Crown, Download, Printer } from "lucide-react";
import { TreeNode } from "../../../server/db";

interface PresentationExportViewProps {
  orgId: number;
  orgName: string;
  onBack: () => void;
}

export default function PresentationExportView({
  orgId,
  orgName,
  onBack,
}: PresentationExportViewProps) {
  const { data: treeData, isLoading } = trpc.matrix.getTree.useQuery({ orgId });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading || !treeData) {
    return (
      <div className="p-12 text-center text-xs text-slate-400">
        Preparing executive presentation chart...
      </div>
    );
  }

  const root = treeData.root;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Non-printed Toolbar */}
      <div className="print:hidden bg-[#100e0e] text-white p-4 flex items-center justify-between sticky top-0 z-50">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
            className="text-white hover:bg-[#322a25] text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          <span>Return to Workspace</span>
        </Button>
        <div className="flex items-center gap-3">
          <Button
            onClick={handlePrint}
            className="bg-[#9d2025] hover:bg-[#74171b] text-white font-bold text-xs h-9 px-4 rounded-lg flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save as PDF</span>
          </Button>
        </div>
      </div>

      {/* Pure Presentation Document Area */}
      <div className="max-w-6xl mx-auto p-8 sm:p-12 space-y-8 bg-white">
        {/* Clean Executive Header */}
        <div className="border-b-2 border-[#211c18] pb-6 flex items-start justify-between">
          <div>
            <SpartanBrand tone="light" className="mb-4" />
            <div className="text-xs font-bold tracking-widest text-[#9d2025] uppercase">Organization placement report</div>
            <h1 className="text-3xl font-extrabold text-slate-900 mt-1">{orgName}</h1>
            <p className="text-sm text-slate-500 mt-0.5">3 × 5 Downline Matrix Organizational Chart</p>
          </div>
          <div className="text-right text-xs text-slate-500 space-y-1">
            <div>
              Date Generated: <span className="font-bold text-slate-800">{new Date().toLocaleDateString()}</span>
            </div>
            <div>
              Total Placed: <span className="font-bold text-slate-800">{treeData.allPlacedMembersCount}</span>
            </div>
            <div>
              Structure: <span className="font-bold text-slate-800">3 Legs × 5 Tiers</span>
            </div>
          </div>
        </div>

        {/* Clean Tree Presentation without any editing buttons */}
        {!root ? (
          <div className="text-center py-16 text-slate-400 text-sm">No downline placements recorded.</div>
        ) : (
          <div className="flex flex-col items-center py-6">
            {/* Apex Root */}
            <div className="flex flex-col items-center">
              <div className="w-56 p-3 rounded-xl border-2 border-amber-400 bg-amber-50/20 text-center shadow-sm">
                <div className="text-[10px] font-extrabold text-amber-700 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                  <Crown className="w-3.5 h-3.5 text-amber-500" />
                  <span>LEVEL 0 - APEX LEADER</span>
                </div>
                <img
                  src={root.member.avatarUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80"}
                  alt=""
                  className="w-12 h-12 rounded-lg object-cover mx-auto my-1.5 border border-amber-300"
                />
                <div className="font-bold text-sm text-slate-900">
                  {root.member.firstName} {root.member.lastName}
                </div>
                <div className="text-xs text-slate-600 font-medium">{root.member.rank}</div>
                <div className="text-[10px] text-slate-500 mt-1 font-semibold">
                  PV: {root.member.personalVolume} • Legs: 3/3
                </div>
              </div>

              {/* Connector line */}
              <div className="w-0.5 h-8 bg-slate-400" />
            </div>

            {/* Level 1 Frontline Legs */}
            <div className="relative pt-6 flex items-start justify-center gap-12 sm:gap-16">
              <div className="absolute top-0 left-28 right-28 h-0.5 bg-slate-400" />

              {[0, 1, 2].map((legIdx) => {
                const leg = root.children[legIdx];
                return (
                  <div key={legIdx} className="flex flex-col items-center relative">
                    <div className="w-0.5 h-6 bg-slate-400 absolute -top-6" />

                    {leg ? (
                      <div className="flex flex-col items-center">
                        <div className="w-52 p-3 rounded-xl border-2 border-[#9d2025] bg-[#f8ebe9]/30 text-center shadow-sm">
                          <div className="text-[9px] font-extrabold text-[#9d2025] uppercase tracking-wider mb-1">
                            LEVEL 1 - POSITION {legIdx + 1}
                          </div>
                          <img
                            src={leg.member.avatarUrl || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&h=120&q=80"}
                            alt=""
                            className="w-10 h-10 rounded-lg object-cover mx-auto my-1 border border-[#ecd0cf]"
                          />
                          <div className="font-bold text-xs text-slate-900">
                            {leg.member.firstName} {leg.member.lastName}
                          </div>
                          <div className="text-[10px] text-slate-600 font-medium">{leg.member.rank}</div>
                          <div className="text-[10px] text-slate-500 font-semibold mt-1">
                            PV: {leg.member.personalVolume}
                          </div>
                        </div>

                        {/* Level 2 Children */}
                        <div className="flex flex-col items-center mt-2">
                          <div className="w-0.5 h-6 bg-slate-300" />
                          <div className="relative pt-6 flex items-start justify-center gap-2.5">
                            <div className="absolute top-0 left-4 right-4 h-0.5 bg-slate-300" />

                            {[0, 1, 2].map((childIdx) => {
                              const child = leg.children[childIdx];
                              return (
                                <div key={childIdx} className="flex flex-col items-center relative">
                                  <div className="w-0.5 h-6 bg-slate-300 absolute -top-6" />
                                  {child ? (
                                    <div className="w-32 p-2 rounded-lg border border-slate-300 bg-white text-center shadow-sm">
                                      <img
                                        src={child.member.avatarUrl || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&h=100&q=80"}
                                        alt=""
                                        className="w-8 h-8 rounded-full object-cover mx-auto mb-1 border border-slate-200"
                                      />
                                      <div className="font-bold text-[11px] text-slate-900 truncate">
                                        {child.member.firstName} {child.member.lastName}
                                      </div>
                                      <div className="text-[9px] text-slate-500 truncate">{child.member.rank}</div>
                                      <div className="text-[9px] font-bold text-slate-600 mt-0.5">
                                        PV: {child.member.personalVolume}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="w-32 p-2 rounded-lg border border-dashed border-slate-300 text-center text-slate-400 text-[10px] font-medium">
                                      Open Slot
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-52 p-3 rounded-xl border border-dashed border-slate-300 text-center text-slate-400 text-xs">
                        Open Position
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Clean Executive Footer */}
        <div className="border-t border-slate-200 pt-6 flex items-center justify-between text-xs text-slate-400">
          <div>Spartan Stack • Sparta Nation</div>
          <div>Confidential • Internal Leadership Review</div>
        </div>
      </div>
    </div>
  );
}
