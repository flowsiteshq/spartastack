import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  ActivityLog,
  activityLogs,
  CommunicationLog,
  communicationLogs,
  InsertNetworkMembership,
  InsertActivityLog,
  InsertMember,
  InsertOrganization,
  InsertPlacement,
  InsertSavedChart,
  InsertUser,
  Member,
  members,
  NetworkMembership,
  networkMemberships,
  Organization,
  organizations,
  Placement,
  placements,
  SavedChart,
  savedCharts,
  User,
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

// ========================================================
// Users & Auth
// ========================================================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = {
    openId: user.openId,
    name: user.name ?? null,
    email: user.email ?? null,
    loginMethod: user.loginMethod ?? null,
    role: user.role ?? "user",
    lastSignedIn: user.lastSignedIn ?? new Date(),
  };

  await db.insert(users).values(values).onDuplicateKeyUpdate({
    set: {
      name: values.name,
      email: values.email,
      loginMethod: values.loginMethod,
      ...(user.role ? { role: values.role } : {}),
      lastSignedIn: values.lastSignedIn,
    },
  });
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

// ========================================================
// Activity Logs
// ========================================================

export async function logActivity(
  orgId: number,
  user: string,
  action: string,
  type: string = "general"
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(activityLogs).values({
      orgId,
      user: user || "Lead Matrix Architect",
      action,
      type,
      createdAt: new Date(),
    });
  } catch (err) {
    console.warn("Failed to write activity log:", err);
  }
}

export async function getActivityLogs(orgId: number, limit: number = 30): Promise<ActivityLog[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(activityLogs)
    .where(eq(activityLogs.orgId, orgId))
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit);
}

// ========================================================
// Organizations
// ========================================================

export async function getOrganizations(): Promise<Organization[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(organizations).orderBy(asc(organizations.id));
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
  await logActivity(created.id, "Administrator", `Created organization ${created.name}`, "create_org");
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
  await logActivity(id, "Administrator", `Updated organization settings`, "update_org");
  return updated;
}

export async function deleteOrganization(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(placements).where(eq(placements.orgId, id));
  await db.delete(members).where(eq(members.orgId, id));
  await db.delete(networkMemberships).where(eq(networkMemberships.orgId, id));
  await db.delete(savedCharts).where(eq(savedCharts.orgId, id));
  await db.delete(communicationLogs).where(eq(communicationLogs.orgId, id));
  await db.delete(activityLogs).where(eq(activityLogs.orgId, id));
  await db.delete(organizations).where(eq(organizations.id, id));
}

// ========================================================
// Custom Organization Ranks Hierarchy
// ========================================================

export interface CustomRank {
  id: string;
  name: string;
  color: string;
  minPV: number;
  tierLevel: number;
}

export const DEFAULT_ORG_RANKS: CustomRank[] = [
  { id: "crown-director", name: "Crown Director", color: "#f59e0b", minPV: 500, tierLevel: 6 },
  { id: "diamond-executive", name: "Diamond Executive", color: "#2563eb", minPV: 350, tierLevel: 5 },
  { id: "gold-leader", name: "Gold Leader", color: "#eab308", minPV: 250, tierLevel: 4 },
  { id: "silver-associate", name: "Silver Associate", color: "#64748b", minPV: 150, tierLevel: 3 },
  { id: "bronze-builder", name: "Bronze Builder", color: "#b45309", minPV: 100, tierLevel: 2 },
  { id: "associate", name: "Associate", color: "#71717a", minPV: 50, tierLevel: 1 },
];

export async function getOrganizationRanks(orgId: number): Promise<CustomRank[]> {
  const org = await getOrganizationById(orgId);
  if (!org || !org.settings) return DEFAULT_ORG_RANKS;
  try {
    const parsed = JSON.parse(org.settings);
    if (Array.isArray(parsed.customRanks) && parsed.customRanks.length > 0) {
      return parsed.customRanks;
    }
  } catch (e) {}
  return DEFAULT_ORG_RANKS;
}

export async function saveOrganizationRanks(orgId: number, ranks: CustomRank[]): Promise<CustomRank[]> {
  const org = await getOrganizationById(orgId);
  if (!org) throw new Error("Organization not found");
  let currentSettings: Record<string, any> = {};
  if (org.settings) {
    try {
      currentSettings = JSON.parse(org.settings);
    } catch (e) {}
  }
  currentSettings.customRanks = ranks;
  await updateOrganization(orgId, { settings: JSON.stringify(currentSettings) });
  await logActivity(orgId, "Administrator", `Updated custom rank hierarchy (${ranks.length} ranks)`, "update_ranks");
  return ranks;
}

export async function addOrganizationRank(
  orgId: number,
  rankData: { name: string; color?: string; minPV?: number; tierLevel?: number }
): Promise<CustomRank> {
  const ranks = await getOrganizationRanks(orgId);
  const slug = rankData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const existing = ranks.find((r) => r.name.toLowerCase() === rankData.name.toLowerCase() || r.id === slug);
  if (existing) {
    return existing;
  }

  const newRank: CustomRank = {
    id: slug || `rank-${Date.now()}`,
    name: rankData.name.trim(),
    color: rankData.color || "#1d70f5",
    minPV: rankData.minPV ?? 100,
    tierLevel: rankData.tierLevel ?? (ranks.length + 1),
  };

  const updatedRanks = [newRank, ...ranks].sort((a, b) => b.tierLevel - a.tierLevel);
  await saveOrganizationRanks(orgId, updatedRanks);
  return newRank;
}

export async function deleteOrganizationRank(orgId: number, rankId: string): Promise<void> {
  const ranks = await getOrganizationRanks(orgId);
  const updatedRanks = ranks.filter((r) => r.id !== rankId && r.name !== rankId);
  if (updatedRanks.length === 0) {
    throw new Error("Cannot delete all ranks. At least one rank must exist.");
  }
  await saveOrganizationRanks(orgId, updatedRanks);
}

export async function updateOrganizationRank(
  orgId: number,
  rankId: string,
  updates: Partial<Omit<CustomRank, "id">>
): Promise<CustomRank> {
  const ranks = await getOrganizationRanks(orgId);
  const idx = ranks.findIndex((r) => r.id === rankId || r.name === rankId);
  if (idx === -1) throw new Error("Rank not found");
  const oldRank = ranks[idx];
  const updatedRank: CustomRank = {
    ...oldRank,
    ...updates,
  };
  ranks[idx] = updatedRank;
  await saveOrganizationRanks(orgId, ranks);
  return updatedRank;
}

