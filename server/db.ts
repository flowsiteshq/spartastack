import { and, asc, desc, eq, inArray, isNull, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertMember,
  InsertOrganization,
  InsertPlacement,
  InsertUser,
  Member,
  Organization,
  Placement,
  members,
  organizations,
  placements,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ========================================================
// Organization Helpers
// ========================================================

export async function getOrganizations(): Promise<Organization[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(organizations).orderBy(asc(organizations.name));
}

export async function getOrganizationById(id: number): Promise<Organization | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const res = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
  return res[0];
}

export async function createOrganization(data: InsertOrganization): Promise<Organization> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [result] = await db.insert(organizations).values(data);
  const created = await getOrganizationById(result.insertId);
  if (!created) throw new Error("Failed to create organization");
  return created;
}

export async function updateOrganization(
  id: number,
  data: Partial<InsertOrganization>
): Promise<Organization> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(organizations).set(data).where(eq(organizations.id, id));
  const updated = await getOrganizationById(id);
  if (!updated) throw new Error("Organization not found");
  return updated;
}

export async function deleteOrganization(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(placements).where(eq(placements.orgId, id));
  await db.delete(members).where(eq(members.orgId, id));
  await db.delete(organizations).where(eq(organizations.id, id));
}

// ========================================================
// Member Directory Helpers
// ========================================================

export interface MemberWithPlacement extends Member {
  isPlaced: boolean;
  placementId?: number;
  placementLevel?: number;
  placementPosition?: number;
  slotCoordinate?: string;
  parentMemberName?: string;
}

export async function getMembersWithPlacement(
  orgId: number,
  filter?: {
    search?: string;
    status?: "all" | "unplaced" | "placed";
    rank?: string;
  }
): Promise<MemberWithPlacement[]> {
  const db = await getDb();
  if (!db) return [];

  const allMembers = await db
    .select()
    .from(members)
    .where(eq(members.orgId, orgId))
    .orderBy(asc(members.lastName), asc(members.firstName));

  const allPlacements = await db
    .select()
    .from(placements)
    .where(eq(placements.orgId, orgId));

  const placementMap = new Map<number, Placement>();
  for (const p of allPlacements) {
    placementMap.set(p.memberId, p);
  }

  // Map placement id to member for parent lookup
  const placementIdToMember = new Map<number, Member>();
  for (const m of allMembers) {
    const p = placementMap.get(m.id);
    if (p) {
      placementIdToMember.set(p.id, m);
    }
  }

  let result: MemberWithPlacement[] = allMembers.map((m) => {
    const p = placementMap.get(m.id);
    let parentMemberName: string | undefined;
    if (p && p.parentId) {
      const parentMem = placementIdToMember.get(p.parentId);
      if (parentMem) {
        parentMemberName = `${parentMem.firstName} ${parentMem.lastName}`;
      }
    }
    return {
      ...m,
      isPlaced: Boolean(p),
      placementId: p?.id,
      placementLevel: p?.level,
      placementPosition: p?.positionIndex,
      slotCoordinate: p?.slotCoordinate,
      parentMemberName,
    };
  });

  if (filter?.search) {
    const q = filter.search.toLowerCase().trim();
    result = result.filter(
      (m) =>
        m.firstName.toLowerCase().includes(q) ||
        m.lastName.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.rank.toLowerCase().includes(q) ||
        (m.phone && m.phone.toLowerCase().includes(q))
    );
  }

  if (filter?.status === "placed") {
    result = result.filter((m) => m.isPlaced);
  } else if (filter?.status === "unplaced") {
    result = result.filter((m) => !m.isPlaced);
  }

  if (filter?.rank && filter.rank !== "all") {
    result = result.filter((m) => m.rank === filter.rank);
  }

  return result;
}

export async function getMemberById(id: number): Promise<Member | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const res = await db.select().from(members).where(eq(members.id, id)).limit(1);
  return res[0];
}

export async function createMember(data: InsertMember): Promise<Member> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [result] = await db.insert(members).values(data);
  const created = await getMemberById(result.insertId);
  if (!created) throw new Error("Failed to create member");
  return created;
}

