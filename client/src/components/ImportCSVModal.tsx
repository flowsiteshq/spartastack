import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { FileSpreadsheet, Upload, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ImportCSVModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: number;
  onSuccess: () => void;
}

const SAMPLE_CSV = `FirstName,LastName,Email,Phone,Rank,PV
Cassandra,Vance,cassandra.v@apexhorizon.org,+1 (555) 321-4321,Associate,150
Gregory,House,gregory.h@apexhorizon.org,+1 (555) 432-5432,Bronze Builder,220
Elena,Rostova,elena.r@apexhorizon.org,+1 (555) 543-6543,Silver Associate,280
Marcus,Brody,marcus.b@apexhorizon.org,+1 (555) 654-7654,Associate,110`;

export default function ImportCSVModal({
  isOpen,
  onClose,
  orgId,
  onSuccess,
}: ImportCSVModalProps) {
  const [csvText, setCsvText] = useState(SAMPLE_CSV);
  const utils = trpc.useUtils();

  const bulkImportMutation = trpc.member.bulkImport.useMutation({
    onSuccess: (res) => {
      toast.success(`Successfully imported ${res.importedCount} members into master directory`);
      utils.member.list.invalidate();
      utils.activity.list.invalidate();
      onSuccess();
      onClose();
    },
    onError: (err) => {
      toast.error("Import error", { description: err.message });
    },
  });

  const handleImport = () => {
    const lines = csvText.trim().split("\n");
    if (lines.length <= 1) {
      toast.error("CSV text is empty or missing data rows");
      return;
    }

    const membersToCreate: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
      if (cols.length >= 3 && cols[0] && cols[1] && cols[2]) {
        membersToCreate.push({
          firstName: cols[0],
          lastName: cols[1],
          email: cols[2],
          phone: cols[3] || undefined,
          rank: cols[4] || "Associate",
          personalVolume: cols[5] ? Number(cols[5]) : 100,
          avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80",
        });
      }
    }

    if (membersToCreate.length === 0) {
      toast.error("Could not parse valid member records from CSV");
      return;
    }

    bulkImportMutation.mutate({
      orgId,
      members: membersToCreate,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg bg-white border border-slate-200 text-slate-800 p-6 shadow-2xl rounded-2xl">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider">
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            <span>Batch Member Ingestion</span>
          </div>
          <DialogTitle className="text-xl font-bold font-sans text-slate-900 mt-1">
            Import Members via CSV
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 font-sans mt-0.5">
            Paste comma-separated rows or review the sample template below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">
            CSV FORMAT: FirstName, LastName, Email, Phone, Rank, PV
          </div>
          <Textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            className="font-mono text-xs h-40 bg-slate-50 border-slate-200"
          />
        </div>

        <DialogFooter className="border-t border-slate-100 pt-4 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-sans"
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={bulkImportMutation.isPending}
            className="bg-[#1d70f5] hover:bg-blue-600 text-white font-bold text-xs uppercase tracking-wider font-sans px-4 h-9 flex items-center gap-2 shadow-sm"
          >
            <Upload className="w-4 h-4" />
            <span>{bulkImportMutation.isPending ? "Importing..." : "Process Import"}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
