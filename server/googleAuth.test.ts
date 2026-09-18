import { describe, expect, it } from "vitest";
import {
  buildGoogleAuthorizationUrl,
  getGoogleOAuthConfig,
  isAuthorizedGoogleAdministrator,
  parseGoogleProfile,
} from "./googleAuth";

const completeEnvironment = {
  GOOGLE_OAUTH_CLIENT_ID: "client-id.apps.googleusercontent.com",
  GOOGLE_OAUTH_CLIENT_SECRET: "client-secret",
  GOOGLE_OAUTH_REDIRECT_URI: "https://memberstack.example.com/api/auth/google/callback",
  GOOGLE_ADMIN_EMAILS: "admin@example.com, second.admin@example.com, ADMIN@example.com",
};

describe("Google OAuth security helpers", () => {
  it("requires all OAuth configuration and at least one administrator email", () => {
    expect(getGoogleOAuthConfig({})).toBeNull();
    expect(getGoogleOAuthConfig({ ...completeEnvironment, GOOGLE_ADMIN_EMAILS: "  " })).toBeNull();
    expect(getGoogleOAuthConfig({ ...completeEnvironment, GOOGLE_OAUTH_CLIENT_SECRET: "" })).toBeNull();
  });

  it("normalizes and de-duplicates the administrator allowlist", () => {
    const config = getGoogleOAuthConfig(completeEnvironment);
    expect(config?.adminEmails).toEqual(["admin@example.com", "second.admin@example.com"]);
  });

  it("builds an authorization-code request with fixed minimal scopes", () => {
    const config = getGoogleOAuthConfig(completeEnvironment);
    expect(config).not.toBeNull();
    const url = new URL(buildGoogleAuthorizationUrl(config!, "csrf-state"));

    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("scope")).toBe("openid email profile");
    expect(url.searchParams.get("redirect_uri")).toBe(completeEnvironment.GOOGLE_OAUTH_REDIRECT_URI);
    expect(url.searchParams.get("state")).toBe("csrf-state");
    expect(url.searchParams.get("prompt")).toBe("select_account");
  });

  it("accepts only verified profiles with a valid Google subject and email", () => {
    expect(
      parseGoogleProfile({
        sub: "112233",
        email: "Admin@Example.com",
        email_verified: true,
        name: "Approved Admin",
        picture: "https://example.com/avatar.jpg",
      }),
    ).toMatchObject({ sub: "112233", email: "admin@example.com", emailVerified: true });

    expect(parseGoogleProfile({ sub: "112233", email: "admin@example.com", email_verified: false })).toBeNull();
    expect(parseGoogleProfile({ sub: "", email: "admin@example.com", email_verified: true })).toBeNull();
  });

  it("denies verified profiles missing from the administrator allowlist", () => {
    const config = getGoogleOAuthConfig(completeEnvironment)!;
    const approved = parseGoogleProfile({
      sub: "112233",
      email: "ADMIN@example.com",
      email_verified: true,
      name: "Approved Admin",
    })!;
    const unapproved = parseGoogleProfile({
      sub: "445566",
      email: "member@example.com",
      email_verified: true,
      name: "Unapproved Member",
    })!;

    expect(isAuthorizedGoogleAdministrator(approved, config)).toBe(true);
    expect(isAuthorizedGoogleAdministrator(unapproved, config)).toBe(false);
  });
});
