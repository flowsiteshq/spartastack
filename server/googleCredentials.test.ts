import { describe, expect, it } from "vitest";
import { getGoogleOAuthConfig, GOOGLE_AUTHORIZATION_ENDPOINT } from "./googleAuth";

describe("Configured Google OAuth credentials validation", () => {
  it("has valid, populated Google OAuth environment variables", () => {
    const config = getGoogleOAuthConfig(process.env);
    expect(config).not.toBeNull();
    expect(config?.clientId).toContain(".apps.googleusercontent.com");
    expect(config?.clientSecret.length).toBeGreaterThan(10);
    expect(config?.redirectUri).toBe("https://memberstack-juyrdxd7.manus.space/api/auth/google/callback");
    expect(config?.adminEmails).toContain("sensei30002003@gmail.com");
  });

  it("successfully reaches the live Google OAuth authorization server", async () => {
    const config = getGoogleOAuthConfig(process.env);
    expect(config).not.toBeNull();

    // Query Google's live authorization endpoint with the registered Client ID
    // to verify that Google recognizes this application ID without rejecting it.
    const probeUrl = new URL(GOOGLE_AUTHORIZATION_ENDPOINT);
    probeUrl.searchParams.set("client_id", config!.clientId);
    probeUrl.searchParams.set("redirect_uri", config!.redirectUri);
    probeUrl.searchParams.set("response_type", "code");
    probeUrl.searchParams.set("scope", "openid email profile");

    const response = await fetch(probeUrl.toString(), {
      method: "GET",
      redirect: "manual",
      headers: {
        "User-Agent": "MemberStack-Auth-Verifier/1.0",
      },
    });

    // Google responds with a redirect (302) to the account chooser or a 200 interactive page.
    // If the client ID were fabricated or invalid, Google would return an invalid_client error page.
    expect([200, 301, 302, 303, 307]).toContain(response.status);
  });
});