export async function updateMember(id: number, data: Partial<InsertMember>): Promise<Member> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(members).set(data).where(eq(members.id, id));
  const updated = await getMemberById(id);
  if (!updated) throw new Error("Member not found");
  return updated;
}

export async function deleteMember(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  // If placed, unstack first
  const placed = await db.select().from(placements).where(eq(placements.memberId, id));
  if (placed.length > 0) {
    await unstackPlacementAndDescendants(placed[0].id);
  }
  await db.delete(members).where(eq(members.id, id));
}

// ========================================================
// 3x5 Downline Matrix Stacking Engine
// ========================================================

export interface TreeNode {
  placementId: number;
  memberId: number;
  parentId: number | null;
  level: number;
  positionIndex: number; // 0, 1, 2
  slotCoordinate: string;
  placedAt: Date;
  member: Member;
  // Exactly 3 slots for 3x5 matrix: either an occupied TreeNode or null (open slot)
  children: (TreeNode | null)[];
  totalDownlineCount: number;
}

export interface MatrixStats {
  maxDepth: number; // 5
  maxWidth: number; // 3
  totalCapacity: number; // 364
  totalPlaced: number;
  totalAvailableSlots: number;
  levelBreakdown: {
    level: number;
    capacity: number;
    occupied: number;
    open: number;
    percentage: number;
  }[];
}

export interface OpenSlot {
  parentId: number | null;
  positionIndex: number; // 0, 1, 2
  level: number;
  parentMemberName?: string;
  parentSlotCoordinate?: string;
  suggestedCoordinate: string;
}

export async function getAllPlacementsForOrg(orgId: number): Promise<Placement[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(placements).where(eq(placements.orgId, orgId));
}

/**
 * Builds the full hierarchical tree for the organization
 */
