import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  CheckCircle2,
  Clock,
  Download,
  Edit,
  Filter,
  Mail,
  MoreVertical,
  Phone,
  Plus,
  Search,
  Trash2,
  Upload,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Member } from "../../../drizzle/schema";
import { MemberWithPlacement } from "../../../server/db";

interface MembersManagerViewProps {
  orgId: number;
  onOpenEnrollModal: () => void;
  onOpenImportCSVModal: () => void;
  onEditMember: (member: Member) => void;
  onViewInTree: () => void;
}

export default function MembersManagerView({
  orgId,
  onOpenEnrollModal,
  onOpenImportCSVModal,
  onEditMember,
  onViewInTree,
}: MembersManagerViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "unplaced" | "placed">("all");
  const [rankFilter, setRankFilter] = useState("all");

  const utils = trpc.useUtils();

  const { data: members, isLoading } = trpc.member.list.useQuery({
    orgId,
    search: searchTerm || undefined,
    status: statusFilter,
    rank: rankFilter !== "all" ? rankFilter : undefined,
  });

  const deleteMutation = trpc.member.delete.useMutation({
    onSuccess: () => {
      toast.info("Member record deleted");
      utils.member.list.invalidate();
      utils.matrix.getTree.invalidate();
      utils.matrix.getOpenSlots.invalidate();
    },
  });

  const unstackMutation = trpc.matrix.unstack.useMutation({
    onSuccess: () => {
      toast.success("Member unstacked back to master unplaced pool");
      utils.member.list.invalidate();
      utils.matrix.getTree.invalidate();
      utils.matrix.getOpenSlots.invalidate();
    },
  });

  const handleExportCSV = () => {
    if (!members || members.length === 0) {
      toast.error("No members to export");
      return;
    }
    const headers = ["ID", "First Name", "Last Name", "Email", "Phone", "Rank", "PV", "Status", "Placed", "Coordinate"];
    const rows = members.map((m) => [
      m.id,
      `"${m.firstName}"`,
      `"${m.lastName}"`,
      `"${m.email}"`,
      `"${m.phone || ""}"`,
      `"${m.rank}"`,
      m.personalVolume,
      m.status,
      m.isPlaced ? "Yes" : "No",
      `"${m.slotCoordinate || "Unplaced"}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `MemberStack_Roster_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Exported members CSV file");
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Toolbar Card */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#1d70f5] uppercase tracking-wider">
            <Users className="w-4 h-4 text-[#1d70f5]" />
            <span>Central Distributor Directory</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 mt-1">Master Member Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Maintain member profiles, contact data, performance volumes, and placement statuses.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={onOpenEnrollModal}
            className="bg-[#1d70f5] hover:bg-blue-600 text-white font-bold text-xs h-9 px-4 rounded-lg shadow-sm flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Member</span>
          </Button>
          <Button
            onClick={onOpenImportCSVModal}
            variant="outline"
            className="border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs h-9 px-3.5 rounded-lg flex items-center gap-1.5"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            <span>Import CSV</span>
          </Button>
          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs h-9 px-3.5 rounded-lg flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-semibold">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-md transition-all ${
              statusFilter === "all" ? "bg-white text-slate-900 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Members
          </button>
          <button
            onClick={() => setStatusFilter("unplaced")}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              statusFilter === "unplaced" ? "bg-white text-amber-700 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Available (Unplaced)</span>
          </button>
          <button
            onClick={() => setStatusFilter("placed")}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              statusFilter === "placed" ? "bg-white text-emerald-700 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Stacked in Chart</span>
          </button>
        </div>

        {/* Search & Rank Filter */}
        <div className="flex items-center gap-2 flex-1 sm:flex-initial min-w-[260px]">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <Input
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs bg-slate-50 border-slate-200"
            />
          </div>
          <Select value={rankFilter} onValueChange={(v) => setRankFilter(v)}>
            <SelectTrigger className="w-36 h-8 text-xs bg-slate-50 border-slate-200">
              <SelectValue placeholder="All Ranks" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="all">All Ranks</SelectItem>
              <SelectItem value="Associate">Associate</SelectItem>
              <SelectItem value="Bronze Builder">Bronze Builder</SelectItem>
              <SelectItem value="Silver Associate">Silver Associate</SelectItem>
              <SelectItem value="Gold Leader">Gold Leader</SelectItem>
              <SelectItem value="Diamond Executive">Diamond Executive</SelectItem>
              <SelectItem value="Crown Director">Crown Director</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table of Members */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Rank / Title</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Personal Volume</th>
                <th className="py-3 px-4">Chart Placement</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    Loading directory records...
                  </td>
                </tr>
              ) : !members || members.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    No members found.
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Photo + Name */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            m.avatarUrl ||
                            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&h=100&q=80"
                          }
                          alt=""
                          className="w-9 h-9 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <span className="font-bold text-slate-900 block">
                            {m.firstName} {m.lastName}
                          </span>
                          <span className="text-[10px] text-slate-400">ID #{m.id}</span>
                        </div>
                      </div>
                    </td>

                    {/* Rank */}
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#1d70f5] border border-blue-100">
                        {m.rank}
                      </span>
                    </td>

                    {/* Contact */}
                    <td className="py-3 px-4 text-slate-600">
                      <div className="space-y-0.5">
                        <div className="truncate max-w-[180px]">{m.email}</div>
                        {m.phone && <div className="text-[10px] text-slate-400">{m.phone}</div>}
                      </div>
                    </td>

                    {/* PV */}
                    <td className="py-3 px-4 font-bold text-slate-800">{m.personalVolume} PV</td>

                    {/* Placement Status */}
                    <td className="py-3 px-4">
                      {m.isPlaced ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>{m.slotCoordinate || "Placed"}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>Available</span>
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {m.isPlaced ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={onViewInTree}
                            className="h-7 text-xs text-[#1d70f5] font-bold"
                          >
                            View in Tree
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={onViewInTree}
                            className="h-7 text-xs text-[#1d70f5] border-blue-200 font-bold"
                          >
                            Assign Slot
                          </Button>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700">
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="text-xs">
                            <DropdownMenuItem onClick={() => onEditMember(m)} className="cursor-pointer">
                              <Edit className="w-3.5 h-3.5 mr-2 text-slate-500" />
                              Edit Member
                            </DropdownMenuItem>
                            {m.isPlaced && m.placementId && (
                              <DropdownMenuItem
                                onClick={() => unstackMutation.mutate({ placementId: m.placementId! })}
                                className="cursor-pointer text-amber-600"
                              >
                                <UserMinus className="w-3.5 h-3.5 mr-2" />
                                Unstack from Tree
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => {
                                if (confirm(`Delete member ${m.firstName} ${m.lastName}?`)) {
                                  deleteMutation.mutate({ id: m.id });
                                }
                              }}
                              className="cursor-pointer text-red-600"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" />
                              Delete Record
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
