import { randomUUID } from "node:crypto";

export const GOOGLE_OAUTH_STATE_COOKIE = "__Host-memberstack_google_oauth_state";
export const GOOGLE_AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
export const GOOGLE_USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";

export type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  adminEmails: string[];
};

export type GoogleProfile = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture: string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const cleanValue = (value: string | undefined) => value?.trim() ?? "";

export function getGoogleOAuthConfig(env: NodeJS.ProcessEnv = process.env): GoogleOAuthConfig | null {
  const clientId = cleanValue(env.GOOGLE_OAUTH_CLIENT_ID);
  const clientSecret = cleanValue(env.GOOGLE_OAUTH_CLIENT_SECRET);
  const redirectUri = cleanValue(env.GOOGLE_OAUTH_REDIRECT_URI);
  const adminEmails = (env.GOOGLE_ADMIN_EMAILS ?? "")
    .split(",")
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);

  if (!clientId || !clientSecret || !redirectUri || adminEmails.length === 0) {
    return null;
  }

  return { clientId, clientSecret, redirectUri, adminEmails: Array.from(new Set(adminEmails)) };
}

export function createGoogleOAuthState(): string {
  return randomUUID();
}

export function buildGoogleAuthorizationUrl(config: GoogleOAuthConfig, state: string): string {
  const url = new URL(GOOGLE_AUTHORIZATION_ENDPOINT);
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  }).toString();
  return url.toString();
}

export function parseGoogleProfile(value: unknown): GoogleProfile | null {
  if (!isRecord(value)) return null;

  const sub = typeof value.sub === "string" ? value.sub : "";
  const email = typeof value.email === "string" ? value.email.trim().toLowerCase() : "";
  const name = typeof value.name === "string" ? value.name.trim() : "";
  const emailVerified = value.email_verified === true;
  const picture = typeof value.picture === "string" && value.picture.length > 0 ? value.picture : null;

  if (!sub || !email || !emailVerified) return null;

  return {
    sub,
    email,
    emailVerified,
    name: name || email,
    picture,
  };
}

export function isAuthorizedGoogleAdministrator(
  profile: GoogleProfile,
  config: GoogleOAuthConfig,
): boolean {
  return profile.emailVerified && config.adminEmails.includes(profile.email.toLowerCase());
}

export function hasGoogleAuthenticationConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return getGoogleOAuthConfig(env) !== null;
}
