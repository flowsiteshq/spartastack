import { describe, expect, it } from "vitest";
import { getUserByOpenId, upsertUser } from "./db";

describe("User session persistence", () => {
  it("keeps the Google login identity when a session refresh only updates activity", async () => {
    const suffix = `${Date.now()}_${Math.floor(Math.random() * 10_000)}`;
    const openId = `google_session_persistence_${suffix}`;
    const email = `session.${suffix}@spartanstack.test`;

    await upsertUser({
      openId,
      name: "Vincent Holmes",
      email,
      phone: "2818189288",
      avatarUrl: "https://profiles.example.test/vincent.jpg",
      loginMethod: "google",
      role: "admin",
    });

    // This mirrors sdk.authenticateRequest, which only records activity after
    // it verifies an already authenticated user.
    await upsertUser({ openId, lastSignedIn: new Date() });

    const user = await getUserByOpenId(openId);
    expect(user).toMatchObject({
      openId,
      name: "Vincent Holmes",
      email,
      phone: "2818189288",
      avatarUrl: "https://profiles.example.test/vincent.jpg",
      loginMethod: "google",
      role: "admin",
    });
  });
});
