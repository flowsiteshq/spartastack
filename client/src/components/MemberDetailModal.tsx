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
  CheckCircle2,
  Clock,
  Layers,
  Mail,
  Phone,
  Shield,
  User,
  UserCheck,
} from "lucide-react";

interface MemberDetailModalProps {
  memberId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenTreeWithMember?: () => void;
}

export default function MemberDetailModal({
  memberId,
  isOpen,
  onClose,
  onOpenTreeWithMember,
}: MemberDetailModalProps) {
  const { data: member, isLoading } = trpc.member.get.useQuery(
    { id: memberId! },
    { enabled: isOpen && Boolean(memberId) }
  );

  if (!memberId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-[#0a1e38] border border-cyan-400/40 text-white p-6 shadow-2xl">
        <DialogHeader className="border-b border-white/10 pb-3">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-300 uppercase tracking-widest">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span>Distributor Dossier</span>
          </div>
          <DialogTitle className="text-xl font-bold font-display text-white mt-1">
            Member Specifications
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-300 font-mono">
            Matrix participant records and status verified by system administrator.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !member ? (
          <div className="p-8 text-center font-mono text-xs text-cyan-300">
            LOADING DOSSIER...
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Member Card with Photo */}
            <div className="p-3.5 rounded bg-[#07172c] border border-cyan-400/30 flex items-center gap-3.5">
              <img
                src={
                  member.avatarUrl ||
                  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80"
                }
                alt={`${member.firstName} ${member.lastName}`}
                className="w-14 h-14 rounded object-cover border-2 border-cyan-400 shadow"
              />
              <div>
                <h3 className="text-base font-bold text-white font-sans">
                  {member.firstName} {member.lastName}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-400/40 text-cyan-300">
                    {member.rank}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    ID #{member.id}
                  </span>
                </div>
              </div>
            </div>

            {/* Telemetry Stats */}
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-2.5 rounded bg-[#07172c] border border-white/10">
                <span className="text-[10px] text-slate-400 block uppercase">PERSONAL VOLUME</span>
                <span className="text-sm font-bold text-cyan-300">{member.personalVolume} PV</span>
              </div>
              <div className="p-2.5 rounded bg-[#07172c] border border-white/10">
                <span className="text-[10px] text-slate-400 block uppercase">ENROLLMENT STATUS</span>
                <span className="text-sm font-bold text-emerald-400 capitalize">{member.status}</span>
              </div>
            </div>

            {/* Contact Details */}
            <div className="space-y-2 text-xs font-mono text-slate-300 p-3 rounded bg-[#07172c] border border-white/10">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                <span>{member.email}</span>
              </div>
              {member.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{member.phone}</span>
                </div>
              )}
            </div>

            {member.notes && (
              <div className="p-3 rounded bg-[#07172c] border border-white/10 text-xs text-slate-300 font-sans">
                <span className="text-[10px] font-mono text-slate-400 block uppercase mb-1">
                  ADMINISTRATIVE NOTES
                </span>
                <p>{member.notes}</p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="border-t border-white/10 pt-4 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-white/20 hover:bg-white/10 text-slate-300 text-xs font-mono"
          >
            Close
          </Button>
          {onOpenTreeWithMember && (
            <Button
              onClick={() => {
                onOpenTreeWithMember();
                onClose();
              }}
              className="bg-cyan-500 hover:bg-cyan-400 text-[#07192f] font-bold text-xs font-mono uppercase"
            >
              <Layers className="w-3.5 h-3.5 mr-1.5" />
              View in Tree
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
