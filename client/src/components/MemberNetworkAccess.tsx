import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SpartanBrand from "@/components/SpartanBrand";
import { trpc } from "@/lib/trpc";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Crown,
  Eye,
  GitBranch,
  LockKeyhole,
  LogOut,
  Network,
  Phone,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type MemberNetworkAccessProps = {
  user: { name: string | null; email: string | null };
  onLogout: () => void;
};

const fallbackPhoto = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&h=160&q=80";

export default function MemberNetworkAccess({ user, onLogout }: MemberNetworkAccessProps) {
  const isForcedPortal =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("previewPortal") === "1";
  const { data: memberships, isLoading, refetch: refetchMemberships } = trpc.network.mine.useQuery();
  const activeMembership = memberships?.find((membership) => membership.status === "active") || null;

  if (isForcedPortal) {
    return <MemberNetworkPortal orgId={1} user={user} onLogout={onLogout} previewMock />;
  }

  if (isLoading) {
    return <NetworkLoading />;
  }

  if (activeMembership) {
    return <MemberNetworkPortal orgId={activeMembership.orgId} user={user} onLogout={onLogout} />;
  }

  return (
    <MemberNetworkJoin
      user={user}
      memberships={memberships || []}
      onJoined={() => refetchMemberships()}
      onLogout={onLogout}
    />
  );
}

function NetworkLoading() {
  return (
    <main className="min-h-screen bg-[#f7f6f3] flex items-center justify-center p-6">
      <div className="text-center space-y-3">
        <div className="mx-auto h-9 w-9 rounded-full border-[3px] border-[#9d2025] border-t-transparent animate-spin" />
        <p className="text-xs font-bold text-slate-600">Preparing secure network access...</p>
      </div>
    </main>
  );
}

