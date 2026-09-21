import mysql from "mysql2/promise";

const ownerEmail = "sensei30002003@gmail.com";
const now = new Date();

const people = [
  ["leonidas", "Leonidas", "King", "leonidas@example.spartanstack.io", "Crown Director", 500, "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80"],
  ["athena", "Athena", "Vale", "athena@example.spartanstack.io", "Diamond Executive", 420, "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&h=256&q=80"],
  ["orion", "Orion", "Reed", "orion@example.spartanstack.io", "Diamond Executive", 385, "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80"],
  ["lyra", "Lyra", "Stone", "lyra@example.spartanstack.io", "Gold Leader", 325, "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80"],
  ["damon", "Damon", "Cross", "damon@example.spartanstack.io", "Silver Associate", 245, "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=256&h=256&q=80"],
  ["cassia", "Cassia", "Rowe", "cassia@example.spartanstack.io", "Silver Associate", 220, "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&h=256&q=80"],
  ["theo", "Theo", "Grant", "theo@example.spartanstack.io", "Associate", 145, "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=256&h=256&q=80"],
  ["helena", "Helena", "Troy", "helena@example.spartanstack.io", "Silver Associate", 235, "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=256&h=256&q=80"],
  ["cassius", "Cassius", "Vance", "cassius@example.spartanstack.io", "Silver Associate", 210, "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&h=256&q=80"],
  ["isadora", "Isadora", "North", "isadora@example.spartanstack.io", "Associate", 150, "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&h=256&q=80"],
  ["nikos", "Nikos", "Ash", "nikos@example.spartanstack.io", "Silver Associate", 225, "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=256&h=256&q=80"],
  ["elara", "Elara", "Wren", "elara@example.spartanstack.io", "Silver Associate", 205, "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&h=256&q=80"],
  ["marcus", "Marcus", "Aurelius", "marcus@example.spartanstack.io", "Associate", 135, "https://images.unsplash.com/photo-1507591064344-4c6ce005b128?auto=format&fit=crop&w=256&h=256&q=80"],
  ["mira", "Mira", "Sol", "mira@example.spartanstack.io", "Associate", 110, "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80"],
  ["thalia", "Thalia", "West", "thalia@example.spartanstack.io", "Associate", 105, "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=256&h=256&q=80"],
  ["argus", "Argus", "Pike", "argus@example.spartanstack.io", "Bronze Builder", 115, "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=256&h=256&q=80"],
  ["selene", "Selene", "Ray", "selene@example.spartanstack.io", "Associate", 100, "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=256&h=256&q=80"],
  ["draco", "Draco", "Lane", "draco@example.spartanstack.io", "Bronze Builder", 120, "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&h=256&q=80"],
];

const db = await mysql.createConnection(process.env.DATABASE_URL);
try {
  await db.beginTransaction();

  const [owners] = await db.execute("SELECT id FROM users WHERE email = ? LIMIT 1", [ownerEmail]);
  let ownerUserId = owners[0]?.id;
  if (!ownerUserId) {
    const [fallbackOwners] = await db.query("SELECT id FROM users ORDER BY role = 'admin' DESC, id ASC LIMIT 1");
    ownerUserId = fallbackOwners[0]?.id;
  }
  if (!ownerUserId) {
    const [newOwner] = await db.execute(
      `INSERT INTO users (openId, name, email, loginMethod, role, createdAt, updatedAt, lastSignedIn)
       VALUES ('sparta_nation_example_owner', 'Sparta Nation', ?, 'system', 'admin', ?, ?, ?)`,
      [ownerEmail, now, now, now],
    );
    ownerUserId = newOwner.insertId;
  }

  // This workspace only contains system-generated demo data. Remove all demo
  // organization records and rebuild the single approved example below.
  for (const table of ["placements", "network_memberships", "saved_charts", "communication_logs", "activity_logs", "members", "organizations"]) {
    await db.query(`DELETE FROM \`${table}\``);
  }

  const [orgResult] = await db.execute(
    `INSERT INTO organizations (name, code, description, matrixWidth, matrixDepth, blueprintCode, ownerUserId, createdAt, updatedAt)
     VALUES (?, ?, ?, 3, 5, ?, ?, ?, ?)`,
    [
      "Sparta Nation Example Network",
      "SPARTA-NATION-EXAMPLE",
      "A complete, editable 3 × 5 example network for learning the Sparta Stack workflow.",
      "SPARTA-3X5-EXAMPLE",
      ownerUserId,
      now,
      now,
    ],
  );
  const orgId = orgResult.insertId;

  const memberIds = new Map();
  for (const [key, firstName, lastName, email, rank, personalVolume, avatarUrl] of people) {
    const [result] = await db.execute(
      `INSERT INTO members (orgId, firstName, lastName, email, phone, avatarUrl, \`rank\`, personalVolume, status, notes, joinDate, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, NULL, ?, ?, ?, 'active', 'Sparta Nation example member', ?, ?, ?)`,
      [orgId, firstName, lastName, email, avatarUrl, rank, personalVolume, now, now, now],
    );
    memberIds.set(key, result.insertId);
  }

  const placementIds = new Map();
  async function place(key, parentKey, positionIndex, level, isLocked = false) {
    const [result] = await db.execute(
      `INSERT INTO placements (orgId, memberId, parentId, level, positionIndex, slotCoordinate, isLocked, notes, placedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orgId,
        memberIds.get(key),
        parentKey ? placementIds.get(parentKey) : null,
        level,
        positionIndex,
        level === 0 ? "LEVEL 0 - APEX" : `LEVEL ${level} - POSITION ${positionIndex + 1}`,
        isLocked,
        isLocked ? "Example locked placement" : null,
        now,
      ],
    );
    placementIds.set(key, result.insertId);
  }

  await place("leonidas", null, 0, 0, true);
  await place("athena", "leonidas", 0, 1, true);
  await place("orion", "leonidas", 1, 1, true);
  await place("lyra", "leonidas", 2, 1);
  await place("damon", "athena", 0, 2);
  await place("cassia", "athena", 1, 2);
  await place("theo", "athena", 2, 2);
  await place("helena", "orion", 0, 2);
  await place("cassius", "orion", 1, 2);
  await place("isadora", "orion", 2, 2);
  await place("nikos", "lyra", 0, 2);
  await place("elara", "lyra", 1, 2);
  await place("marcus", "lyra", 2, 2);

  const snapshot = JSON.stringify({
    orgId,
    savedAt: now.toISOString(),
    note: "Sparta Nation Example Baseline",
  });
  await db.execute(
    `INSERT INTO saved_charts (orgId, name, description, snapshot, totalMembers, filledPositions, openPositions, completionRate, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, 18, 13, 2, 87, ?, ?)`,
    [orgId, "Sparta Nation Example Baseline", "A complete, editable Sparta Nation 3 × 5 example.", snapshot, now, now],
  );
  await db.execute(
    `INSERT INTO activity_logs (orgId, user, action, type, createdAt)
     VALUES (?, 'Sparta Nation', 'Created the complete Sparta Nation example network', 'init', ?)`,
    [orgId, now],
  );

  await db.commit();
  console.log(JSON.stringify({ orgId, organization: "Sparta Nation Example Network", totalMembers: people.length, placedMembers: 13, unplacedMembers: people.length - 13 }, null, 2));
} catch (error) {
  await db.rollback();
  throw error;
} finally {
  await db.end();
}
