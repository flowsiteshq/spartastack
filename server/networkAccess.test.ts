import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createOwnerContext(userId: number = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: "google_109876543210987654321",
      email: "admin@memberstack.internal",
      name: "Lead Matrix Architect",
      loginMethod: "google",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {}, cookie: () => {} } as any,
  };
}

function createMemberContext(userId: number, email: string): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `google_member_${userId}`,
      email,
      name: `Member User ${userId}`,
      loginMethod: "google",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {}, cookie: () => {} } as any,
  };
}

describe("Member Network Access, Join Matching, and Visibility Boundaries", () => {
  it("allows verified Google users to discover and join a network via matching member email with limited view", async () => {
    const ownerCtx = createOwnerContext(1);
    const ownerCaller = appRouter.createCaller(ownerCtx);

    const orgs = await ownerCaller.org.list();
    const orgId = orgs[0].id;

    // Create a target member with a known email
    const uniqueEmail = `sarah.lead.${Date.now()}@apexhorizon.org`;
    const member = await ownerCaller.member.create({
      orgId,
      firstName: "Sarah",
      lastName: "Conway",
      email: uniqueEmail,
      phone: "+1 (555) 987-6543",
      rank: "Bronze Builder",
    });

    const memberCtx = createMemberContext(4001, uniqueEmail);
    const memberCaller = appRouter.createCaller(memberCtx);

    // 1. Member discovers their matching organization
    const matches = await memberCaller.network.emailMatches();
    expect(matches.some((m) => m.orgId === orgId && m.memberId === member.id)).toBe(true);

    // 2. Member joins the network
    const joined = await memberCaller.network.joinByEmail({ orgId });
    expect(joined.status).toBe("active");
    expect(joined.accessLevel).toBe("limited");
    expect(joined.matchMethod).toBe("email");

    // 3. Member retrieves scoped portal data
    const portal = await memberCaller.network.portal({ orgId });
    expect(portal.member.id).toBe(member.id);
    expect(portal.membership.accessLevel).toBe("limited");
    // Limited view does not expose the entire tree
    expect(portal.fullTree).toBeNull();
  });

  it("handles phone matching as an approval-pending request requiring creator sign-off", async () => {
    const ownerCtx = createOwnerContext(1);
    const ownerCaller = appRouter.createCaller(ownerCtx);

    const orgs = await ownerCaller.org.list();
    const orgId = orgs[0].id;

    const uniquePhone = `+1 (555) 888-${Math.floor(1000 + Math.random() * 9000)}`;
    const member = await ownerCaller.member.create({
      orgId,
      firstName: "David",
      lastName: "Kim",
      email: `david.${Date.now()}@apexhorizon.org`,
      phone: uniquePhone,
      rank: "Associate",
    });

    // Member signs in with a different Google account and matches by phone
    const memberCtx = createMemberContext(4002, "unrelated.david@gmail.com");
    const memberCaller = appRouter.createCaller(memberCtx);

    const phoneMatches = await memberCaller.network.phoneMatches({ phone: uniquePhone });
    expect(phoneMatches.some((m) => m.orgId === orgId && m.memberId === member.id)).toBe(true);

    const request = await memberCaller.network.requestByPhone({ orgId, phone: uniquePhone });
    expect(request.status).toBe("pending");

    // Portal access fails while pending
    await expect(memberCaller.network.portal({ orgId })).rejects.toThrow(/do not have active access/i);

    // Organization creator reviews and approves the request
    const ownerView = await ownerCaller.network.ownerAccess({ orgId });
    expect(ownerView.isOwner).toBe(true);
    const pendingMembership = ownerView.memberships.find((m) => m.id === request.id);
    expect(pendingMembership).toBeDefined();

    await ownerCaller.network.updateMemberAccess({
      orgId,
      membershipId: request.id,
      status: "active",
      accessLevel: "limited",
    });

    // Member now has active limited access
    const portal = await memberCaller.network.portal({ orgId });
    expect(portal.membership.status).toBe("active");
    expect(portal.membership.accessLevel).toBe("limited");
  });

  it("allows only the organization creator to grant full-network visibility", async () => {
    const ownerCtx = createOwnerContext(1);
    const ownerCaller = appRouter.createCaller(ownerCtx);

    const orgs = await ownerCaller.org.list();
    const orgId = orgs[0].id;

    const memberEmail = `rachel.leader.${Date.now()}@apexhorizon.org`;
    const member = await ownerCaller.member.create({
      orgId,
      firstName: "Rachel",
      lastName: "Sterling",
      email: memberEmail,
      rank: "Gold Leader",
    });

    const memberCtx = createMemberContext(4003, memberEmail);
    const memberCaller = appRouter.createCaller(memberCtx);

    const joined = await memberCaller.network.joinByEmail({ orgId });
    expect(joined.accessLevel).toBe("limited");

    // Creator elevates member to full network visibility
    await ownerCaller.network.updateMemberAccess({
      orgId,
      membershipId: joined.id,
      accessLevel: "full",
    });

    const portal = await memberCaller.network.portal({ orgId });
    expect(portal.membership.accessLevel).toBe("full");
    expect(portal.fullTree).not.toBeNull();
    expect(portal.fullTree?.root).toBeDefined();

    // A non-owner administrator cannot update visibility privileges
    const otherAdminCtx = createOwnerContext(999);
    const otherAdminCaller = appRouter.createCaller(otherAdminCtx);
    await expect(
      otherAdminCaller.network.updateMemberAccess({
        orgId,
        membershipId: joined.id,
        accessLevel: "limited",
      })
    ).rejects.toThrow(/creator/i);
  });
});