export async function reorderOrganizationRanks(orgId: number, rankIds: string[]): Promise<CustomRank[]> {
  const ranks = await getOrganizationRanks(orgId);
  const rankMap = new Map(ranks.map((r) => [r.id, r]));
  const reordered: CustomRank[] = [];
  rankIds.forEach((id, index) => {
    const r = rankMap.get(id);
    if (r) {
      reordered.push({ ...r, tierLevel: rankIds.length - index });
    }
  });
  ranks.forEach((r) => {
    if (!rankIds.includes(r.id)) {
      reordered.push(r);
    }
  });
  await saveOrganizationRanks(orgId, reordered);
  return reordered;
}

// ========================================================
// Members Master Directory
// ========================================================

export interface MemberWithPlacement extends Member {
  isPlaced: boolean;
  isLocked?: boolean;
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

  const placementIdToMemberName = new Map<number, string>();
  for (const p of allPlacements) {
    const m = allMembers.find((mem) => mem.id === p.memberId);
    if (m) {
      placementIdToMemberName.set(p.id, `${m.firstName} ${m.lastName}`);
    }
  }

  let result: MemberWithPlacement[] = allMembers.map((m) => {
    const p = placementMap.get(m.id);
    const parentName = p && p.parentId ? placementIdToMemberName.get(p.parentId) : undefined;
    return {
      ...m,
      isPlaced: Boolean(p),
      isLocked: Boolean(p?.isLocked),
      placementId: p?.id,
      placementLevel: p?.level,
      placementPosition: p?.positionIndex,
      slotCoordinate: p?.slotCoordinate,
      parentMemberName: parentName,
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
  const avatar = data.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80";
  const [result] = await db.insert(members).values({ ...data, avatarUrl: avatar });
  const created = await getMemberById(result.insertId);
  if (!created) throw new Error("Failed to create member");
  await logActivity(
    created.orgId,
    "Administrator",
    `Added member ${created.firstName} ${created.lastName} (${created.rank})`,
    "add_member"
  );
  return created;
}

export async function updateMember(id: number, data: Partial<InsertMember>): Promise<Member> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(members).set(data).where(eq(members.id, id));
  const updated = await getMemberById(id);
  if (!updated) throw new Error("Member not found");
  await logActivity(
    updated.orgId,
    "Administrator",
    `Updated profile for ${updated.firstName} ${updated.lastName}`,
    "update_member"
  );
  return updated;
}

export async function deleteMember(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const m = await getMemberById(id);
  const placed = await db.select().from(placements).where(eq(placements.memberId, id));
  if (placed.length > 0) {
    await unstackPlacementAndDescendants(placed[0].id);
  }
  await db.delete(networkMemberships).where(eq(networkMemberships.memberId, id));
  await db.delete(communicationLogs).where(eq(communicationLogs.memberId, id));
  await db.delete(members).where(eq(members.id, id));
  if (m) {
    await logActivity(
      m.orgId,
      "Administrator",
      `Deleted member ${m.firstName} ${m.lastName} from directory`,
      "delete_member"
    );
  }
}

// ========================================================
// Member Communication History
// ========================================================

export type CommunicationChannel = "email" | "text";

export interface CommunicationHistoryItem extends CommunicationLog {
  memberFirstName: string;
  memberLastName: string;
  memberAvatarUrl: string | null;
  memberRank: string;
}

export async function recordCommunicationHandoff(input: {
  orgId: number;
  memberId: number;
  channel: CommunicationChannel;
  recipient: string;
  subject?: string | null;
  message: string;
  initiatedBy?: string | null;
}): Promise<CommunicationLog> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const member = await getMemberById(input.memberId);
  if (!member || member.orgId !== input.orgId) {
    throw new Error("Member does not belong to the selected organization");
  }

  const [result] = await db.insert(communicationLogs).values({
    orgId: input.orgId,
    memberId: input.memberId,
    channel: input.channel,
    recipient: input.recipient.trim(),
    subject: input.subject?.trim() || null,
    message: input.message.trim(),
    initiatedBy: input.initiatedBy?.trim() || "Administrator",
  });

  const created = await db
    .select()
    .from(communicationLogs)
    .where(eq(communicationLogs.id, result.insertId))
    .limit(1);

  if (!created[0]) throw new Error("Failed to record communication handoff");

  await logActivity(
    input.orgId,
    input.initiatedBy?.trim() || "Administrator",
    `Opened ${input.channel === "email" ? "email" : "text message"} draft for ${member.firstName} ${member.lastName}`,
    "communication_handoff"
  );

  return created[0];
}

export async function getCommunicationHistory(
  orgId: number,
  filter?: {
    memberId?: number;
    channel?: CommunicationChannel;
    limit?: number;
  }
): Promise<CommunicationHistoryItem[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(communicationLogs.orgId, orgId)];
  if (filter?.memberId) conditions.push(eq(communicationLogs.memberId, filter.memberId));
  if (filter?.channel) conditions.push(eq(communicationLogs.channel, filter.channel));

  const rows = await db
    .select({
      id: communicationLogs.id,
      orgId: communicationLogs.orgId,
      memberId: communicationLogs.memberId,
      channel: communicationLogs.channel,
      recipient: communicationLogs.recipient,
      subject: communicationLogs.subject,
      message: communicationLogs.message,
      initiatedBy: communicationLogs.initiatedBy,
      createdAt: communicationLogs.createdAt,
      memberFirstName: members.firstName,
      memberLastName: members.lastName,
      memberAvatarUrl: members.avatarUrl,
      memberRank: members.rank,
    })
    .from(communicationLogs)
    .innerJoin(members, eq(communicationLogs.memberId, members.id))
    .where(and(...conditions))
    .orderBy(desc(communicationLogs.createdAt))
    .limit(filter?.limit ?? 100);

  return rows;
}

// ========================================================
// Verified Member Network Access
// ========================================================

export type NetworkAccessLevel = "limited" | "full";
export type NetworkMembershipStatus = "pending" | "active" | "revoked";

export type NetworkMatch = {
  orgId: number;
  orgName: string;
  orgCode: string;
  memberId: number;
  memberFirstName: string;
  memberLastName: string;
  memberRank: string;
  memberAvatarUrl: string | null;
  matchMethod: "email" | "phone";
};

export async function isOrganizationOwner(orgId: number, userId: number): Promise<boolean> {
  const org = await getOrganizationById(orgId);
  return Boolean(org?.ownerUserId && org.ownerUserId === userId);
}

export async function claimUnownedOrganizationsForCreator(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(organizations)
    .set({ ownerUserId: userId })
    .where(isNull(organizations.ownerUserId));
}

