import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Database tests use the configured development store. Run a final reset after
 * every Vitest invocation so generated organizations are never visible in the
 * Sparta Nation administrator workspace.
 */
export default async function setup() {
  return async function teardown() {
    if (!process.env.DATABASE_URL) return;
    try {
      await execFileAsync(process.execPath, ["scripts/rebuild-sparta-nation-example.mjs"], {
        cwd: process.cwd(),
        env: process.env,
      });
    } catch (error) {
      console.warn("[Test cleanup] Could not restore the Sparta Nation example network", error);
    }
  };
}
