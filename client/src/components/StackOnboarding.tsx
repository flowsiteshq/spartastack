import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import SpartanBrand from "@/components/SpartanBrand";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  ChevronRight,
  Crown,
  Eye,
  GitBranch,
  ImagePlus,
  LockKeyhole,
  LogOut,
  MailCheck,
  Network,
  Phone,
  Plus,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type OnboardingProfile = {
  firstName: string;
  lastName: string;
  phone: string;
  avatarUrl: string | null;
};

type StackOnboardingProps = {
  user: { name: string | null; email: string | null; avatarUrl?: string | null };
  profile: OnboardingProfile;
  onLogout: () => void;
  onComplete: (createdOrgId?: number) => void;
};

type InviteDraft = { id: string; name: string; email: string };
type Journey = "choose" | "create" | "join";

const fallbackAvatar =
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&h=240&q=80";

async function compressProfilePhoto(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose a PNG, JPEG, or WebP image");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Choose an image smaller than 10 MB");
  }

  const imageUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("The selected photo could not be read"));
      element.src = imageUrl;
    });
    const side = Math.min(720, Math.max(280, Math.min(image.naturalWidth, image.naturalHeight)));
    const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
    const sourceX = Math.max(0, (image.naturalWidth - sourceSize) / 2);
    const sourceY = Math.max(0, (image.naturalHeight - sourceSize) / 2);
    const canvas = document.createElement("canvas");
    canvas.width = side;
    canvas.height = side;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Photo processing is unavailable in this browser");
    context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, side, side);
    return canvas.toDataURL("image/jpeg", 0.86);
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function initials(firstName: string, lastName: string) {
  return `${firstName[0] || "S"}${lastName[0] || "S"}`.toUpperCase();
}

