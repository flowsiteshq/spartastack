import { useAuth } from "@/_core/hooks/useAuth";
import ActivityLogDrawer from "@/components/ActivityLogDrawer";
import AdminAuthGate from "@/components/AdminAuthGate";
import ChartSettingsView from "@/components/ChartSettingsView";
import ImportCSVModal from "@/components/ImportCSVModal";
import MemberCommunicationDialog, { CommunicationMember } from "@/components/MemberCommunicationDialog";
import MemberNetworkAccess from "@/components/MemberNetworkAccess";
import MessagesWorkspaceView from "@/components/MessagesWorkspaceView";
import MasterListDrawer from "@/components/MasterListDrawer";
import MemberDetailDrawer from "@/components/MemberDetailDrawer";
import MembersManagerView from "@/components/MembersManagerView";
import PlaceMemberModal from "@/components/PlaceMemberModal";
import ImportExportHubView from "@/components/ImportExportHubView";
import RandomPlacementModal from "@/components/RandomPlacementModal";
import SaaSDashboard from "@/components/SaaSDashboard";
import SaaSMemberModal from "@/components/SaaSMemberModal";
import SaaSNavigation, { ActiveView, SaaSSidebar } from "@/components/SaaSNavigation";
import MobileNavigation from "@/components/MobileNavigation";
import SaaSTreeCanvas from "@/components/SaaSTreeCanvas";
import SaveChartModal from "@/components/SaveChartModal";
import SavedChartsManager from "@/components/SavedChartsManager";
import SpartanBrand from "@/components/SpartanBrand";
import StackOnboarding from "@/components/StackOnboarding";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Member } from "../../../drizzle/schema";
import { MemberWithPlacement } from "../../../server/db";

