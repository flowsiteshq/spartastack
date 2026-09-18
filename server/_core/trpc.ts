import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ENV } from "./env";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    const isGoogleAdministrator =
      ctx.user?.role === "admin" &&
      ctx.user.loginMethod === "google" &&
      (ctx.user.openId.startsWith("google_") || ctx.user.openId === ENV.ownerOpenId);
    const isOwnerAdministrator =
      ctx.user?.role === "admin" &&
      Boolean(ENV.ownerOpenId) &&
      ctx.user.openId === ENV.ownerOpenId;
    const isLocalDevelopmentAdministrator =
      process.env.NODE_ENV === "development" &&
      ctx.user?.role === "admin" &&
      ctx.user.openId === "admin_workspace_master";
    const isTestFixture = process.env.NODE_ENV === "test";

    // Production access is never inherited from a prior Manus or preview
    // session. Only an approved, verified Google OAuth identity can operate
    // the administrator APIs. The narrow development exception preserves the
    // local demo workflow; Vitest uses explicit context fixtures.
    if (!ctx.user || ctx.user.role !== 'admin' || (!isGoogleAdministrator && !isOwnerAdministrator && !isLocalDevelopmentAdministrator && !isTestFixture)) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
