import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,

  // ========================================================
  // Authentication & Administrator Gateway
  // ========================================================
  auth: router({
    me: publicProcedure.query(async ({ ctx }) => {
      return ctx.user;
    }),

    loginAsAdmin: publicProcedure
      .input(
        z
          .object({
            adminName: z.string().optional().default("Lead Matrix Architect"),
          })
          .optional()
      )
      .mutation(async ({ ctx, input }) => {
        if (process.env.NODE_ENV !== "development") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Self-issued admin sessions are disabled in production. Authenticate with an approved Google account.",
          });
        }

        const adminName = input?.adminName || "Lead Matrix Architect";
        const openId = "admin_workspace_master";

        await db.upsertUser({
          openId,
          name: adminName,
          email: "admin@memberstack.internal",
          role: "admin",
          loginMethod: "admin_portal",
          lastSignedIn: new Date(),
        });

        const sessionToken = await sdk.createSessionToken(openId, {
          name: adminName,
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        const user = await db.getUserByOpenId(openId);
        return { success: true, user };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ========================================================
  // Organizations
  // ========================================================
  org: router({
    list: adminProcedure.query(async ({ ctx }) => {
      await db.seedInitialMLMDataIfEmpty();
      await db.claimUnownedOrganizationsForCreator(ctx.user.id);
      return db.getOrganizations();
    }),

    get: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const org = await db.getOrganizationById(input.id);
        if (!org) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
        }
        return org;
      }),

    create: adminProcedure
      .input(
        z.object({
          name: z.string().min(2, "Name must be at least 2 characters"),
          code: z.string().min(2, "Code must be at least 2 characters"),
          description: z.string().optional(),
          blueprintCode: z.string().optional().default("3X5-STANDARD"),
          logoUrl: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return db.createOrganization({
          name: input.name,
          code: input.code.toUpperCase().replace(/\s+/g, "-"),
          description: input.description || null,
          blueprintCode: input.blueprintCode || "3X5-STANDARD",
          logoUrl: input.logoUrl || null,
          matrixWidth: 3,
          matrixDepth: 5,
          ownerUserId: ctx.user.id,
        });
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(2).optional(),
          description: z.string().optional(),
          blueprintCode: z.string().optional(),
          logoUrl: z.string().optional(),
          settings: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateOrganization(id, data);
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteOrganization(input.id);
        return { success: true };
      }),

    resetDemo: adminProcedure
      .input(z.object({ orgId: z.number() }))
      .mutation(async ({ input }) => {
        await db.clearAllPlacements(input.orgId);
        return { success: true };
      }),
  }),

  // ========================================================
  // Master Members Directory
  // ========================================================
  member: router({
    list: adminProcedure
      .input(
        z.object({
          orgId: z.number(),
          search: z.string().optional(),
          status: z.enum(["all", "unplaced", "placed"]).optional().default("all"),
          rank: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        return db.getMembersWithPlacement(input.orgId, {
          search: input.search,
          status: input.status,
          rank: input.rank,
        });
      }),

    get: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const member = await db.getMemberById(input.id);
        if (!member) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
        }
        return member;
      }),

    create: adminProcedure
      .input(
        z.object({
          orgId: z.number(),
          firstName: z.string().min(1, "First name is required"),
          lastName: z.string().min(1, "Last name is required"),
          email: z.string().email("Invalid email address"),
          phone: z.string().optional(),
          avatarUrl: z.string().optional(),
          rank: z.string().optional().default("Associate"),
          personalVolume: z.number().optional().default(100),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return db.createMember({
          orgId: input.orgId,
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phone: input.phone || null,
          avatarUrl: input.avatarUrl || null,
          rank: input.rank || "Associate",
          personalVolume: input.personalVolume || 100,
          notes: input.notes || null,
        });
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          firstName: z.string().min(1).optional(),
          lastName: z.string().min(1).optional(),
          email: z.string().email().optional(),
          phone: z.string().optional(),
          avatarUrl: z.string().optional(),
          rank: z.string().optional(),
          personalVolume: z.number().optional(),
          status: z.enum(["active", "inactive", "pending"]).optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateMember(id, data);
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteMember(input.id);
        return { success: true };
      }),

    bulkImport: adminProcedure
      .input(
        z.object({
          orgId: z.number(),
          members: z.array(
            z.object({
              firstName: z.string(),
              lastName: z.string(),
              email: z.string(),
              phone: z.string().optional(),
              rank: z.string().optional(),
              personalVolume: z.number().optional(),
              avatarUrl: z.string().optional(),
            })
          ),
        })
      )
      .mutation(async ({ input }) => {
        let createdCount = 0;
        for (const m of input.members) {
          try {
            await db.createMember({
              orgId: input.orgId,
              firstName: m.firstName,
              lastName: m.lastName,
              email: m.email,
              phone: m.phone || null,
              rank: m.rank || "Associate",
              personalVolume: m.personalVolume || 100,
              avatarUrl: m.avatarUrl || null,
              status: "active",
            });
            createdCount++;
          } catch (e) {
            // ignore duplicates
          }
        }
        return { importedCount: createdCount };
      }),

    batchGenerate: adminProcedure
      .input(
        z.object({
          orgId: z.number(),
          count: z.number().min(1).max(20).default(5),
        })
      )
      .mutation(async ({ input }) => {
        const photoPool = [
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80",
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80",
          "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&h=256&q=80",
          "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80",
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&h=256&q=80",
          "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=256&h=256&q=80",
          "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=256&h=256&q=80",
          "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=256&h=256&q=80",
          "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&h=256&q=80",
          "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&h=256&q=80",
        ];
        const firstNames = ["Austin", "Claire", "Julian", "Maya", "Bennett", "Sienna", "Tristan", "Vera"];
        const lastNames = ["Hayes", "Kensington", "Sterling", "Monroe", "Patterson", "Sinclair", "Vanguard"];
        const ranks = ["Associate", "Bronze Builder", "Silver Associate"];

        const created = [];
        for (let i = 0; i < input.count; i++) {
          const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
          const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
          const rank = ranks[Math.floor(Math.random() * ranks.length)];
          const avatar = photoPool[Math.floor(Math.random() * photoPool.length)];
          const num = Math.floor(100 + Math.random() * 900);

          const member = await db.createMember({
            orgId: input.orgId,
            firstName: fn,
            lastName: ln,
            email: `${fn.toLowerCase()}.${ln.toLowerCase()}${num}@apexhorizon.org`,
            phone: `+1 (555) ${Math.floor(200 + Math.random() * 700)}-${Math.floor(1000 + Math.random() * 9000)}`,
            avatarUrl: avatar,
            rank,
            personalVolume: Math.floor(100 + Math.random() * 300),
            notes: "Candidate in master unplaced list",
          });
          created.push(member);
        }
        return { count: created.length, members: created };
      }),
  }),

  // ========================================================
  // 3x5 Downline Matrix Stacking Engine
  // ========================================================
  matrix: router({
    getTree: adminProcedure
      .input(
        z.object({
          orgId: z.number(),
          rootPlacementId: z.number().optional(),
        })
      )
      .query(async ({ input }) => {
        return db.getTreeStructure(input.orgId, input.rootPlacementId);
      }),

    getOpenSlots: adminProcedure
      .input(z.object({ orgId: z.number() }))
      .query(async ({ input }) => {
        return db.getAvailableOpenSlots(input.orgId);
      }),

    place: adminProcedure
      .input(
        z.object({
          orgId: z.number(),
          memberId: z.number(),
          parentId: z.number().nullable(),
          positionIndex: z.number().min(0).max(2),
          isLocked: z.boolean().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          return await db.placeMemberInSlot(input);
        } catch (err: any) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: err.message || "Failed to place member in slot",
          });
        }
      }),

    move: adminProcedure
      .input(
        z.object({
          orgId: z.number(),
          sourcePlacementId: z.number(),
          targetParentId: z.number().nullable(),
          targetPositionIndex: z.number().min(0).max(2),
          moveDownline: z.boolean().default(true),
        })
      )
      .mutation(async ({ input }) => {
        await db.moveMember(input);
        return { success: true };
      }),

    toggleLock: adminProcedure
      .input(
        z.object({
          placementId: z.number(),
          isLocked: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return db.togglePlacementLock(input.placementId, input.isLocked);
      }),

    batchSetLocks: adminProcedure
      .input(
        z.object({
          placementIds: z.array(z.number()),
          isLocked: z.boolean(),
        })
      )
      .mutation(async ({ input }) => {
        const updated = await db.batchSetLocks(input.placementIds, input.isLocked);
        return { updatedCount: updated };
      }),

    unstack: adminProcedure
      .input(z.object({ placementId: z.number() }))
      .mutation(async ({ input }) => {
        return db.unstackPlacementAndDescendants(input.placementId);
      }),

    randomStack: adminProcedure
      .input(
        z.object({
          orgId: z.number(),
          scope: z.enum(["all", "open_only", "level", "subtree"]).default("open_only"),
          level: z.number().optional(),
          rootPlacementId: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return db.randomStackMatrix(input.orgId, input);
      }),

    // Backward compatibility for existing modals
    randomFill: adminProcedure
      .input(
        z.object({
          orgId: z.number(),
          count: z.number().min(1).max(50).optional(),
        })
      )
      .mutation(async ({ input }) => {
        return db.randomStackMatrix(input.orgId, { scope: "open_only", count: input.count });
      }),

    autoFill: adminProcedure
      .input(
        z.object({
          orgId: z.number(),
          count: z.number().min(1).max(50).optional(),
        })
      )
      .mutation(async ({ input }) => {
        return db.autoFillNextSlots(input.orgId, input.count);
      }),

    clear: adminProcedure
      .input(z.object({ orgId: z.number() }))
      .mutation(async ({ input }) => {
        return db.clearAllPlacements(input.orgId);
      }),
  }),

  // ========================================================
  // Saved Charts Snapshots
  // ========================================================
  charts: router({
    list: adminProcedure
      .input(z.object({ orgId: z.number() }))
      .query(async ({ input }) => {
        return db.getSavedCharts(input.orgId);
      }),

    save: adminProcedure
      .input(
        z.object({
          orgId: z.number(),
          name: z.string().min(1, "Chart name required"),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return db.saveChartSnapshot(input.orgId, input.name, input.description);
      }),

    load: adminProcedure
      .input(z.object({ chartId: z.number() }))
      .mutation(async ({ input }) => {
        await db.loadSavedChart(input.chartId);
        return { success: true };
      }),

    duplicate: adminProcedure
      .input(
        z.object({
          chartId: z.number(),
          newName: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return db.duplicateSavedChart(input.chartId, input.newName);
      }),

    rename: adminProcedure
      .input(
        z.object({
          chartId: z.number(),
          name: z.string().min(1, "Name required"),
        })
      )
      .mutation(async ({ input }) => {
        return db.renameSavedChart(input.chartId, input.name);
      }),

    delete: adminProcedure
      .input(z.object({ chartId: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteSavedChart(input.chartId);
        return { success: true };
      }),
  }),

  // ========================================================
  // Custom Organization Ranks
  // ========================================================
  rank: router({
    list: adminProcedure
      .input(z.object({ orgId: z.number() }))
      .query(async ({ input }) => {
        return db.getOrganizationRanks(input.orgId);
      }),

    create: adminProcedure
      .input(
        z.object({
          orgId: z.number(),
          name: z.string().min(1, "Rank title is required"),
          color: z.string().optional(),
          minPV: z.number().min(0).optional(),
          tierLevel: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return db.addOrganizationRank(input.orgId, input);
      }),

    update: adminProcedure
      .input(
        z.object({
          orgId: z.number(),
          rankId: z.string(),
          name: z.string().optional(),
          color: z.string().optional(),
          minPV: z.number().optional(),
          tierLevel: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { orgId, rankId, ...data } = input;
        return db.updateOrganizationRank(orgId, rankId, data);
      }),

    reorder: adminProcedure
      .input(
        z.object({
          orgId: z.number(),
          rankIds: z.array(z.string()),
        })
      )
      .mutation(async ({ input }) => {
        return db.reorderOrganizationRanks(input.orgId, input.rankIds);
      }),

    saveAll: adminProcedure
      .input(
        z.object({
          orgId: z.number(),
          ranks: z.array(
            z.object({
              id: z.string(),
              name: z.string().min(1),
              color: z.string(),
              minPV: z.number(),
              tierLevel: z.number(),
            })
          ),
        })
      )
      .mutation(async ({ input }) => {
        return db.saveOrganizationRanks(input.orgId, input.ranks);
      }),

    delete: adminProcedure
      .input(z.object({ orgId: z.number(), rankId: z.string() }))
      .mutation(async ({ input }) => {
        await db.deleteOrganizationRank(input.orgId, input.rankId);
        return { success: true };
    }),
  }),

  // ========================================================
  // Verified Member Network Access
  // ========================================================
  network: router({
    mine: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserNetworkMemberships(ctx.user.id);
    }),

    emailMatches: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user.email) return [];
      return db.findEmailNetworkMatches(ctx.user.email);
    }),

    phoneMatches: protectedProcedure
      .input(z.object({ phone: z.string().min(7).max(64) }))
      .query(async ({ input }) => {
        return db.findPhoneNetworkMatches(input.phone);
      }),

    joinByEmail: protectedProcedure
      .input(z.object({ orgId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return db.joinNetworkByVerifiedEmail(input.orgId, ctx.user);
      }),

    requestByPhone: protectedProcedure
      .input(z.object({ orgId: z.number(), phone: z.string().min(7).max(64) }))
      .mutation(async ({ ctx, input }) => {
        return db.requestNetworkJoinByPhone(input.orgId, input.phone, ctx.user);
      }),

    portal: protectedProcedure
      .input(z.object({ orgId: z.number() }))
      .query(async ({ ctx, input }) => {
        try {
          return await db.getMemberPortalData(input.orgId, ctx.user.id);
        } catch (error) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: error instanceof Error ? error.message : "Network access is unavailable",
          });
        }
      }),

    ownerAccess: adminProcedure
      .input(z.object({ orgId: z.number() }))
      .query(async ({ ctx, input }) => {
        const isOwner = await db.isOrganizationOwner(input.orgId, ctx.user.id);
        return {
          isOwner,
          memberships: isOwner ? await db.getOwnerNetworkMemberships(input.orgId) : [],
        };
      }),

    updateMemberAccess: adminProcedure
      .input(
        z.object({
          orgId: z.number(),
          membershipId: z.number(),
          status: z.enum(["pending", "active", "revoked"]).optional(),
          accessLevel: z.enum(["limited", "full"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          return await db.updateNetworkMembershipByOwner({
            ...input,
            ownerUserId: ctx.user.id,
          });
        } catch (error) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: error instanceof Error ? error.message : "Unable to update member visibility privileges",
          });
        }
      }),
  }),

  // ========================================================
  // Member Communication History
  // ========================================================
  communication: router({
    list: adminProcedure
      .input(
        z.object({
          orgId: z.number(),
          memberId: z.number().optional(),
          channel: z.enum(["email", "text"]).optional(),
          limit: z.number().min(1).max(250).optional().default(100),
        })
      )
      .query(async ({ input }) => {
        return db.getCommunicationHistory(input.orgId, {
          memberId: input.memberId,
          channel: input.channel,
          limit: input.limit,
        });
      }),

    recordHandoff: adminProcedure
      .input(
        z.object({
          orgId: z.number(),
          memberId: z.number(),
          channel: z.enum(["email", "text"]),
          recipient: z.string().min(1).max(320),
          subject: z.string().max(255).optional(),
          message: z.string().min(1).max(10000),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return db.recordCommunicationHandoff({
          ...input,
          initiatedBy: ctx.user.name || ctx.user.email || "Administrator",
        });
      }),
  }),

  // ========================================================
  // Activity Logs
  // ========================================================
  activity: router({
    list: adminProcedure
      .input(
        z.object({
          orgId: z.number(),
          limit: z.number().optional().default(30),
        })
      )
      .query(async ({ input }) => {
        return db.getActivityLogs(input.orgId, input.limit);
      }),
  }),
});

export type AppRouter = typeof appRouter;
