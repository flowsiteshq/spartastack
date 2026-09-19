import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { upsertUser, getUserByOpenId } from "./db";

async function createOnboardingContext(userId: number, email: string): Promise<TrpcContext> {
  return createCustomContext(userId, email, "user");
}

async function createCustomContext(userId: number, email: string, role: "user" | "admin", runSuffix = ""): Promise<TrpcContext> {
  const openId = `google_onboarding_${userId}_${runSuffix || Date.now()}`;
  await upsertUser({
    openId,
    email,
    name: `New User ${userId}`,
    loginMethod: "google",
    role,
  });
  const persistentUser = await getUserByOpenId(openId);
  return {
    user: {
      id: persistentUser!.id,
      openId,
      email,
      name: `New User ${userId}`,
      loginMethod: "google",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {}, cookie: () => {} } as any,
  };
}

describe("Mandatory Account Onboarding, Photo Setup, and Stack Choice", () => {
  it("enforces incomplete status until profile is saved and a stack choice is completed", async () => {
    const userId = 8801;
    const runId = Date.now().toString();
    const email = `new.spartan.${runId}@spartanstack.io`;
    const userContext = await createCustomContext(userId, email, "user", runId);
    const caller = appRouter.createCaller(userContext);

    // Initial onboarding status is incomplete
    const initialStatus = await caller.onboarding.status();
    expect(initialStatus.completed).toBe(false);
    expect(initialStatus.mode).toBeFalsy();

    // Save profile with name, phone, and profile photo
    const tinyPngDataUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const savedUser = await caller.onboarding.saveProfile({
      firstName: "Marcus",
      lastName: "Aurelius",
      phone: "+1 (555) 432-1098",
      avatarDataUrl: tinyPngDataUrl,
    });
    expect(savedUser.name).toBe("Marcus Aurelius");
    expect(savedUser.phone).toBe("+1 (555) 432-1098");
    expect(savedUser.avatarUrl).toContain("/manus-storage/");

    // Status still requires choosing whether to create or join a stack
    const afterProfileStatus = await caller.onboarding.status();
    expect(afterProfileStatus.completed).toBe(false);
    expect(afterProfileStatus.profile.firstName).toBe("Marcus");
    expect(afterProfileStatus.profile.lastName).toBe("Aurelius");

    // Creating a stack completes onboarding and sets the user as the Apex founder
    const created = await caller.onboarding.createStack({
      stackName: `Spartan Legion ${Date.now().toString().slice(-4)}`,
      description: "Leadership network initialized through mandatory onboarding",
      invites: [
        { name: "Cassius Vance", email: `cassius.${Date.now()}@spartanstack.io` },
        { name: "Helena Troy", email: `helena.${Date.now()}@spartanstack.io` },
      ],
    });

    expect(created.organization.id).toBeGreaterThan(0);
    expect(created.founder.rank).toBe("Crown Director");
    expect(created.invitedCount).toBe(2);

    // Founder now has completed onboarding and stack owner mode
    const finalStatus = await caller.onboarding.status();
    expect(finalStatus.completed).toBe(true);
    expect(finalStatus.mode).toBe("stack_owner");
    expect(finalStatus.ownedStacks.length).toBeGreaterThan(0);

    // Organization chart contains the founder at Apex Level 0
    const founderCaller = appRouter.createCaller(await createCustomContext(userId, email, "admin", runId));
    const tree = await founderCaller.matrix.getTree({ orgId: created.organization.id });
    expect(tree.root).not.toBeNull();
    expect(tree.root?.member.id).toBe(created.founder.id);
    expect(tree.root?.slotCoordinate).toBe("LEVEL 0 - APEX");
  });

  it("completes member onboarding when joining an existing matched stack", async () => {
    // 1. Establish an owner and an organization with a pre-enrolled member
    const ownerUserId = 8802;
    const ownerEmail = `owner.${Date.now()}@spartanstack.io`;
    const ownerCaller = appRouter.createCaller(await createOnboardingContext(ownerUserId, ownerEmail));
    await ownerCaller.onboarding.saveProfile({
      firstName: "Leonidas",
      lastName: "King",
    });
    const stack = await ownerCaller.onboarding.createStack({
      stackName: `Thermapylae Unit ${Date.now().toString().slice(-4)}`,
    });

    const ownerAdminCaller = appRouter.createCaller(await createCustomContext(ownerUserId, ownerEmail, "admin"));
    const memberEmail = `cadet.${Date.now()}@spartanstack.io`;
    const enrolledMember = await ownerAdminCaller.member.create({
      orgId: stack.organization.id,
      firstName: "Dilios",
      lastName: "Spartan",
      email: memberEmail,
      rank: "Associate",
    });

    // 2. Joining member signs in for the first time
    const cadetUserId = 8803;
    const cadetCaller = appRouter.createCaller(await createOnboardingContext(cadetUserId, memberEmail));
    await cadetCaller.onboarding.saveProfile({
      firstName: "Dilios",
      lastName: "Spartan",
      phone: "+1 (555) 777-1234",
    });

    // Discovers the existing stack by email
    const matches = await cadetCaller.network.emailMatches();
    expect(matches.some((m) => m.orgId === stack.organization.id && m.memberId === enrolledMember.id)).toBe(true);

    // Joins the stack and completes member onboarding
    await cadetCaller.network.joinByEmail({ orgId: stack.organization.id });
    await cadetCaller.onboarding.completeMember();

    const status = await cadetCaller.onboarding.status();
    expect(status.completed).toBe(true);
    expect(status.mode).toBe("member");

    const portal = await cadetCaller.network.portal({ orgId: stack.organization.id });
    expect(portal.member.id).toBe(enrolledMember.id);
  });
});
