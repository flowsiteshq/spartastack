export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Starts the application-owned Google OAuth flow. This is deliberately a
 * navigation-only helper: state is minted and stored server-side in an
 * HttpOnly, short-lived cookie before the browser is sent to Google.
 */
export const startGoogleLogin = () => {
  window.location.assign("/api/auth/google");
};