export async function getTreeStructure(
  orgId: number,
  rootPlacementId?: number
): Promise<{
  root: TreeNode | null;
  stats: MatrixStats;
  allPlacedMembersCount: number;
  unplacedMembersCount: number;
}> {
  const db = await getDb();
  if (!db) {
    return {
      root: null,
      stats: computeEmptyStats(),
      allPlacedMembersCount: 0,
      unplacedMembersCount: 0,
    };
  }

  const allOrgMembers = await db.select().from(members).where(eq(members.orgId, orgId));
  const memberMap = new Map<number, Member>();
  for (const m of allOrgMembers) {
    memberMap.set(m.id, m);
  }

  const allOrgPlacements = await db
    .select()
    .from(placements)
    .where(eq(placements.orgId, orgId))
    .orderBy(asc(placements.level), asc(placements.positionIndex));

  if (allOrgPlacements.length === 0) {
    return {
      root: null,
      stats: computeMatrixStats([]),
      allPlacedMembersCount: 0,
      unplacedMembersCount: allOrgMembers.length,
    };
  }

  // Group placements by parentId
  const placementMap = new Map<number, Placement>();
  const childrenByParent = new Map<number, Placement[]>();
  let rootPlacement: Placement | undefined;

  for (const p of allOrgPlacements) {
    placementMap.set(p.id, p);
    if (p.parentId === null) {
      if (!rootPlacement || p.level === 0) {
        rootPlacement = p;
      }
    } else {
      const list = childrenByParent.get(p.parentId) || [];
      list.push(p);
      childrenByParent.set(p.parentId, list);
    }
  }

  if (rootPlacementId) {
    const target = placementMap.get(rootPlacementId);
    if (target) {
      rootPlacement = target;
    }
  }

  if (!rootPlacement) {
    return {
      root: null,
      stats: computeMatrixStats(allOrgPlacements),
      allPlacedMembersCount: allOrgPlacements.length,
      unplacedMembersCount: allOrgMembers.length - allOrgPlacements.length,
    };
  }

  // Recursive tree builder
  function buildNode(p: Placement): TreeNode {
    const m = memberMap.get(p.memberId) || {
      id: p.memberId,
      orgId,
      firstName: "Unknown",
      lastName: "Member",
      email: "unknown@example.com",
      phone: null,
      avatarUrl: null,
      rank: "Associate",
      personalVolume: 100,
      joinDate: new Date(),
      status: "active" as const,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const childrenPlacements = childrenByParent.get(p.id) || [];
    const childrenSlots: (TreeNode | null)[] = [null, null, null];

    let downlineSum = 0;

    // Only build children if level < 5
    if (p.level < 5) {
      for (const cp of childrenPlacements) {
        if (cp.positionIndex >= 0 && cp.positionIndex < 3) {
          const childNode = buildNode(cp);
          childrenSlots[cp.positionIndex] = childNode;
          downlineSum += 1 + childNode.totalDownlineCount;
        }
      }
    }

    return {
      placementId: p.id,
      memberId: p.memberId,
      parentId: p.parentId,
      level: p.level,
      positionIndex: p.positionIndex,
      slotCoordinate: p.slotCoordinate,
      placedAt: p.placedAt,
      member: m,
      children: childrenSlots,
      totalDownlineCount: downlineSum,
    };
  }

  const rootNode = buildNode(rootPlacement);
  const stats = computeMatrixStats(allOrgPlacements);

  return {
    root: rootNode,
    stats,
    allPlacedMembersCount: allOrgPlacements.length,
    unplacedMembersCount: Math.max(0, allOrgMembers.length - allOrgPlacements.length),
  };
}

function computeEmptyStats(): MatrixStats {
  return computeMatrixStats([]);
}

function computeMatrixStats(allPlacements: Placement[]): MatrixStats {
  // 3x5 matrix capacity per level:
  // Level 0: 3^0 = 1
  // Level 1: 3^1 = 3
  // Level 2: 3^2 = 9
  // Level 3: 3^3 = 27
  // Level 4: 3^4 = 81
  // Level 5: 3^5 = 243
  // Total: 364
  const capacities = [1, 3, 9, 27, 81, 243];
  const occupiedCounts = [0, 0, 0, 0, 0, 0];

  for (const p of allPlacements) {
    if (p.level >= 0 && p.level <= 5) {
      occupiedCounts[p.level]++;
    }
  }

  const levelBreakdown = capacities.map((cap, lvl) => {
    const occ = occupiedCounts[lvl];
    return {
      level: lvl,
      capacity: cap,
      occupied: occ,
      open: Math.max(0, cap - occ),
      percentage: Math.min(100, Math.round((occ / cap) * 100)),
    };
  });

  const totalCapacity = capacities.reduce((a, b) => a + b, 0);
  const totalPlaced = allPlacements.length;

  return {
    maxDepth: 5,
    maxWidth: 3,
    totalCapacity,
    totalPlaced,
    totalAvailableSlots: Math.max(0, totalCapacity - totalPlaced),
    levelBreakdown,
  };
}

/**
 * Returns all directly attachable open slots in the existing tree (or root slot if tree is empty).
 * An open slot is an empty position (0, 1, or 2) under an existing node at level < 5.
 */
export async function getAvailableOpenSlots(orgId: number): Promise<OpenSlot[]> {
  const db = await getDb();
  if (!db) return [];

  const allPlacements = await db
    .select()
    .from(placements)
    .where(eq(placements.orgId, orgId))
    .orderBy(asc(placements.level), asc(placements.positionIndex));

  // If tree is completely empty, the root position is open
  if (allPlacements.length === 0) {
    return [
      {
        parentId: null,
        positionIndex: 0,
        level: 0,
        suggestedCoordinate: "SEC-L0-POS0 (ROOT)",
      },
    ];
  }

  const allMembers = await db.select().from(members).where(eq(members.orgId, orgId));
  const memberMap = new Map<number, Member>();
  for (const m of allMembers) memberMap.set(m.id, m);

  const openSlots: OpenSlot[] = [];

  // Map children by parentId
  const childrenByParent = new Map<number, Set<number>>();
  for (const p of allPlacements) {
    if (p.parentId !== null) {
      const set = childrenByParent.get(p.parentId) || new Set<number>();
      set.add(p.positionIndex);
      childrenByParent.set(p.parentId, set);
    }
  }

  for (const p of allPlacements) {
    // Nodes at level 5 cannot have children in a 3x5 matrix
    if (p.level >= 5) continue;

    const occupiedPositions = childrenByParent.get(p.id) || new Set<number>();
    const parentMem = memberMap.get(p.memberId);
    const parentName = parentMem ? `${parentMem.firstName} ${parentMem.lastName}` : `Member #${p.memberId}`;

    for (let pos = 0; pos < 3; pos++) {
      if (!occupiedPositions.has(pos)) {
        const childLevel = p.level + 1;
        openSlots.push({
          parentId: p.id,
          positionIndex: pos,
          level: childLevel,
          parentMemberName: parentName,
          parentSlotCoordinate: p.slotCoordinate,
          suggestedCoordinate: `SEC-L${childLevel}-P${pos} under ${parentName}`,
        });
      }
    }
  }

  return openSlots;
}

/**
 * Places a member into a specific slot with complete MLM validation
 */
export async function placeMemberInSlot(data: {
  orgId: number;
  memberId: number;
  parentId: number | null;
  positionIndex: number;
  notes?: string;
}): Promise<Placement> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const { orgId, memberId, parentId, positionIndex, notes } = data;

  // 1. Validate member belongs to organization
  const member = await getMemberById(memberId);
  if (!member || member.orgId !== orgId) {
    throw new Error("Target member does not exist in this organization");
  }

  // 2. Validate member is not already placed
  const existingMemberPlacement = await db
    .select()
    .from(placements)
    .where(and(eq(placements.orgId, orgId), eq(placements.memberId, memberId)));

  if (existingMemberPlacement.length > 0) {
    throw new Error(
      `Member ${member.firstName} ${member.lastName} is already placed at coordinate ${existingMemberPlacement[0].slotCoordinate}. Unstack them first to move.`
    );
  }

  let targetLevel = 0;
  let slotCoordinate = "SEC-L0-POS0";

  if (parentId === null) {
    // Root placement validation
    const existingRoot = await db
      .select()
      .from(placements)
      .where(and(eq(placements.orgId, orgId), isNull(placements.parentId)));

    if (existingRoot.length > 0) {
      throw new Error(
        "A root member is already assigned to this downline matrix. Select an open leg under an existing member."
      );
    }
    targetLevel = 0;
    slotCoordinate = "SEC-L0-POS0";
  } else {
    // Child placement validation
    if (positionIndex < 0 || positionIndex > 2) {
      throw new Error("Invalid leg index. In a 3x5 matrix, each member has exactly 3 legs (indexes 0, 1, 2).");
    }

    const parentPlacement = await db
      .select()
      .from(placements)
      .where(and(eq(placements.id, parentId), eq(placements.orgId, orgId)));

    if (parentPlacement.length === 0) {
      throw new Error("Parent position not found in this organization.");
    }

    const parent = parentPlacement[0];
    targetLevel = parent.level + 1;

    if (targetLevel > 5) {
      throw new Error("Cannot place below Level 5. The 3x5 matrix limit has been reached on this branch.");
    }

    // Check if slot (parentId, positionIndex) is already occupied
    const slotTaken = await db
      .select()
      .from(placements)
      .where(
        and(
          eq(placements.orgId, orgId),
          eq(placements.parentId, parentId),
          eq(placements.positionIndex, positionIndex)
        )
      );

    if (slotTaken.length > 0) {
      throw new Error(`Leg position ${positionIndex + 1} under parent is already occupied.`);
    }

    slotCoordinate = `${parent.slotCoordinate}-LEG${positionIndex + 1}`;
  }

  const [inserted] = await db.insert(placements).values({
    orgId,
    memberId,
    parentId,
    level: targetLevel,
    positionIndex: parentId === null ? 0 : positionIndex,
    slotCoordinate,
    notes: notes || null,
  });

  const created = await db.select().from(placements).where(eq(placements.id, inserted.insertId));
  if (created.length === 0) throw new Error("Failed to place member");
  return created[0];
}

