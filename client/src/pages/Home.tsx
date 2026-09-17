import { useAuth } from "@/_core/hooks/useAuth";
import ActivityLogDrawer from "@/components/ActivityLogDrawer";
import AdminAuthGate from "@/components/AdminAuthGate";
import ChartSettingsView from "@/components/ChartSettingsView";
import ImportCSVModal from "@/components/ImportCSVModal";
import MasterListDrawer from "@/components/MasterListDrawer";
import MemberDetailDrawer from "@/components/MemberDetailDrawer";
import MembersManagerView from "@/components/MembersManagerView";
import PlaceMemberModal from "@/components/PlaceMemberModal";
import PresentationExportView from "@/components/PresentationExportView";
import RandomPlacementModal from "@/components/RandomPlacementModal";
import SaaSDashboard from "@/components/SaaSDashboard";
import SaaSMemberModal from "@/components/SaaSMemberModal";
import SaaSNavigation, { ActiveView, SaaSSidebar } from "@/components/SaaSNavigation";
import SaaSTreeCanvas from "@/components/SaaSTreeCanvas";
import SaveChartModal from "@/components/SaveChartModal";
import SavedChartsManager from "@/components/SavedChartsManager";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Member } from "../../../drizzle/schema";
import { MemberWithPlacement } from "../../../server/db";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [activeView, setActiveView] = useState<ActiveView>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const v = params.get("view");
      if (v && ["chart", "dashboard", "members", "saved-charts", "import-export", "settings"].includes(v)) {
        return v as ActiveView;
      }
    }
    return "chart";
  });

  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [searchHighlight, setSearchHighlight] = useState<string>("");

  // Modal & Drawer visibility
  const [randomModalOpen, setRandomModalOpen] = useState(false);
  const [autoFillModalOpen, setAutoFillModalOpen] = useState(false);
  const [saveChartModalOpen, setSaveChartModalOpen] = useState(false);
  const [activityDrawerOpen, setActivityDrawerOpen] = useState(false);
  const [importCSVModalOpen, setImportCSVModalOpen] = useState(false);
  const [masterListOpen, setMasterListOpen] = useState(true);

  // Slot placement modal state
  const [placeSlotModalOpen, setPlaceSlotModalOpen] = useState(false);
  const [targetSlot, setTargetSlot] = useState<{
    parentId: number | null;
    positionIndex: number;
    level: number;
    parentName?: string;
    slotName?: string;
  } | null>(null);

  // Member modal state (create / edit)
  const [memberModalOpen, setMemberModalOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("enroll") === "true";
    }
    return false;
  });
  const [memberToEdit, setMemberToEdit] = useState<Member | null>(null);

  // Member detail drawer
  const [selectedDetailMemberId, setSelectedDetailMemberId] = useState<number | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [highlightedPlacementId, setHighlightedPlacementId] = useState<number | null>(null);

  // Undo / Redo State
  const [undoStack, setUndoStack] = useState<number[]>([]);
  const [redoStack, setRedoStack] = useState<number[]>([]);

  const utils = trpc.useUtils();

  // Fetch organizations
  const { data: orgs, isLoading: isOrgsLoading } = trpc.org.list.useQuery();

  useEffect(() => {
    if (orgs && orgs.length > 0 && selectedOrgId === null) {
      setSelectedOrgId(orgs[0].id);
    }
  }, [orgs, selectedOrgId]);

  const activeOrgId = selectedOrgId || (orgs && orgs[0]?.id) || 1;
  const activeOrg = orgs?.find((o) => o.id === activeOrgId);

  const saveChartMutation = trpc.charts.save.useMutation();
  const loadChartMutation = trpc.charts.load.useMutation({
    onSuccess: () => {
      utils.matrix.getTree.invalidate();
      utils.matrix.getOpenSlots.invalidate();
      utils.member.list.invalidate();
    },
  });

  const pushUndoSnapshot = async () => {
    try {
      const snap = await saveChartMutation.mutateAsync({
        orgId: activeOrgId,
        name: `Undo Checkpoint ${new Date().toLocaleTimeString()}`,
      });
      setUndoStack((prev) => [...prev, snap.id]);
      setRedoStack([]);
    } catch (e) {}
  };

  const handleUndo = async () => {
    if (undoStack.length === 0) {
      toast.info("Nothing to undo");
      return;
    }
    const lastSnapId = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, lastSnapId]);
    await loadChartMutation.mutateAsync({ chartId: lastSnapId });
    toast.success("Previous downline state restored");
  };

  const handleRedo = async () => {
    if (redoStack.length === 0) {
      toast.info("Nothing to redo");
      return;
    }
    const redoSnapId = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, redoSnapId]);
    await loadChartMutation.mutateAsync({ chartId: redoSnapId });
    toast.success("Downline state reapplied");
  };

  // Fetch matrix tree data
  const { data: treeData } = trpc.matrix.getTree.useQuery(
    { orgId: activeOrgId },
    { enabled: Boolean(activeOrgId) }
  );

  // Fetch members directory
  const { data: membersList } = trpc.member.list.useQuery(
    { orgId: activeOrgId },
    { enabled: Boolean(activeOrgId) }
  );

  // Fetch open slots
  const { data: openSlots } = trpc.matrix.getOpenSlots.useQuery(
    { orgId: activeOrgId },
    { enabled: Boolean(activeOrgId) }
  );

  // Mutations
  const toggleLockMutation = trpc.matrix.toggleLock.useMutation({
    onSuccess: (p) => {
      pushUndoSnapshot();
      toast.success(p.isLocked ? "Position locked successfully" : "Position unlocked");
      utils.matrix.getTree.invalidate();
      utils.member.list.invalidate();
      utils.activity.list.invalidate();
    },
  });

  const unstackMutation = trpc.matrix.unstack.useMutation({
    onSuccess: () => {
      pushUndoSnapshot();
      toast.success("Member unstacked from chart back to master list");
      utils.matrix.getTree.invalidate();
      utils.matrix.getOpenSlots.invalidate();
      utils.member.list.invalidate();
      utils.activity.list.invalidate();
    },
  });

  const clearChartMutation = trpc.matrix.clear.useMutation({
    onSuccess: (res) => {
      pushUndoSnapshot();
      toast.info(`Cleared ${res.clearedCount} downlines from chart`);
      utils.matrix.getTree.invalidate();
      utils.matrix.getOpenSlots.invalidate();
      utils.member.list.invalidate();
      utils.activity.list.invalidate();
    },
  });

  const quickPlaceMutation = trpc.matrix.place.useMutation({
    onSuccess: (res) => {
      pushUndoSnapshot();
      toast.success(`Assigned to ${res.slotCoordinate}`);
      setHighlightedPlacementId(res.id);
      setTimeout(() => setHighlightedPlacementId(null), 3000);
      utils.matrix.getTree.invalidate();
      utils.matrix.getOpenSlots.invalidate();
      utils.member.list.invalidate();
      utils.activity.list.invalidate();
    },
    onError: (err) => {
      toast.error("Placement error", { description: err.message });
    },
  });

  const handleQuickAddMemberToTree = (member: MemberWithPlacement) => {
    if (!openSlots || openSlots.length === 0) {
      toast.error("No open slots available in the current matrix.");
      return;
    }
    const slot = openSlots[0];
    quickPlaceMutation.mutate({
      orgId: activeOrgId,
      memberId: member.id,
      parentId: slot.parentId,
      positionIndex: slot.positionIndex,
    });
  };

  const handleSelectSlotToAssign = (parentId: number | null, positionIndex: number, level: number) => {
    setTargetSlot({
      parentId,
      positionIndex,
      level,
      slotName: `Level ${level} Position ${positionIndex + 1}`,
    });
    setPlaceSlotModalOpen(true);
  };

  const handleSelectMemberDetails = (memberId: number) => {
    setSelectedDetailMemberId(memberId);
    setDetailDrawerOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center space-y-3 border border-slate-200">
          <div className="w-8 h-8 border-3 border-[#1d70f5] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-700">Loading MemberStack Workspace...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <AdminAuthGate />;
  }

  // Presentation Export view replaces entire chrome for clean printing
  if (activeView === "import-export") {
    return (
      <PresentationExportView
        orgId={activeOrgId}
        orgName={activeOrg?.name || "Apex Horizons MLM Network"}
        onBack={() => setActiveView("chart")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900 flex flex-col font-sans">
      {/* Top Application Header */}
      <SaaSNavigation
        activeView={activeView}
        onSelectView={(v) => setActiveView(v)}
        onGlobalSearch={(q) => setSearchHighlight(q)}
        onOpenRandomStack={() => setRandomModalOpen(true)}
        onOpenAutoFill={() => setAutoFillModalOpen(true)}
        onOpenActivityDrawer={() => setActivityDrawerOpen(true)}
        user={user}
      />

      {/* Main Workspace Body: Left Sidebar + Center Workspace + Optional Right Master List */}
      <div className="flex-1 flex overflow-hidden">
        {/* Persistent Dark Navy Left Sidebar */}
        <SaaSSidebar
          activeView={activeView}
          onSelectView={(v) => setActiveView(v)}
          onOpenRandomStack={() => setRandomModalOpen(true)}
          onOpenAutoFill={() => setAutoFillModalOpen(true)}
        />

        {/* Center Workspace Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {activeView === "chart" && (
            <SaaSTreeCanvas
              root={treeData?.root || null}
              orgName={activeOrg?.name || "Apex Horizons MLM Network"}
              organizations={orgs || []}
              currentOrgId={activeOrgId}
              onSelectOrg={(id) => setSelectedOrgId(id)}
              totalPlacedCount={treeData?.allPlacedMembersCount || 0}
              unplacedCount={treeData?.unplacedMembersCount || 0}
              openSlotsCount={openSlots?.length || 4}
              completionRate={treeData?.stats.completionRate || 73}
              searchHighlight={searchHighlight}
              onOpenRandomStack={() => setRandomModalOpen(true)}
              onOpenAutoFill={() => setAutoFillModalOpen(true)}
              onOpenSaveChart={() => setSaveChartModalOpen(true)}
              onClearChart={() => clearChartMutation.mutate({ orgId: activeOrgId })}
              onSelectSlotToAssign={handleSelectSlotToAssign}
              onSelectMemberDetails={handleSelectMemberDetails}
              onToggleLock={(pId, isL) => toggleLockMutation.mutate({ placementId: pId, isLocked: isL })}
              onUnstack={(pId) => unstackMutation.mutate({ placementId: pId })}
              onAddNewMember={() => {
                setMemberToEdit(null);
                setMemberModalOpen(true);
              }}
              onExportPDF={() => setActiveView("import-export")}
              onExportImage={() => setActiveView("import-export")}
              onUndo={handleUndo}
              onRedo={handleRedo}
              canUndo={undoStack.length > 0}
              canRedo={redoStack.length > 0}
              highlightedPlacementId={highlightedPlacementId}
            />
          )}

          {activeView === "dashboard" && (
            <SaaSDashboard
              orgId={activeOrgId}
              orgName={activeOrg?.name || "Apex Horizons MLM Network"}
              onOpenChart={() => setActiveView("chart")}
              onOpenMembers={() => setActiveView("members")}
              onOpenSavedCharts={() => setActiveView("saved-charts")}
            />
          )}

          {activeView === "members" && (
            <MembersManagerView
              orgId={activeOrgId}
              onOpenEnrollModal={() => {
                setMemberToEdit(null);
                setMemberModalOpen(true);
              }}
              onOpenImportCSVModal={() => setImportCSVModalOpen(true)}
              onEditMember={(m) => {
                setMemberToEdit(m);
                setMemberModalOpen(true);
              }}
              onViewInTree={() => setActiveView("chart")}
            />
          )}

          {activeView === "saved-charts" && (
            <SavedChartsManager
              orgId={activeOrgId}
              onOpenSaveModal={() => setSaveChartModalOpen(true)}
              onChartLoaded={() => setActiveView("chart")}
            />
          )}

          {activeView === "settings" && <ChartSettingsView orgId={activeOrgId} />}
        </main>

        {/* Right-Side Collapsible Master List (Rendered on Chart View matching mockup) */}
        {activeView === "chart" && (
          <MasterListDrawer
            members={membersList || []}
            selectedMemberId={selectedDetailMemberId}
            onSelectMember={(mId) => handleSelectMemberDetails(mId)}
            onQuickAddMemberToTree={handleQuickAddMemberToTree}
            onOpenAddMemberModal={() => {
              setMemberToEdit(null);
              setMemberModalOpen(true);
            }}
            onOpenImportCSVModal={() => setImportCSVModalOpen(true)}
            isOpen={masterListOpen}
            onToggleOpen={() => setMasterListOpen(!masterListOpen)}
          />
        )}
      </div>

      {/* Footer matching reference mockup */}
      <footer className="bg-white border-t border-slate-200 py-3 px-6 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded bg-amber-500 flex items-center justify-center text-slate-950 font-extrabold text-[10px]">
            MS
          </div>
          <span className="font-bold text-slate-800">MEMBERSTACK</span>
          <span className="text-slate-400">People • Power • Possibilities</span>
        </div>
        <div className="text-slate-400 text-[11px]">
          Version 1.0.0 • Built by Flow Sites Corp.
        </div>
      </footer>

      {/* Modals & Slide-out Drawers */}
      <RandomPlacementModal
        isOpen={randomModalOpen}
        onClose={() => setRandomModalOpen(false)}
        orgId={activeOrgId}
        unplacedCount={treeData?.unplacedMembersCount || 0}
        openSlotsCount={openSlots?.length || 4}
        mode="random"
        onSuccess={() => utils.matrix.getTree.invalidate()}
      />

      <RandomPlacementModal
        isOpen={autoFillModalOpen}
        onClose={() => setAutoFillModalOpen(false)}
        orgId={activeOrgId}
        unplacedCount={treeData?.unplacedMembersCount || 0}
        openSlotsCount={openSlots?.length || 4}
        mode="autofill"
        onSuccess={() => utils.matrix.getTree.invalidate()}
      />

      <SaveChartModal
        isOpen={saveChartModalOpen}
        onClose={() => setSaveChartModalOpen(false)}
        orgId={activeOrgId}
        defaultName={`${activeOrg?.name || "Apex Horizons"} - Baseline`}
        onSavedSuccess={() => utils.charts.list.invalidate()}
      />

      <PlaceMemberModal
        isOpen={placeSlotModalOpen}
        onClose={() => setPlaceSlotModalOpen(false)}
        orgId={activeOrgId}
        targetSlot={targetSlot}
        onPlacedSuccess={() => {
          utils.matrix.getTree.invalidate();
          utils.matrix.getOpenSlots.invalidate();
        }}
        onOpenCreateMemberModal={() => {
          setMemberToEdit(null);
          setMemberModalOpen(true);
        }}
      />

      <SaaSMemberModal
        isOpen={memberModalOpen}
        onClose={() => setMemberModalOpen(false)}
        orgId={activeOrgId}
        memberToEdit={memberToEdit}
        onSuccess={() => {
          utils.member.list.invalidate();
          utils.matrix.getTree.invalidate();
        }}
      />

      <MemberDetailDrawer
        memberId={selectedDetailMemberId}
        orgId={activeOrgId}
        isOpen={detailDrawerOpen}
        onClose={() => setDetailDrawerOpen(false)}
        onOpenEditModal={(m) => {
          setMemberToEdit(m);
          setMemberModalOpen(true);
        }}
        onUnstack={(pId) => {
          unstackMutation.mutate({ placementId: pId });
          setDetailDrawerOpen(false);
        }}
        onToggleLock={(pId, isL) => toggleLockMutation.mutate({ placementId: pId, isLocked: isL })}
      />

      <ImportCSVModal
        isOpen={importCSVModalOpen}
        onClose={() => setImportCSVModalOpen(false)}
        orgId={activeOrgId}
        onSuccess={() => utils.member.list.invalidate()}
      />

      <ActivityLogDrawer
        orgId={activeOrgId}
        isOpen={activityDrawerOpen}
        onClose={() => setActivityDrawerOpen(false)}
      />
    </div>
  );
}