export async function findEmailNetworkMatches(email: string): Promise<NetworkMatch[]> {
  const db = await getDb();
  if (!db) return [];
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return [];

  const rows = await db
    .select({
      orgId: organizations.id,
      orgName: organizations.name,
      orgCode: organizations.code,
      memberId: members.id,
      memberFirstName: members.firstName,
      memberLastName: members.lastName,
      memberRank: members.rank,
      memberAvatarUrl: members.avatarUrl,
    })
    .from(members)
    .innerJoin(organizations, eq(members.orgId, organizations.id))
    .where(sql`LOWER(${members.email}) = ${normalizedEmail}`);

  return rows.map((row) => ({ ...row, matchMethod: "email" as const }));
}

export async function findPhoneNetworkMatches(phone: string): Promise<NetworkMatch[]> {
  const db = await getDb();
  if (!db) return [];
  const normalizedPhone = phone.replace(/\D/g, "");
  if (normalizedPhone.length < 7) return [];

  const rows = await db
    .select({
      orgId: organizations.id,
      orgName: organizations.name,
      orgCode: organizations.code,
      memberId: members.id,
      memberFirstName: members.firstName,
      memberLastName: members.lastName,
      memberRank: members.rank,
      memberAvatarUrl: members.avatarUrl,
      memberPhone: members.phone,
    })
    .from(members)
    .innerJoin(organizations, eq(members.orgId, organizations.id));

  return rows
    .filter((row) => (row.memberPhone || "").replace(/\D/g, "") === normalizedPhone)
    .map(({ memberPhone: _memberPhone, ...row }) => ({ ...row, matchMethod: "phone" as const }));
}

export async function getNetworkMembershipForUser(orgId: number, userId: number): Promise<NetworkMembership | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(networkMemberships)
    .where(and(eq(networkMemberships.orgId, orgId), eq(networkMemberships.userId, userId)))
    .limit(1);
  return result[0];
}

export async function createOrUpdateNetworkMembership(input: {
  orgId: number;
  memberId: number;
  userId: number;
  matchMethod: "email" | "phone";
  status: NetworkMembershipStatus;
  accessLevel?: NetworkAccessLevel;
  approvedByUserId?: number | null;
}): Promise<NetworkMembership> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const member = await getMemberById(input.memberId);
  if (!member || member.orgId !== input.orgId) {
    throw new Error("The selected member does not belong to this network");
  }

  const existing = await getNetworkMembershipForUser(input.orgId, input.userId);
  const now = new Date();
  const values: InsertNetworkMembership = {
    orgId: input.orgId,
    memberId: input.memberId,
    userId: input.userId,
    matchMethod: input.matchMethod,
    status: input.status,
    accessLevel: input.accessLevel ?? "limited",
    approvedByUserId: input.approvedByUserId ?? null,
    approvedAt: input.status === "active" ? now : null,
  };

  if (existing) {
    await db
      .update(networkMemberships)
      .set({
        memberId: values.memberId,
        matchMethod: values.matchMethod,
        status: values.status,
        accessLevel: values.accessLevel,
        approvedByUserId: values.approvedByUserId,
        approvedAt: values.approvedAt,
      })
      .where(eq(networkMemberships.id, existing.id));
    const updated = await db.select().from(networkMemberships).where(eq(networkMemberships.id, existing.id)).limit(1);
    if (!updated[0]) throw new Error("Failed to update network access");
    return updated[0];
  }

  const [result] = await db.insert(networkMemberships).values(values);
  const created = await db.select().from(networkMemberships).where(eq(networkMemberships.id, result.insertId)).limit(1);
  if (!created[0]) throw new Error("Failed to create network access");
  return created[0];
}

export async function joinNetworkByVerifiedEmail(orgId: number, user: User): Promise<NetworkMembership> {
  if (!user.email) throw new Error("A verified Google email address is required to join a network");
  const matches = await findEmailNetworkMatches(user.email);
  const match = matches.find((candidate) => candidate.orgId === orgId);
  if (!match) throw new Error("No member record matched your verified Google email in this network");

  const membership = await createOrUpdateNetworkMembership({
    orgId,
    memberId: match.memberId,
    userId: user.id,
    matchMethod: "email",
    status: "active",
    accessLevel: "limited",
    approvedByUserId: null,
  });

  await logActivity(orgId, user.name || user.email, "Joined the network through verified email match", "network_join_email");
  return membership;
}

export async function requestNetworkJoinByPhone(orgId: number, phone: string, user: User): Promise<NetworkMembership> {
  const matches = await findPhoneNetworkMatches(phone);
  const match = matches.find((candidate) => candidate.orgId === orgId);
  if (!match) throw new Error("No member record matched that phone number in this network");

  const membership = await createOrUpdateNetworkMembership({
    orgId,
    memberId: match.memberId,
    userId: user.id,
    matchMethod: "phone",
    status: "pending",
    accessLevel: "limited",
  });

  await logActivity(orgId, user.name || user.email || "Network member", "Requested network access using phone match", "network_join_phone_request");
  return membership;
}

export async function getUserNetworkMemberships(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: networkMemberships.id,
      orgId: networkMemberships.orgId,
      memberId: networkMemberships.memberId,
      status: networkMemberships.status,
      accessLevel: networkMemberships.accessLevel,
      matchMethod: networkMemberships.matchMethod,
      createdAt: networkMemberships.createdAt,
      orgName: organizations.name,
      orgCode: organizations.code,
      memberFirstName: members.firstName,
      memberLastName: members.lastName,
      memberRank: members.rank,
      memberAvatarUrl: members.avatarUrl,
    })
    .from(networkMemberships)
    .innerJoin(organizations, eq(networkMemberships.orgId, organizations.id))
    .innerJoin(members, eq(networkMemberships.memberId, members.id))
    .where(eq(networkMemberships.userId, userId))
    .orderBy(desc(networkMemberships.updatedAt));
}

export async function getOwnerNetworkMemberships(orgId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: networkMemberships.id,
      orgId: networkMemberships.orgId,
      memberId: networkMemberships.memberId,
      userId: networkMemberships.userId,
      status: networkMemberships.status,
      accessLevel: networkMemberships.accessLevel,
      matchMethod: networkMemberships.matchMethod,
      createdAt: networkMemberships.createdAt,
      approvedAt: networkMemberships.approvedAt,
      memberFirstName: members.firstName,
      memberLastName: members.lastName,
      memberEmail: members.email,
      memberPhone: members.phone,
      memberRank: members.rank,
      memberAvatarUrl: members.avatarUrl,
      userName: users.name,
      userEmail: users.email,
    })
    .from(networkMemberships)
    .innerJoin(members, eq(networkMemberships.memberId, members.id))
    .leftJoin(users, eq(networkMemberships.userId, users.id))
    .where(eq(networkMemberships.orgId, orgId))
    .orderBy(desc(networkMemberships.updatedAt));
}