export default function Home() {
  const { user, loading, isAuthenticated, logout, refresh } = useAuth();
  const authError =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("authError")
      : null;
  const forceGatePreview =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("authPreview") === "true";
  const forceMemberJoinPreview =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("previewJoin") === "1";
  const forceMemberPortalPreview =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("previewPortal") === "1";
  const [activeView, setActiveView] = useState<ActiveView>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const v = params.get("view");
      if (v && ["chart", "dashboard", "members", "messages", "saved-charts", "import-export", "settings"].includes(v)) {
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
  const [masterListOpen, setMasterListOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 1024;
    }
    return true;
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    const urlParam = new URLSearchParams(window.location.search).get("sidebar");
    if (urlParam === "collapsed") return true;
    if (urlParam === "expanded") return false;
    return window.localStorage.getItem("spartan-stack-sidebar-collapsed") === "true";
  });

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
  const [communicationMember, setCommunicationMember] = useState<CommunicationMember | null>(null);
  const [highlightedPlacementId, setHighlightedPlacementId] = useState<number | null>(null);

  // Undo / Redo State
  const [undoStack, setUndoStack] = useState<number[]>([]);
  const [redoStack, setRedoStack] = useState<number[]>([]);

  const utils = trpc.useUtils();
  const onboardingQuery = trpc.onboarding.status.useQuery(undefined, {
    enabled: Boolean(isAuthenticated && user),
    retry: false,
  });

  // Fetch organizations
  const isAdministrator = user?.role === "admin";
  const { data: orgs, isLoading: isOrgsLoading } = trpc.org.list.useQuery(undefined, {
    enabled: Boolean(isAdministrator),
  });

  useEffect(() => {
    if (orgs && orgs.length > 0 && selectedOrgId === null) {
      const requestedStackId = typeof window !== "undefined"
        ? Number(new URLSearchParams(window.location.search).get("stackId"))
        : NaN;
      const requestedStack = orgs.find((org) => org.id === requestedStackId);
      setSelectedOrgId(requestedStack?.id || orgs[0].id);
    }
  }, [orgs, selectedOrgId]);

  useEffect(() => {
    window.localStorage.setItem("spartan-stack-sidebar-collapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const activeOrgId = selectedOrgId || (orgs && orgs[0]?.id) || 300004;
  const activeOrg = orgs?.find((o) => o.id === activeOrgId) || orgs?.[0];

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
    { enabled: Boolean(activeOrgId && isAdministrator) }
  );

  // Fetch members directory
  const { data: membersList } = trpc.member.list.useQuery(
    { orgId: activeOrgId },
    { enabled: Boolean(activeOrgId && isAdministrator) }
  );

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("communicationPreview") === "true" &&
      !communicationMember
    ) {
      setCommunicationMember(
        membersList?.[0] || {
          id: 999,
          firstName: "Marcus",
          lastName: "Vance",
          email: "marcus.vance@spartannation.internal",
          phone: "+1 (555) 234-5678",
          avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&h=160&q=80",
          rank: "Spartan Centurion",
        }
      );
    }
  }, [membersList, communicationMember]);

  // Fetch open slots
  const { data: openSlots } = trpc.matrix.getOpenSlots.useQuery(
    { orgId: activeOrgId },
    { enabled: Boolean(activeOrgId && isAdministrator) }
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

  const handleOpenCommunication = (member: CommunicationMember) => {
    setCommunicationMember(member);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f6f3] flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center space-y-3 border border-[#ded4c3]">
          <div className="w-8 h-8 border-3 border-[#9d2025] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-700">Loading Spartan Stack Workspace...</p>
        </div>
      </div>
    );
  }

  const requiresGoogleSignIn =
    import.meta.env.PROD &&
    user?.loginMethod !== "google" &&
    user?.openId !== "admin_workspace_master";

  if (forceGatePreview || !isAuthenticated || !user || requiresGoogleSignIn) {
    return <AdminAuthGate errorCode={authError || (requiresGoogleSignIn ? "access_denied" : null)} />;
  }

  if (forceMemberJoinPreview) {
    return (
      <MemberNetworkAccess
        user={{ name: "David Kim", email: "david.kim@gmail.com" }}
        onLogout={logout}
      />
    );
  }

  if (forceMemberPortalPreview) {
    return (
      <MemberNetworkAccess
        user={{ name: "Sarah Conway", email: "sarah.conway@gmail.com" }}
        onLogout={logout}
      />
    );
  }

  const forceOnboardingPreview =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("previewOnboarding") === "true";

  const forceChartPreview =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("previewChart") === "true";

  if (forceOnboardingPreview) {
    return (
      <StackOnboarding
        user={user || { name: "Sensei Spartan", email: "sensei30002003@gmail.com", avatarUrl: null }}
        profile={{ firstName: "", lastName: "", phone: "", avatarUrl: null }}
        onLogout={logout}
        onComplete={() => {}}
      />
    );
  }

  if (onboardingQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#f7f6f3] flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center space-y-3 border border-[#ded4c3]">
          <div className="w-8 h-8 border-3 border-[#9d2025] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-700">Preparing your secure account setup...</p>
        </div>
      </div>
    );
  }

  if (!forceChartPreview && !onboardingQuery.data?.completed) {
    return (
      <StackOnboarding
        user={user}
        profile={onboardingQuery.data?.profile || { firstName: "", lastName: "", phone: "", avatarUrl: null }}
        onLogout={logout}
        onComplete={async (createdOrgId) => {
          await Promise.all([refresh(), onboardingQuery.refetch(), utils.org.list.invalidate()]);
          if (createdOrgId) {
            window.history.replaceState({}, "", `/?stackId=${createdOrgId}`);
            setSelectedOrgId(createdOrgId);
          }
        }}
      />
    );
  }

  if (user.role !== "admin") {
    return <MemberNetworkAccess user={user} onLogout={logout} />;
  }

  // Presentation Export view replaces entire chrome for clean printing
  if (activeView === "import-export") {
    return (
      <ImportExportHubView
        orgId={activeOrgId}
        orgName={activeOrg?.name || "Apex Horizons MLM Network"}
        onBack={() => setActiveView("chart")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f6f3] text-slate-900 flex flex-col font-sans pb-16 md:pb-0">
      {/* Mobile Top Navigation & Bottom App Bar */}
      <MobileNavigation
        activeView={activeView}
        onSelectView={(v) => setActiveView(v)}
        onGlobalSearch={(q) => setSearchHighlight(q)}
        onOpenRandomStack={() => setRandomModalOpen(true)}
        onOpenAutoFill={() => setAutoFillModalOpen(true)}
        onOpenActivityDrawer={() => setActivityDrawerOpen(true)}
        user={user}
      />

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
          isCollapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
        />

        {/* Center Workspace Content */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8">
          {activeView === "chart" && (
            <SaaSTreeCanvas
              root={treeData?.root || null}
              orgName={activeOrg?.name || "Sparta Nation Example Network"}
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
              onOpenCommunication={handleOpenCommunication}
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
              onOpenCommunication={handleOpenCommunication}
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
              onOpenCommunication={handleOpenCommunication}
              onViewInTree={() => setActiveView("chart")}
            />
          )}

          {activeView === "messages" && (
            <MessagesWorkspaceView
              orgId={activeOrgId}
              orgName={activeOrg?.name || "Apex Horizons MLM Network"}
              onComposeMessage={handleOpenCommunication}
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
            onOpenCommunication={handleOpenCommunication}
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
      <footer className="bg-[#fffdf9] border-t border-[#ded4c3] py-3 px-6 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-4">
        <SpartanBrand tone="light" className="pointer-events-none" />
        <div className="text-slate-400 text-[11px]">
          Sparta Nation • Organization planning system
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
        onOpenCommunication={handleOpenCommunication}
      />

      <MemberCommunicationDialog
        member={communicationMember}
        orgId={activeOrgId}
        isOpen={Boolean(communicationMember)}
        onClose={() => setCommunicationMember(null)}
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
