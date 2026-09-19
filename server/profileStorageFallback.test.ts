import { describe, expect, it, vi } from "vitest";

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockRejectedValue(new Error("Storage config missing")),
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getUserByOpenId, upsertUser } from "./db";

const tinyPngDataUrl =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function createContext(): Promise<TrpcContext> {
  const suffix = Date.now().toString();
  const openId = `google_storage_fallback_${suffix}`;
  const email = `fallback.${suffix}@spartanstack.test`;
  await upsertUser({
    openId,
    email,
    name: "Storage Fallback",
    loginMethod: "google",
    role: "user",
  });
  const user = await getUserByOpenId(openId);
  if (!user) throw new Error("Test user was not created");
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {}, cookie: () => {} } as any,
  };
}

describe("Profile storage outage fallback", () => {
  it("saves a compact validated photo even when hosted storage is unavailable", async () => {
    const caller = appRouter.createCaller(await createContext());

    const result = await caller.onboarding.saveProfile({
      firstName: "Vincent",
      lastName: "Holmes",
      phone: "2818189288",
      avatarDataUrl: tinyPngDataUrl,
    });

    expect(result.name).toBe("Vincent Holmes");
    expect(result.phone).toBe("2818189288");
    expect(result.avatarUrl).toBe(tinyPngDataUrl);
  });
});
