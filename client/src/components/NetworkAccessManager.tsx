import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Crown, Eye, LockKeyhole, ShieldCheck, UserCheck, UserX, Users } from "lucide-react";
import { toast } from "sonner";

const fallbackPhoto = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&h=160&q=80";

type NetworkAccessManagerProps = { orgId: number };

export default function NetworkAccessManager({ orgId }: NetworkAccessManagerProps) {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.network.ownerAccess.useQuery({ orgId }, { enabled: Boolean(orgId) });

  const updateMutation = trpc.network.updateMemberAccess.useMutation({
    onSuccess: () => {
      toast.success("Member network visibility updated.");
      utils.network.ownerAccess.invalidate({ orgId });
    },
    onError: (error) => toast.error("Unable to update access", { description: error.message }),
  });

  if (isLoading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6 text-xs text-slate-400">Checking organization creator privileges...</div>;
  }

  if (!data?.isOwner) {
    return (
      <div className="rounded-xl border border-slate-200 bg-[#faf9f6] p-5 text-xs text-slate-500">
        <div className="flex items-start gap-3">
          <LockKeyhole className="h-4 w-4 shrink-0 text-slate-400" />
          <div>
            <p className="font-bold text-slate-700">Network member privileges</p>
            <p className="mt-1 leading-5">Only the organization creator can approve phone-match requests or grant full-network visibility. Your administrator access does not override this creator-only safeguard.</p>
          </div>
        </div>
      </div>
    );
  }

  const pending = data.memberships.filter((member) => member.status === "pending");
  const active = data.memberships.filter((member) => member.status === "active");

  return (
    <section className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-5">
      <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#9d2025]"><Crown className="h-4 w-4" />Creator-only member access</div>
          <h2 className="mt-1 text-base font-extrabold text-slate-900">Network Visibility & Join Requests</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">Approve verified phone matches and decide whether each member sees only their direct relationships or the full organizational tree. Full view does not grant administrator control.</p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[#d3aa54]/45 bg-[#fdf8eb] px-2.5 py-1 text-[10px] font-bold text-[#76521d]"><ShieldCheck className="h-3.5 w-3.5" />Organization creator</span>
      </div>

      {pending.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-800"><UserCheck className="h-4 w-4" />Pending phone-match requests ({pending.length})</div>
          <div className="divide-y overflow-hidden rounded-xl border border-amber-200 bg-amber-50/40">
            {pending.map((record) => <MembershipRow key={record.id} record={record} updateMutation={updateMutation} />)}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700"><Users className="h-4 w-4 text-[#9d2025]" />Active member portal access ({active.length})</div>
        {active.length ? <div className="divide-y overflow-hidden rounded-xl border border-slate-200">{active.map((record) => <MembershipRow key={record.id} record={record} updateMutation={updateMutation} />)}</div> : <div className="rounded-xl border border-dashed border-slate-300 bg-[#faf9f6] p-5 text-center text-xs text-slate-500">No active member portal accounts yet. New members can join from the Google sign-in screen using their email or phone match.</div>}
      </div>
    </section>
  );
}

function MembershipRow({ record, updateMutation }: { record: any; updateMutation: any }) {
  const memberName = `${record.memberFirstName} ${record.memberLastName}`;
  const isPending = record.status === "pending";
  const isFull = record.accessLevel === "full";

  return (
    <div className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="h-10 w-10 border border-[#d3aa54]/60"><AvatarImage src={record.memberAvatarUrl || fallbackPhoto} /><AvatarFallback className="bg-[#100e0e] text-xs text-white">{record.memberFirstName?.[0]}{record.memberLastName?.[0]}</AvatarFallback></Avatar>
        <div className="min-w-0">
          <div className="flex items-center gap-2"><p className="truncate text-xs font-extrabold text-slate-900">{memberName}</p><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-600">{record.memberRank}</span></div>
          <p className="mt-0.5 truncate text-[10px] text-slate-500">Signed in as {record.userEmail || record.userName || "Verified Google user"} · matched by {record.matchMethod}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {isPending ? (
          <>
            <Button size="sm" disabled={updateMutation.isPending} onClick={() => updateMutation.mutate({ orgId: record.orgId, membershipId: record.id, status: "active", accessLevel: "limited" })} className="h-8 bg-[#9d2025] px-3 text-[10px] font-bold text-white hover:bg-[#74171b]"><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Approve limited</Button>
            <Button size="sm" variant="outline" disabled={updateMutation.isPending} onClick={() => updateMutation.mutate({ orgId: record.orgId, membershipId: record.id, status: "revoked" })} className="h-8 border-red-200 px-3 text-[10px] font-bold text-red-600 hover:bg-red-50"><UserX className="mr-1 h-3.5 w-3.5" />Decline</Button>
          </>
        ) : (
          <>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-bold ${isFull ? "border-[#d3aa54]/60 bg-[#fdf8eb] text-[#76521d]" : "border-slate-200 bg-slate-50 text-slate-600"}`}>{isFull ? <Eye className="h-3 w-3" /> : <LockKeyhole className="h-3 w-3" />}{isFull ? "Full view" : "Limited view"}</span>
            <Button size="sm" variant="outline" disabled={updateMutation.isPending} onClick={() => updateMutation.mutate({ orgId: record.orgId, membershipId: record.id, accessLevel: isFull ? "limited" : "full" })} className="h-8 border-[#9d2025]/25 px-3 text-[10px] font-bold text-[#9d2025] hover:bg-[#f8ebe9]">{isFull ? "Set limited" : "Grant full view"}</Button>
            <Button size="sm" variant="ghost" disabled={updateMutation.isPending} onClick={() => updateMutation.mutate({ orgId: record.orgId, membershipId: record.id, status: "revoked" })} className="h-8 px-2 text-[10px] font-bold text-slate-500 hover:bg-red-50 hover:text-red-600">Revoke</Button>
          </>
        )}
      </div>
    </div>
  );
}
