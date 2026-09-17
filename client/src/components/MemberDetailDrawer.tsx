import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import {
  Calendar,
  CheckCircle2,
  Crown,
  Edit,
  Lock,
  Mail,
  Network,
  Phone,
  Shield,
  Unlock,
  UserCheck,
  UserMinus,
  Users,
} from "lucide-react";
import { TreeNode } from "../../../server/db";

interface MemberDetailDrawerProps {
  memberId: number | null;
  orgId: number;
  isOpen: boolean;
  onClose: () => void;
  onOpenEditModal: (member: any) => void;
  onUnstack: (placementId: number) => void;
  onToggleLock: (placementId: number, isLocked?: boolean) => void;
}

export default function MemberDetailDrawer({
  memberId,
  orgId,
  isOpen,
  onClose,
  onOpenEditModal,
  onUnstack,
  onToggleLock,
}: MemberDetailDrawerProps) {
  const { data: member, isLoading } = trpc.member.get.useQuery(
    { id: memberId! },
    { enabled: isOpen && Boolean(memberId) }
  );

  const { data: treeData } = trpc.matrix.getTree.useQuery(
    { orgId },
    { enabled: isOpen && Boolean(orgId) }
  );

  if (!memberId) return null;

  // Find member in tree
  let placedNode: any = null;
  let uplineParentNode: any = null;

  function findInTree(current: TreeNode, parent: TreeNode | null = null) {
    if (current.memberId === memberId) {
      placedNode = current;
      uplineParentNode = parent;
      return;
    }
    for (const child of current.children) {
      if (child) {
        findInTree(child, current);
        if (placedNode) return;
      }
    }
  }

  if (treeData?.root) {
    findInTree(treeData.root);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-white border border-slate-200 text-slate-800 p-6 shadow-2xl rounded-2xl">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider">
            <Shield className="w-4 h-4 text-blue-600" />
            <span>Distributor Profile & Downline Details</span>
          </div>
          <DialogTitle className="text-xl font-bold font-sans text-slate-900 mt-1">
            Member Overview
          </DialogTitle>
        </DialogHeader>

        {isLoading || !member ? (
          <div className="p-8 text-center text-xs text-slate-400 font-sans">
            Loading member profile...
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Member Card with Photo */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-3.5 shadow-sm">
              <img
                src={
                  member.avatarUrl ||
                  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80"
                }
                alt={`${member.firstName} ${member.lastName}`}
                className="w-14 h-14 rounded-xl object-cover border-2 border-white shadow flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-slate-900 font-sans truncate">
                    {member.firstName} {member.lastName}
                  </h3>
                  {placedNode?.isLocked && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      <Lock className="w-3 h-3 text-amber-600" /> Locked
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-semibold text-[#1d70f5] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                    {member.rank}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">ID: #{member.id}</span>
                </div>
              </div>
            </div>

            {/* Downline Relationships Section */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                NETWORK PLACEMENT & LINEAGE
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block">POSITION</span>
                  <span className="font-bold text-slate-900">
                    {placedNode ? placedNode.slotCoordinate : "Available in Master List"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">DIRECT SPONSOR / UPLINE</span>
                  <span className="font-bold text-[#1d70f5]">
                    {uplineParentNode
                      ? `${uplineParentNode.member.firstName} ${uplineParentNode.member.lastName}`
                      : placedNode?.level === 0
                      ? "Apex Leader (Level 0)"
                      : "None"}
                  </span>
                </div>
              </div>

              {/* Direct Downlines / Frontlines */}
              {placedNode && (
                <div className="pt-2 border-t border-slate-200/60 mt-2">
                  <span className="text-slate-400 text-[10px] block mb-1">
                    DIRECT FRONTLINES ({placedNode.children.filter(Boolean).length} / 3 LEGS OCCUPIED)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {placedNode.children.map((child: any, idx: number) =>
                      child ? (
                        <span
                          key={child.id}
                          className="text-[11px] font-semibold bg-white border border-slate-200 px-2 py-1 rounded-md text-slate-800"
                        >
                          Leg {idx + 1}: {child.member.firstName} {child.member.lastName} ({child.member.rank})
                        </span>
                      ) : (
                        <span
                          key={idx}
                          className="text-[11px] font-medium bg-white/60 border border-dashed border-slate-300 px-2 py-1 rounded-md text-slate-400"
                        >
                          Leg {idx + 1}: Open
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-3 text-xs font-medium">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-slate-500 text-[10px] uppercase block">PERSONAL VOLUME</span>
                <span className="text-base font-bold text-slate-900">{member.personalVolume} PV</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-slate-500 text-[10px] uppercase block">ACCOUNT STATUS</span>
                <span className="text-base font-bold text-emerald-600 capitalize">{member.status}</span>
              </div>
            </div>

            {/* Contact details */}
            <div className="space-y-1.5 text-xs font-medium text-slate-600 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">{member.email}</span>
              </div>
              {member.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{member.phone}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="border-t border-slate-100 pt-4 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            {placedNode && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onToggleLock(placedNode!.placementId, !placedNode!.isLocked);
                    onClose();
                  }}
                  className="text-xs font-bold border-amber-300 text-amber-800 hover:bg-amber-50 h-8"
                >
                  {placedNode.isLocked ? (
                    <>
                      <Unlock className="w-3.5 h-3.5 mr-1 text-slate-500" />
                      Unlock
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 mr-1 text-amber-600" />
                      Lock Position
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onUnstack(placedNode!.placementId);
                    onClose();
                  }}
                  className="text-xs font-bold border-red-200 text-red-600 hover:bg-red-50 h-8"
                >
                  <UserMinus className="w-3.5 h-3.5 mr-1" />
                  Unstack
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-sans h-8"
            >
              Close
            </Button>
            {member && (
              <Button
                onClick={() => {
                  onOpenEditModal(member);
                  onClose();
                }}
                className="bg-[#1d70f5] hover:bg-blue-600 text-white text-xs font-bold h-8"
              >
                <Edit className="w-3.5 h-3.5 mr-1" />
                Edit Profile
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