/**
 * Unstacks a placement and all its downlines, returning all members to the available unplaced pool
 */
export async function unstackPlacementAndDescendants(placementId: number): Promise<{ unstackedCount: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const target = await db.select().from(placements).where(eq(placements.id, placementId)).limit(1);
  if (target.length === 0) return { unstackedCount: 0 };

  const orgId = target[0].orgId;
  const allPlacements = await db.select().from(placements).where(eq(placements.orgId, orgId));

  // Collect all descendant placement IDs
  const childrenMap = new Map<number, number[]>();
  for (const p of allPlacements) {
    if (p.parentId !== null) {
      const arr = childrenMap.get(p.parentId) || [];
      arr.push(p.id);
      childrenMap.set(p.parentId, arr);
    }
  }

  const idsToDelete: number[] = [];
  function collectIds(currentId: number) {
    idsToDelete.push(currentId);
    const children = childrenMap.get(currentId) || [];
    for (const childId of children) {
      collectIds(childId);
    }
  }

  collectIds(placementId);

  if (idsToDelete.length > 0) {
    await db.delete(placements).where(inArray(placements.id, idsToDelete));
  }

  return { unstackedCount: idsToDelete.length };
}

/**
 * Randomly places unplaced members into available open slots in the 3x5 matrix
 */
