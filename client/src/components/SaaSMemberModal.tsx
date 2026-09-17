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
import { trpc } from "@/lib/trpc";
import { UserPlus, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Member } from "../../../drizzle/schema";

interface SaaSMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: number;
  memberToEdit?: Member | null;
  onSuccess: () => void;
}

const AVATAR_OPTIONS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&h=150&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80",
  "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&h=150&q=80",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&h=150&q=80",
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&h=150&q=80",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&h=150&q=80",
  "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&h=150&q=80",
];

export default function SaaSMemberModal({
  isOpen,
  onClose,
  orgId,
  memberToEdit,
  onSuccess,
}: SaaSMemberModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [rank, setRank] = useState("Associate");
  const [personalVolume, setPersonalVolume] = useState(100);
  const [avatarUrl, setAvatarUrl] = useState(AVATAR_OPTIONS[0]);
  const [notes, setNotes] = useState("");

  const utils = trpc.useUtils();

  useEffect(() => {
    if (memberToEdit) {
      setFirstName(memberToEdit.firstName);
      setLastName(memberToEdit.lastName);
      setEmail(memberToEdit.email);
      setPhone(memberToEdit.phone || "");
      setRank(memberToEdit.rank);
      setPersonalVolume(memberToEdit.personalVolume);
      setAvatarUrl(memberToEdit.avatarUrl || AVATAR_OPTIONS[0]);
      setNotes(memberToEdit.notes || "");
    } else {
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setRank("Associate");
      setPersonalVolume(100);
      setAvatarUrl(AVATAR_OPTIONS[Math.floor(Math.random() * AVATAR_OPTIONS.length)]);
      setNotes("");
    }
  }, [memberToEdit, isOpen]);

  const createMutation = trpc.member.create.useMutation({
    onSuccess: (mem) => {
      toast.success(`Enrolled ${mem.firstName} ${mem.lastName} into master list`);
      utils.member.list.invalidate();
      utils.activity.list.invalidate();
      onSuccess();
      onClose();
    },
    onError: (err) => {
      toast.error("Failed to enroll member", { description: err.message });
    },
  });

  const updateMutation = trpc.member.update.useMutation({
    onSuccess: (mem) => {
      toast.success(`Updated member profile for ${mem.firstName} ${mem.lastName}`);
      utils.member.list.invalidate();
      utils.matrix.getTree.invalidate();
      utils.activity.list.invalidate();
      onSuccess();
      onClose();
    },
    onError: (err) => {
      toast.error("Failed to update profile", { description: err.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (memberToEdit) {
      updateMutation.mutate({
        id: memberToEdit.id,
        firstName,
        lastName,
        email,
        phone,
        rank,
        personalVolume,
        avatarUrl,
        notes,
      });
    } else {
      createMutation.mutate({
        orgId,
        firstName,
        lastName,
        email,
        phone,
        rank,
        personalVolume,
        avatarUrl,
        notes,
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-white border border-slate-200 text-slate-800 p-6 shadow-2xl rounded-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider">
              <UserPlus className="w-4 h-4 text-blue-600" />
              <span>Distributor Profile Ledger</span>
            </div>
            <DialogTitle className="text-xl font-bold font-sans text-slate-900 mt-1">
              {memberToEdit ? "Edit Member Profile" : "Enroll New Member"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-sans mt-0.5">
              Registered into the organization's central master member directory.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* Avatar Photo Preset Picker */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                PROFILE PHOTO AVATAR
              </label>
              <div className="flex items-center gap-2 overflow-x-auto p-1.5 border border-slate-200 rounded-xl bg-slate-50">
                {AVATAR_OPTIONS.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt="avatar option"
                    onClick={() => setAvatarUrl(url)}
                    className={`w-10 h-10 rounded-full object-cover cursor-pointer transition-all flex-shrink-0 ${
                      avatarUrl === url ? "ring-2 ring-[#1d70f5] scale-105 border-2 border-white" : "opacity-60 hover:opacity-100"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* First and Last Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">FIRST NAME *</label>
                <Input
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Alex"
                  className="h-9 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">LAST NAME *</label>
                <Input
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Morgan"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Email and Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">EMAIL ADDRESS *</label>
                <Input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex.m@apexhorizon.org"
                  className="h-9 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">PHONE NUMBER</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Rank and PV */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">NETWORK RANK</label>
                <Select value={rank} onValueChange={(v) => setRank(v)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Rank" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
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
                <label className="text-xs font-bold text-slate-700 block mb-1">PERSONAL VOLUME (PV)</label>
                <Input
                  type="number"
                  value={personalVolume}
                  onChange={(e) => setPersonalVolume(Number(e.target.value))}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">NOTES</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Recruitment notes or sponsor lineage..."
                className="text-xs resize-none h-16"
              />
            </div>
          </div>

          <DialogFooter className="border-t border-slate-100 pt-4 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-sans"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-[#1d70f5] hover:bg-blue-600 text-white font-bold text-xs uppercase tracking-wider font-sans px-4 h-9 shadow-sm"
            >
              {isPending
                ? "Saving..."
                : memberToEdit
                ? "Update Member Profile"
                : "Enroll Member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