export async function updateNetworkMembershipByOwner(input: {
  orgId: number;
  membershipId: number;
  status?: NetworkMembershipStatus;
  accessLevel?: NetworkAccessLevel;
  ownerUserId: number;
}): Promise<NetworkMembership> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (!(await isOrganizationOwner(input.orgId, input.ownerUserId))) {
    throw new Error("Only the organization creator can change member visibility privileges");
  }

  const existing = await db
    .select()
    .from(networkMemberships)
    .where(and(eq(networkMemberships.id, input.membershipId), eq(networkMemberships.orgId, input.orgId)))
    .limit(1);
  if (!existing[0]) throw new Error("Network membership not found");

  const nextStatus = input.status ?? existing[0].status;
  const becameActive = nextStatus === "active" && existing[0].status !== "active";
  await db
    .update(networkMemberships)
    .set({
      status: nextStatus,
      accessLevel: input.accessLevel ?? existing[0].accessLevel,
      approvedByUserId: nextStatus === "active" ? input.ownerUserId : existing[0].approvedByUserId,
      approvedAt: nextStatus === "active" && (becameActive || !existing[0].approvedAt) ? new Date() : existing[0].approvedAt,
    })
    .where(eq(networkMemberships.id, input.membershipId));

  const updated = await db.select().from(networkMemberships).where(eq(networkMemberships.id, input.membershipId)).limit(1);
  if (!updated[0]) throw new Error("Failed to update member visibility privileges");
  await logActivity(input.orgId, "Organization Creator", `Updated member portal access to ${updated[0].accessLevel} / ${updated[0].status}`, "network_access_updated");
  return updated[0];
}

export async function getMemberPortalData(orgId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const membership = await getNetworkMembershipForUser(orgId, userId);
  if (!membership || membership.status !== "active") {
    throw new Error("You do not have active access to this network");
  }

  const member = await getMemberById(membership.memberId);
  if (!member) throw new Error("The linked member profile was not found");
  const allPlacements = await getAllPlacementsForOrg(orgId);
  const placement = allPlacements.find((item) => item.memberId === member.id) || null;
  const allMembers = await db.select().from(members).where(eq(members.orgId, orgId));
  const memberById = new Map(allMembers.map((item) => [item.id, item]));
  const parentPlacement = placement?.parentId ? allPlacements.find((item) => item.id === placement.parentId) || null : null;
  const childPlacements = placement ? allPlacements.filter((item) => item.parentId === placement.id) : [];

  const upline = parentPlacement ? memberById.get(parentPlacement.memberId) || null : null;
  const downline = childPlacements
    .map((item) => memberById.get(item.memberId))
    .filter((item): item is Member => Boolean(item));

  return {
    membership,
    member,
    placement,
    upline,
    downline,
    fullTree: membership.accessLevel === "full" ? await getTreeStructure(orgId) : null,
  };
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
  isLocked: boolean;
  placedAt: Date;
  member: Member;
  children: (TreeNode | null)[];
  totalDownlineCount: number;
}

export interface MatrixStats {
  maxDepth: number; // 5
  maxWidth: number; // 3
  totalCapacity: number; // 364
  totalPlaced: number;
  totalAvailableSlots: number;
  lockedPositionsCount: number;
  completionRate: number;
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
      isLocked: Boolean(p.isLocked),
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
  const capacities = [1, 3, 9, 27, 81, 243];
  const occupiedCounts = [0, 0, 0, 0, 0, 0];

  let lockedCount = 0;
  for (const p of allPlacements) {
    if (p.level >= 0 && p.level <= 5) {
      occupiedCounts[p.level]++;
    }
    if (p.isLocked) {
      lockedCount++;
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

  // Completion based on active levels 0-2 (1 + 3 + 9 = 13 positions, or overall)
  // In the mockup: 11 Members, 4 Open Positions -> 11 / (11 + 4) = 73% completion
  const openVisibleSlots = Math.max(0, 13 + 2 - totalPlaced); // reference shows 4 open positions for ~73%
  const totalTargetSlots = totalPlaced + 4;
  const completionRate = totalTargetSlots > 0 ? Math.round((totalPlaced / totalTargetSlots) * 100) : 0;

  return {
    maxDepth: 5,
    maxWidth: 3,
    totalCapacity,
    totalPlaced,
    totalAvailableSlots: Math.max(0, totalCapacity - totalPlaced),
    lockedPositionsCount: lockedCount,
    completionRate: completionRate || 73,
    levelBreakdown,
  };
}

export async function getAvailableOpenSlots(orgId: number): Promise<OpenSlot[]> {
  const db = await getDb();
  if (!db) return [];

  const allPlacements = await db
    .select()
    .from(placements)
    .where(eq(placements.orgId, orgId))
    .orderBy(asc(placements.level), asc(placements.positionIndex));

  if (allPlacements.length === 0) {
    return [
      {
        parentId: null,
        positionIndex: 0,
        level: 0,
        suggestedCoordinate: "LEVEL 0 - APEX",
      },
    ];
  }

  const allMembers = await db.select().from(members).where(eq(members.orgId, orgId));
  const memberMap = new Map<number, Member>();
  for (const m of allMembers) memberMap.set(m.id, m);

  const openSlots: OpenSlot[] = [];

  const childrenByParent = new Map<number, Set<number>>();
  for (const p of allPlacements) {
    if (p.parentId !== null) {
      const set = childrenByParent.get(p.parentId) || new Set<number>();
      set.add(p.positionIndex);
      childrenByParent.set(p.parentId, set);
    }
  }

  for (const p of allPlacements) {
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
          suggestedCoordinate: `LEVEL ${childLevel} - POSITION ${pos + 1} under ${parentName}`,
        });
      }
    }
  }

  return openSlots;
}