export async function randomFillOpenSlots(
  orgId: number,
  count?: number
): Promise<{ placedCount: number; placedMembers: string[] }> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  // Get unplaced members
  const allMembers = await getMembersWithPlacement(orgId, { status: "unplaced" });
  if (allMembers.length === 0) {
    return { placedCount: 0, placedMembers: [] };
  }

  // Shuffle unplaced members
  const shuffledMembers = [...allMembers].sort(() => Math.random() - 0.5);

  let placedCount = 0;
  const placedMemberNames: string[] = [];
  const targetCount = count ? Math.min(count, shuffledMembers.length) : shuffledMembers.length;

  for (let i = 0; i < shuffledMembers.length && placedCount < targetCount; i++) {
    const memberToPlace = shuffledMembers[i];

    // Recalculate available open slots dynamically as tree grows
    const openSlots = await getAvailableOpenSlots(orgId);
    if (openSlots.length === 0) break;

    // Pick a random open slot
    const randomSlot = openSlots[Math.floor(Math.random() * openSlots.length)];

    try {
      await placeMemberInSlot({
        orgId,
        memberId: memberToPlace.id,
        parentId: randomSlot.parentId,
        positionIndex: randomSlot.positionIndex,
      });
      placedCount++;
      placedMemberNames.push(`${memberToPlace.firstName} ${memberToPlace.lastName}`);
    } catch (err) {
      console.warn("Slot placement collision during random fill, continuing...", err);
    }
  }

  return { placedCount, placedMembers: placedMemberNames };
}

/**
 * Top-down BFS Auto-Fill: fills open slots systematically (spillover stacking)
 */
export async function autoFillNextSlots(
  orgId: number,
  count?: number
): Promise<{ placedCount: number; placedMembers: string[] }> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const unplacedMembers = await getMembersWithPlacement(orgId, { status: "unplaced" });
  if (unplacedMembers.length === 0) {
    return { placedCount: 0, placedMembers: [] };
  }

  let placedCount = 0;
  const placedMemberNames: string[] = [];
  const targetCount = count ? Math.min(count, unplacedMembers.length) : unplacedMembers.length;

  for (let i = 0; i < unplacedMembers.length && placedCount < targetCount; i++) {
    const member = unplacedMembers[i];
    const openSlots = await getAvailableOpenSlots(orgId);
    if (openSlots.length === 0) break;

    // Sort by level ascending, then parentId, then positionIndex (systematic BFS)
    openSlots.sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      if ((a.parentId ?? -1) !== (b.parentId ?? -1)) return (a.parentId ?? -1) - (b.parentId ?? -1);
      return a.positionIndex - b.positionIndex;
    });

    const nextSlot = openSlots[0];
    try {
      await placeMemberInSlot({
        orgId,
        memberId: member.id,
        parentId: nextSlot.parentId,
        positionIndex: nextSlot.positionIndex,
      });
      placedCount++;
      placedMemberNames.push(`${member.firstName} ${member.lastName}`);
    } catch (err) {
      console.warn("Auto-fill placement error:", err);
    }
  }

  return { placedCount, placedMembers: placedMemberNames };
}

