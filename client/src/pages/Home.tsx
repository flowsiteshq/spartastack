import { useAuth } from "@/_core/hooks/useAuth";
import AdminAuthGate from "@/components/AdminAuthGate";
import BlueprintHeader from "@/components/BlueprintHeader";
import CreateOrgModal from "@/components/CreateOrgModal";
import MasterMemberList from "@/components/MasterMemberList";
import MatrixAnalytics from "@/components/MatrixAnalytics";
import MemberDetailModal from "@/components/MemberDetailModal";
import TreeView3x5 from "@/components/TreeView3x5";
import { trpc } from "@/lib/trpc";
import { Organization } from "../../../drizzle/schema";
import { useEffect, useState } from "react";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<"tree" | "members" | "analytics">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab === "members" || tab === "analytics") return tab;
    }
    return "tree";
  });

  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [createOrgModalOpen, setCreateOrgModalOpen] = useState(false);
  const [detailMemberId, setDetailMemberId] = useState<number | null>(null);

  const { data: orgs, isLoading: isOrgsLoading } = trpc.org.list.useQuery();

  // Set default organization once loaded
  useEffect(() => {
    if (orgs && orgs.length > 0 && !selectedOrg) {
      setSelectedOrg(orgs[0]);
    }
  }, [orgs, selectedOrg]);

  const handleTabChange = (tab: "tree" | "members" | "analytics") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState({}, "", url.toString());
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen blueprint-canvas flex items-center justify-center">
        <div className="border border-cyan-400/40 bg-[#0a1e38] p-8 text-center space-y-3 shadow-2xl">
          <div className="inline-block w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <p className="font-mono text-xs text-cyan-300 tracking-wider">
            INITIALIZING CAD BLUEPRINT WORKSPACE...
          </p>
        </div>
      </div>
    );
  }

  // Enforce Administrator Authentication
  if (!isAuthenticated || !user) {
    return <AdminAuthGate />;
  }

  return (
    <div className="min-h-screen blueprint-canvas flex flex-col text-white">
      {/* CAD Header & Title Block */}
      <BlueprintHeader
        organizations={orgs || []}
        selectedOrg={selectedOrg}
        onSelectOrg={(org) => setSelectedOrg(org)}
        onOpenCreateOrg={() => setCreateOrgModalOpen(true)}
        activeTab={activeTab}
        onChangeTab={handleTabChange}
        user={user}
      />

      {/* Main Administrative Workspace */}
      <main className="flex-1 container py-6 max-w-7xl mx-auto px-4 sm:px-6">
        {isOrgsLoading || !selectedOrg ? (
          <div className="p-12 text-center font-mono text-xs text-cyan-300">
            LOADING NETWORK ARCHITECTURE CONFIGURATION...
          </div>
        ) : (
          <>
            {activeTab === "tree" && (
              <TreeView3x5
                orgId={selectedOrg.id}
                onViewMemberDetails={(mId) => setDetailMemberId(mId)}
              />
            )}

            {activeTab === "members" && (
              <MasterMemberList
                orgId={selectedOrg.id}
                onSwitchToTree={() => handleTabChange("tree")}
              />
            )}

            {activeTab === "analytics" && (
              <MatrixAnalytics
                orgId={selectedOrg.id}
                onSwitchToTree={() => handleTabChange("tree")}
              />
            )}
          </>
        )}
      </main>

      {/* Technical Blueprint Footer Dimension Bar */}
      <footer className="border-t border-cyan-400/20 bg-[#07172c]/90 py-2.5 px-4 text-[10px] font-mono text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-4">
          <span className="text-cyan-300">
            CAD-ENGINE: <span className="text-white">v4.8-ORTHOGONAL</span>
          </span>
          <span className="text-slate-500">|</span>
          <span>
            SPEC: <span className="text-white">MIL-STD-3X5 MATRIX PLACEMENT</span>
          </span>
          <span className="text-slate-500">|</span>
          <span>
            PARTITION: <span className="text-cyan-300">{selectedOrg?.code || "DEFAULT"}</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-emerald-400 font-semibold">DUPLICATE REJECTION: ACTIVE</span>
          <span className="text-slate-500">|</span>
          <span>ALL PLACEMENTS COMMITTED TO DATABASE</span>
        </div>
      </footer>

      {/* Modals */}
      <CreateOrgModal
        isOpen={createOrgModalOpen}
        onClose={() => setCreateOrgModalOpen(false)}
        onCreated={(newOrg) => setSelectedOrg(newOrg)}
      />

      <MemberDetailModal
        memberId={detailMemberId}
        isOpen={Boolean(detailMemberId)}
        onClose={() => setDetailMemberId(null)}
        onOpenTreeWithMember={() => handleTabChange("tree")}
      />
    </div>
  );
}