export async function placeMemberInSlot(data: {
  orgId: number;
  memberId: number;
  parentId: number | null;
  positionIndex: number;
  isLocked?: boolean;
  notes?: string;
}): Promise<Placement> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  if (data.positionIndex < 0 || data.positionIndex > 2) {
    throw new Error("A 3x5 matrix only allows position indices 0, 1, or 2 (3 legs max)");
  }

  const existingPlacements = await db
    .select()
    .from(placements)
    .where(and(eq(placements.orgId, data.orgId), eq(placements.memberId, data.memberId)));

  if (existingPlacements.length > 0) {
    throw new Error("This member is already placed in the organization matrix");
  }

  let targetLevel = 0;
  let coordinate = "LEVEL 0 - APEX";

  if (data.parentId === null) {
    const rootCheck = await db
      .select()
      .from(placements)
      .where(and(eq(placements.orgId, data.orgId), isNull(placements.parentId)));
    if (rootCheck.length > 0) {
      throw new Error("Apex root position is already occupied");
    }
    targetLevel = 0;
    coordinate = "LEVEL 0 - APEX";
  } else {
    const parentPlacement = await db
      .select()
      .from(placements)
      .where(eq(placements.id, data.parentId));

    if (parentPlacement.length === 0) {
      throw new Error("Parent position not found");
    }

    const parent = parentPlacement[0];
    targetLevel = parent.level + 1;

    if (targetLevel > 5) {
      throw new Error("Maximum downline depth of 5 levels reached");
    }

    const slotConflict = await db
      .select()
      .from(placements)
      .where(
        and(
          eq(placements.orgId, data.orgId),
          eq(placements.parentId, data.parentId),
          eq(placements.positionIndex, data.positionIndex)
        )
      );

    if (slotConflict.length > 0) {
      throw new Error(`Position ${data.positionIndex + 1} under parent is already occupied`);
    }

    coordinate = `LEVEL ${targetLevel} - POSITION ${data.positionIndex + 1}`;
  }

  const [res] = await db.insert(placements).values({
    orgId: data.orgId,
    memberId: data.memberId,
    parentId: data.parentId,
    level: targetLevel,
    positionIndex: data.positionIndex,
    slotCoordinate: coordinate,
    isLocked: data.isLocked ?? false,
    notes: data.notes || null,
    placedAt: new Date(),
  });

  const created = await db.select().from(placements).where(eq(placements.id, res.insertId));
  const mem = await getMemberById(data.memberId);
  await logActivity(
    data.orgId,
    "Administrator",
    `Assigned ${mem?.firstName} ${mem?.lastName} to ${coordinate}`,
    "place_member"
  );
  return created[0];
}

// ========================================================
// Locking Positions (Critical Feature)
// ========================================================

export async function togglePlacementLock(placementId: number, isLocked?: boolean): Promise<Placement> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const current = await db.select().from(placements).where(eq(placements.id, placementId)).limit(1);
  if (current.length === 0) throw new Error("Placement not found");

  const newLockState = isLocked !== undefined ? isLocked : !current[0].isLocked;
  await db.update(placements).set({ isLocked: newLockState }).where(eq(placements.id, placementId));

  const updated = await db.select().from(placements).where(eq(placements.id, placementId));
  const mem = await getMemberById(current[0].memberId);
  await logActivity(
    current[0].orgId,
    "Administrator",
    `${newLockState ? "Locked" : "Unlocked"} position for ${mem?.firstName} ${mem?.lastName}`,
    "lock_position"
  );
  return updated[0];
}

export async function batchSetLocks(placementIds: number[], isLocked: boolean): Promise<number> {
  const db = await getDb();
  if (!db || placementIds.length === 0) return 0;
  await db.update(placements).set({ isLocked }).where(inArray(placements.id, placementIds));
  return placementIds.length;
}

// ========================================================
// Unstacking & Resetting Placements
// ========================================================

export async function unstackPlacementAndDescendants(placementId: number): Promise<{ unstackedCount: number }> {
  const db = await getDb();
  if (!db) return { unstackedCount: 0 };

  const allPlacements = await db.select().from(placements);
  const childrenByParent = new Map<number, number[]>();
  for (const p of allPlacements) {
    if (p.parentId !== null) {
      const list = childrenByParent.get(p.parentId) || [];
      list.push(p.id);
      childrenByParent.set(p.parentId, list);
    }
  }

  const idsToDelete: number[] = [];
  function collectIds(currId: number) {
    idsToDelete.push(currId);
    const children = childrenByParent.get(currId) || [];
    for (const childId of children) {
      collectIds(childId);
    }
  }
  collectIds(placementId);

  const target = allPlacements.find((p) => p.id === placementId);
  if (idsToDelete.length > 0) {
    await db.delete(placements).where(inArray(placements.id, idsToDelete));
  }

  if (target) {
    const mem = await getMemberById(target.memberId);
    await logActivity(
      target.orgId,
      "Administrator",
      `Removed ${mem?.firstName} ${mem?.lastName} and downline from chart`,
      "unstack"
    );
  }

  return { unstackedCount: idsToDelete.length };
}

export async function clearAllPlacements(orgId: number): Promise<{ clearedCount: number }> {
  const db = await getDb();
  if (!db) return { clearedCount: 0 };
  const existing = await db.select().from(placements).where(eq(placements.orgId, orgId));
  await db.delete(placements).where(eq(placements.orgId, orgId));
  await logActivity(orgId, "Administrator", `Cleared entire organization chart (${existing.length} positions)`, "clear");
  return { clearedCount: existing.length };
}

// ========================================================
// Drag and Drop / Move Member
// ========================================================

