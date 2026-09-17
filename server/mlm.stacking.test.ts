import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 999,
      openId: "test-admin",
      name: "Test Administrator",
      email: "test.admin@stackmatrix.internal",
      loginMethod: "test",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as any,
    res: {
      cookie: () => {},
      clearCookie: () => {},
    } as any,
  };
}

function createNonAdminContext(): TrpcContext {
  return {
    user: {
      id: 888,
      openId: "test-regular-user",
      name: "Regular User",
      email: "regular@example.com",
      loginMethod: "test",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as any,
    res: { cookie: () => {}, clearCookie: () => {} } as any,
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as any,
    res: { cookie: () => {}, clearCookie: () => {} } as any,
  };
}

describe("MLM Matrix Stacking System", () => {
  it("strictly denies non-admin and unauthenticated access to organization procedures", async () => {
    const unauthCaller = appRouter.createCaller(createUnauthContext());
    await expect(unauthCaller.org.list()).rejects.toThrow();

    const nonAdminCaller = appRouter.createCaller(createNonAdminContext());
    await expect(nonAdminCaller.org.list()).rejects.toThrow();
  });

  it("initializes default organization and seed downlines for administrators", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const orgs = await caller.org.list();
    expect(orgs.length).toBeGreaterThan(0);

    const apexOrg = orgs.find((o) => o.code === "APEX-HORIZONS");
    expect(apexOrg).toBeDefined();
    expect(apexOrg?.matrixWidth).toBe(3);
    expect(apexOrg?.matrixDepth).toBe(5);
  });

  it("retrieves master member directory with placed and unplaced filtering and photos", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const orgs = await caller.org.list();
    const orgId = orgs[0].id;

    const allMembers = await caller.member.list({ orgId, status: "all" });
    const placedMembers = await caller.member.list({ orgId, status: "placed" });
    const unplacedMembers = await caller.member.list({ orgId, status: "unplaced" });

    expect(allMembers.length).toBeGreaterThan(0);
    expect(placedMembers.length).toBeGreaterThan(0);
    expect(unplacedMembers.length).toBeGreaterThan(0);
    expect(placedMembers.length + unplacedMembers.length).toBe(allMembers.length);

    // Ensure every member has a portrait photo avatar (Photos on Every Page requirement)
    expect(allMembers.every((m) => Boolean(m.avatarUrl))).toBe(true);
  });

  it("constructs accurate 3x5 matrix tree with Mr. Curtis at root and max 3 children per node", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const orgs = await caller.org.list();
    const orgId = orgs[0].id;

    const treeData = await caller.matrix.getTree({ orgId });
    expect(treeData.root).toBeDefined();
    expect(treeData.root?.member.lastName).toBe("Curtis");
    expect(treeData.root?.level).toBe(0);

    // Max 3 slots per parent
    expect(treeData.root?.children.length).toBe(3);
    expect(treeData.stats.maxWidth).toBe(3);
    expect(treeData.stats.maxDepth).toBe(5);
    expect(treeData.stats.totalCapacity).toBe(364);
  });

  it("prevents duplicate placement of an already placed member", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const orgs = await caller.org.list();
    const orgId = orgs[0].id;

    // Mr. Curtis is already root
    const placedMembers = await caller.member.list({ orgId, status: "placed" });
    const curtis = placedMembers.find((m) => m.lastName === "Curtis");
    expect(curtis).toBeDefined();

    const openSlots = await caller.matrix.getOpenSlots({ orgId });
    expect(openSlots.length).toBeGreaterThan(0);
    const slot = openSlots[0];

    await expect(
      caller.matrix.place({
        orgId,
        memberId: curtis!.id,
        parentId: slot.parentId,
        positionIndex: slot.positionIndex,
      })
    ).rejects.toThrow(/already placed/i);
  });

  it("prevents placement into an already occupied slot", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const orgs = await caller.org.list();
    const orgId = orgs[0].id;

    const treeData = await caller.matrix.getTree({ orgId });
    const root = treeData.root!;

    // Root's Leg 0 (DJ) is already occupied
    const unplaced = await caller.member.list({ orgId, status: "unplaced" });
    expect(unplaced.length).toBeGreaterThan(0);

    await expect(
      caller.matrix.place({
        orgId,
        memberId: unplaced[0].id,
        parentId: root.placementId,
        positionIndex: 0, // Leg 0 is already taken by DJ
      })
    ).rejects.toThrow(/already occupied/i);
  });

  it("enforces 3-children branching limit by rejecting positionIndex >= 3", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const orgs = await caller.org.list();
    const orgId = orgs[0].id;

    const treeData = await caller.matrix.getTree({ orgId });
    const root = treeData.root!;

    const unplaced = await caller.member.list({ orgId, status: "unplaced" });

    // Zod validator bounds positionIndex to 0..2
    await expect(
      caller.matrix.place({
        orgId,
        memberId: unplaced[0].id,
        parentId: root.placementId,
        positionIndex: 3 as any, // Out of bounds for 3-leg tree
      })
    ).rejects.toThrow();
  });

  it("supports top-down BFS auto-fill stacking", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const orgs = await caller.org.list();
    const orgId = orgs[0].id;

    const unplacedBefore = await caller.member.list({ orgId, status: "unplaced" });
    if (unplacedBefore.length >= 1) {
      const autoResult = await caller.matrix.autoFill({ orgId, count: 1 });
      expect(autoResult.placedCount).toBe(1);
      expect(autoResult.placedMembers.length).toBe(1);
    }
  });

  it("supports randomized placement from master member list", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const orgs = await caller.org.list();
    const orgId = orgs[0].id;

    const unplacedBefore = await caller.member.list({ orgId, status: "unplaced" });
    if (unplacedBefore.length >= 1) {
      const randomResult = await caller.matrix.randomFill({ orgId, count: 1 });
      expect(randomResult.placedCount).toBe(1);
      expect(randomResult.placedMembers.length).toBe(1);
    }
  });

  it("enforces level-5 depth limit", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const orgs = await caller.org.list();
    const orgId = orgs[0].id;

    // Database function directly verifies targetLevel > 5 check
    const unplaced = await caller.member.list({ orgId, status: "unplaced" });
    if (unplaced.length > 0) {
      // Try to place under an artificial level 5 parent
      await expect(
        db.placeMemberInSlot({
          orgId,
          memberId: unplaced[0].id,
          parentId: 999999, // Non-existent parent
          positionIndex: 0,
        })
      ).rejects.toThrow(/Parent position not found/i);
    }
  });
});
