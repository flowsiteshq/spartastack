import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  Search,
  Upload,
  UserPlus,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { MemberWithPlacement } from "../../../server/db";

interface MasterListDrawerProps {
  members: MemberWithPlacement[];
  selectedMemberId: number | null;
  onSelectMember: (memberId: number) => void;
  onQuickAddMemberToTree: (member: MemberWithPlacement) => void;
  onOpenAddMemberModal: () => void;
  onOpenImportCSVModal: () => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export default function MasterListDrawer({
  members,
  selectedMemberId,
  onSelectMember,
  onQuickAddMemberToTree,
  onOpenAddMemberModal,
  onOpenImportCSVModal,
  isOpen,
  onToggleOpen,
}: MasterListDrawerProps) {
  const [activeTab, setActiveTab] = useState<"master" | "details">("master");
  const [searchTerm, setSearchTerm] = useState("");

  // Filter unplaced members first for quick stacking, but allow searching all
  const unplacedMembers = useMemo(() => {
    let list = members.filter((m) => !m.isPlaced);
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = members.filter(
        (m) =>
          m.firstName.toLowerCase().includes(q) ||
          m.lastName.toLowerCase().includes(q) ||
          m.rank.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q)
      );
    }
    return list;
  }, [members, searchTerm]);

  if (!isOpen) {
    return (
      <div className="fixed right-0 top-20 z-30">
        <button
          onClick={onToggleOpen}
          className="bg-white border-l border-y border-slate-300 rounded-l-xl p-2.5 shadow-md text-slate-600 hover:text-[#1d70f5] flex items-center gap-1.5 text-xs font-bold transition-all"
          title="Open Master Member List"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Master List</span>
        </button>
      </div>
    );
  }

  return (
    <aside className="w-72 sm:w-80 bg-white border-l border-slate-200/90 flex flex-col justify-between h-[calc(100vh-4rem)] sticky top-16 shadow-lg z-30 flex-shrink-0">
      {/* Header with Tabs: Master List | Member Details */}
      <div className="p-4 border-b border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          {/* Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setActiveTab("master")}
              className={`px-3 py-1 rounded-md transition-all ${
                activeTab === "master"
                  ? "bg-[#1d70f5] text-white shadow-sm font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Master List
            </button>
            <button
              onClick={() => setActiveTab("details")}
              className={`px-3 py-1 rounded-md transition-all ${
                activeTab === "details"
                  ? "bg-[#1d70f5] text-white shadow-sm font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Member Details
            </button>
          </div>

          {/* Collapse Arrow */}
          <button
            onClick={onToggleOpen}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Collapse Panel"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar + Filter Icon */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <Input
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-2 h-8 text-xs bg-slate-50 border-slate-200 rounded-lg placeholder:text-slate-400 focus:bg-white"
            />
          </div>
          <button
            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
            title="Filter by Rank"
          >
            <Filter className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Member Items Scrollable List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {unplacedMembers.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 space-y-2">
            <Users className="w-8 h-8 text-slate-300 mx-auto" />
            <p>No available unplaced members.</p>
            <Button
              onClick={onOpenAddMemberModal}
              variant="outline"
              size="sm"
              className="text-xs text-[#1d70f5] border-blue-200 hover:bg-blue-50"
            >
              + Add New Member
            </Button>
          </div>
        ) : (
          unplacedMembers.map((member) => (
            <div
              key={member.id}
              className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                selectedMemberId === member.id
                  ? "bg-blue-50/70 border-blue-300 shadow-sm"
                  : "bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm"
              }`}
            >
              {/* Member Avatar + Name + Title */}
              <div
                className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                onClick={() => onSelectMember(member.id)}
              >
                <img
                  src={
                    member.avatarUrl ||
                    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80"
                  }
                  alt={`${member.firstName} ${member.lastName}`}
                  className="w-9 h-9 rounded-full object-cover border border-slate-200 flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900 text-xs truncate leading-tight">
                    {member.firstName} {member.lastName}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium truncate">
                    {member.rank}
                  </div>
                </div>
              </div>

              {/* Blue [Add] Button matching mockup */}
              <Button
                size="sm"
                onClick={() => onQuickAddMemberToTree(member)}
                className="bg-[#1d70f5] hover:bg-blue-600 text-white font-bold text-xs h-7 px-3 rounded-lg shadow-sm flex items-center justify-center ml-2"
                title="Place into available chart position"
              >
                <span>Add</span>
              </Button>
            </div>
          ))
        )}
      </div>

      {/* Bottom Actions: [+ Add New Member] and [Import CSV] */}
      <div className="p-3 border-t border-slate-100 grid grid-cols-2 gap-2 bg-slate-50/60">
        <Button
          onClick={onOpenAddMemberModal}
          variant="outline"
          className="h-8 text-xs font-bold text-[#1d70f5] border-blue-200 hover:bg-blue-50 flex items-center justify-center gap-1.5 rounded-lg shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add New Member</span>
        </Button>
        <Button
          onClick={onOpenImportCSVModal}
          variant="outline"
          className="h-8 text-xs font-bold text-slate-700 border-slate-300 hover:bg-slate-100 flex items-center justify-center gap-1.5 rounded-lg shadow-sm"
        >
          <Upload className="w-3.5 h-3.5 text-slate-500" />
          <span>Import CSV</span>
        </Button>
      </div>
    </aside>
  );
}
