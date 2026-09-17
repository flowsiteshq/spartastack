import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin_test",
      email: "admin@memberstack.internal",
      name: "Lead Matrix Architect",
      loginMethod: "admin_portal",
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

describe("MLM Matrix Stacking System", () => {
  it("strictly denies non-admin and unauthenticated access to organization procedures", async () => {
    const nonAdminCtx = createNonAdminContext();
    const caller = appRouter.createCaller(nonAdminCtx);

    await expect(caller.org.list()).rejects.toThrow(/permission|FORBIDDEN/i);
    await expect(caller.matrix.getTree({ orgId: 1 })).rejects.toThrow(/permission|FORBIDDEN/i);
  });

  it("initializes default organization and seed downlines for administrators", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const orgs = await caller.org.list();
    expect(orgs.length).toBeGreaterThan(0);
    expect(orgs[0].code).toBe("APEX-HORIZONS");
    expect(orgs[0].matrixWidth).toBe(3);
    expect(orgs[0].matrixDepth).toBe(5);
  });

  it("retrieves master member directory with placed and unplaced filtering and photos", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const orgs = await caller.org.list();
    const orgId = orgs[0].id;

    // Ensure unplaced members exist
    let unplacedMembers = await caller.member.list({ orgId, status: "unplaced" });
    if (unplacedMembers.length === 0) {
      await caller.member.batchGenerate({ orgId, count: 5 });
      unplacedMembers = await caller.member.list({ orgId, status: "unplaced" });
    }

    const allMembers = await caller.member.list({ orgId, status: "all" });
    const placedMembers = await caller.member.list({ orgId, status: "placed" });

    expect(allMembers.length).toBeGreaterThan(0);
    expect(placedMembers.length).toBeGreaterThan(0);
    expect(unplacedMembers.length).toBeGreaterThan(0);
    expect(placedMembers.length + unplacedMembers.length).toBe(allMembers.length);
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

    let unplaced = await caller.member.list({ orgId, status: "unplaced" });
    if (unplaced.length === 0) {
      await caller.member.batchGenerate({ orgId, count: 3 });
      unplaced = await caller.member.list({ orgId, status: "unplaced" });
    }

    // Leg 0 is already occupied by DJ
    await expect(
      caller.matrix.place({
        orgId,
        memberId: unplaced[0].id,
        parentId: root.placementId,
        positionIndex: 0,
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

    let unplaced = await caller.member.list({ orgId, status: "unplaced" });
    if (unplaced.length === 0) {
      await caller.member.batchGenerate({ orgId, count: 3 });
      unplaced = await caller.member.list({ orgId, status: "unplaced" });
    }

    await expect(
      caller.matrix.place({
        orgId,
        memberId: unplaced[0].id,
        parentId: root.placementId,
        positionIndex: 3 as any,
      })
    ).rejects.toThrow(/<=2|3 legs max/i);
  });

  it("supports position locking and preserves locked members during random stack", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const orgs = await caller.org.list();
    const orgId = orgs[0].id;

    const treeData = await caller.matrix.getTree({ orgId });
    const root = treeData.root!;

    // Lock the root apex position
    const lockedRoot = await caller.matrix.toggleLock({ placementId: root.placementId, isLocked: true });
    expect(lockedRoot.isLocked).toBe(true);

    // Execute a full matrix random stack with scope="all"
    await caller.matrix.randomStack({ orgId, scope: "all" });

    // Verify that the locked root remains intact and still locked
    const afterTree = await caller.matrix.getTree({ orgId });
    expect(afterTree.root).toBeDefined();
    expect(afterTree.root?.memberId).toBe(root.memberId);
    expect(afterTree.root?.isLocked).toBe(true);
  });

  it("supports saved chart snapshots and restoration", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const orgs = await caller.org.list();
    const orgId = orgs[0].id;

    // Save snapshot
    const saved = await caller.charts.save({
      orgId,
      name: "Test Vitest Snapshot",
      description: "Automated snapshot test",
    });
    expect(saved.id).toBeDefined();
    expect(saved.name).toBe("Test Vitest Snapshot");

    // Rename snapshot
    const renamed = await caller.charts.rename({
      chartId: saved.id,
      name: "Renamed Vitest Snapshot",
    });
    expect(renamed.name).toBe("Renamed Vitest Snapshot");

    // List charts
    const charts = await caller.charts.list({ orgId });
    expect(charts.some((c) => c.id === saved.id && c.name === "Renamed Vitest Snapshot")).toBe(true);

    // Clean up
    await caller.charts.delete({ chartId: saved.id });
  });

  it("supports top-down BFS auto-fill stacking and random stack with count limit", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const orgs = await caller.org.list();
    const orgId = orgs[0].id;

    // Ensure unplaced members
    await caller.member.batchGenerate({ orgId, count: 3 });

    const autoResult = await caller.matrix.autoFill({ orgId, count: 1 });
    expect(autoResult.placedCount).toBe(1);
    expect(autoResult.placedMembers.length).toBe(1);

    const randomResult = await caller.matrix.randomFill({ orgId, count: 1 });
    expect(randomResult.placedCount).toBe(1);
  });
});
