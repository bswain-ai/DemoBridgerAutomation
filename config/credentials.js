// ─────────────────────────────────────────────────────────────────
// credentials.js — State-based file resolution
// ─────────────────────────────────────────────────────────────────
// This is the ONLY file in the framework that knows about states
// and file paths. All spec files, helpers, and navigators read the
// exported keys (dataFile, raterFile, etc.) and never reference
// STATE or BASE_DIR directly.
//
// HOW IT WORKS:
//   1. Reads BASE_DIR from .env — the shared root folder path.
//   2. Reads STATE from .env (e.g. "TX").
//   3. Looks up DATA_FILE_TX and RATER_FILE_TX dynamically.
//   4. Combines BASE_DIR + filename using path.join() for every path.
//
// TO ADD A NEW STATE (e.g. CA):
//   Add to .env:  DATA_FILE_CA=<filename>.xlsx
//                 RATER_FILE_CA=<filename>.xlsm
//   Then set:     STATE=CA
//   Zero code changes required here.
// ─────────────────────────────────────────────────────────────────
import path from "path";

// ── BASE DIRECTORY ───────────────────────────────────────────────
// BASE_DIR is the only full system path in .env.
// All other .env file values are filenames — combined with
// BASE_DIR here via path.join().
//
// WHY path.join() OVER STRING CONCATENATION:
//   Handles trailing/missing slashes in BASE_DIR automatically.
//   Produces OS-native paths accepted by Node.js fs and xlsx.
// ─────────────────────────────────────────────────────────────────
const baseDir = (process.env.BASE_DIR || "").trim();

if (!baseDir) {
  // Fail at module load time — before any browser or Excel COM session
  // opens — so the analyst sees this immediately on startup.
  throw new Error(
    "[Config] BASE_DIR is not set in .env.\n" +
      "Copy .env.example to .env and set BASE_DIR to your local regression suite folder.",
  );
}

// Helper: prepend BASE_DIR to a filename → full absolute path.
// Every file reference in this module goes through resolve().
const resolve = (filename) => path.join(baseDir, filename);

// ── STATE RESOLUTION ─────────────────────────────────────────────
// Reads STATE (e.g. "TX"), then dynamically resolves
// DATA_FILE_{STATE} and RATER_FILE_{STATE} from .env.
//
// WHY DYNAMIC LOOKUP process.env[`KEY_${state}`]:
//   Adding CA needs only 2 .env lines — no code changes here.
// ─────────────────────────────────────────────────────────────────
const state = (process.env.STATE || "TX").toUpperCase().trim();

const dataFileName = process.env[`DATA_FILE_${state}`];
const raterFileName = process.env[`RATER_FILE_${state}`];

// ─────────────────────────────────────────────────────────────────
// ENVIRONMENT RESOLUTION
// Reads ENVIRONMENT (TEST / PROD) and dynamically resolves
// TEST_URL / PROD_URL, TEST_AGENT_EMAIL / PROD_AGENT_EMAIL, etc.
// ─────────────────────────────────────────────────────────────────
const environment = (process.env.ENVIRONMENT || "TEST").toUpperCase().trim();

const baseUrl = process.env[`${environment}_URL`];
const agentEmail = process.env[`${environment}_AGENT_EMAIL`];
const uwEmail = process.env[`${environment}_UW_EMAIL`];
const password = process.env[`${environment}_PASSWORD`];

if (!baseUrl) {
  throw new Error(`[Config] ${environment}_URL is not set in .env.`);
}

if (!agentEmail) {
  throw new Error(`[Config] ${environment}_AGENT_EMAIL is not set in .env.`);
}

if (!uwEmail) {
  throw new Error(`[Config] ${environment}_UW_EMAIL is not set in .env.`);
}

if (!password) {
  throw new Error(`[Config] ${environment}_PASSWORD is not set in .env.`);
}

// Fail at module load if state files are missing — clear message
// names the exact .env variable the analyst needs to add.
if (!dataFileName) {
  throw new Error(
    `[Config] DATA_FILE_${state} is not set in .env.\n` +
      `Add: DATA_FILE_${state}=<filename>.xlsx to run the ${state} suite.`,
  );
}
if (!raterFileName) {
  throw new Error(
    `[Config] RATER_FILE_${state} is not set in .env.\n` +
      `Add: RATER_FILE_${state}=<filename>.xlsm to run the ${state} suite.`,
  );
}

export const credentials = {
  // Active state — exposed for logging in spec files only.
  // Example: console.log(`Running ${credentials.state} suite...`)
  state,

  // Active environment (TEST / PROD).
  // Determines which application URL and credentials are used.
  environment,

  // Base URL for the active environment.
  // Resolved dynamically from TEST_URL or PROD_URL in .env.
  baseUrl,

  // ── USER CREDENTIALS ───────────────────────────────────────────
  // Agent credentials for the active environment.
  agent: {
    username: agentEmail,
    password,
  },

  // Underwriter credentials for the active environment.
  underwriter: {
    username: uwEmail,
    password,
  },

  // Full absolute paths — BASE_DIR + state-specific filename.
  // These are the only path keys any other file should ever read.
  dataFile: resolve(dataFileName),
  raterFile: resolve(raterFileName),

  // Output paths — shared across all states.
  resultFile: resolve(
    process.env.DATA_RESULT || "OutputFile_PolicyUIPrem&RaterPrem.xlsx",
  ),

  // NOTE: raterHelper.js currently reads process.env.RATER_OUTPUT directly
  // (line 245). raterOutput is exported here for use after raterHelper.js
  // is updated in Order 4. Until then, path.join produces the correct full
  // path from the filename-only RATER_OUTPUT value in .env.
  raterOutput: resolve(process.env.RATER_OUTPUT || "RaterOutput"),
};