export default function StackOnboarding({ user, profile, onLogout, onComplete }: StackOnboardingProps) {
  const utils = trpc.useUtils();
  const previewJourneyParam =
    typeof window !== "undefined"
      ? (new URLSearchParams(window.location.search).get("previewJourney") as Journey | null)
      : null;
  const [step, setStep] = useState<"profile" | "journey">(previewJourneyParam ? "journey" : "profile");
  const [journey, setJourney] = useState<Journey>(previewJourneyParam || "choose");
  const [firstName, setFirstName] = useState(profile.firstName || user.name?.split(/\s+/)[0] || "");
  const [lastName, setLastName] = useState(profile.lastName || user.name?.split(/\s+/).slice(1).join(" ") || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [savedAvatarUrl, setSavedAvatarUrl] = useState<string | null>(profile.avatarUrl || user.avatarUrl || null);
  const [stackName, setStackName] = useState("");
  const [stackDescription, setStackDescription] = useState("");
  const [invites, setInvites] = useState<InviteDraft[]>([{ id: "invite-1", name: "", email: "" }]);
  const [phoneSearch, setPhoneSearch] = useState("");
  const [submittedProfile, setSubmittedProfile] = useState(Boolean(profile.firstName && profile.lastName && (profile.avatarUrl || user.avatarUrl)));

  const canContinueProfile = Boolean(firstName.trim() && lastName.trim() && (photoDataUrl || savedAvatarUrl));
  const emailMatchesQuery = trpc.network.emailMatches.useQuery(undefined, { enabled: journey === "join" });
  const phoneMatchesQuery = trpc.network.phoneMatches.useQuery(
    { phone: phoneSearch },
    { enabled: journey === "join" && phoneSearch.replace(/\D/g, "").length >= 7 },
  );

  const saveProfile = trpc.onboarding.saveProfile.useMutation({
    onSuccess: (updated) => {
      setSavedAvatarUrl(updated.avatarUrl || savedAvatarUrl);
      setSubmittedProfile(true);
      utils.auth.me.invalidate();
      toast.success("Your Spartan profile is ready");
      setStep("journey");
    },
    onError: (error) => toast.error("Unable to save your profile", { description: error.message }),
  });

  const createStack = trpc.onboarding.createStack.useMutation({
    onSuccess: async (result) => {
      await Promise.all([
        utils.auth.me.invalidate(),
        utils.onboarding.status.invalidate(),
        utils.org.list.invalidate(),
        utils.member.list.invalidate(),
        utils.matrix.getTree.invalidate(),
      ]);
      toast.success(`${result.organization.name} is ready`, {
        description: result.invitedCount
          ? `${result.invitedCount} launch member${result.invitedCount === 1 ? " was" : "s were"} added to your roster.`
          : "You now hold the Apex founder position.",
      });
      onComplete(result.organization.id);
    },
    onError: (error) => toast.error("Your stack could not be created", { description: error.message }),
  });

  const completeMember = trpc.onboarding.completeMember.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.auth.me.invalidate(), utils.onboarding.status.invalidate(), utils.network.mine.invalidate()]);
      onComplete();
    },
    onError: (error) => toast.error("Unable to finish enrollment", { description: error.message }),
  });

  const joinByEmail = trpc.network.joinByEmail.useMutation({
    onSuccess: async () => {
      toast.success("You are now connected to your stack");
      completeMember.mutate();
    },
    onError: (error) => toast.error("Unable to join that stack", { description: error.message }),
  });

  const requestByPhone = trpc.network.requestByPhone.useMutation({
    onSuccess: async () => {
      toast.success("Your connection request is ready for review");
      completeMember.mutate();
    },
    onError: (error) => toast.error("No eligible stack matched that phone number", { description: error.message }),
  });

  useEffect(() => {
    if (profile.avatarUrl || user.avatarUrl) setSavedAvatarUrl(profile.avatarUrl || user.avatarUrl || null);
  }, [profile.avatarUrl, user.avatarUrl]);

  const onPhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressProfilePhoto(file);
      setPhotoDataUrl(dataUrl);
    } catch (error) {
      toast.error("Photo could not be used", { description: error instanceof Error ? error.message : "Try another image" });
    }
  };

  const visibleAvatar = photoDataUrl || savedAvatarUrl || fallbackAvatar;
  const activeInvites = useMemo(
    () => invites.filter((invite) => invite.name.trim() || invite.email.trim()),
    [invites],
  );

  const submitProfile = () => {
    if (!canContinueProfile) {
      toast.error("Add your name and a profile photo to continue");
      return;
    }
    saveProfile.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim() || undefined,
      avatarDataUrl: photoDataUrl || undefined,
    });
  };

  const submitFounderStack = () => {
    if (!stackName.trim()) {
      toast.error("Give your stack a name before continuing");
      return;
    }
    const incompleteInvite = activeInvites.find((invite) => !invite.name.trim() || !invite.email.trim());
    if (incompleteInvite) {
      toast.error("Finish or remove the incomplete launch member");
      return;
    }
    createStack.mutate({
      stackName: stackName.trim(),
      description: stackDescription.trim() || undefined,
      invites: activeInvites.map(({ name, email }) => ({ name: name.trim(), email: email.trim() })),
    });
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f4f1eb] text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[0.92fr_1.08fr]">
        <section className="relative order-2 overflow-hidden bg-[#100e0e] px-6 py-10 text-white lg:order-1 lg:px-12 lg:py-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(211,170,84,0.22),transparent_28%),radial-gradient(circle_at_100%_84%,rgba(157,32,37,0.35),transparent_34%),linear-gradient(135deg,#0b0b0c_0%,#1f1210_56%,#100e0e_100%)]" />
          <div className="absolute -right-28 top-20 h-80 w-80 rounded-full border border-[#d3aa54]/15" />
          <div className="absolute -right-8 top-40 h-52 w-52 rounded-full border border-[#d3aa54]/10" />
          <div className="relative mx-auto flex h-full max-w-lg flex-col justify-between gap-12">
            <SpartanBrand tone="dark" />
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d3aa54]/35 bg-[#d3aa54]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#f1d993]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Required secure setup
              </div>
              <h1 className="mt-6 max-w-md text-4xl font-black leading-[0.98] tracking-[-0.055em] sm:text-5xl">
                Build your profile. <span className="text-[#e3c578]">Choose your path.</span>
              </h1>
              <p className="mt-5 max-w-md text-sm leading-6 text-slate-300 sm:text-base">
                Every Spartan Stack account begins with a verified identity. Then decide whether to build a new organization or connect to the stack that already knows you.
              </p>
            </div>

            <div className="space-y-3">
              {[
                ["1", "Create your profile", "Your name, contact number, and a real photo keep every connection personal."],
                ["2", "Choose your stack", "Start as the Apex founder or securely match into an existing organization."],
                ["3", "Launch your network", "Name your stack, invite launch members, and manage the people you lead."],
              ].map(([number, title, detail]) => (
                <div key={number} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.055] p-3.5 backdrop-blur-sm">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#d3aa54]/45 bg-[#d3aa54]/10 text-xs font-black text-[#f1d993]">{number}</span>
                  <div>
                    <p className="text-xs font-bold text-white">{title}</p>
                    <p className="mt-0.5 text-[11px] leading-4 text-slate-300">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="order-1 flex min-h-screen flex-col bg-[#fffdfa] lg:order-2">
          <header className="flex items-center justify-between px-5 py-4 sm:px-8 lg:px-11 lg:py-6">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#76521d]">
              <LockKeyhole className="h-3.5 w-3.5" /> Account onboarding
            </div>
            <Button variant="ghost" onClick={onLogout} className="h-8 px-2 text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800">
              <LogOut className="mr-1.5 h-3.5 w-3.5" /> Sign out
            </Button>
          </header>

          <div className="mx-auto flex w-full max-w-2xl flex-1 items-center px-5 pb-10 sm:px-8 lg:px-11">
            {step === "profile" ? (
              <section className="w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                <StepHeader step="01" eyebrow="Your identity" title="Set up your Spartan profile." description="This is required before you can create or join a stack. Your verified Google email is already protected; add the details your network needs." />
                <div className="mt-7 grid gap-6 rounded-3xl border border-[#e5ddd0] bg-white p-5 shadow-[0_18px_52px_-36px_rgba(15,23,42,0.36)] sm:p-7">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                    <div className="relative mx-auto shrink-0 sm:mx-0">
                      <Avatar className="h-24 w-24 border-4 border-[#d3aa54] shadow-lg sm:h-28 sm:w-28">
                        <AvatarImage src={visibleAvatar} className="object-cover" />
                        <AvatarFallback className="bg-[#100e0e] text-xl font-black text-[#f1d993]">{initials(firstName, lastName)}</AvatarFallback>
                      </Avatar>
                      <label className="absolute -bottom-1 -right-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-[#9d2025] text-white shadow-md transition-transform hover:scale-105" title="Take or choose a profile photo">
                        <Camera className="h-4 w-4" />
                        <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" capture="user" onChange={onPhotoChange} />
                      </label>
                    </div>
                    <div className="min-w-0 text-center sm:text-left">
                      <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                        <p className="text-base font-black text-slate-950">Your profile photo is required</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${photoDataUrl || savedAvatarUrl ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                          {photoDataUrl || savedAvatarUrl ? "Photo ready" : "Needed to continue"}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs leading-5 text-slate-500">Tap the camera to take a new photo or choose one from your device. We crop it square and secure it to your account.</p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="First name" required>
                      <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="Your first name" className="h-11 border-slate-300 bg-[#fffdfa] text-sm" />
                    </Field>
                    <Field label="Last name" required>
                      <Input value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="Your last name" className="h-11 border-slate-300 bg-[#fffdfa] text-sm" />
                    </Field>
                  </div>

                  <Field label="Verified Google email">
                    <div className="flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600"><MailCheck className="h-4 w-4 text-[#9d2025]" />{user.email || "Verified account"}</div>
                  </Field>
                  <Field label="Mobile phone" optionalText="used to match an existing stack privately">
                    <Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+1 (555) 123-4567" className="h-11 border-slate-300 bg-[#fffdfa] text-sm" />
                  </Field>

                  <div className="flex items-start gap-2 rounded-xl border border-[#d3aa54]/30 bg-[#fdf8eb] p-3 text-[11px] leading-5 text-[#76521d]">
                    <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-[#b38024]" />
                    <span>Your photo and contact details are used for your network profile. Your stack owner controls any visibility beyond your direct relationship.</span>
                  </div>
                  <Button onClick={submitProfile} disabled={!canContinueProfile || saveProfile.isPending} className="h-12 bg-[#9d2025] text-sm font-bold text-white shadow-[0_10px_25px_-12px_rgba(157,32,37,0.72)] hover:bg-[#74171b]">
                    {saveProfile.isPending ? "Saving your profile..." : "Continue to your stack choice"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </section>
            ) : journey === "choose" ? (
              <section className="w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                <StepHeader step="02" eyebrow="Choose your path" title={firstName ? `Welcome, ${firstName}.` : "Welcome to Spartan Stack."} description="Are you creating a new Spartan Stack, or joining a stack where an organizer has already added your name?" />
                <div className="mt-7 grid gap-4 sm:grid-cols-2">
                  <JourneyCard icon={<Crown className="h-6 w-6" />} title="Create my own stack" description="Name your organization, become the Apex founder, add launch members, and manage invitations." action="Build a stack" onClick={() => setJourney("create")} tone="gold" />
                  <JourneyCard icon={<GitBranch className="h-6 w-6" />} title="Join an existing stack" description="Find your member profile by verified email or phone, then enter with protected visibility." action="Find my stack" onClick={() => setJourney("join")} tone="red" />
                </div>
                <button type="button" className="mt-6 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800" onClick={() => setStep("profile")}><ArrowLeft className="h-3.5 w-3.5" /> Edit profile</button>
              </section>
            ) : journey === "create" ? (
              <section className="w-full animate-in fade-in slide-in-from-right-2 duration-300">
                <StepHeader step="03" eyebrow="Founder stack setup" title="Name the stack you will lead." description="You become the Apex founder with full visibility. Add a few launch members now; their profiles will be waiting in your roster, ready for a message invite." />
                <div className="mt-7 space-y-5 rounded-3xl border border-[#e5ddd0] bg-white p-5 shadow-[0_18px_52px_-36px_rgba(15,23,42,0.36)] sm:p-7">
                  <Field label="Stack name" required>
                    <Input value={stackName} onChange={(event) => setStackName(event.target.value)} placeholder="e.g. Spartan North Star" className="h-12 border-slate-300 bg-[#fffdfa] text-sm font-semibold" autoFocus />
                  </Field>
                  <Field label="Mission or focus" optionalText="optional">
                    <Textarea value={stackDescription} onChange={(event) => setStackDescription(event.target.value)} placeholder="What brings this community together?" className="min-h-[84px] resize-none border-slate-300 bg-[#fffdfa] text-sm" />
                  </Field>

                  <div className="rounded-2xl border border-[#d3aa54]/35 bg-[#fdf8eb] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-black text-slate-900"><Users className="h-4 w-4 text-[#9d2025]" /> Add launch members</div>
                        <p className="mt-1 text-[11px] leading-5 text-slate-600">Optional. Add up to eight people now. They will appear as pending in your roster, and you can invite them from Messages after setup.</p>
                      </div>
                      <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-[#76521d]">{activeInvites.length}/8</span>
                    </div>
                    <div className="mt-4 space-y-2.5">
                      {invites.map((invite, index) => (
                        <div key={invite.id} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                          <Input value={invite.name} onChange={(event) => setInvites((current) => current.map((item) => item.id === invite.id ? { ...item, name: event.target.value } : item))} placeholder="Name" className="h-10 min-w-0 border-slate-300 bg-white text-xs" />
                          <Input value={invite.email} onChange={(event) => setInvites((current) => current.map((item) => item.id === invite.id ? { ...item, email: event.target.value } : item))} placeholder="email@example.com" type="email" className="h-10 min-w-0 border-slate-300 bg-white text-xs" />
                          <Button type="button" variant="ghost" onClick={() => setInvites((current) => current.length === 1 ? [{ ...invite, name: "", email: "" }] : current.filter((item) => item.id !== invite.id))} className="h-10 w-10 p-0 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={`Remove launch member ${index + 1}`}><X className="h-4 w-4" /></Button>
                        </div>
                      ))}
                    </div>
                    {invites.length < 8 && <button type="button" onClick={() => setInvites((current) => [...current, { id: `invite-${Date.now()}`, name: "", email: "" }])} className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#9d2025] hover:text-[#74171b]"><Plus className="h-3.5 w-3.5" /> Add another member</button>}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Button type="button" variant="outline" onClick={() => setJourney("choose")} className="h-11 border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50"><ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back</Button>
                    <Button onClick={submitFounderStack} disabled={createStack.isPending || !stackName.trim()} className="h-11 bg-[#9d2025] text-xs font-bold text-white hover:bg-[#74171b]">{createStack.isPending ? "Establishing stack..." : "Create my stack"}<ChevronRight className="ml-1.5 h-4 w-4" /></Button>
                  </div>
                </div>
              </section>
            ) : (
              <JoinExistingStack
                email={user.email}
                phoneSearch={phoneSearch}
                setPhoneSearch={setPhoneSearch}
                emailMatches={emailMatchesQuery.data || []}
                emailLoading={emailMatchesQuery.isLoading}
                phoneMatches={phoneMatchesQuery.data || []}
                phoneLoading={phoneMatchesQuery.isFetching}
                onJoinEmail={(orgId) => joinByEmail.mutate({ orgId })}
                onJoinPhone={(orgId) => requestByPhone.mutate({ orgId, phone: phoneSearch })}
                isBusy={joinByEmail.isPending || requestByPhone.isPending || completeMember.isPending}
                onBack={() => setJourney("choose")}
              />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function StepHeader({ step, eyebrow, title, description }: { step: string; eyebrow: string; title: string; description: string }) {
  return <div><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9d2025]"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f7e6e4] text-[10px]">{step}</span>{eyebrow}</div><h2 className="mt-4 text-3xl font-black tracking-[-0.045em] text-slate-950 sm:text-4xl">{title}</h2><p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">{description}</p></div>;
}

function Field({ label, required, optionalText, children }: { label: string; required?: boolean; optionalText?: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">{label}{required ? <span className="text-[#9d2025]">*</span> : null}{optionalText ? <span className="normal-case font-medium tracking-normal text-slate-400">({optionalText})</span> : null}</span>{children}</label>;
}

function JourneyCard({ icon, title, description, action, onClick, tone }: { icon: React.ReactNode; title: string; description: string; action: string; onClick: () => void; tone: "gold" | "red" }) {
  const classes = tone === "gold" ? "border-[#d3aa54]/55 bg-[#fdf8eb] hover:border-[#b38024]" : "border-[#9d2025]/25 bg-[#fdf4f3] hover:border-[#9d2025]";
  const iconClasses = tone === "gold" ? "bg-[#d3aa54]/15 text-[#9a7022]" : "bg-[#9d2025]/10 text-[#9d2025]";
  return <button type="button" onClick={onClick} className={`group min-h-[255px] rounded-3xl border p-6 text-left shadow-[0_18px_40px_-34px_rgba(15,23,42,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${classes}`}><span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconClasses}`}>{icon}</span><h3 className="mt-6 text-xl font-black tracking-[-0.03em] text-slate-950">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p><span className="mt-6 inline-flex items-center gap-1.5 text-xs font-bold text-slate-900">{action}<ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></span></button>;
}

function JoinExistingStack({ email, phoneSearch, setPhoneSearch, emailMatches, emailLoading, phoneMatches, phoneLoading, onJoinEmail, onJoinPhone, isBusy, onBack }: { email: string | null; phoneSearch: string; setPhoneSearch: (value: string) => void; emailMatches: any[]; emailLoading: boolean; phoneMatches: any[]; phoneLoading: boolean; onJoinEmail: (orgId: number) => void; onJoinPhone: (orgId: number) => void; isBusy: boolean; onBack: () => void }) {
  return <section className="w-full animate-in fade-in slide-in-from-right-2 duration-300"><StepHeader step="03" eyebrow="Secure stack match" title="Find the stack that knows you." description="We match only against the email or phone on an existing member profile. Your relationship view stays private by default." /><div className="mt-7 space-y-5 rounded-3xl border border-[#e5ddd0] bg-white p-5 shadow-[0_18px_52px_-36px_rgba(15,23,42,0.36)] sm:p-7"><div className="rounded-2xl border border-slate-200 bg-[#faf9f6] p-4"><div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><MailCheck className="h-4 w-4" /></span><div><p className="text-sm font-black text-slate-900">Match with your verified email</p><p className="mt-1 text-[11px] leading-5 text-slate-500">{email || "Your verified Google email"}. An exact match lets you connect immediately with protected member visibility.</p></div></div><div className="mt-4 space-y-2">{emailLoading ? <p className="rounded-xl bg-white p-3 text-xs text-slate-400">Checking your email for a stack profile...</p> : emailMatches.length ? emailMatches.map((match) => <MatchCard key={`${match.orgId}-${match.memberId}`} match={match} action="Join this stack" onAction={() => onJoinEmail(match.orgId)} disabled={isBusy} />) : <p className="rounded-xl border border-dashed border-slate-300 bg-white p-3 text-xs leading-5 text-slate-500">No stack profile is matched to this email yet. Try the phone number your organizer has on file.</p>}</div></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f7e6e4] text-[#9d2025]"><Phone className="h-4 w-4" /></span><div><p className="text-sm font-black text-slate-900">Match with your phone</p><p className="mt-1 text-[11px] leading-5 text-slate-500">Phone matches are sent to the stack founder for approval, keeping every network private.</p></div></div><div className="mt-4 flex gap-2"><Input value={phoneSearch} onChange={(event) => setPhoneSearch(event.target.value)} placeholder="Phone number on your member profile" className="h-10 border-slate-300 bg-[#fffdfa] text-xs" /><Button type="button" variant="outline" disabled={phoneSearch.replace(/\D/g, "").length < 7} className="h-10 shrink-0 border-[#9d2025]/30 text-xs font-bold text-[#9d2025] hover:bg-[#fdf4f3]" onClick={() => setPhoneSearch(phoneSearch.trim())}>Find</Button></div>{phoneSearch.replace(/\D/g, "").length >= 7 && <div className="mt-3 space-y-2">{phoneLoading ? <p className="text-xs text-slate-400">Searching profile records...</p> : phoneMatches.length ? phoneMatches.map((match) => <MatchCard key={`${match.orgId}-${match.memberId}`} match={match} action="Request connection" onAction={() => onJoinPhone(match.orgId)} disabled={isBusy} />) : <p className="text-xs text-slate-500">No stack profile matches that phone number.</p>}</div>}</div><Button type="button" variant="outline" onClick={onBack} className="h-11 w-full border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50"><ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to stack choice</Button></div></section>;
}

function MatchCard({ match, action, onAction, disabled }: { match: any; action: string; onAction: () => void; disabled: boolean }) {
  return <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><Avatar className="h-10 w-10 border border-[#d3aa54]/60"><AvatarImage src={match.memberAvatarUrl || fallbackAvatar} /><AvatarFallback className="bg-[#100e0e] text-xs font-bold text-white">{match.memberFirstName?.[0]}{match.memberLastName?.[0]}</AvatarFallback></Avatar><div className="min-w-0"><p className="truncate text-xs font-extrabold text-slate-900">{match.orgName}</p><p className="mt-0.5 text-[10px] text-slate-500">Matched to {match.memberFirstName} {match.memberLastName} · {match.memberRank}</p></div></div><Button onClick={onAction} disabled={disabled} className="h-8 bg-[#9d2025] px-3 text-[11px] font-bold text-white hover:bg-[#74171b]">{action}<ChevronRight className="ml-1 h-3.5 w-3.5" /></Button></div>;
}