/**
 * Clears all placements for an organization (resets downline matrix)
 */
export async function clearAllPlacements(orgId: number): Promise<{ clearedCount: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existing = await db.select().from(placements).where(eq(placements.orgId, orgId));
  await db.delete(placements).where(eq(placements.orgId, orgId));
  return { clearedCount: existing.length };
}

// ========================================================
// Seed Data Helper
// ========================================================

export async function seedInitialMLMDataIfEmpty(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const existingOrgs = await db.select().from(organizations);
  if (existingOrgs.length > 0) {
    return; // Already initialized
  }

  // 1. Create primary organization referencing Mr. Curtis
  const [primaryOrg] = await db.insert(organizations).values({
    name: "Apex Horizons MLM Network",
    code: "APEX-HORIZONS",
    description:
      "Premier 3x5 architectural matrix downline organization with verified stacking geometry.",
    matrixWidth: 3,
    matrixDepth: 5,
    blueprintCode: "BLUEPRINT-3X5-CURTIS",
    logoUrl: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=256&h=256&q=80",
  });
  const orgId = primaryOrg.insertId;

  // Create secondary organization for testing org switching
  await db.insert(organizations).values({
    name: "Vanguard Global Alliance",
    code: "VANGUARD-GLOBAL",
    description: "Multi-tier affiliate and distributor organization configured for 3-leg spillover.",
    matrixWidth: 3,
    matrixDepth: 5,
    blueprintCode: "BLUEPRINT-3X5-VANGUARD",
    logoUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=256&h=256&q=80",
  });

  // 2. High-quality member seed profiles with portrait photos (ensuring photos on every page!)
  const seedProfiles = [
    // Key leaders from user's screenshot
    {
      firstName: "Mr.",
      lastName: "Curtis",
      email: "curtis.lead@apexhorizon.org",
      phone: "+1 (555) 234-5678",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80",
      rank: "Crown Director",
      personalVolume: 500,
      notes: "Top-level organization leader. Matrix Root.",
    },
    {
      firstName: "DJ",
      lastName: "Sterling",
      email: "dj.sterling@apexhorizon.org",
      phone: "+1 (555) 345-6789",
      avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80",
      rank: "Diamond Executive",
      personalVolume: 350,
      notes: "Frontline Leg 1 Captain.",
    },
    {
      firstName: "Sarah",
      lastName: "Jenkins",
      email: "sarah.j@apexhorizon.org",
      phone: "+1 (555) 456-7890",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80",
      rank: "Diamond Executive",
      personalVolume: 400,
      notes: "Frontline Leg 2 Captain.",
    },
    {
      firstName: "Marcus",
      lastName: "Vance",
      email: "marcus.v@apexhorizon.org",
      phone: "+1 (555) 567-8901",
      avatarUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=256&h=256&q=80",
      rank: "Gold Leader",
      personalVolume: 300,
      notes: "Frontline Leg 3 Captain.",
    },
    {
      firstName: "Emily",
      lastName: "Watson",
      email: "emily.w@apexhorizon.org",
      phone: "+1 (555) 678-9012",
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&h=256&q=80",
      rank: "Silver Associate",
      personalVolume: 250,
      notes: "Level 2 under DJ.",
    },
    {
      firstName: "Chris",
      lastName: "Evans",
      email: "chris.e@apexhorizon.org",
      phone: "+1 (555) 789-0123",
      avatarUrl: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=256&h=256&q=80",
      rank: "Silver Associate",
      personalVolume: 220,
      notes: "Level 2 under DJ.",
    },
    {
      firstName: "David",
      lastName: "Miller",
      email: "david.m@apexhorizon.org",
      phone: "+1 (555) 890-1234",
      avatarUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=256&h=256&q=80",
      rank: "Silver Associate",
      personalVolume: 280,
      notes: "Level 2 under Sarah.",
    },
    {
      firstName: "John",
      lastName: "Reynolds",
      email: "john.r@apexhorizon.org",
      phone: "+1 (555) 901-2345",
      avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&h=256&q=80",
      rank: "Silver Associate",
      personalVolume: 240,
      notes: "Level 2 under Sarah.",
    },
    {
      firstName: "Lisa",
      lastName: "Chen",
      email: "lisa.c@apexhorizon.org",
      phone: "+1 (555) 012-3456",
      avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&h=256&q=80",
      rank: "Silver Associate",
      personalVolume: 260,
      notes: "Level 2 under Marcus.",
    },
    // Additional unplaced members ready for manual or random placement
    {
      firstName: "Elena",
      lastName: "Rostova",
      email: "elena.r@apexhorizon.org",
      phone: "+1 (555) 111-2233",
      avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&h=256&q=80",
      rank: "Bronze Builder",
      personalVolume: 150,
      notes: "High potential recruit. Master pool.",
    },
    {
      firstName: "Robert",
      lastName: "Kim",
      email: "robert.k@apexhorizon.org",
      phone: "+1 (555) 222-3344",
      avatarUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&h=256&q=80",
      rank: "Bronze Builder",
      personalVolume: 180,
      notes: "Master pool available for placement.",
    },
    {
      firstName: "Amina",
      lastName: "Diallo",
      email: "amina.d@apexhorizon.org",
      phone: "+1 (555) 333-4455",
      avatarUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=256&h=256&q=80",
      rank: "Bronze Builder",
      personalVolume: 200,
      notes: "Ready for placement.",
    },
    {
      firstName: "Tyler",
      lastName: "Brooks",
      email: "tyler.b@apexhorizon.org",
      phone: "+1 (555) 444-5566",
      avatarUrl: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=256&h=256&q=80",
      rank: "Associate",
      personalVolume: 120,
      notes: "Enrolled this week.",
    },
    {
      firstName: "Sophia",
      lastName: "Martinez",
      email: "sophia.m@apexhorizon.org",
      phone: "+1 (555) 555-6677",
      avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&h=256&q=80",
      rank: "Bronze Builder",
      personalVolume: 160,
      notes: "Available in master directory.",
    },
    {
      firstName: "Nathan",
      lastName: "Drake",
      email: "nathan.d@apexhorizon.org",
      phone: "+1 (555) 666-7788",
      avatarUrl: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=256&h=256&q=80",
      rank: "Associate",
      personalVolume: 110,
      notes: "Ready to stack.",
    },
    {
      firstName: "Grace",
      lastName: "Hopper",
      email: "grace.h@apexhorizon.org",
      phone: "+1 (555) 777-8899",
      avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&h=256&q=80",
      rank: "Gold Leader",
      personalVolume: 320,
      notes: "Seasoned networker.",
    },
    {
      firstName: "Carlos",
      lastName: "Santana",
      email: "carlos.s@apexhorizon.org",
      phone: "+1 (555) 888-9900",
      avatarUrl: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=256&h=256&q=80",
      rank: "Associate",
      personalVolume: 100,
      notes: "Newly onboarded.",
    },
    {
      firstName: "Zoe",
      lastName: "Kravitz",
      email: "zoe.k@apexhorizon.org",
      phone: "+1 (555) 999-0011",
      avatarUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=256&h=256&q=80",
      rank: "Silver Associate",
      personalVolume: 210,
      notes: "Master candidate.",
    },
    {
      firstName: "Brian",
      lastName: "O'Conner",
      email: "brian.o@apexhorizon.org",
      phone: "+1 (555) 000-1122",
      avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&h=256&q=80",
      rank: "Associate",
      personalVolume: 100,
      notes: "Unplaced pool.",
    },
    {
      firstName: "Hannah",
      lastName: "Abbott",
      email: "hannah.a@apexhorizon.org",
      phone: "+1 (555) 123-9876",
      avatarUrl: "https://images.unsplash.com/photo-1586297135537-94bc9ba060aa?auto=format&fit=crop&w=256&h=256&q=80",
      rank: "Associate",
      personalVolume: 130,
      notes: "Unplaced pool.",
    },
  ];

  const insertedMemberIds: number[] = [];
  for (const prof of seedProfiles) {
    const [res] = await db.insert(members).values({
      orgId,
      firstName: prof.firstName,
      lastName: prof.lastName,
      email: prof.email,
      phone: prof.phone,
      avatarUrl: prof.avatarUrl,
      rank: prof.rank,
      personalVolume: prof.personalVolume,
      notes: prof.notes,
    });
    insertedMemberIds.push(res.insertId);
  }

  // 3. Recreate the exact downline configuration from user's screenshot:
  // Root: Mr. Curtis (Level 0)
  // Leg 0: DJ (Level 1)
  // Leg 1: Sarah (Level 1)
  // Leg 2: Marcus (Level 1)
  // Under DJ: Emily (pos 0), Chris (pos 1)
  // Under Sarah: David (pos 0), John (pos 1)
  // Under Marcus: Lisa (pos 0)

  const curtisId = insertedMemberIds[0];
  const djId = insertedMemberIds[1];
  const sarahId = insertedMemberIds[2];
  const marcusId = insertedMemberIds[3];
  const emilyId = insertedMemberIds[4];
  const chrisId = insertedMemberIds[5];
  const davidId = insertedMemberIds[6];
  const johnId = insertedMemberIds[7];
  const lisaId = insertedMemberIds[8];

  // Place Root (Mr. Curtis)
  const [curtisPlacement] = await db.insert(placements).values({
    orgId,
    memberId: curtisId,
    parentId: null,
    level: 0,
    positionIndex: 0,
    slotCoordinate: "SEC-L0-POS0",
    notes: "Top Organization Root Leader",
  });
  const rootPid = curtisPlacement.insertId;

  // Place Level 1
  const [djPlacement] = await db.insert(placements).values({
    orgId,
    memberId: djId,
    parentId: rootPid,
    level: 1,
    positionIndex: 0,
    slotCoordinate: "SEC-L0-POS0-LEG1",
    notes: "Leg 1 Leader",
  });
  const djPid = djPlacement.insertId;

  const [sarahPlacement] = await db.insert(placements).values({
    orgId,
    memberId: sarahId,
    parentId: rootPid,
    level: 1,
    positionIndex: 1,
    slotCoordinate: "SEC-L0-POS0-LEG2",
    notes: "Leg 2 Leader",
  });
  const sarahPid = sarahPlacement.insertId;

  const [marcusPlacement] = await db.insert(placements).values({
    orgId,
    memberId: marcusId,
    parentId: rootPid,
    level: 1,
    positionIndex: 2,
    slotCoordinate: "SEC-L0-POS0-LEG3",
    notes: "Leg 3 Leader",
  });
  const marcusPid = marcusPlacement.insertId;

  // Place Level 2 under DJ
  await db.insert(placements).values([
    {
      orgId,
      memberId: emilyId,
      parentId: djPid,
      level: 2,
      positionIndex: 0,
      slotCoordinate: "SEC-L0-POS0-LEG1-LEG1",
      notes: "Emily under DJ",
    },
    {
      orgId,
      memberId: chrisId,
      parentId: djPid,
      level: 2,
      positionIndex: 1,
      slotCoordinate: "SEC-L0-POS0-LEG1-LEG2",
      notes: "Chris under DJ",
    },
  ]);

  // Place Level 2 under Sarah
  await db.insert(placements).values([
    {
      orgId,
      memberId: davidId,
      parentId: sarahPid,
      level: 2,
      positionIndex: 0,
      slotCoordinate: "SEC-L0-POS0-LEG2-LEG1",
      notes: "David under Sarah",
    },
    {
      orgId,
      memberId: johnId,
      parentId: sarahPid,
      level: 2,
      positionIndex: 1,
      slotCoordinate: "SEC-L0-POS0-LEG2-LEG2",
      notes: "John under Sarah",
    },
  ]);

  // Place Level 2 under Marcus
  await db.insert(placements).values([
    {
      orgId,
      memberId: lisaId,
      parentId: marcusPid,
      level: 2,
      positionIndex: 0,
      slotCoordinate: "SEC-L0-POS0-LEG3-LEG1",
      notes: "Lisa under Marcus",
    },
  ]);
}