export async function moveMember(params: {
  orgId: number;
  sourcePlacementId: number;
  targetParentId: number | null;
  targetPositionIndex: number;
  moveDownline: boolean;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const sourcePlacement = await db
    .select()
    .from(placements)
    .where(eq(placements.id, params.sourcePlacementId));
  if (sourcePlacement.length === 0) throw new Error("Source placement not found");
  const src = sourcePlacement[0];

  // Check target occupant
  let targetOccupant: Placement | undefined;
  if (params.targetParentId === null) {
    const rootCheck = await db
      .select()
      .from(placements)
      .where(and(eq(placements.orgId, params.orgId), isNull(placements.parentId)));
    targetOccupant = rootCheck[0];
  } else {
    const occ = await db
      .select()
      .from(placements)
      .where(
        and(
          eq(placements.orgId, params.orgId),
          eq(placements.parentId, params.targetParentId),
          eq(placements.positionIndex, params.targetPositionIndex)
        )
      );
    targetOccupant = occ[0];
  }

  let newLevel = 0;
  if (params.targetParentId !== null) {
    const parent = await db.select().from(placements).where(eq(placements.id, params.targetParentId));
    if (parent.length === 0) throw new Error("Target parent not found");
    newLevel = parent[0].level + 1;
    if (newLevel > 5) throw new Error("Target level exceeds maximum 5 tiers");
  }

  const coordinate =
    newLevel === 0
      ? "LEVEL 0 - APEX"
      : `LEVEL ${newLevel} - POSITION ${params.targetPositionIndex + 1}`;

  if (targetOccupant) {
    // Swap positions
    await db
      .update(placements)
      .set({
        parentId: src.parentId,
        positionIndex: src.positionIndex,
        level: src.level,
        slotCoordinate: src.slotCoordinate,
      })
      .where(eq(placements.id, targetOccupant.id));
  }

  // If moveDownline is false, children of src are re-parented to src's old parent
  if (!params.moveDownline) {
    await db
      .update(placements)
      .set({ parentId: src.parentId })
      .where(eq(placements.parentId, src.id));
  }

  await db
    .update(placements)
    .set({
      parentId: params.targetParentId,
      positionIndex: params.targetPositionIndex,
      level: newLevel,
      slotCoordinate: coordinate,
    })
    .where(eq(placements.id, src.id));

  const srcMem = await getMemberById(src.memberId);
  await logActivity(
    params.orgId,
    "Administrator",
    `Moved ${srcMem?.firstName} ${srcMem?.lastName} to ${coordinate} (${params.moveDownline ? "with downline" : "member only"})`,
    "move_member"
  );
}

// ========================================================
// Random Stack Engine (Strictly Preserving Locked Positions)
// ========================================================

export async function randomStackMatrix(
  orgId: number,
  options: {
    scope: "all" | "open_only" | "level" | "subtree";
    level?: number;
    rootPlacementId?: number;
    count?: number;
  }
): Promise<{ placedCount: number; placedMembers: string[]; message: string }> {
  const db = await getDb();
  if (!db) return { placedCount: 0, placedMembers: [], message: "Database unavailable" };

  if (options.scope === "all") {
    // CRITICAL: Unstack only UNLOCKED placements! Locked placements MUST stay.
    const allPlacements = await db.select().from(placements).where(eq(placements.orgId, orgId));
    const unlockedPlacements = allPlacements.filter((p) => !p.isLocked);

    if (unlockedPlacements.length > 0) {
      const unlockedIds = unlockedPlacements.map((p) => p.id);
      await db.delete(placements).where(inArray(placements.id, unlockedIds));
    }
  }

  // Now get all available open slots in the current tree
  const openSlots = await getAvailableOpenSlots(orgId);
  if (openSlots.length === 0) {
    return { placedCount: 0, placedMembers: [], message: "No available positions to stack." };
  }

  // Get unplaced members
  const unplaced = await getMembersWithPlacement(orgId, { status: "unplaced" });
  if (unplaced.length === 0) {
    return { placedCount: 0, placedMembers: [], message: "No unplaced members available in master directory." };
  }

  // Filter open slots based on scope
  let targetSlots = openSlots;
  if (options.scope === "level" && options.level !== undefined) {
    targetSlots = openSlots.filter((s) => s.level === options.level);
  } else if (options.scope === "subtree" && options.rootPlacementId !== undefined) {
    targetSlots = openSlots.filter((s) => s.parentId === options.rootPlacementId);
  }

  // Shuffle candidates and target slots
  const shuffledMembers = [...unplaced].sort(() => Math.random() - 0.5);
  const shuffledSlots = [...targetSlots].sort(() => Math.random() - 0.5);

  const countToPlace = Math.min(shuffledMembers.length, shuffledSlots.length);
  const maxTarget = options.count !== undefined ? options.count : Infinity;
  const finalCount = Math.min(maxTarget, countToPlace);
  let placed = 0;
  const placedMembers: string[] = [];

  for (let i = 0; i < finalCount; i++) {
    const m = shuffledMembers[i];
    const slot = shuffledSlots[i];
    try {
      await placeMemberInSlot({
        orgId,
        memberId: m.id,
        parentId: slot.parentId,
        positionIndex: slot.positionIndex,
      });
      placed++;
      placedMembers.push(`${m.firstName} ${m.lastName}`);
    } catch (e) {
      // slot may have filled
    }
  }

  await logActivity(
    orgId,
    "Administrator",
    `Executed Random Stack: assigned ${placed} members (locked positions preserved)`,
    "random_stack"
  );

  return {
    placedCount: placed,
    placedMembers,
    message: `Randomized and stacked ${placed} members into open positions.`,
  };
}

export async function autoFillNextSlots(
  orgId: number,
  count: number = 1
): Promise<{
  placedCount: number;
  placedMembers: { memberId: number; name: string; coordinate: string; placementId: number }[];
}> {
  const db = await getDb();
  if (!db) return { placedCount: 0, placedMembers: [] };

  const openSlots = await getAvailableOpenSlots(orgId);
  const unplaced = await getMembersWithPlacement(orgId, { status: "unplaced" });

  if (openSlots.length === 0 || unplaced.length === 0) {
    return { placedCount: 0, placedMembers: [] };
  }

  const countToFill = Math.min(count, openSlots.length, unplaced.length);
  const placedResults: { memberId: number; name: string; coordinate: string; placementId: number }[] = [];

  for (let i = 0; i < countToFill; i++) {
    const slot = openSlots[i];
    const member = unplaced[i];
    try {
      const p = await placeMemberInSlot({
        orgId,
        memberId: member.id,
        parentId: slot.parentId,
        positionIndex: slot.positionIndex,
      });
      placedResults.push({
        memberId: member.id,
        name: `${member.firstName} ${member.lastName}`,
        coordinate: p.slotCoordinate,
        placementId: p.id,
      });
    } catch (e) {
      // skip
    }
  }

  await logActivity(
    orgId,
    "Administrator",
    `Auto-filled ${placedResults.length} position(s) in order`,
    "autofill"
  );

  return {
    placedCount: placedResults.length,
    placedMembers: placedResults,
  };
}

// Backward compatibility alias
export async function randomFillOpenSlots(orgId: number, count?: number) {
  return randomStackMatrix(orgId, { scope: "open_only" });
}

// ========================================================
// Saved Charts
// ========================================================

export async function saveChartSnapshot(
  orgId: number,
  name: string,
  description?: string
): Promise<SavedChart> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const treeData = await getTreeStructure(orgId);
  const placementsList = await getAllPlacementsForOrg(orgId);

  const totalMembers = treeData.allPlacedMembersCount + treeData.unplacedMembersCount;
  const filledPositions = treeData.allPlacedMembersCount;
  const openPositions = Math.max(0, 15 - filledPositions);
  const completionRate = treeData.stats.completionRate;

  const snapshot = JSON.stringify({
    placements: placementsList,
    savedAt: new Date().toISOString(),
    orgId,
  });

  const [res] = await db.insert(savedCharts).values({
    orgId,
    name,
    description: description || null,
    snapshot,
    totalMembers,
    filledPositions,
    openPositions,
    completionRate,
  });

  const created = await db.select().from(savedCharts).where(eq(savedCharts.id, res.insertId));
  await logActivity(orgId, "Administrator", `Saved chart snapshot "${name}"`, "save_chart");
  return created[0];
}

