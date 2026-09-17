import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Activity, Clock, FileText, User } from "lucide-react";

interface ActivityLogDrawerProps {
  orgId: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function ActivityLogDrawer({ orgId, isOpen, onClose }: ActivityLogDrawerProps) {
  const { data: logs, isLoading } = trpc.activity.list.useQuery(
    { orgId, limit: 50 },
    { enabled: isOpen }
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg bg-white border border-slate-200 text-slate-800 p-6 shadow-2xl rounded-2xl">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider">
            <Activity className="w-4 h-4 text-blue-600" />
            <span>Audit Trail & Activity Log</span>
          </div>
          <DialogTitle className="text-xl font-bold font-sans text-slate-900 mt-1">
            Organizational Changes History
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 font-sans mt-0.5">
            Chronological record of downline placements, locks, randomizations, and member edits.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-96 overflow-y-auto space-y-3 py-2 pr-1">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading activity records...</div>
          ) : !logs || logs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">No activity recorded yet.</div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3 text-xs"
              >
                <div className="w-2 h-2 rounded-full bg-[#1d70f5] mt-1.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900 leading-snug">{log.action}</div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      {log.user}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
