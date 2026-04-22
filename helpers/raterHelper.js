import xlsx from "xlsx";
import fs from "fs";
import path from "path";
import { credentials } from "../config/credentials.js";

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Safely read a value from a row object by column header name.
 * Falls back through multiple possible header names (handles legacy aliases).
 * Returns "" if none of the keys exist or all are empty/null.
 *
 * Keys are compared case-insensitively and with leading/trailing spaces stripped,
 * so "V1 VIN", "v1 vin", and " V1 VIN " all resolve to the same cell.
 */
function getValue(data, ...keys) {
  const normalizedData = {};
  for (const key in data) {
    normalizedData[key.toLowerCase().trim()] = data[key];
  }
  for (const key of keys) {
    const normalizedKey = key.toLowerCase().trim();
    if (
      normalizedData[normalizedKey] !== undefined &&
      normalizedData[normalizedKey] !== null &&
      normalizedData[normalizedKey] !== ""
    ) {
      return normalizedData[normalizedKey];
    }
  }
  return "";
}

/**
 * Convert any date value (Excel serial number, ISO string, or JS Date)
 * to MM-DD-YYYY string format expected by the rater.
 *
 * IMPORTANT — serial number handling:
 *   xlsx reads date cells as raw Excel serial numbers (days since 1900-01-01)
 *   when `raw: false` is not set. new Date(serial) interprets the number as
 *   MILLISECONDS since Unix epoch — producing a nonsense date near 1970.
 *   This function detects numeric input and applies the correct conversion:
 *     (serial − 25569) × 86400 × 1000 ms  →  Unix timestamp
 *   25569 = Excel serial for 1970-01-01 (the Excel-to-Unix epoch offset).
 *   UTC accessors (getUTCMonth etc.) are used to avoid local-timezone shifts.
 */
