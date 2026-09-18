import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  Send,
  Shield,
  User,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CommunicationMember } from "./MemberCommunicationDialog";

interface MessagesWorkspaceViewProps {
  orgId: number;
  orgName: string;
  onComposeMessage: (member: CommunicationMember) => void;
}

export default function MessagesWorkspaceView({
  orgId,
  orgName,
  onComposeMessage,
}: MessagesWorkspaceViewProps) {
  const [selectedChannel, setSelectedChannel] = useState<"all" | "email" | "text">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const { data: logs, isLoading, refetch } = trpc.communication.list.useQuery({
    orgId,
    channel: selectedChannel === "all" ? undefined : selectedChannel,
  });

  const { data: membersList } = trpc.member.list.useQuery({ orgId });

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    if (!searchQuery.trim()) return logs;

    const q = searchQuery.toLowerCase().trim();
    return logs.filter(
      (item) =>
        item.memberFirstName.toLowerCase().includes(q) ||
        item.memberLastName.toLowerCase().includes(q) ||
        item.recipient.toLowerCase().includes(q) ||
        (item.subject && item.subject.toLowerCase().includes(q)) ||
        item.message.toLowerCase().includes(q) ||
        item.memberRank.toLowerCase().includes(q)
    );
  }, [logs, searchQuery]);

  const activeLog = useMemo(() => {
    if (!filteredLogs || filteredLogs.length === 0) return null;
    if (selectedLogId !== null) {
      const found = filteredLogs.find((l) => l.id === selectedLogId);
      if (found) return found;
    }
    return filteredLogs[0];
  }, [filteredLogs, selectedLogId]);

  const emailCount = useMemo(() => logs?.filter((l) => l.channel === "email").length || 0, [logs]);
  const textCount = useMemo(() => logs?.filter((l) => l.channel === "text").length || 0, [logs]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-[#ded4c3] bg-gradient-to-r from-[#100e0e] via-[#2a1715] to-[#100e0e] p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#d3aa54] text-xs font-bold uppercase tracking-widest">
            <MessageSquare className="w-4 h-4" />
            Communication Channels & Outreach
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Messages & Member Outreach
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-300 max-w-2xl">
            Keep up with every communication initiated from Spartan Stack. Review prepared email and text messages, recipient details, and message logs for {orgName}.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <Button
            variant="outline"
            onClick={() => refetch()}
            className="h-9 border-[#5f4e39] bg-white/5 text-white hover:bg-white/10 text-xs font-bold"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>
          {membersList && membersList.length > 0 && (
            <Button
              onClick={() => onComposeMessage(membersList[0])}
              className="h-9 bg-[#9d2025] hover:bg-[#74171b] text-white text-xs font-bold shadow-md"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Compose New Message
            </Button>
          )}
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Handoffs</span>
            <div className="mt-1 text-2xl font-black text-slate-900">{logs?.length || 0}</div>
            <p className="text-[10px] text-slate-500 mt-0.5">Recorded administrator outreach</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-[#f7f6f3] border border-slate-200 flex items-center justify-center text-[#9d2025]">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Email Drafts</span>
            <div className="mt-1 text-2xl font-black text-slate-900">{emailCount}</div>
            <p className="text-[10px] text-slate-500 mt-0.5">Opened in mail client</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
            <Mail className="w-5 h-5" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Text Message Drafts</span>
            <div className="mt-1 text-2xl font-black text-slate-900">{textCount}</div>
            <p className="text-[10px] text-slate-500 mt-0.5">Opened in SMS messaging client</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-[#9d2025]">
            <MessageCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Outreach Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Filterable List */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[580px]">
          {/* Controls Bar */}
          <div className="p-4 border-b border-slate-100 space-y-3 bg-[#faf9f6]">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <Input
                placeholder="Search messages, members, recipients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-white text-xs border-slate-200 focus-visible:ring-[#9d2025]"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedChannel("all")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                  selectedChannel === "all"
                    ? "bg-[#9d2025] text-white border-[#9d2025] shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                All ({logs?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setSelectedChannel("email")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg border flex items-center justify-center gap-1 transition-all ${
                  selectedChannel === "email"
                    ? "bg-[#9d2025] text-white border-[#9d2025] shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                Email ({emailCount})
              </button>
              <button
                type="button"
                onClick={() => setSelectedChannel("text")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg border flex items-center justify-center gap-1 transition-all ${
                  selectedChannel === "text"
                    ? "bg-[#9d2025] text-white border-[#9d2025] shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Text ({textCount})
              </button>
            </div>
          </div>

          {/* List Items */}
          <div className="divide-y divide-slate-100 overflow-y-auto max-h-[500px] flex-1">
            {isLoading ? (
              <div className="p-8 text-center space-y-2 text-slate-400">
                <div className="w-6 h-6 border-2 border-[#9d2025] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-semibold">Loading communication logs...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">No message records found</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    Click any member photo in the tree, roster, or master list to open a draft and log outreach.
                  </p>
                </div>
              </div>
            ) : (
              filteredLogs.map((log) => {
                const isSelected = activeLog?.id === log.id;
                return (
                  <button
                    key={log.id}
                    type="button"
                    onClick={() => setSelectedLogId(log.id)}
                    className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 hover:bg-slate-50 ${
                      isSelected ? "bg-[#fbf7ee] border-l-4 border-l-[#9d2025]" : ""
                    }`}
                  >
                    <Avatar className="w-10 h-10 border border-slate-200 shrink-0 mt-0.5">
                      <AvatarImage src={log.memberAvatarUrl || undefined} />
                      <AvatarFallback className="bg-slate-100 text-slate-700 font-bold text-xs">
                        {log.memberFirstName[0]}
                        {log.memberLastName[0]}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-extrabold text-slate-900 truncate">
                          {log.memberFirstName} {log.memberLastName}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {new Date(log.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold ${
                            log.channel === "email"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-red-100 text-[#9d2025]"
                          }`}
                        >
                          {log.channel === "email" ? (
                            <Mail className="w-2.5 h-2.5" />
                          ) : (
                            <MessageCircle className="w-2.5 h-2.5" />
                          )}
                          {log.channel === "email" ? "Email" : "Text"}
                        </span>
                        <span className="text-[10px] text-slate-500 truncate">{log.recipient}</span>
                      </div>

                      <p className="mt-1.5 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {log.subject ? <strong className="font-semibold text-slate-800">{log.subject} — </strong> : null}
                        {log.message}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Selected Message Detail & Member Context */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 min-h-[580px] flex flex-col justify-between">
          {activeLog ? (
            <div className="space-y-6">
              {/* Member Card & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <Avatar className="w-14 h-14 border-2 border-[#d3aa54] shadow-sm">
                    <AvatarImage src={activeLog.memberAvatarUrl || undefined} />
                    <AvatarFallback className="bg-slate-900 text-white font-bold text-sm">
                      {activeLog.memberFirstName[0]}
                      {activeLog.memberLastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-slate-950">
                        {activeLog.memberFirstName} {activeLog.memberLastName}
                      </h2>
                      <span className="rounded-full border border-slate-200 bg-[#f7f6f3] px-2.5 py-0.5 text-[10px] font-bold text-slate-700">
                        {activeLog.memberRank}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Recipient target: <span className="font-semibold text-slate-700">{activeLog.recipient}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() =>
                      onComposeMessage({
                        id: activeLog.memberId,
                        firstName: activeLog.memberFirstName,
                        lastName: activeLog.memberLastName,
                        email: activeLog.channel === "email" ? activeLog.recipient : "",
                        phone: activeLog.channel === "text" ? activeLog.recipient : "",
                        avatarUrl: activeLog.memberAvatarUrl,
                        rank: activeLog.memberRank,
                      })
                    }
                    className="h-9 bg-[#9d2025] hover:bg-[#74171b] text-white text-xs font-bold shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    Message Again
                  </Button>
                </div>
              </div>

              {/* Message Meta Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl bg-[#faf9f6] border border-slate-200/80 p-3.5 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Channel</span>
                  <span className="font-extrabold text-slate-800 capitalize flex items-center gap-1 mt-0.5">
                    {activeLog.channel === "email" ? <Mail className="w-3 h-3 text-[#9d2025]" /> : <MessageCircle className="w-3 h-3 text-[#9d2025]" />}
                    {activeLog.channel === "email" ? "Email Message" : "Direct Text"}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Initiated By</span>
                  <span className="font-extrabold text-slate-800 mt-0.5 block truncate">
                    {activeLog.initiatedBy || "Lead Matrix Architect"}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Date & Time</span>
                  <span className="font-extrabold text-slate-800 mt-0.5 block">
                    {new Date(activeLog.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Status</span>
                  <span className="font-extrabold text-emerald-700 flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Draft Handed Off
                  </span>
                </div>
              </div>

              {/* Message Payload Body */}
              <div className="space-y-2">
                {activeLog.subject && (
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Subject</span>
                    <p className="mt-1 text-sm font-bold text-slate-900">{activeLog.subject}</p>
                  </div>
                )}

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Message Content</span>
                  <div className="mt-2 text-sm leading-relaxed text-slate-800 whitespace-pre-wrap font-sans bg-[#fffdfa] p-4 rounded-lg border border-amber-100/60">
                    {activeLog.message}
                  </div>
                </div>
              </div>

              {/* Safeguard Notice */}
              <div className="flex items-start gap-2.5 rounded-xl border border-[#e8d6aa] bg-[#fdf8eb] p-3 text-[11px] leading-5 text-[#76521d]">
                <Shield className="w-4 h-4 shrink-0 mt-0.5 text-[#d3aa54]" />
                <div>
                  <span className="font-bold">Security Notice: </span>
                  Spartan Stack logs the drafted message and recipient for internal accountability. Outgoing messages are dispatched through your local mail or SMS client.
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center text-slate-400 space-y-2">
              <MessageSquare className="w-10 h-10 text-slate-300" />
              <p className="text-sm font-bold text-slate-600">Select a message from the list</p>
              <p className="text-xs text-slate-400 max-w-sm">
                Choose any item on the left to inspect its complete text, recipient target, and handoff timestamp.
              </p>
            </div>
          )}

          {/* Quick Roster Outreach bar */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Direct member outreach is available from all member profile photos.</span>
            <span className="font-semibold text-slate-700">Spartan Stack v2.1</span>
          </div>
        </div>
      </div>
    </div>
  );
}
