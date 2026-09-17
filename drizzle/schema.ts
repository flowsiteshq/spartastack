import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("admin").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 191 }).notNull(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  description: text("description"),
  matrixWidth: int("matrixWidth").default(3).notNull(),
  matrixDepth: int("matrixDepth").default(5).notNull(),
  blueprintCode: varchar("blueprintCode", { length: 64 }).default("SEC-3X5-ALPHA").notNull(),
  logoUrl: text("logoUrl"),
  settings: text("settings"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

export const members = mysqlTable("members", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId").notNull(),
  firstName: varchar("firstName", { length: 128 }).notNull(),
  lastName: varchar("lastName", { length: 128 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 64 }),
  avatarUrl: text("avatarUrl"),
  rank: varchar("rank", { length: 64 }).default("Associate").notNull(),
  personalVolume: int("personalVolume").default(100).notNull(),
  joinDate: timestamp("joinDate").defaultNow().notNull(),
  status: mysqlEnum("status", ["active", "inactive", "pending"]).default("active").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Member = typeof members.$inferSelect;
export type InsertMember = typeof members.$inferInsert;

export const placements = mysqlTable("placements", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId").notNull(),
  memberId: int("memberId").notNull(),
  parentId: int("parentId"), // null if root
  level: int("level").notNull(), // 0 for root, 1..5
  positionIndex: int("positionIndex").notNull(), // 0, 1, 2
  slotCoordinate: varchar("slotCoordinate", { length: 128 }).notNull(),
  isLocked: boolean("isLocked").default(false).notNull(),
  placedAt: timestamp("placedAt").defaultNow().notNull(),
  notes: text("notes"),
});

export type Placement = typeof placements.$inferSelect;
export type InsertPlacement = typeof placements.$inferInsert;

export const savedCharts = mysqlTable("saved_charts", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  snapshot: text("snapshot").notNull(), // JSON serialized placements
  totalMembers: int("totalMembers").default(0).notNull(),
  filledPositions: int("filledPositions").default(0).notNull(),
  openPositions: int("openPositions").default(0).notNull(),
  completionRate: int("completionRate").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SavedChart = typeof savedCharts.$inferSelect;
export type InsertSavedChart = typeof savedCharts.$inferInsert;

export const activityLogs = mysqlTable("activity_logs", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId").notNull(),
  user: varchar("user", { length: 255 }).default("Lead Matrix Architect").notNull(),
  action: text("action").notNull(),
  type: varchar("type", { length: 64 }).default("general").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = typeof activityLogs.$inferInsert;
