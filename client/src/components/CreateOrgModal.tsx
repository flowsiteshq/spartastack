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
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Building2, Layers, Shield } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface CreateOrgModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newOrg: any) => void;
}

export default function CreateOrgModal({ isOpen, onClose, onCreated }: CreateOrgModalProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [blueprintCode, setBlueprintCode] = useState("CAD-3X5-V2");

  const utils = trpc.useUtils();

  const createMutation = trpc.org.create.useMutation({
    onSuccess: (org) => {
      toast.success(`Organization ${org.name} initialized with 3×5 matrix architecture`);
      utils.org.list.invalidate();
      onCreated(org);
      onClose();
      setName("");
      setCode("");
      setDescription("");
    },
    onError: (err) => {
      toast.error("Failed to create organization", { description: err.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      toast.error("Organization name and unique code are required");
      return;
    }
    createMutation.mutate({
      name,
      code,
      description,
      blueprintCode,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-[#0a1e38] border border-cyan-400/40 text-white p-6 shadow-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="border-b border-white/10 pb-3">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-300 uppercase tracking-widest">
              <Building2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Network Architecture Provisioning</span>
            </div>
            <DialogTitle className="text-xl font-bold font-display text-white mt-1">
              Provision New MLM Organization
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-300 font-mono">
              Initializes an independent database partition with 3×5 matrix constraints.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-[11px] font-mono text-slate-300 uppercase block mb-1">
                ORGANIZATION NAME *
              </label>
              <Input
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!code) {
                    setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "-").slice(0, 16));
                  }
                }}
                placeholder="e.g. Horizon Premier Alliance"
                className="h-9 bg-[#07172c] border-white/20 text-white text-xs font-sans"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-300 uppercase block mb-1">
                NETWORK IDENTIFIER CODE *
              </label>
              <Input
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. HORIZON-ALLIANCE"
                className="h-9 bg-[#07172c] border-white/20 text-white text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-300 uppercase block mb-1">
                BLUEPRINT CAD SPECIFICATION CODE
              </label>
              <Input
                value={blueprintCode}
                onChange={(e) => setBlueprintCode(e.target.value)}
                placeholder="CAD-3X5-V2"
                className="h-9 bg-[#07172c] border-white/20 text-white text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-300 uppercase block mb-1">
                DESCRIPTION / MISSION
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Network focus, commission matrix overview, compensation plan..."
                className="bg-[#07172c] border-white/20 text-white text-xs font-sans resize-none h-16"
              />
            </div>

            <div className="p-3 rounded bg-[#07172c] border border-cyan-400/20 text-[10px] font-mono text-slate-300 space-y-1">
              <div className="text-cyan-300 font-bold uppercase">PRE-CONFIGURED MATRIX SPECS:</div>
              <div className="flex justify-between">
                <span>Branching Factor:</span> <span className="text-white">3 Direct Legs per node</span>
              </div>
              <div className="flex justify-between">
                <span>Depth Boundary:</span> <span className="text-white">5 Matrix Tiers (364 capacity)</span>
              </div>
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
              disabled={createMutation.isPending}
              className="bg-cyan-500 hover:bg-cyan-400 text-[#07192f] font-bold text-xs uppercase tracking-wider font-mono px-4 h-9"
            >
              {createMutation.isPending ? "Creating..." : "Provision Organization"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
