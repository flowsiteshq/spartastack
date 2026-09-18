import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, MessageCircle, Phone, Send, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export type CommunicationMember = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  rank?: string | null;
};

interface MemberCommunicationDialogProps {
  member: CommunicationMember | null;
  isOpen: boolean;
  onClose: () => void;
}

type Channel = "email" | "text";

const fallbackPhoto = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&h=160&q=80";

function cleanPhone(phone?: string | null) {
  return (phone || "").replace(/[^0-9+]/g, "");
}

export default function MemberCommunicationDialog({ member, isOpen, onClose }: MemberCommunicationDialogProps) {
  const [channel, setChannel] = useState<Channel>("email");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const memberName = useMemo(() => {
    if (!member) return "Member";
    return `${member.firstName} ${member.lastName}`.trim();
  }, [member]);

  useEffect(() => {
    if (!member || !isOpen) return;
    setChannel("email");
    setSubject(`A note from Spartan Stack`);
    setMessage(`Hi ${member.firstName},\n\n`);
  }, [member, isOpen]);

  if (!member) return null;

  const emailAvailable = Boolean(member.email?.trim());
  const textAvailable = Boolean(cleanPhone(member.phone));
  const destination = channel === "email" ? member.email : member.phone || "No mobile number on file";

  const handleChannelChange = (nextChannel: Channel) => {
    setChannel(nextChannel);
    if (nextChannel === "text") setSubject("");
  };

  const handleOpenComposer = () => {
    if (channel === "email") {
      if (!emailAvailable) {
        toast.error("This member does not have an email address on file.");
        return;
      }
      const url = `mailto:${encodeURIComponent(member.email)}?subject=${encodeURIComponent(subject.trim())}&body=${encodeURIComponent(message)}`;
      window.location.assign(url);
      toast.success("Email draft opened in your mail application.");
      return;
    }

    const phone = cleanPhone(member.phone);
    if (!phone) {
      toast.error("Add a mobile number before sending a text.");
      return;
    }
    window.location.assign(`sms:${phone}?body=${encodeURIComponent(message)}`);
    toast.success("Text draft opened in your messaging application.");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg overflow-hidden border border-[#ded4c3] bg-[#fffdf9] p-0 text-slate-800 shadow-2xl rounded-2xl">
        <div className="bg-gradient-to-r from-[#100e0e] via-[#2b1715] to-[#100e0e] px-6 py-5 text-white">
          <DialogHeader className="gap-0 text-left">
            <div className="flex items-center gap-3">
              <img
                src={member.avatarUrl || fallbackPhoto}
                alt={`${memberName} profile`}
                className="h-12 w-12 rounded-xl border-2 border-[#d3aa54] object-cover shadow-lg"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <DialogTitle className="truncate text-lg font-extrabold text-white">Message {memberName}</DialogTitle>
                  {member.rank && <span className="hidden rounded-full border border-[#d3aa54]/50 bg-[#d3aa54]/15 px-2 py-0.5 text-[10px] font-bold text-[#f0deb4] sm:inline">{member.rank}</span>}
                </div>
                <DialogDescription className="mt-1 text-xs text-slate-300">Choose a channel, personalize the message, and review it in your own communication app.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="space-y-5 p-6">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#f1efea] p-1.5">
            <button
              type="button"
              onClick={() => handleChannelChange("email")}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                channel === "email" ? "bg-[#9d2025] text-white shadow-sm" : "text-slate-600 hover:bg-white"
              }`}
            >
              <Mail className="h-4 w-4" /> Email
            </button>
            <button
              type="button"
              onClick={() => handleChannelChange("text")}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                channel === "text" ? "bg-[#9d2025] text-white shadow-sm" : "text-slate-600 hover:bg-white"
              }`}
            >
              <MessageCircle className="h-4 w-4" /> Text message
            </button>
          </div>

          <div className="rounded-xl border border-[#e4ddd2] bg-white p-3.5">
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Recipient</span>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              {channel === "email" ? <Mail className="h-4 w-4 text-[#9d2025]" /> : <Phone className="h-4 w-4 text-[#9d2025]" />}
              <span className="truncate">{destination}</span>
            </div>
          </div>

          {channel === "email" && (
            <div className="space-y-1.5">
              <label htmlFor="communication-subject" className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Subject</label>
              <Input
                id="communication-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Message subject"
                className="h-9 border-[#ded4c3] bg-white text-xs focus-visible:ring-[#9d2025]"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="communication-message" className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Message</label>
            <Textarea
              id="communication-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={`Write a message to ${member.firstName}...`}
              className="min-h-32 resize-none border-[#ded4c3] bg-white text-sm leading-6 focus-visible:ring-[#9d2025]"
            />
            <p className="text-[10px] text-slate-400">Your communication application opens with this draft; nothing sends automatically from Spartan Stack.</p>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-[#e8d6aa] bg-[#fdf8eb] px-3 py-2.5 text-[10px] leading-4 text-[#76521d]">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>Direct-contact mode protects member information by handing the message to your selected mail or text application for final review.</span>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[#eee9df] pt-4">
            <Button variant="outline" onClick={onClose} className="h-9 border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50">Cancel</Button>
            <Button
              onClick={handleOpenComposer}
              disabled={channel === "email" ? !emailAvailable : !textAvailable}
              className="h-9 bg-[#9d2025] px-4 text-xs font-bold text-white hover:bg-[#74171b] disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Send className="mr-1.5 h-3.5 w-3.5" />
              {channel === "email" ? "Open Email Draft" : "Open Text Draft"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