function dateFormatUSA(dateValue) {
  if (!dateValue) return "";
  let d;
  if (typeof dateValue === "number") {
    // Excel serial → Unix timestamp (days × seconds/day × ms/second)
    d = new Date((dateValue - 25569) * 86400 * 1000);
  } else {
    d = new Date(dateValue);
  }
  if (isNaN(d)) return dateValue;
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${mm}-${dd}-${yyyy}`;
}

/**
 * Same as dateFormatUSA() but returns MM/DD/YYYY (slashes) for UI date fields.
 * UI date pickers require slashes; the rater expects dashes — kept separate
 * so callers are explicit about which format they need.
 */
function dateFormatSlash(dateValue) {
  return dateFormatUSA(dateValue).replace(/-/g, "/");
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the structured rater data object from one input row.
 *
 * The multi-vehicle template (TC_Template sheet) stores vehicle data in
 * V1–V8 prefixed columns and driver data in D1–D8 prefixed columns.
 * Policy-level fields have no prefix and apply to the whole policy.
 *
 * This function produces:
 * {
 *   policy:   { 16 fields — effective date, term, coverages, discounts, etc. }
 *   vehicles: [ one entry per V1–V8 slot that has a VIN ]
 *   drivers:  [ one entry per D1–D8 slot that has a DOB ]
 * }
 *
 * Presence check rules:
 *   - A vehicle slot is occupied if V{n} VIN is non-empty.
 *   - A driver slot is occupied if D{n} DOB is non-empty.
 *   - Both loops use break (not continue) — slots must be filled contiguously
 *     starting from V1/D1. Leaving a gap (e.g. V1 filled, V2 empty, V3 filled)
 *     is not supported: the loop stops at the first empty slot.
 *
 * Column naming gaps (columns absent from multi-template):
 *   - licenseType:   no "D{n} License Type" column → always returns ""
 *   - learnersPermit: no "D{n} Learner's Permit" column → always returns 0
 *   rater.ps1 must handle these empty/zero values gracefully.
 *
 * @param {object} row - One row object from readSheetAsJson() (TC_Template sheet)
 * @returns {{ policy: object, vehicles: object[], drivers: object[] }}
 */
export function buildRaterData(row) {
  const toNum = (val) => Number(val) || 0;
  // Shorthand so each field read stays on one line
  const g = (...keys) => getValue(row, ...keys);

  // ── POLICY-LEVEL FIELDS ─────────────────────────────────────────────────
  // These columns have no V{n}/D{n} prefix — they describe the whole policy
  // and are written to the RateOrder sheet's row 4 block by rater.ps1.
  const policy = {
    tcId: g("TC_ID"),
    effectiveDate: dateFormatUSA(g("Effective Date")),
    term: toNum(g("Term Length")) || 6, // default: 6-month term
    zip: toNum(g("Garage Zip")),
    nonOwner: toNum(g("Non-Owner")),
    priorCoverage: toNum(g("Prior Coverage")),
    priorCovMonths: toNum(g("Prior Cov Months")),
    rolloverDiscount: toNum(g("Rollover Discount")),
    isRenew: toNum(g("IsRenew")),
    daysInForce: toNum(g("Days In Force")),
    // Liability coverages — policy-wide, apply to every vehicle on the policy
    umbi: toNum(g("UMBI Selection")),
    uimbi: toNum(g("UIMBI Selection")),
    umpd: toNum(g("UMPD Selection")),
    uimpd: toNum(g("UIMPD Selection")),
    pip: toNum(g("PIP Selection")),
    medpay: toNum(g("MedPay Selection")),
  };

  // ── VEHICLES (V1–V8) ───────────────────────────────────────────────────
  // Each vehicle slot has 22 columns prefixed "V{n} ...".
  // rater.ps1 writes these to RateOrder rows 8–15 (one row per vehicle).
  // Stop at the first slot with no VIN — slots must be contiguous.
  const vehicles = [];
  for (let n = 1; n <= 8; n++) {
    const vin = g(`V${n} VIN`);
    if (!vin) break;

    vehicles.push({
      vin,
      year: toNum(g(`V${n} Year`)),
      make: g(`V${n} Make`),
      model: g(`V${n} Model`),
      vehicleUse: g(`V${n} Vehicle Use`),
      // ISO comp/coll symbols — pre-populated from the rater's symbol lookup
      // tables after the first quote run. Used for premium calculation.
      compSymbol: toNum(g(`V${n} Comp Symbol`)),
      collSymbol: toNum(g(`V${n} Coll Symbol`)),
      // Physical damage coverage selections (0 = not selected / excluded)
      compSelection: toNum(g(`V${n} Comp Selection`)),
      collSelection: toNum(g(`V${n} Coll Selection`)),
      compDed: toNum(g(`V${n} Comp Deductible`)) || 250, // default $250
      collDed: toNum(g(`V${n} Coll Deductible`)) || 250, // default $250
      // Rental reimbursement — stored as two separate columns (limit + duration)
      // rater.ps1 combines them into the rater cell format (e.g. "30-30")
      rrSelection: toNum(g(`V${n} RR Selection`)),
      rrLimit: g(`V${n} RR Limit`),
      rrDuration: g(`V${n} RR Duration`),
      // Roadside assistance
      rsaSelection: toNum(g(`V${n} RSA Selection`)),
      rsaVal: toNum(g(`V${n} RSA Value`)),
      // Per-vehicle UW flag — triggers the Unacceptable Risk Surcharge in the rater
      unacceptableRisk: toNum(g(`V${n} Unacceptable Risk`)),

      // ── UI-ONLY FIELDS ──────────────────────────────────────────────────
      // These fields are needed by vehicleNavigator.js to fill the quote form
      // but are NOT written to the rater spreadsheet by rater.ps1.
      // They are excluded from the rater JSON payload intentionally.
      msrpCostNew: g(`V${n} MSRP/Cost New`), // dollar value shown on vehicle card
      // dateFormatSlash() handles both Excel serial numbers (e.g. 46035) and
      // unpadded date strings (e.g. "1/13/2026"), producing zero-padded
      // MM/DD/YYYY — the format required by the UI purchase date field.
      // Using dateFormatUSA().replace() was insufficient because xlsx returns
      // the raw serial number (not a formatted string) when raw:false is absent,
      // and new Date(serial) misinterprets it as milliseconds → wrong date.
      purchaseDate: dateFormatSlash(g(`V${n} Purchase Date`)),
      purchaseStatus: g(`V${n} Purchase Status`), // "New" or "Used"
      vehDamage: g(`V${n} Veh Damage`), // e.g. "None", "Minor", "Major"
      salvage: toNum(g(`V${n} Salvage`)), // 1 = Yes (salvage title), 0 = No
    });
  }

  // ── DRIVERS (D1–D8) ──────────────────────────────────────────────────────
  // Each driver slot has 15 columns prefixed "D{n} ...".
  // rater.ps1 writes these to RateOrder rows 19–26 (one row per driver).
  // Stop at the first slot with no DOB — slots must be contiguous.
  const drivers = [];
  for (let n = 1; n <= 8; n++) {
    const dob = g(`D${n} DOB`);
    if (!dob) break;

    drivers.push({
      gender: g(`D${n} Gender`),
      maritalStatus: g(`D${n} Marital Status`),
      dob: dateFormatUSA(dob),
      // UI-ONLY: relationship is not a rater input but is required by the
      // Add Driver drawer. Null for D1 (primary insured, no relationship
      // field shown). For D2–D8 reads from template; defaults to "Spouse".
      relationship:
        n === 1 ? null : g(`D${n} Relationship to Named Insured`) || "Spouse",
      licenseState: g(`D${n} License State`),
      licenseStatus: g(`D${n} License Status`),
      // "License Type" (Full / Restricted / Learner's Permit) has no dedicated
      // D{n} column in the multi-template. The rater derives this from
      // licenseStatus. Defaults to "" — rater.ps1 must handle empty string.
      licenseType: "",
      licenseYears: toNum(g(`D${n} License Years`)),
      licenseMonths: toNum(g(`D${n} License Months`)),
      sr22: toNum(g(`D${n} SR22`)),
      drivingExp: toNum(g(`D${n} Driving Exp`)),
      age55OrOlder: toNum(g(`D${n} 55Plus Driver`)),
      goodStudent: toNum(g(`D${n} GoodStudent Discount`)),
      youthfulDriver: toNum(g(`D${n} Youthful`)), // ✅ FIXED
      defensiveDriver: toNum(g(`D${n} Defensive Driver`)),
      drugDiscount: toNum(g(`D${n} Drug Discount`)),
      occupation: g(`D${n} Occupation`),
      majorViolations: toNum(g(`D${n} Major Violations`)),
      minorViolations: toNum(g(`D${n} Minor Violations`)),
      chargeableViolations: toNum(g(`D${n} Chargeable Viol.`)),
      // "Learner's Permit" has no dedicated D{n} column in the multi-template.
      // Defaults to 0. Add "D{n} Learner's Permit" to the template if this
      // surcharge needs to be covered by test cases in the future.
      learnersPermit: 0,

      // ── UI-ONLY FIELD ───────────────────────────────────────────────────
      // licenseNo is needed by driverNavigator.js to fill the license number
      // field on the UI but is NOT passed to rater.ps1 (not a rating factor).
      licenseNo: g(`D${n} License No`),
    });
  }

  return { policy, vehicles, drivers };
}

/**
 * Read the policy total premium from a completed rater output file.
 *
 * The multi-vehicle VBA macro (CalcPolicyTotalPremium) loops all vehicle slots,
 * sets the B29/E29 selector cells, triggers recalculation, reads C136 per
 * vehicle, and accumulates results in L152:L159. L160 = SUM(L152:L159).
 * M160 = =L160 is the designated output cell — this is the cell we read.
 *
 * Single-vehicle test cases (Vehicle Count = 1) produce the same M160 value
 * since the macro still runs through its loop for one vehicle.
 *
 * @param {string} raterFile - Absolute path to the saved per-TC rater .xlsm copy
 * @returns {number} Policy total premium, or 0 if the sheet/cell is missing
 */
export function getRaterPremium(raterFile) {
  const wb = xlsx.readFile(raterFile);
  const sheet = wb.Sheets["RateOrder"];

  if (!sheet) {
    console.log("RateOrder sheet not found");
    return 0;
  }

  // M160 = policy total premium written by CalcPolicyTotalPremium VBA macro
  // (replaces old single-vehicle cell C98)
  const cell = sheet["M160"];
  const premium = Number(cell?.v || 0);

  console.log("Captured Premium:", premium);
  return premium;
}

/**
 * Extract per-coverage factor and calculated-premium values from a completed
 * rater output file. Used by traceValidation.spec.js to capture the full
 * factor breakdown for test cases that FAIL premium comparison.
 *
 * Reads the saved per-TC rater copy from credentials.raterOutput, which is
 * resolved to an absolute path (BASE_DIR + RATER_OUTPUT) in credentials.js.
 *
 * @param {string} policyNo - Policy number used to locate the file by name match
 * @param {string} type     - Factor row key — must match a key in rowMap below
 * @returns {{ BI, PD, COMP, COLL } | null} Factor + calc values, or null if not found
 */
export function getRaterCoverageData(policyNo, type) {
  // Use credentials.raterOutput (absolute path from credentials.js)
  // instead of reading process.env.RATER_OUTPUT directly here.
  const folderPath = credentials.raterOutput;
  const files = fs.readdirSync(folderPath);

  const fileName = files.find((f) => f.includes(policyNo));

  if (!fileName) {
    console.log(` File not found for ${policyNo}`);
    return null;
  }

  const fullPath = path.join(folderPath, fileName);
  const wb = xlsx.readFile(fullPath);
  const sheet = wb.Sheets["RateOrder"];

  // Each entry maps a factor name to:
  //   factor: the row number containing the rater input/factor value
  //   calc:   the row number containing the calculated premium contribution,
  //           or null if the factor is absorbed into a cumulative row.
  //
  // Multi-vehicle rater layout (confirmed from TC002 RateOrder sheet dump):
  //   Factor block: rows 86–112  (+38 from old single-vehicle rows 48–72)
  //   Calc block:   rows 118–130
  //   Row 128 = "× SURCHARGE FACTOR" — cumulative surcharge product
  //   Row 129 = "× DISCOUNT FACTOR"  — cumulative discount product
  //   Row 130 = "ANTI-THEFT DISCOUNT (COMP ONLY)"
  //
  // Individual surcharge/discount entries use calc: null because the
  // multi-vehicle rater collapses all per-factor contributions into the
  // single cumulative rows 128/129. Reading the old individual calc row
  // numbers (91–94, 98–104) now lands on unrelated cell content.
  //
  // New entries (rows not present in single-vehicle rater):
  //   "Learner's Permit"    row 100 — surcharge
  //   "Vehicle Surcharge"   row 102 — surcharge
  //   "Renewal Discount"    row 107 — discount
  //   "Vehicle Discount"    row 111 — discount (calc: 129 to track cumulative)
  //   "Anti-Theft Discount" row 112 — discount (COMP only, own calc row 130)
  //
  // Order change: old rater had Defensive(70)→Drug(71)→Rollover(72).
  // New rater has Rollover(108)→Defensive(109)→Drug(110).
  const rowMap = {
    Base: { factor: 86, calc: 118 },
    Region: { factor: 87, calc: 119 },
    Profile: { factor: 88, calc: 120 },
    Household: { factor: 89, calc: 121 },
    "Policy class": { factor: 90, calc: 122 },
    "Model year": { factor: 91, calc: 123 },
    Symbol: { factor: 92, calc: 124 },
    "Non-Owner / FR": { factor: 93, calc: 125 },
    "Limits / Deductible": { factor: 94, calc: 126 },
    Term: { factor: 95, calc: 127 },
    "Sum of Surcharges": { factor: 96, calc: 128 },
    "License Type Surcharge": { factor: 97, calc: null },
    "Business Use": { factor: 98, calc: null },
    "Violations Surcharge": { factor: 99, calc: null },
    "Learner's Permit": { factor: 100, calc: null },
    "Unacceptable Risk Surcharge": { factor: 101, calc: null },
    "Vehicle Surcharge": { factor: 102, calc: null },
    "Sum of discounts": { factor: 104, calc: 129 },
    "Multi-Car Discount": { factor: 105, calc: null },
    "Prior Coverage Discount": { factor: 106, calc: null },
    "Renewal Discount": { factor: 107, calc: null },
    "Rollover Discount": { factor: 108, calc: null },
    "Defensive Driver Discount": { factor: 109, calc: null },
    "Drug/Alcohol Awareness Discount": { factor: 110, calc: null },
    "Vehicle Discount": { factor: 111, calc: 129 },
    "Anti-Theft Discount": { factor: 112, calc: 130 },
  };

  const rows = rowMap[type];
  if (!rows) {
    console.log(` No mapping for ${type}`);
    return null;
  }

  const get = (col, row) => Number(sheet[`${col}${row}`]?.v || 0);
  // calc: null means this factor is absorbed into a cumulative row.
  // Return null for calc fields rather than reading the wrong row.
  const getCalc = (col) => (rows.calc !== null ? get(col, rows.calc) : null);

  // Columns: C = BI, D = PD, K = COMP, L = COLL
  return {
    BI: { factor: get("C", rows.factor), calc: getCalc("C") },
    PD: { factor: get("D", rows.factor), calc: getCalc("D") },
    COMP: { factor: get("K", rows.factor), calc: getCalc("K") },
    COLL: { factor: get("L", rows.factor), calc: getCalc("L") },
  };
}
