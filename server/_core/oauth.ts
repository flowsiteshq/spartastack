import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import {
  buildGoogleAuthorizationUrl,
  createGoogleOAuthState,
  getGoogleOAuthConfig,
  GOOGLE_AUTHORIZATION_ENDPOINT,
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_TOKEN_ENDPOINT,
  GOOGLE_USERINFO_ENDPOINT,
  isAuthorizedGoogleAdministrator,
  parseGoogleProfile,
} from "../googleAuth";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

const GOOGLE_OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

type TokenResponse = {
  access_token?: unknown;
};

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function redirectToLoginError(res: Response, errorCode: string) {
  res.redirect(302, `/?authError=${encodeURIComponent(errorCode)}`);
}

async function exchangeGoogleAuthorizationCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<string> {
  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const body = (await response.json().catch(() => null)) as TokenResponse | null;
  const accessToken = typeof body?.access_token === "string" ? body.access_token : "";
  if (!response.ok || !accessToken) {
    throw new Error("Google token exchange failed");
  }

  return accessToken;
}

async function getGoogleProfile(accessToken: string) {
  const response = await fetch(GOOGLE_USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error("Google profile request failed");
  }

  return parseGoogleProfile(await response.json());
}

/**
 * Registers only the application-owned Google OAuth flow. The legacy Manus
 * OAuth callback is intentionally not registered: access is now granted only
 * to verified Google accounts in GOOGLE_ADMIN_EMAILS.
 */
export function registerOAuthRoutes(app: Express) {
  app.get("/api/auth/google", (req: Request, res: Response) => {
    const config = getGoogleOAuthConfig();
    if (!config) {
      redirectToLoginError(res, "google_not_configured");
      return;
    }

    const state = createGoogleOAuthState();
    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(GOOGLE_OAUTH_STATE_COOKIE, state, {
      ...cookieOptions,
      httpOnly: true,
      maxAge: GOOGLE_OAUTH_STATE_TTL_MS,
    });
    res.setHeader("Cache-Control", "no-store");
    res.redirect(302, buildGoogleAuthorizationUrl(config, state));
  });

  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const config = getGoogleOAuthConfig();
    if (!config) {
      redirectToLoginError(res, "google_not_configured");
      return;
    }

    const state = getQueryParam(req, "state");
    const code = getQueryParam(req, "code");
    const googleError = getQueryParam(req, "error");
    const cookieOptions = getSessionCookieOptions(req);
    const expectedState = parseCookieHeader(req.headers.cookie ?? "")[GOOGLE_OAUTH_STATE_COOKIE];

    res.clearCookie(GOOGLE_OAUTH_STATE_COOKIE, cookieOptions);
    res.setHeader("Cache-Control", "no-store");

    if (googleError) {
      redirectToLoginError(res, "google_cancelled");
      return;
    }

    // A state mismatch fails closed before the authorization code is exchanged.
    if (!state || !code || !expectedState || state !== expectedState) {
      redirectToLoginError(res, "invalid_google_state");
      return;
    }

    try {
      const accessToken = await exchangeGoogleAuthorizationCode(
        code,
        config.clientId,
        config.clientSecret,
        config.redirectUri,
      );
      const profile = await getGoogleProfile(accessToken);

      if (!profile || !isAuthorizedGoogleAdministrator(profile, config)) {
        redirectToLoginError(res, "access_denied");
        return;
      }

      const openId = `google_${profile.sub}`;
      await db.upsertUser({
        openId,
        name: profile.name,
        email: profile.email,
        loginMethod: "google",
        role: "admin",
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(openId, {
        name: profile.name,
        expiresInMs: ONE_YEAR_MS,
      });

      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[Google OAuth] Sign-in failed", error instanceof Error ? error.message : "unknown error");
      redirectToLoginError(res, "google_signin_failed");
    }
  });
}

export const googleOAuthEndpoints = {
  authorization: GOOGLE_AUTHORIZATION_ENDPOINT,
  token: GOOGLE_TOKEN_ENDPOINT,
  userinfo: GOOGLE_USERINFO_ENDPOINT,
} as const;
