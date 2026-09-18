import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "google_109876543210987654321",
      email: "admin@memberstack.internal",
      name: "Lead Matrix Architect",
      loginMethod: "google",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as any,
  };
}

function createNonAdminContext(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "distributor_user",
      email: "user@example.com",
      name: "Standard Member",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as any,
  };
}

describe("Member Communication & Messages Workspace", () => {
  it("protects communication endpoints behind administrator access", async () => {
    const nonAdminCtx = createNonAdminContext();
    const caller = appRouter.createCaller(nonAdminCtx);

    await expect(
      caller.communication.list({ orgId: 1 })
    ).rejects.toThrow(/permission|FORBIDDEN/i);

    await expect(
      caller.communication.recordHandoff({
        orgId: 1,
        memberId: 1,
        channel: "email",
        recipient: "target@example.com",
        message: "Hello",
      })
    ).rejects.toThrow(/permission|FORBIDDEN/i);
  });

  it("records an email communication handoff and retrieves it in the Messages list", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const orgs = await caller.org.list();
    const orgId = orgs[0].id;

    // Get a member to message
    const members = await caller.member.list({ orgId });
    expect(members.length).toBeGreaterThan(0);
    const targetMember = members[0];

    const record = await caller.communication.recordHandoff({
      orgId,
      memberId: targetMember.id,
      channel: "email",
      recipient: targetMember.email,
      subject: "Welcome to Spartan Stack Stacking Review",
      message: "Please review your frontline placement on Level 1.",
    });

    expect(record.id).toBeDefined();
    expect(record.channel).toBe("email");
    expect(record.recipient).toBe(targetMember.email);
    expect(record.subject).toBe("Welcome to Spartan Stack Stacking Review");

    const history = await caller.communication.list({ orgId });
    expect(history.length).toBeGreaterThan(0);
    const found = history.find((h) => h.id === record.id);
    expect(found).toBeDefined();
    expect(found?.memberFirstName).toBe(targetMember.firstName);
    expect(found?.memberLastName).toBe(targetMember.lastName);
  });

  it("records a direct text handoff and filters by channel", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const orgs = await caller.org.list();
    const orgId = orgs[0].id;

    const members = await caller.member.list({ orgId });
    const targetMember = members[0];

    await caller.communication.recordHandoff({
      orgId,
      memberId: targetMember.id,
      channel: "text",
      recipient: targetMember.phone || "+15551234567",
      message: "Spartan Stack update: Your downline matrix has expanded.",
    });

    const textHistory = await caller.communication.list({ orgId, channel: "text" });
    expect(textHistory.length).toBeGreaterThan(0);
    expect(textHistory.every((h) => h.channel === "text")).toBe(true);

    const emailHistory = await caller.communication.list({ orgId, channel: "email" });
    expect(emailHistory.every((h) => h.channel === "email")).toBe(true);
  });
});
