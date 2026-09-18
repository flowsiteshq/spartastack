import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import SpartanBrand from "@/components/SpartanBrand";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  CheckCircle2,
  Crown,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  Share2,
  Upload,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

interface ImportExportHubViewProps {
  orgId: number;
  orgName: string;
  onBack: () => void;
}

const SAMPLE_CSV = `FirstName,LastName,Email,Phone,Rank,PV
Marcus,Vance,marcus.v@spartannation.internal,+1 (555) 234-5678,Spartan Centurion,250
Elena,Rostova,elena.r@spartannation.internal,+1 (555) 345-6789,Gold Leader,180
Darius,Sterling,darius.s@spartannation.internal,+1 (555) 456-7890,Silver Associate,140
Cassandra,Cole,cassandra.c@spartannation.internal,+1 (555) 567-8901,Bronze Builder,120`;

export default function ImportExportHubView({ orgId, orgName, onBack }: ImportExportHubViewProps) {
  const [activeTab, setActiveTab] = useState<"export" | "import" | "presentation">("export");
  const [csvText, setCsvText] = useState(SAMPLE_CSV);

  const utils = trpc.useUtils();
  const { data: treeData, isLoading: isTreeLoading, error: treeError } = trpc.matrix.getTree.useQuery({ orgId });
  const { data: membersList, isLoading: isMembersLoading } = trpc.member.list.useQuery({ orgId });
  const { data: ranksList } = trpc.rank.list.useQuery({ orgId });

  const bulkImportMutation = trpc.member.bulkImport.useMutation({
    onSuccess: (res) => {
      toast.success(`Successfully imported ${res.importedCount} members into Spartan Stack.`);
      utils.member.list.invalidate();
      utils.matrix.getTree.invalidate();
      utils.activity.list.invalidate();
    },
    onError: (err) => {
      toast.error("Import error", { description: err.message });
    },
  });

  const handleExportCSV = () => {
    if (!membersList || membersList.length === 0) {
      toast.error("No member records available to export.");
      return;
    }

    const headers = ["ID", "FirstName", "LastName", "Email", "Phone", "Rank", "PersonalVolume", "Status", "Placed", "Position"];
    const rows = membersList.map((m) => [
      m.id,
      `"${m.firstName.replace(/"/g, '""')}"`,
      `"${m.lastName.replace(/"/g, '""')}"`,
      `"${m.email.replace(/"/g, '""')}"`,
      `"${(m.phone || "").replace(/"/g, '""')}"`,
      `"${m.rank.replace(/"/g, '""')}"`,
      m.personalVolume,
      m.status,
      m.isPlaced ? "Yes" : "No",
      `"${m.slotCoordinate || "Unassigned"}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${orgName.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_members.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Member roster CSV downloaded successfully.");
  };

  const handleExportTreeJSON = () => {
    if (!treeData) {
      toast.error("Chart tree data is still loading.");
      return;
    }
    const payload = JSON.stringify(treeData, null, 2);
    const blob = new Blob([payload], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${orgName.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_3x5_tree.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Downline matrix structure exported as JSON.");
  };

  const handleParseAndImportCSV = () => {
    const lines = csvText.trim().split("\n");
    if (lines.length <= 1) {
      toast.error("CSV text is empty or missing data rows.");
      return;
    }

    const membersToCreate: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = line.split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
      if (cols.length >= 3 && cols[0] && cols[1] && cols[2]) {
        membersToCreate.push({
          firstName: cols[0],
          lastName: cols[1],
          email: cols[2],
          phone: cols[3] || undefined,
          rank: cols[4] || "Associate",
          personalVolume: cols[5] ? Number(cols[5]) : 100,
          avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80",
        });
      }
    }

    if (membersToCreate.length === 0) {
      toast.error("Could not parse valid member records. Check your columns.");
      return;
    }

    bulkImportMutation.mutate({
      orgId,
      members: membersToCreate,
    });
  };

  const root = treeData?.root;

  return (
    <div className="min-h-screen bg-[#f7f6f3] text-slate-900 font-sans">
      {/* Top Application Ribbon */}
      <div className="bg-[#100e0e] text-white px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-[#3d3325] sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-slate-300 hover:text-white hover:bg-[#322a25] text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            <span>Return to Workspace</span>
          </Button>
          <div className="h-4 w-px bg-slate-700 hidden sm:block" />
          <div className="hidden sm:block">
            <span className="text-[10px] font-bold text-[#d3aa54] uppercase tracking-wider block">Import & Export Hub</span>
            <span className="text-xs font-extrabold text-white truncate max-w-[260px] block">{orgName}</span>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 bg-[#211c19] p-1 rounded-lg border border-[#463a2c] text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("export")}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === "export" ? "bg-[#9d2025] text-white shadow font-bold" : "text-slate-300 hover:text-white"
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Data</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("import")}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === "import" ? "bg-[#9d2025] text-white shadow font-bold" : "text-slate-300 hover:text-white"
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import CSV</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("presentation")}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === "presentation" ? "bg-[#9d2025] text-white shadow font-bold" : "text-slate-300 hover:text-white"
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Presentation Report</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <main className="max-w-6xl mx-auto p-4 sm:p-8 space-y-6">
        {/* ======================================================== */}
        {/* EXPORT TAB                                               */}
        {/* ======================================================== */}
        {activeTab === "export" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-[#9d2025] uppercase tracking-wider">
                  <Share2 className="w-4 h-4 text-[#9d2025]" />
                  <span>Data Export & Backup</span>
                </div>
                <h1 className="text-xl font-extrabold text-slate-900 mt-1">Export Spartan Stack Organization</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Generate instant CSV spreadsheets or JSON matrix backups of your 3×5 downlines.
                </p>
              </div>
              <Button
                onClick={() => setActiveTab("presentation")}
                className="bg-[#9d2025] hover:bg-[#74171b] text-white text-xs font-bold h-9 px-4 rounded-lg flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Open Printable Presentation</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Members CSV */}
              <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-[#f8ebe9] text-[#9d2025] flex items-center justify-center font-bold">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Distributor Directory CSV</h3>
                    <p className="text-xs text-slate-500">Includes names, emails, phones, ranks, PV, and matrix placement coordinates.</p>
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 border border-slate-100 space-y-1">
                  <div className="flex justify-between font-medium">
                    <span>Total Members:</span>
                    <span className="font-bold text-slate-900">{membersList?.length || 0}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Stacked in Tree:</span>
                    <span className="font-bold text-emerald-700">{membersList?.filter((m) => m.isPlaced).length || 0}</span>
                  </div>
                </div>
                <Button
                  onClick={handleExportCSV}
                  disabled={isMembersLoading || !membersList || membersList.length === 0}
                  className="w-full bg-[#9d2025] hover:bg-[#74171b] text-white text-xs font-bold h-9"
                >
                  <Download className="w-4 h-4 mr-2" />
                  <span>Download Directory CSV</span>
                </Button>
              </div>

              {/* Card 2: 3x5 Matrix JSON */}
              <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-[#fbf6eb] text-[#b3832e] flex items-center justify-center font-bold">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">3×5 Matrix Tree JSON</h3>
                    <p className="text-xs text-slate-500">Full hierarchical snapshot of levels 0 through 5 with lock states and downline links.</p>
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 border border-slate-100 space-y-1">
                  <div className="flex justify-between font-medium">
                    <span>Placed Downlines:</span>
                    <span className="font-bold text-slate-900">{treeData?.allPlacedMembersCount || 0}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Matrix Completion:</span>
                    <span className="font-bold text-[#b3832e]">{treeData?.stats.completionRate || 0}%</span>
                  </div>
                </div>
                <Button
                  onClick={handleExportTreeJSON}
                  disabled={isTreeLoading || !treeData}
                  variant="outline"
                  className="w-full border-[#d3aa54] text-[#8e681c] hover:bg-[#fbf6eb] text-xs font-bold h-9"
                >
                  <Download className="w-4 h-4 mr-2 text-[#b3832e]" />
                  <span>Download Tree Snapshot JSON</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* IMPORT TAB                                               */}
        {/* ======================================================== */}
        {activeTab === "import" && (
          <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-[#9d2025] uppercase tracking-wider">
                  <Upload className="w-4 h-4 text-[#9d2025]" />
                  <span>Batch Ingestion</span>
                </div>
                <h2 className="text-lg font-extrabold text-slate-900 mt-1">Import Members via CSV</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Paste rows with columns: FirstName, LastName, Email, Phone, Rank, PersonalVolume.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCsvText(SAMPLE_CSV)}
                className="text-xs text-slate-600 border-slate-300 hover:bg-slate-50"
              >
                Reset Sample Data
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                PASTE CSV DATA (HEADER ROW REQUIRED)
              </label>
              <Textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                rows={10}
                className="font-mono text-xs bg-slate-50 border-slate-200 resize-y"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-400">
                New records will be created in the Master List, ready for auto-fill or manual tree stacking.
              </span>
              <Button
                onClick={handleParseAndImportCSV}
                disabled={bulkImportMutation.isPending}
                className="bg-[#9d2025] hover:bg-[#74171b] text-white text-xs font-bold h-9 px-5"
              >
                <Upload className="w-4 h-4 mr-2" />
                <span>{bulkImportMutation.isPending ? "Importing Records..." : "Ingest Member Records"}</span>
              </Button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* PRESENTATION TAB (Clean Printable Executive Output)     */}
        {/* ======================================================== */}
        {activeTab === "presentation" && (
          <div className="bg-white rounded-2xl p-8 sm:p-12 border border-slate-200/80 shadow-md space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b-2 border-slate-900 gap-4">
              <div>
                <SpartanBrand tone="light" className="mb-3 pointer-events-none" />
                <span className="text-xs font-bold text-[#9d2025] uppercase tracking-widest block">Executive Placement Report</span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">{orgName}</h1>
                <p className="text-xs text-slate-500 mt-0.5">3 × 5 Downline Matrix Organizational Architecture</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => window.print()}
                  className="bg-[#9d2025] hover:bg-[#74171b] text-white text-xs font-bold h-9 px-4 rounded-lg flex items-center gap-2 shadow"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print / Save as PDF</span>
                </Button>
              </div>
            </div>

            {/* Tree Presentation */}
            {isTreeLoading ? (
              <div className="py-16 text-center text-xs text-slate-400">Loading downline matrix records...</div>
            ) : !root ? (
              <div className="py-16 text-center text-xs text-slate-400">No placed leader at Apex position yet.</div>
            ) : (
              <div className="flex flex-col items-center py-4">
                {/* Level 0 Apex Leader */}
                <div className="w-56 p-3.5 rounded-xl border-2 border-[#d3aa54] bg-[#fbf6eb]/50 text-center shadow-sm">
                  <div className="flex items-center justify-center gap-1.5 text-[10px] font-extrabold text-[#b3832e] uppercase tracking-wider mb-1">
                    <Crown className="w-3.5 h-3.5" />
                    <span>LEVEL 0 - APEX LEADER</span>
                  </div>
                  <img
                    src={root.member.avatarUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80"}
                    alt=""
                    className="w-12 h-12 rounded-lg object-cover mx-auto my-1.5 border border-[#d3aa54]"
                  />
                  <div className="font-bold text-sm text-slate-900">{root.member.firstName} {root.member.lastName}</div>
                  <div className="text-xs text-slate-600 font-medium">{root.member.rank}</div>
                  <div className="text-[10px] text-slate-500 font-semibold mt-1">PV: {root.member.personalVolume} • Legs: 3/3</div>
                </div>

                <div className="w-0.5 h-8 bg-[#9d2025]/50" />

                {/* Level 1 Frontlines */}
                <div className="relative pt-6 flex items-start justify-center gap-8 sm:gap-14">
                  <div className="absolute top-0 left-20 right-20 h-0.5 bg-[#9d2025]/50" />

                  {[0, 1, 2].map((legIdx) => {
                    const leg = root.children[legIdx];
                    return (
                      <div key={legIdx} className="flex flex-col items-center relative">
                        <div className="w-0.5 h-6 bg-[#9d2025]/50 absolute -top-6" />

                        {leg ? (
                          <div className="flex flex-col items-center">
                            <div className="w-48 p-3 rounded-xl border-2 border-[#9d2025] bg-[#f8ebe9]/30 text-center shadow-sm">
                              <div className="text-[9px] font-extrabold text-[#9d2025] uppercase tracking-wider mb-1">
                                LEVEL 1 - POSITION {legIdx + 1}
                              </div>
                              <img
                                src={leg.member.avatarUrl || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&h=120&q=80"}
                                alt=""
                                className="w-10 h-10 rounded-lg object-cover mx-auto my-1 border border-[#ecd0cf]"
                              />
                              <div className="font-bold text-xs text-slate-900">{leg.member.firstName} {leg.member.lastName}</div>
                              <div className="text-[10px] text-slate-600 font-medium">{leg.member.rank}</div>
                              <div className="text-[10px] text-slate-500 font-semibold mt-1">PV: {leg.member.personalVolume}</div>
                            </div>

                            {/* Level 2 Children */}
                            <div className="flex flex-col items-center mt-2">
                              <div className="w-0.5 h-6 bg-slate-300" />
                              <div className="relative pt-6 flex items-start justify-center gap-2">
                                <div className="absolute top-0 left-4 right-4 h-0.5 bg-slate-300" />
                                {[0, 1, 2].map((childIdx) => {
                                  const child = leg.children[childIdx];
                                  return (
                                    <div key={childIdx} className="flex flex-col items-center relative">
                                      <div className="w-0.5 h-6 bg-slate-300 absolute -top-6" />
                                      {child ? (
                                        <div className="w-28 p-2 rounded-lg border border-slate-300 bg-white text-center shadow-sm">
                                          <img
                                            src={child.member.avatarUrl || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&h=100&q=80"}
                                            alt=""
                                            className="w-7 h-7 rounded-full object-cover mx-auto mb-1 border border-slate-200"
                                          />
                                          <div className="font-bold text-[10px] text-slate-900 truncate">
                                            {child.member.firstName} {child.member.lastName}
                                          </div>
                                          <div className="text-[9px] text-slate-500 truncate">{child.member.rank}</div>
                                          <div className="text-[8px] font-bold text-slate-600 mt-0.5">PV: {child.member.personalVolume}</div>
                                        </div>
                                      ) : (
                                        <div className="w-28 p-2 rounded-lg border border-dashed border-slate-300 text-center text-slate-400 text-[9px] font-medium">
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
                          <div className="w-48 p-3 rounded-xl border border-dashed border-slate-300 text-center text-slate-400 text-xs">
                            Open Position
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="border-t border-slate-200 pt-6 flex items-center justify-between text-xs text-slate-400">
              <div>Spartan Stack • Spartan Nation</div>
              <div>Confidential Internal Architecture</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