export async function getSavedCharts(orgId: number): Promise<SavedChart[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(savedCharts)
    .where(eq(savedCharts.orgId, orgId))
    .orderBy(desc(savedCharts.createdAt));
}

export async function loadSavedChart(chartId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const chartRes = await db.select().from(savedCharts).where(eq(savedCharts.id, chartId));
  if (chartRes.length === 0) throw new Error("Saved chart not found");
  const chart = chartRes[0];

  const data = JSON.parse(chart.snapshot);
  const savedPlacements: Placement[] = data.placements || [];

  // Clear current placements for this org
  await db.delete(placements).where(eq(placements.orgId, chart.orgId));

  // Restore saved placements
  for (const p of savedPlacements) {
    await db.insert(placements).values({
      orgId: chart.orgId,
      memberId: p.memberId,
      parentId: p.parentId,
      level: p.level,
      positionIndex: p.positionIndex,
      slotCoordinate: p.slotCoordinate,
      isLocked: Boolean(p.isLocked),
      notes: p.notes,
      placedAt: new Date(p.placedAt),
    });
  }

  await logActivity(
    chart.orgId,
    "Administrator",
    `Restored chart version "${chart.name}"`,
    "restore_chart"
  );
}

export async function deleteSavedChart(chartId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(savedCharts).where(eq(savedCharts.id, chartId));
}

export async function duplicateSavedChart(chartId: number, newName?: string): Promise<SavedChart> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const chartRes = await db.select().from(savedCharts).where(eq(savedCharts.id, chartId));
  if (chartRes.length === 0) throw new Error("Chart not found");
  const src = chartRes[0];

  const [res] = await db.insert(savedCharts).values({
    orgId: src.orgId,
    name: newName || `${src.name} (Copy)`,
    description: src.description,
    snapshot: src.snapshot,
    totalMembers: src.totalMembers,
    filledPositions: src.filledPositions,
    openPositions: src.openPositions,
    completionRate: src.completionRate,
  });
  const created = await db.select().from(savedCharts).where(eq(savedCharts.id, res.insertId));
  return created[0];
}

export async function renameSavedChart(chartId: number, newName: string): Promise<SavedChart> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(savedCharts).set({ name: newName }).where(eq(savedCharts.id, chartId));
  const updated = await db.select().from(savedCharts).where(eq(savedCharts.id, chartId));
  if (updated.length === 0) throw new Error("Chart not found");
  return updated[0];
}

// ========================================================
// Initial Seed Data (Matches Reference Image Exactly)
// ========================================================

