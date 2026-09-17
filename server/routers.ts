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
            adminName: z.string().optional().default("System Administrator"),
          })
          .optional()
      )
      .mutation(async ({ ctx, input }) => {
        // Strict environment guard: only permit dev-convenience token issuance in development mode
        if (process.env.NODE_ENV !== "development") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Self-issued admin sessions are disabled in production. Authenticate via Manus OAuth.",
          });
        }

        const adminName = input?.adminName || "System Administrator";
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
  // Organization Management (Strictly Administrator Only)
  // ========================================================
  org: router({
    list: adminProcedure.query(async () => {
      await db.seedInitialMLMDataIfEmpty();
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
          blueprintCode: z.string().optional().default("SEC-3X5-ALPHA"),
          logoUrl: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return db.createOrganization({
          name: input.name,
          code: input.code.toUpperCase().replace(/\s+/g, "-"),
          description: input.description || null,
          blueprintCode: input.blueprintCode || "SEC-3X5-ALPHA",
          logoUrl: input.logoUrl || null,
          matrixWidth: 3,
          matrixDepth: 5,
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
  // Master Member Directory (Strictly Administrator Only)
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
          "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&h=256&q=80",
          "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=256&h=256&q=80",
        ];

        const firstNames = ["Liam", "Olivia", "Noah", "Emma", "Oliver", "Charlotte", "Elijah", "Amelia", "James", "Ava", "William", "Sophia"];
        const lastNames = ["Sterling", "Mercer", "Sinclair", "Montgomery", "Callahan", "Hawthorne", "Covington", "Kensington", "Blackwood", "Vanguard"];
        const ranks = ["Associate", "Bronze Builder", "Silver Associate", "Gold Leader"];

        const created = [];
        for (let i = 0; i < input.count; i++) {
          const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
          const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
          const rank = ranks[Math.floor(Math.random() * ranks.length)];
          const avatar = photoPool[Math.floor(Math.random() * photoPool.length)];
          const randNum = Math.floor(100 + Math.random() * 900);

          const member = await db.createMember({
            orgId: input.orgId,
            firstName: fn,
            lastName: ln,
            email: `${fn.toLowerCase()}.${ln.toLowerCase()}${randNum}@stackmatrix.org`,
            phone: `+1 (555) ${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`,
            avatarUrl: avatar,
            rank,
            personalVolume: Math.floor(100 + Math.random() * 400),
            notes: "Generated recruit candidate in master unplaced pool.",
          });
          created.push(member);
        }
        return { count: created.length, members: created };
      }),
  }),

  // ========================================================
  // 3x5 Downline Matrix Stacking Engine (Strictly Administrator Only)
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

    unstack: adminProcedure
      .input(z.object({ placementId: z.number() }))
      .mutation(async ({ input }) => {
        return db.unstackPlacementAndDescendants(input.placementId);
      }),

    randomFill: adminProcedure
      .input(
        z.object({
          orgId: z.number(),
          count: z.number().min(1).max(50).optional(),
        })
      )
      .mutation(async ({ input }) => {
        return db.randomFillOpenSlots(input.orgId, input.count);
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
});

export type AppRouter = typeof appRouter;