function MemberNetworkJoin({
  user,
  memberships,
  onJoined,
  onLogout,
}: MemberNetworkAccessProps & { memberships: any[]; onJoined: () => void }) {
  const [phone, setPhone] = useState("");
  const [searchedPhone, setSearchedPhone] = useState("");
  const { data: emailMatches, isLoading: isEmailLoading } = trpc.network.emailMatches.useQuery();
  const { data: phoneMatches, isFetching: isPhoneFetching } = trpc.network.phoneMatches.useQuery(
    { phone: searchedPhone },
    { enabled: searchedPhone.replace(/\D/g, "").length >= 7 }
  );
  const joinByEmail = trpc.network.joinByEmail.useMutation({
    onSuccess: () => {
      toast.success("You have joined the network with limited member visibility.");
      onJoined();
    },
    onError: (error) => toast.error("Unable to join this network", { description: error.message }),
  });
  const requestByPhone = trpc.network.requestByPhone.useMutation({
    onSuccess: () => {
      toast.success("Access request sent to the organization creator for review.");
      onJoined();
    },
    onError: (error) => toast.error("No eligible phone match found", { description: error.message }),
  });

  const hasPending = memberships.some((membership) => membership.status === "pending");

  return (
    <main className="min-h-screen bg-[#f7f6f3] p-4 sm:p-8">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 pb-8">
        <SpartanBrand tone="light" />
        <Button variant="outline" onClick={onLogout} className="h-9 border-slate-300 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50">
          <LogOut className="mr-1.5 h-3.5 w-3.5" />
          Sign out
        </Button>
      </header>

      <section className="mx-auto grid max-w-6xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_28px_70px_-32px_rgba(15,23,42,0.34)] lg:grid-cols-[0.92fr_1.08fr]">
        <aside className="relative overflow-hidden bg-[#100e0e] px-7 py-9 text-white sm:px-10 lg:py-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_18%,rgba(211,170,84,0.2),transparent_35%),linear-gradient(145deg,#100e0e_0%,#321813_54%,#100e0e_100%)]" />
          <div className="relative flex h-full flex-col justify-between gap-14">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d3aa54]/35 bg-[#d3aa54]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#e9cc86]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Verified member access
              </div>
              <h1 className="mt-7 max-w-md text-3xl font-black leading-tight tracking-[-0.04em] sm:text-4xl">
                Join the network that already knows you.
              </h1>
              <p className="mt-4 max-w-md text-sm leading-6 text-slate-300">
                Spartan Stack matches your verified email or phone number to an existing member profile—so your place in the organization stays protected.
              </p>
            </div>

            <div className="space-y-3">
              {[
                ["Automatic email match", "Your verified Google email can activate a limited member view immediately."],
                ["Phone match with approval", "Phone matches are reviewed by the organization creator before access is granted."],
                ["Private-by-default visibility", "Limited access shows only you, your direct upline, and your direct downline."],
              ].map(([title, detail]) => (
                <div key={title} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#d3aa54]" />
                  <div>
                    <p className="text-xs font-bold text-white">{title}</p>
                    <p className="mt-1 text-[11px] leading-4 text-slate-300">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <div className="p-6 sm:p-9 lg:p-12">
          <div className="max-w-xl">
            <span className="text-xs font-bold uppercase tracking-widest text-[#9d2025]">Member network enrollment</span>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-slate-950">Do you want to join an existing network?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Signed in as <span className="font-bold text-slate-700">{user.email || user.name || "verified member"}</span>. Choose a matched organization below, or use the phone number from your member profile.
            </p>
          </div>

          <div className="mt-7 space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-[#faf9f6] p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <UserCheck className="h-4 w-4 text-[#9d2025]" />
                    Match through your verified Google email
                  </div>
                  <p className="mt-1 text-[11px] leading-5 text-slate-500">This option activates a restricted member account immediately after an exact email match.</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">Secure match</span>
              </div>

              <div className="mt-4 space-y-2">
                {isEmailLoading ? (
                  <div className="rounded-xl bg-white p-4 text-xs text-slate-400">Checking your verified email for existing network profiles...</div>
                ) : !emailMatches?.length ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-xs leading-5 text-slate-500">
                    No member profile is currently associated with this verified email. You can try your phone number below.
                  </div>
                ) : (
                  emailMatches.map((match) => (
                    <NetworkMatchCard
                      key={`${match.orgId}-${match.memberId}`}
                      match={match}
                      actionLabel="Join network"
                      onAction={() => joinByEmail.mutate({ orgId: match.orgId })}
                      isPending={joinByEmail.isPending}
                    />
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Phone className="h-4 w-4 text-[#9d2025]" />
                Match by phone number
              </div>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">For privacy, phone matches generate a pending request. The organization creator must approve it before you can view the network.</p>

              <div className="mt-3 flex gap-2">
                <Input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="Enter the phone number on your member profile"
                  className="h-10 border-slate-300 bg-[#faf9f6] text-xs focus-visible:ring-[#9d2025]"
                />
                <Button
                  type="button"
                  onClick={() => setSearchedPhone(phone)}
                  disabled={phone.replace(/\D/g, "").length < 7 || isPhoneFetching}
                  className="h-10 shrink-0 bg-[#9d2025] px-4 text-xs font-bold text-white hover:bg-[#74171b]"
                >
                  Find group
                </Button>
              </div>

              {searchedPhone && (
                <div className="mt-3 space-y-2">
                  {isPhoneFetching ? <p className="text-xs text-slate-400">Checking phone match...</p> : null}
                  {!isPhoneFetching && !phoneMatches?.length ? <p className="text-xs text-slate-500">No matching member record found for that phone number.</p> : null}
                  {phoneMatches?.map((match) => (
                    <NetworkMatchCard
                      key={`${match.orgId}-${match.memberId}`}
                      match={match}
                      actionLabel="Request access"
                      onAction={() => requestByPhone.mutate({ orgId: match.orgId, phone: searchedPhone })}
                      isPending={requestByPhone.isPending}
                    />
                  ))}
                </div>
              )}
            </div>

            {hasPending && (
              <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-950">
                <LockKeyhole className="h-4 w-4 shrink-0 text-amber-700" />
                <div>
                  <span className="font-bold">Approval pending.</span> The organization creator will review your phone-match request. You will see your network portal once access is approved.
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function NetworkMatchCard({ match, actionLabel, onAction, isPending }: { match: any; actionLabel: string; onAction: () => void; isPending: boolean }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="h-10 w-10 border border-[#d3aa54]/60">
          <AvatarImage src={match.memberAvatarUrl || fallbackPhoto} />
          <AvatarFallback className="bg-[#100e0e] text-xs font-bold text-white">{match.memberFirstName[0]}{match.memberLastName[0]}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-xs font-extrabold text-slate-900">{match.orgName}</p>
          <p className="mt-0.5 text-[10px] text-slate-500">Matched to {match.memberFirstName} {match.memberLastName} · {match.memberRank}</p>
        </div>
      </div>
      <Button onClick={onAction} disabled={isPending} className="h-8 bg-[#9d2025] px-3 text-[11px] font-bold text-white hover:bg-[#74171b]">
        {isPending ? "Connecting..." : actionLabel}
        <ChevronRight className="ml-1 h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function MemberNetworkPortal({ orgId, user, onLogout, previewMock }: MemberNetworkAccessProps & { orgId: number; previewMock?: boolean }) {
  const portalQuery = trpc.network.portal.useQuery({ orgId }, { enabled: !previewMock });
  const [fullNetworkOpen, setFullNetworkOpen] = useState(false);

  const mockData = useMemo(() => {
    if (!previewMock) return null;
    return {
      membership: { accessLevel: "limited", status: "active" },
      member: {
        id: 101,
        firstName: "Sarah",
        lastName: "Conway",
        rank: "Bronze Builder",
        personalVolume: 120,
        status: "active",
        avatarUrl: fallbackPhoto,
      },
      placement: { slotCoordinate: "Level 2 · Leg 1" },
      upline: {
        firstName: "DJ",
        lastName: "Sterling",
        rank: "Diamond Executive",
        avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&h=160&q=80",
      },
      downline: [
        {
          id: 201,
          firstName: "Hannah",
          lastName: "Abbott",
          rank: "Associate",
          avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=160&h=160&q=80",
        },
        {
          id: 202,
          firstName: "Emily",
          lastName: "Watson",
          rank: "Silver Associate",
          avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&h=160&q=80",
        },
      ],
      fullTree: null,
    };
  }, [previewMock]);

  const data = previewMock ? mockData : portalQuery.data;
  const isLoading = !previewMock && portalQuery.isLoading;
  const error = !previewMock ? portalQuery.error : null;
  if (isLoading) return <NetworkLoading />;
  if (!data || error) {
    return (
      <main className="min-h-screen bg-[#f7f6f3] flex items-center justify-center p-6">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-7 text-center shadow-lg">
          <LockKeyhole className="mx-auto h-8 w-8 text-[#9d2025]" />
          <h1 className="mt-3 text-lg font-black text-slate-900">Your network access is not active</h1>
          <p className="mt-2 text-sm text-slate-500">{error?.message || "Please return to the network enrollment screen and request access."}</p>
          <Button onClick={onLogout} className="mt-5 bg-[#9d2025] text-white hover:bg-[#74171b]">Sign out</Button>
        </div>
      </main>
    );
  }

  const { membership, member, placement, upline, downline, fullTree } = data;
  const hasFullVisibility = membership.accessLevel === "full";

  return (
    <main className="min-h-screen bg-[#f7f6f3] text-slate-900">
      <header className="border-b border-[#3d3325] bg-[#100e0e] px-4 py-3 text-white sm:px-7">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <SpartanBrand />
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-bold text-white">{user.name || member.firstName}</p>
              <p className="text-[10px] text-[#d3aa54]">Verified network member</p>
            </div>
            <Button variant="outline" onClick={onLogout} className="h-8 border-[#5d4934] bg-transparent text-xs font-bold text-white hover:bg-white/10 hover:text-white">
              <LogOut className="mr-1 h-3.5 w-3.5" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl p-4 sm:p-7 lg:p-9">
        <section className="overflow-hidden rounded-2xl border border-[#ded4c3] bg-white shadow-sm">
          <div className="bg-gradient-to-r from-[#100e0e] via-[#2a1715] to-[#100e0e] p-6 text-white sm:p-8">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
              <div>
                <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#d3aa54]"><Network className="h-3.5 w-3.5" /> Your organization view</span>
                <h1 className="mt-2 text-2xl font-black tracking-[-0.035em] sm:text-3xl">Welcome, {member.firstName}.</h1>
                <p className="mt-1 text-sm text-slate-300">Your current placement: <span className="font-bold text-white">{placement?.slotCoordinate || "Available member"}</span></p>
              </div>
              <span className={`inline-flex items-center gap-2 self-start rounded-full border px-3 py-1.5 text-xs font-bold ${hasFullVisibility ? "border-[#d3aa54]/50 bg-[#d3aa54]/15 text-[#f1d993]" : "border-white/15 bg-white/10 text-slate-200"}`}>
                {hasFullVisibility ? <Eye className="h-3.5 w-3.5" /> : <LockKeyhole className="h-3.5 w-3.5" />}
                {hasFullVisibility ? "Full network visibility" : "Private member visibility"}
              </span>
            </div>
          </div>

          {!hasFullVisibility && (
            <div className="flex items-start gap-3 border-b border-amber-100 bg-[#fdf8eb] px-6 py-4 text-xs leading-5 text-[#76521d]">
              <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-[#b38024]" />
              <p><span className="font-bold">Your view is intentionally limited.</span> You can see only your direct upline and your direct downline. Ask the organization creator if you need full-network visibility.</p>
            </div>
          )}

          <div className="p-5 sm:p-7">
            <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr_1fr]">
              <RelationshipCard label="Your direct upline" member={upline} icon={<ArrowRight className="h-4 w-4 rotate-[-90deg]" />} emptyText="No upline placement is recorded yet." tone="gold" />
              <YourProfileCard member={member} placement={placement} />
              <DownlineCard downline={downline} />
            </div>

            {hasFullVisibility && fullTree?.root && (
              <div className="mt-7 border-t border-slate-100 pt-7">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#9d2025]">Owner-approved access</span>
                    <h2 className="mt-1 text-lg font-black text-slate-900">Complete network map</h2>
                    <p className="mt-1 text-xs text-slate-500">All active positions through five levels are visible under your assigned full-network privilege.</p>
                  </div>
                  <Button variant="outline" onClick={() => setFullNetworkOpen((open) => !open)} className="h-9 border-[#9d2025]/25 text-xs font-bold text-[#9d2025] hover:bg-[#f8ebe9]">
                    <GitBranch className="mr-1.5 h-3.5 w-3.5" />
                    {fullNetworkOpen ? "Hide network map" : "Open network map"}
                  </Button>
                </div>
                {fullNetworkOpen && <FullNetworkMap root={fullTree.root} />}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function RelationshipCard({ label, member, icon, emptyText, tone }: { label: string; member: any; icon: React.ReactNode; emptyText: string; tone: "gold" }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-[#faf9f6] p-4">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">{icon}{label}</div>
      {member ? (
        <div className="mt-4 flex items-center gap-3">
          <Avatar className="h-11 w-11 border-2 border-[#d3aa54]">
            <AvatarImage src={member.avatarUrl || fallbackPhoto} />
            <AvatarFallback>{member.firstName?.[0]}{member.lastName?.[0]}</AvatarFallback>
          </Avatar>
          <div className="min-w-0"><p className="truncate text-sm font-extrabold text-slate-900">{member.firstName} {member.lastName}</p><p className="mt-0.5 text-[11px] text-[#9d2025]">{member.rank}</p></div>
        </div>
      ) : <p className="mt-4 text-xs leading-5 text-slate-400">{emptyText}</p>}
    </section>
  );
}

function YourProfileCard({ member, placement }: { member: any; placement: any }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-[#d3aa54]/60 bg-white p-5 shadow-[0_12px_30px_-20px_rgba(157,32,37,0.45)]">
      <div className="absolute right-0 top-0 h-16 w-16 rounded-bl-[3rem] bg-[#d3aa54]/10" />
      <div className="relative flex items-center gap-4">
        <Avatar className="h-16 w-16 border-2 border-[#d3aa54] shadow-sm"><AvatarImage src={member.avatarUrl || fallbackPhoto} /><AvatarFallback className="bg-[#100e0e] text-white">{member.firstName?.[0]}{member.lastName?.[0]}</AvatarFallback></Avatar>
        <div className="min-w-0"><p className="text-lg font-black text-slate-950">{member.firstName} {member.lastName}</p><p className="text-xs font-bold text-[#9d2025]">{member.rank}</p><p className="mt-1 text-[10px] text-slate-400">{placement?.slotCoordinate || "Available member profile"}</p></div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 text-center"><div><span className="text-[10px] font-bold uppercase text-slate-400">Personal volume</span><p className="mt-0.5 text-sm font-black text-slate-800">{member.personalVolume} PV</p></div><div><span className="text-[10px] font-bold uppercase text-slate-400">Account status</span><p className="mt-0.5 text-sm font-black capitalize text-emerald-700">{member.status}</p></div></div>
    </section>
  );
}

function DownlineCard({ downline }: { downline: any[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-[#faf9f6] p-4"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500"><Users className="h-4 w-4" />Your direct downline</div>{downline.length ? <div className="mt-3 space-y-2">{downline.map((member) => <div key={member.id} className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-2"><Avatar className="h-8 w-8"><AvatarImage src={member.avatarUrl || fallbackPhoto} /><AvatarFallback>{member.firstName?.[0]}{member.lastName?.[0]}</AvatarFallback></Avatar><div className="min-w-0"><p className="truncate text-xs font-bold text-slate-800">{member.firstName} {member.lastName}</p><p className="text-[10px] text-slate-500">{member.rank}</p></div></div>)}</div> : <p className="mt-4 text-xs leading-5 text-slate-400">No direct downline members are currently placed below you.</p>}</section>
  );
}

function FullNetworkMap({ root }: { root: any }) {
  const nodesByLevel = useMemo(() => {
    const result: Record<number, any[]> = {};
    const visit = (node: any) => {
      if (!node) return;
      (result[node.level] ||= []).push(node);
      node.children?.forEach(visit);
    };
    visit(root);
    return result;
  }, [root]);

  return <div className="mt-5 space-y-5 rounded-2xl border border-slate-200 bg-[#faf9f6] p-4 sm:p-5">{Object.entries(nodesByLevel).sort(([a], [b]) => Number(a) - Number(b)).map(([level, nodes]) => <div key={level}><div className="mb-2 flex items-center gap-2"><span className="rounded bg-[#9d2025] px-2 py-0.5 text-[10px] font-bold text-white">Level {level}</span><span className="text-[10px] text-slate-400">{nodes.length} visible position{nodes.length === 1 ? "" : "s"}</span></div><div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">{nodes.map((node: any) => <div key={node.placementId} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5"><Avatar className="h-8 w-8"><AvatarImage src={node.member.avatarUrl || fallbackPhoto} /><AvatarFallback>{node.member.firstName?.[0]}{node.member.lastName?.[0]}</AvatarFallback></Avatar><div className="min-w-0"><p className="truncate text-xs font-bold text-slate-800">{node.member.firstName} {node.member.lastName}</p><p className="text-[10px] text-slate-500">{node.member.rank} · {node.slotCoordinate}</p></div></div>)}</div></div>)}</div>;
}
