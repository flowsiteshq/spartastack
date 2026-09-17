import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Member } from "../../../drizzle/schema";
import { trpc } from "@/lib/trpc";
import { Shield, Sparkles, User, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface MemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: number;
  memberToEdit?: Member | null;
  onSuccess: () => void;
}

const AVATAR_PRESETS = [
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&h=256&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&h=256&q=80",
  "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=256&h=256&q=80",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=256&h=256&q=80",
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=256&h=256&q=80",
];

export default function MemberModal({
  isOpen,
  onClose,
  orgId,
  memberToEdit,
  onSuccess,
}: MemberModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(AVATAR_PRESETS[0]);
  const [rank, setRank] = useState("Associate");
  const [personalVolume, setPersonalVolume] = useState(100);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (memberToEdit) {
      setFirstName(memberToEdit.firstName);
      setLastName(memberToEdit.lastName);
      setEmail(memberToEdit.email);
      setPhone(memberToEdit.phone || "");
      setAvatarUrl(memberToEdit.avatarUrl || AVATAR_PRESETS[0]);
      setRank(memberToEdit.rank || "Associate");
      setPersonalVolume(memberToEdit.personalVolume || 100);
      setNotes(memberToEdit.notes || "");
    } else {
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setAvatarUrl(AVATAR_PRESETS[Math.floor(Math.random() * AVATAR_PRESETS.length)]);
      setRank("Associate");
      setPersonalVolume(100);
      setNotes("");
    }
  }, [memberToEdit, isOpen]);

  const utils = trpc.useUtils();

  const createMutation = trpc.member.create.useMutation({
    onSuccess: (m) => {
      toast.success(`Enrolled ${m.firstName} ${m.lastName} into Master Directory`);
      utils.member.list.invalidate();
      utils.matrix.getTree.invalidate();
      onSuccess();
      onClose();
    },
    onError: (err) => {
      toast.error("Failed to enroll member", { description: err.message });
    },
  });

  const updateMutation = trpc.member.update.useMutation({
    onSuccess: () => {
      toast.success("Member profile updated");
      utils.member.list.invalidate();
      utils.matrix.getTree.invalidate();
      onSuccess();
      onClose();
    },
    onError: (err) => {
      toast.error("Failed to update member", { description: err.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast.error("First name, last name, and email are required");
      return;
    }

    if (memberToEdit) {
      updateMutation.mutate({
        id: memberToEdit.id,
        firstName,
        lastName,
        email,
        phone: phone || undefined,
        avatarUrl,
        rank,
        personalVolume,
        notes: notes || undefined,
      });
    } else {
      createMutation.mutate({
        orgId,
        firstName,
        lastName,
        email,
        phone: phone || undefined,
        avatarUrl,
        rank,
        personalVolume,
        notes: notes || undefined,
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg bg-[#0a1e38] border border-cyan-400/40 text-white p-6 shadow-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="border-b border-white/10 pb-3">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-300 uppercase tracking-widest">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span>CAD Master Directory Record</span>
            </div>
            <DialogTitle className="text-xl font-bold font-display text-white mt-1">
              {memberToEdit ? "Edit Member Profile" : "Enroll New Master Member"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-300 font-mono">
              Manage distributor profile data, rank classification, and photo portrait.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Photo Avatar Selector */}
            <div>
              <label className="text-[11px] font-mono text-cyan-300 uppercase block mb-1.5">
                PROFILE PHOTO PORTRAIT
              </label>
              <div className="flex items-center gap-3">
                <img
                  src={avatarUrl}
                  alt="Selected avatar"
                  className="w-14 h-14 rounded object-cover border-2 border-cyan-400 shadow"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {AVATAR_PRESETS.map((preset, idx) => (
                      <img
                        key={idx}
                        src={preset}
                        alt={`Preset ${idx + 1}`}
                        onClick={() => setAvatarUrl(preset)}
                        className={`w-7 h-7 rounded object-cover cursor-pointer border transition-transform ${
                          avatarUrl === preset
                            ? "border-cyan-400 scale-110 shadow-[0_0_8px_rgba(56,189,248,0.5)]"
                            : "border-white/20 opacity-60 hover:opacity-100"
                        }`}
                      />
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Or enter custom image URL..."
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="mt-1.5 w-full h-7 px-2 text-[10px] font-mono bg-[#07172c] border border-white/20 rounded text-slate-300 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-mono text-slate-300 uppercase block mb-1">
                  FIRST NAME *
                </label>
                <Input
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Marcus"
                  className="h-9 bg-[#07172c] border-white/20 text-white text-xs font-sans"
                />
              </div>
              <div>
                <label className="text-[11px] font-mono text-slate-300 uppercase block mb-1">
                  LAST NAME *
                </label>
                <Input
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Vance"
                  className="h-9 bg-[#07172c] border-white/20 text-white text-xs font-sans"
                />
              </div>
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-mono text-slate-300 uppercase block mb-1">
                  EMAIL ADDRESS *
                </label>
                <Input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="member@stackmatrix.org"
                  className="h-9 bg-[#07172c] border-white/20 text-white text-xs font-sans"
                />
              </div>
              <div>
                <label className="text-[11px] font-mono text-slate-300 uppercase block mb-1">
                  PHONE NUMBER
                </label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 012-3456"
                  className="h-9 bg-[#07172c] border-white/20 text-white text-xs font-sans"
                />
              </div>
            </div>

            {/* Rank & Personal Volume */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-mono text-slate-300 uppercase block mb-1">
                  NETWORK RANK
                </label>
                <Select value={rank} onValueChange={(val) => setRank(val)}>
                  <SelectTrigger className="h-9 bg-[#07172c] border-white/20 text-white text-xs font-mono">
                    <SelectValue placeholder="Select Rank" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0a203c] border-white/20 text-white font-mono text-xs">
                    <SelectItem value="Associate">Associate</SelectItem>
                    <SelectItem value="Bronze Builder">Bronze Builder</SelectItem>
                    <SelectItem value="Silver Associate">Silver Associate</SelectItem>
                    <SelectItem value="Gold Leader">Gold Leader</SelectItem>
                    <SelectItem value="Diamond Executive">Diamond Executive</SelectItem>
                    <SelectItem value="Crown Director">Crown Director</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[11px] font-mono text-slate-300 uppercase block mb-1">
                  PERSONAL VOLUME (PV)
                </label>
                <Input
                  type="number"
                  value={personalVolume}
                  onChange={(e) => setPersonalVolume(Number(e.target.value))}
                  className="h-9 bg-[#07172c] border-white/20 text-white text-xs font-mono"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-[11px] font-mono text-slate-300 uppercase block mb-1">
                NOTES / SPECIFICATIONS
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Background, sponsor notes, recruit source..."
                className="bg-[#07172c] border-white/20 text-white text-xs font-sans resize-none h-16"
              />
            </div>
          </div>

          <DialogFooter className="border-t border-white/10 pt-4 flex items-center justify-between gap-3 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-white/20 hover:bg-white/10 text-slate-300 text-xs font-mono"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-cyan-500 hover:bg-cyan-400 text-[#07192f] font-bold text-xs uppercase tracking-wider font-mono px-4 h-9"
            >
              {isPending
                ? "Saving..."
                : memberToEdit
                ? "Update Profile"
                : "Enroll to Master List"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