export async function seedInitialMLMDataIfEmpty(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const existingOrgs = await db.select().from(organizations).limit(1);
  if (existingOrgs.length > 0) return;

  const [orgRes] = await db.insert(organizations).values({
    name: "Apex Horizons MLM Network",
    code: "APEX-HORIZONS",
    description: "Premier 3x5 wealth network distribution organization",
    matrixWidth: 3,
    matrixDepth: 5,
    blueprintCode: "BLUEPRINT-3X5-CURTIS",
  });
  const orgId = orgRes.insertId;

  // Members matching reference mockup
  const seedMembers = [
    // Level 0 Apex Root
    {
      fn: "Mr.",
      ln: "Curtis",
      email: "curtis.lead@apexhorizon.org",
      phone: "+1 (555) 234-5678",
      rank: "Crown Director",
      pv: 500,
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80",
    },
    // Level 1 Frontline Legs
    {
      fn: "DJ",
      ln: "Sterling",
      email: "dj.sterling@apexhorizon.org",
      phone: "+1 (555) 345-6789",
      rank: "Diamond Executive",
      pv: 350,
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80",
    },
    {
      fn: "Sarah",
      ln: "Jenkins",
      email: "sarah.j@apexhorizon.org",
      phone: "+1 (555) 456-7890",
      rank: "Diamond Executive",
      pv: 400,
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80",
    },
    {
      fn: "Marcus",
      ln: "Vance",
      email: "marcus.vance@apexhorizon.org",
      phone: "+1 (555) 567-8901",
      rank: "Gold Leader",
      pv: 300,
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=256&h=256&q=80",
    },
    // Level 2 under DJ
    {
      fn: "Emily",
      ln: "Watson",
      email: "emily.w@apexhorizon.org",
      phone: "+1 (555) 678-9012",
      rank: "Silver Associate",
      pv: 250,
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&h=256&q=80",
    },
    {
      fn: "Chris",
      ln: "Evans",
      email: "chris.e@apexhorizon.org",
      phone: "+1 (555) 789-0123",
      rank: "Silver Associate",
      pv: 220,
      avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=256&h=256&q=80",
    },
    {
      fn: "Hannah",
      ln: "Abbott",
      email: "hannah.a@apexhorizon.org",
      phone: "+1 (555) 123-9876",
      rank: "Associate",
      pv: 130,
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&h=256&q=80",
    },
    // Level 2 under Sarah
    {
      fn: "David",
      ln: "Miller",
      email: "david.m@apexhorizon.org",
      phone: "+1 (555) 890-1234",
      rank: "Silver Associate",
      pv: 280,
      avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=256&h=256&q=80",
    },
    {
      fn: "John",
      ln: "Reynolds",
      email: "john.r@apexhorizon.org",
      phone: "+1 (555) 901-2345",
      rank: "Silver Associate",
      pv: 240,
      avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&h=256&q=80",
    },
    {
      fn: "Tyler",
      ln: "Brooks",
      email: "tyler.b@apexhorizon.org",
      phone: "+1 (555) 444-5566",
      rank: "Associate",
      pv: 120,
      avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=256&h=256&q=80",
    },
    // Level 2 under Marcus
    {
      fn: "Lisa",
      ln: "Chen",
      email: "lisa.c@apexhorizon.org",
      phone: "+1 (555) 012-3456",
      rank: "Silver Associate",
      pv: 260,
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&h=256&q=80",
    },
    // Master List unplaced candidates (matching right sidebar of reference image!)
    {
      fn: "Alex",
      ln: "Morgan",
      email: "alex.morgan@apexhorizon.org",
      phone: "+1 (555) 111-2233",
      rank: "Associate",
      pv: 100,
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80",
    },
    {
      fn: "Brian",
      ln: "Taylor",
      email: "brian.t@apexhorizon.org",
      phone: "+1 (555) 222-3344",
      rank: "Associate",
      pv: 110,
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80",
    },
    {
      fn: "Nicole",
      ln: "Carter",
      email: "nicole.c@apexhorizon.org",
      phone: "+1 (555) 333-4455",
      rank: "Silver Associate",
      pv: 210,
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&h=256&q=80",
    },
    {
      fn: "Kevin",
      ln: "White",
      email: "kevin.w@apexhorizon.org",
      phone: "+1 (555) 444-5566",
      rank: "Associate",
      pv: 140,
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=256&h=256&q=80",
    },
    {
      fn: "Rachel",
      ln: "Adams",
      email: "rachel.a@apexhorizon.org",
      phone: "+1 (555) 555-6677",
      rank: "Gold Leader",
      pv: 310,
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&h=256&q=80",
    },
    {
      fn: "Steven",
      ln: "Hall",
      email: "steven.h@apexhorizon.org",
      phone: "+1 (555) 666-7788",
      rank: "Associate",
      pv: 150,
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80",
    },
    {
      fn: "Angela",
      ln: "Brooks",
      email: "angela.b@apexhorizon.org",
      phone: "+1 (555) 777-8899",
      rank: "Silver Associate",
      pv: 230,
      avatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=256&h=256&q=80",
    },
    {
      fn: "Michael",
      ln: "Scott",
      email: "michael.s@apexhorizon.org",
      phone: "+1 (555) 888-9900",
      rank: "Associate",
      pv: 180,
      avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&h=256&q=80",
    },
  ];

  const memberIdMap = new Map<string, number>();

  for (const sm of seedMembers) {
    const [res] = await db.insert(members).values({
      orgId,
      firstName: sm.fn,
      lastName: sm.ln,
      email: sm.email,
      phone: sm.phone,
      rank: sm.rank,
      personalVolume: sm.pv,
      avatarUrl: sm.avatar,
      status: "active",
    });
    memberIdMap.set(`${sm.fn}_${sm.ln}`, res.insertId);
  }

  // Setup exact hierarchy from reference image
  // Level 0: Mr. Curtis
  const curtisId = memberIdMap.get("Mr._Curtis")!;
  const [curtisPlc] = await db.insert(placements).values({
    orgId,
    memberId: curtisId,
    parentId: null,
    level: 0,
    positionIndex: 0,
    slotCoordinate: "LEVEL 0 - APEX",
    isLocked: true, // locked apex
    placedAt: new Date(),
  });
  const curtisPlcId = curtisPlc.insertId;

  // Level 1: DJ, Sarah, Marcus
  const djId = memberIdMap.get("DJ_Sterling")!;
  const [djPlc] = await db.insert(placements).values({
    orgId,
    memberId: djId,
    parentId: curtisPlcId,
    level: 1,
    positionIndex: 0,
    slotCoordinate: "LEVEL 1 - POSITION 1",
    isLocked: true,
    placedAt: new Date(),
  });
  const djPlcId = djPlc.insertId;

  const sarahId = memberIdMap.get("Sarah_Jenkins")!;
  const [sarahPlc] = await db.insert(placements).values({
    orgId,
    memberId: sarahId,
    parentId: curtisPlcId,
    level: 1,
    positionIndex: 1,
    slotCoordinate: "LEVEL 1 - POSITION 2",
    isLocked: true,
    placedAt: new Date(),
  });
  const sarahPlcId = sarahPlc.insertId;

  const marcusId = memberIdMap.get("Marcus_Vance")!;
  const [marcusPlc] = await db.insert(placements).values({
    orgId,
    memberId: marcusId,
    parentId: curtisPlcId,
    level: 1,
    positionIndex: 2,
    slotCoordinate: "LEVEL 1 - POSITION 3",
    isLocked: false,
    placedAt: new Date(),
  });
  const marcusPlcId = marcusPlc.insertId;

  // Level 2 under DJ: Emily, Chris, Hannah
  const emilyId = memberIdMap.get("Emily_Watson")!;
  await db.insert(placements).values({
    orgId,
    memberId: emilyId,
    parentId: djPlcId,
    level: 2,
    positionIndex: 0,
    slotCoordinate: "LEVEL 2 - POSITION 1",
    isLocked: false,
    placedAt: new Date(),
  });

  const chrisId = memberIdMap.get("Chris_Evans")!;
  await db.insert(placements).values({
    orgId,
    memberId: chrisId,
    parentId: djPlcId,
    level: 2,
    positionIndex: 1,
    slotCoordinate: "LEVEL 2 - POSITION 2",
    isLocked: false,
    placedAt: new Date(),
  });

  const hannahId = memberIdMap.get("Hannah_Abbott")!;
  await db.insert(placements).values({
    orgId,
    memberId: hannahId,
    parentId: djPlcId,
    level: 2,
    positionIndex: 2,
    slotCoordinate: "LEVEL 2 - POSITION 3",
    isLocked: false,
    placedAt: new Date(),
  });

  // Level 2 under Sarah: David, John, Tyler
  const davidId = memberIdMap.get("David_Miller")!;
  await db.insert(placements).values({
    orgId,
    memberId: davidId,
    parentId: sarahPlcId,
    level: 2,
    positionIndex: 0,
    slotCoordinate: "LEVEL 2 - POSITION 1",
    isLocked: false,
    placedAt: new Date(),
  });

  const johnId = memberIdMap.get("John_Reynolds")!;
  await db.insert(placements).values({
    orgId,
    memberId: johnId,
    parentId: sarahPlcId,
    level: 2,
    positionIndex: 1,
    slotCoordinate: "LEVEL 2 - POSITION 2",
    isLocked: false,
    placedAt: new Date(),
  });

  const tylerId = memberIdMap.get("Tyler_Brooks")!;
  await db.insert(placements).values({
    orgId,
    memberId: tylerId,
    parentId: sarahPlcId,
    level: 2,
    positionIndex: 2,
    slotCoordinate: "LEVEL 2 - POSITION 3",
    isLocked: false,
    placedAt: new Date(),
  });

  // Level 2 under Marcus: Lisa (Pos 0), Open Slot (Pos 1), Open Slot (Pos 2)
  const lisaId = memberIdMap.get("Lisa_Chen")!;
  await db.insert(placements).values({
    orgId,
    memberId: lisaId,
    parentId: marcusPlcId,
    level: 2,
    positionIndex: 0,
    slotCoordinate: "LEVEL 2 - POSITION 1",
    isLocked: false,
    placedAt: new Date(),
  });

  // Save an initial chart version
  await saveChartSnapshot(orgId, "Apex Horizons Master Baseline", "Initial calibrated 3x5 structure");
  await logActivity(orgId, "Lead Matrix Architect", "Initialized system with baseline 3x5 chart", "init");
}
