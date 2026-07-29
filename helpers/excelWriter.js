import xlsx from "xlsx";
import {
  getCurrentMappedRaterData,
  getCaliforniaMappedRaterData,
} from "./raterHelper.js";
import { comparePolicy } from "../helpers/comparisonEngine.js";

/**
 * Writes a result row to the output sheet, anchored by TC number.
 *
 * TC_NO ANCHOR FIX — Phase 1 Task 1
 * The old version used a numeric rowIndex (the loop counter from the test
 * file) to decide which Excel row to write to. This caused row drift: any
 * skipped or failed test case left a gap, shifting every row below it one
 * position out of place. The premium comparison then silently joined the
 * wrong UI premium to the wrong rater premium for every subsequent row.
 *
 * This version receives tcNo (e.g. "TC003") instead of a row number and:
 *   1. Scans the existing output rows to find a row already written for
 *      this TC number — if found, that row is overwritten (safe for retries).
 *   2. If no existing row is found, appends after the last written row.
 *
 * Result: the output row position is determined by TC identity, not by
 * where the test case happened to fall in the loop. Skipped test cases
 * no longer affect the row placement of any test case below them.
 *
 * @param {object} sheet   - The xlsx sheet object to write into.
 * @param {object} rowData - Key/value pairs aligned with the sheet headers.
 * @param {string} tcNo    - The test case number (e.g. "TC003") used to
 *                           locate or create the correct output row.
 */
/**
 * ============================================================
 * Write / Update a Test Case Row in Excel
 * ============================================================
 *
 * Behaviour:
 * ----------
 * 1. Reads the header row from the worksheet.
 * 2. Maps rowData values according to the header order.
 * 3. Checks whether the Test Case already exists.
 *      - If YES → overwrite the existing row (retry support).
 *      - If NO  → write to the fixed row based on TC number.
 *
 * Fixed Row Mapping:
 * ------------------
 * TC001 -> Excel Row 2
 * TC002 -> Excel Row 3
 * TC003 -> Excel Row 4
 * TC004 -> Excel Row 5
 * ...
 *
 * This guarantees that the output remains in the same order
 * regardless of sequential or parallel execution.
 * ============================================================
 */

export function writeRow(sheet, rowData, tcNo) {
  // ==========================================================
  // Validate Sheet
  // ==========================================================
  if (!sheet["!ref"]) {
    throw new Error("Sheet has no headers defined.");
  }

  // ==========================================================
  // Read Worksheet Range
  // ==========================================================
  const range = xlsx.utils.decode_range(sheet["!ref"]);

  // ==========================================================
  // Read Header Row (Excel Row 1)
  // ==========================================================
  const headers = [];

  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = xlsx.utils.encode_cell({
      r: 0,
      c: col,
    });

    const cell = sheet[cellAddress];

    headers.push(cell ? String(cell.v).trim() : "");
  }

  // ==========================================================
  // Build Row Values
  // Keeps column order identical to Excel headers
  // ==========================================================
  const rowValues = headers.map((header) => rowData[header] ?? "");

  // ==========================================================
  // Locate "TestCase No" Column
  //
  // We normalize the header text to avoid failures due to:
  //   TestCase No
  //   Test Case No
  //   testcase no
  // ==========================================================
  const tcColIndex = headers.findIndex(
    (header) =>
      header.toString().toLowerCase().replace(/\s/g, "") === "testcaseno",
  );

  // ==========================================================
  // Retry Support
  //
  // If this TC already exists in the sheet,
  // overwrite the existing row instead of creating duplicates.
  // ==========================================================
  let targetRow = null;

  if (tcColIndex !== -1) {
    for (let r = 1; r <= range.e.r; r++) {
      const cellAddress = xlsx.utils.encode_cell({
        r,
        c: tcColIndex,
      });

      const cell = sheet[cellAddress];

      if (cell && String(cell.v).trim() === String(tcNo).trim()) {
        targetRow = r;
        break;
      }
    }
  }

  // ==========================================================
  // New Test Case
  //
  // If this TC does not already exist,
  // derive the Excel row from the TC number.
  //
  // Examples:
  // TC001 -> Row Index 1 (Excel Row 2)
  // TC002 -> Row Index 2 (Excel Row 3)
  // TC010 -> Row Index 10 (Excel Row 11)
  //
  // This avoids row shifting during parallel execution.
  // ==========================================================
  if (targetRow === null) {
    const match = String(tcNo).match(/\d+/);

    if (!match) {
      throw new Error(`Invalid Test Case Number: ${tcNo}`);
    }

    targetRow = Number(match[0]);
  }

  console.log(`Writing ${tcNo} to Excel Row ${targetRow + 1}`);

  // ==========================================================
  // Write Cell Values
  //
  // Writes every value to its corresponding column.
  // ==========================================================
  rowValues.forEach((value, colIndex) => {
    const cellAddress = xlsx.utils.encode_cell({
      r: targetRow,
      c: colIndex,
    });

    sheet[cellAddress] = {
      t: typeof value === "number" ? "n" : "s",
      v: value,
    };
  });

  // ==========================================================
  // Update Worksheet Used Range
  //
  // Extend the worksheet range only if writing beyond the
  // current last row.
  // ==========================================================
  const newRange = xlsx.utils.decode_range(sheet["!ref"]);

  if (targetRow > newRange.e.r) {
    newRange.e.r = targetRow;
  }

  sheet["!ref"] = xlsx.utils.encode_range(newRange);

  console.log(`Updated Sheet Range : ${sheet["!ref"]}`);
}

/**
 * Create UI vs Rater Premium comparison sheet
 */
export function createPremiumComparison(resultFile, premiumResults = []) {
  const wb = xlsx.readFile(resultFile);

  const uiSheet = wb.Sheets["Output_PolicyUIPremium"];

  if (!uiSheet) {
    console.log("UI Sheet not found. Skipping comparison.");
    return;
  }

  const uiData = xlsx.utils.sheet_to_json(uiSheet);

  if (!uiData || uiData.length === 0) {
    console.log("UI Data empty. Skipping comparison.");
    return;
  }

  const result = [];

  // TC_NO ANCHOR FIX — Phase 1 Task 1
  // The old version joined each UI output row with its rater result using
  // array position (uiData[i] paired with premiumResults[i]). This was
  // fragile: if any test case was skipped and left a blank row in the output
  // sheet, every row below it would be compared against the wrong rater
  // premium — producing silent wrong PASS or FAIL results with no error.
  //
  // Fix: build a lookup map from TC number → rater result, then match each
  // UI row to its rater result by TC number. Array position is no longer
  // involved — a gap caused by a skipped test case has no effect on any
  // other row's comparison.
  const raterByTcNo = new Map(premiumResults.map((r) => [r.testCase, r]));

  for (const row of uiData) {
    // The "TestCase No" value was written by createPolicy.spec.js and is
    // now anchored to the source TC number from the input Excel — safe to
    // use as the join key between the UI output and the rater result.
    const tcNo = row["TestCase No"]?.toString().trim() || "";
    const raterResult = raterByTcNo.get(tcNo);

    const policyNo =
      raterResult?.policyNo || row["Policy Number"] || row["PolicyNo"] || "";

    const uiPremium =
      Number(
        String(
          row["totalPremium"] ||
            row["Total Premium"] ||
            row["Policy Premium(UI)"] ||
            "",
        ).replace(/[$,]/g, ""),
      ) || 0;

    // Matched by TC number — if no rater result exists for this TC (e.g.
    // policyValidation was not yet run), raterPremium defaults to 0 and
    // the row will show FAIL, which is the correct safe default.
    const raterPremium = raterResult?.raterPremium || 0;

    // Delegate PASS/FAIL decision and result object construction to the
    // comparison engine — excelWriter owns I/O only; comparison logic
    // lives in comparisonEngine.js. Tolerance defaults to 0 (strict
    // equality) matching the previous hardcoded behaviour exactly.
    result.push(comparePolicy({ tcNo, policyNo, uiPremium, raterPremium }));
  }

  wb.Sheets["Output_UIPremVsRatePrem"] = xlsx.utils.json_to_sheet(result);

  xlsx.writeFile(wb, resultFile);

  console.log("Premium comparison sheet created successfully");
}
/**
 * Write Failed Policies
 */
export function writeFailedPoliciesToSheet(resultFile, failedPolicies) {
  const wb = xlsx.readFile(resultFile);

  const sheetNames = [
    "Base Failed Scenarios",
    "Region Failed Scenarios",
    "Profile Failed Scenarios",
    "Household Failed Scenarios",
    "PolicyClass Failed Scenarios",
    "ModelYear Failed Scenarios",
    "NonOwnerFR Failed Scenarios",
    "LimitsDed Failed Scenarios",
    "Term Failed Scenarios",
    "License Failed Scenarios",
    "Business Failed Scenarios",
    "Violations Failed Scenarios",
    "URisk Failed Scenarios",
    "Surcharge Sum Failed Scenarios",
    "MultiCar Failed Scenarios",
    "PriorCoverage Failed Scenarios",
    "DfensiveDriver Failed Scenarios",
    "Drug Failed Scenarios",
    "Rollover Failed Scenarios",
    "Discount Sum Failed Scenarios",
  ];

  sheetNames.forEach((sheetName) => {
    let sheet = wb.Sheets[sheetName];

    if (!sheet) {
      sheet = xlsx.utils.aoa_to_sheet([["Policy Number", "Type"]]);
      wb.Sheets[sheetName] = sheet;
    }

    let row = 2;

    while (sheet[`A${row}`]?.v) row += 2;

    failedPolicies.forEach((policy) => {
      const policyNo = policy.policyNumber?.trim();
      if (!policyNo) return;

      sheet[`A${row}`] = { t: "s", v: policyNo };
      sheet[`B${row}`] = { t: "s", v: "UI Coverage Values" };
      sheet[`B${row + 1}`] = { t: "s", v: "Excel Coverage Values" };

      row += 2;
    });
  });

  xlsx.writeFile(wb, resultFile);
  console.log(" Policy numbers written");
}

/**
 * ================= Write Coverage Data =================
 */
export function writeUICoverageData(wb, policyNo, type, data) {
  //const wb = xlsx.readFile(resultFile);

  // Skip Symbol completely
  if (type === "Symbol") return;

  const noCalcTypes = [
    "License Type Surcharge",
    "Business Use",
    "Violations Surcharge",
    "Unacceptable Risk Surcharge",
    "Multi-Car Discount",
    "Prior Coverage Discount",
    "Defensive Driver Discount",
    "Drug/Alcohol Awareness Discount",
    "Rollover Discount",
  ];

  const sheetNameMap = {
    Base: "Base Failed Scenarios",
    Region: "Region Failed Scenarios",
    Profile: "Profile Failed Scenarios",
    Household: "Household Failed Scenarios",
    "Policy class": "PolicyClass Failed Scenarios",
    "Model year": "ModelYear Failed Scenarios",
    "Non-Owner / FR": "NonOwnerFR Failed Scenarios",
    "Limits / Deductible": "LimitsDed Failed Scenarios",
    Term: "Term Failed Scenarios",
    "License Type Surcharge": "License Failed Scenarios",
    "Business Use": "Business Failed Scenarios",
    "Violations Surcharge": "Violations Failed Scenarios",
    "Unacceptable Risk Surcharge": "URisk Failed Scenarios",
    "Sum of Surcharges": "Surcharge Sum Failed Scenarios",
    "Multi-Car Discount": "MultiCar Failed Scenarios",
    "Prior Coverage Discount": "PriorCoverage Failed Scenarios",
    "Defensive Driver Discount": "DfensiveDriver Failed Scenarios",
    "Drug/Alcohol Awareness Discount": "Drug Failed Scenarios",
    "Rollover Discount": "Rollover Failed Scenarios",
    "Sum of discounts": "Discount Sum Failed Scenarios",
  };

  const sheetName = sheetNameMap[type];
  if (!sheetName) {
    console.log(`No sheet mapping for type: ${type}`);
    return;
  }

  const sheet = wb.Sheets[sheetName];
  if (!sheet) return;

  const columnMap = {
    BI: ["C", "D"],
    PD: ["E", "F"],
    PIP: ["G", "H"],
    MEDPAY: ["I", "J"],
    UMBI: ["K", "L"],
    UIMBI: ["M", "N"],
    COMP: ["O", "P"],
    COLL: ["Q", "R"],
    RRB: ["S", "T"],
    RSA: ["U", "V"],
  };

  let row = null;

  //  STRICT SEARCH ONLY FOR POLICY
  for (let i = 2; i <= 5000; i += 2) {
    const val = sheet[`A${i}`]?.v;

    if (val && val.toString().trim() === policyNo) {
      row = i;
      break;
    }
  }

  //  DO NOT CREATE AGAIN (already created in writeFailedPoliciesToSheet)
  if (!row) {
    console.log(` Policy row not found for ${policyNo}`);
    return;
  }

  const uiRow = row;
  const excelRow = row + 1;

  console.log(` Writing ${type} → UI Row ${uiRow}, Excel Row ${excelRow}`);

  // ================= UI WRITE =================
  Object.entries(data).forEach(([coverage, values]) => {
    const cols = columnMap[coverage.toUpperCase()];
    if (!cols) return;

    const [factorCol, calcCol] = cols;

    // Factor
    sheet[`${factorCol}${uiRow}`] = {
      t: "n",
      v: Number(values.factor ?? 0),
    };

    // Calc (if allowed)
    if (!noCalcTypes.includes(type)) {
      sheet[`${calcCol}${uiRow}`] = {
        t: "n",
        v: Number(values.calc ?? 0),
      };
    } else {
      sheet[`${calcCol}${uiRow}`] = { t: "s", v: "" };
    }
  });

  // ================= SAVE =================
  wb.Sheets[sheetName] = sheet;
  //xlsx.writeFile(wb, resultFile);
}

// =================== COMPARISON JSON ==================
export function buildComparisonJSON(policyNo, traceData) {
  const result = {
    policyNo,
    data: {},
  };

  // ==========================================
  // CURRENT STATE
  // ==========================================

  const state = process.env.STATE;

  console.log(`Building Comparison JSON for State: ${state}`);

  // ==========================================
  // LOOP DRIVERS
  // ==========================================

  Object.entries(traceData).forEach(([driverName, vehicleData]) => {
    result.data[driverName] = {};

    // ======================================
    // LOOP VEHICLES
    // ======================================

    Object.entries(vehicleData).forEach(([vehicleName, traceTypes]) => {
      result.data[driverName][vehicleName] = {};

      // ==================================
      // LOOP FACTOR TYPES
      // ==================================

      Object.entries(traceTypes).forEach(([type, uiData]) => {
        // ==================================
        // SKIP EMPTY
        // ==================================

        if (!uiData || Object.keys(uiData).length === 0) {
          return;
        }

        // ==================================
        // OPTIONAL SKIP
        // ==================================

        // ==================================
        // OPTIONAL SKIP
        // ==================================

        if (
          type === "Symbol" ||
          type.includes("Subtotal") ||
          type === "Total"
        ) {
          return;
        }

        // ==================================
        // GET RATER DATA
        // ==================================

        let raterData = null;

        // ==================================
        // TEXAS
        // ==================================

        if (state === "TX" || state === "Texas") {
          raterData = getCurrentMappedRaterData(
            global.currentRaterFile,
            type,
            vehicleName,
            driverName,
          );
        }

        // ==================================
        // CALIFORNIA
        // ==================================

        if (state === "CA" || state === "California") {
          raterData = getCaliforniaMappedRaterData(
            global.currentRaterFile,
            type,
          );
        }

        // ==================================
        // NO RATER DATA
        // ==================================

        if (!raterData) {
          console.log(`No Rater Data -> ${type}`);
          return;
        }

        console.log(
          `Rater Data Found -> ${type}`,
          JSON.stringify(raterData, null, 2),
        );

        result.data[driverName][vehicleName][type] = {};

        // ==================================
        // LOOP COVERAGES
        // ==================================

        Object.entries(uiData).forEach(([coverage, uiValues]) => {
          // ==================================
          // NORMALIZE COVERAGE
          // ==================================

          const normalizedCoverage = coverage === "COLDW" ? "CDW" : coverage;

          const raterValues = raterData[normalizedCoverage];

          // ==================================
          // COVERAGE NOT FOUND
          // ==================================

          if (!raterValues) {
            console.log(`Coverage Missing -> ${coverage}`);

            return;
          }

          // ==================================
          // FACTORS
          // ==================================

          const uiFactor = Number(uiValues.factor ?? 0);

          const raterFactor = Number(raterValues.factor ?? 0);

          // ==================================
          // STORE
          // ==================================

          result.data[driverName][vehicleName][type][coverage] = {
            uiFactor,
            raterFactor,
          };

          console.log(
            `${type} | ${coverage} | UI=${uiFactor} | Rater=${raterFactor}`,
          );
        });

        // ==================================
        // REMOVE EMPTY TYPES
        // ==================================

        if (
          Object.keys(result.data[driverName][vehicleName][type]).length === 0
        ) {
          delete result.data[driverName][vehicleName][type];
        }
      });

      // ==================================
      // REMOVE EMPTY VEHICLES
      // ==================================

      if (Object.keys(result.data[driverName][vehicleName]).length === 0) {
        delete result.data[driverName][vehicleName];
      }
    });

    // ==================================
    // REMOVE EMPTY DRIVERS
    // ==================================

    if (Object.keys(result.data[driverName]).length === 0) {
      delete result.data[driverName];
    }
  });

  // ==================================
  // FINAL RESULT
  // ==================================

  console.log(`Comparison JSON Built for Policy: ${policyNo}`);

  return result;
}

// =================== GET MISMATCH COMPARISION ====================

export function getMismatches(comparisonJSON) {
  const mismatches = [];

  const { policyNo, data } = comparisonJSON;

  const TOLERANCE = 0.001;

  // Coverage-level skip rules — applied to BOTH factor and calc comparisons.
  // Each key is a factor type; the value lists coverage codes excluded from
  // all comparisons for that type.
  //
  // "Limits / Deductible" — BI and PD:
  //   Deductibles are a physical-damage concept (COMP/COLL only). The UI
  //   price trace displays 1.000 for the BI/PD deductible factor because
  //   it has no deductible — the value is a neutral multiplier placeholder.
  //   In the rater, RateOrder row 94 (DEDUCTIBLE FACTOR) leaves the BI and
  //   PD cells blank. getRaterCoverageData() reads blank cells as 0, so the
  //   comparison produces 1.000 (UI) vs 0.000 (Rater) on every single policy
  //   regardless of what coverages are selected. This is correct rater
  //   behaviour, not a premium error — skip it here to suppress the noise.
  // =====================================================
  // LOOP DRIVERS
  // =====================================================

  Object.entries(data).forEach(([driver, vehicles]) => {
    // =================================================
    // LOOP VEHICLES
    // =================================================

    Object.entries(vehicles).forEach(([vehicle, types]) => {
      // =============================================
      // LOOP TYPES
      // =============================================

      Object.entries(types).forEach(([type, coverages]) => {
        // =========================================
        // LOOP COVERAGES
        // =========================================

        Object.entries(coverages).forEach(([coverage, values]) => {
          const uiFactor = Number(values.uiFactor ?? 0);

          const raterFactor = Number(values.raterFactor ?? 0);

          // =====================================
          // COMPARE FACTORS ONLY
          // =====================================

          if (Math.abs(uiFactor - raterFactor) > TOLERANCE) {
            mismatches.push({
              policyNo,

              driver,

              vehicle,

              type,

              coverage,

              uiValue: uiFactor,

              raterValue: raterFactor,
            });
          }
        });
      });
    });
  });

  return mismatches;
}

export function writeFactorMismatch(wb, mismatches) {
  const sheetName = "Coverage Factor Mismatch New";

  // ==========================================
  // FORMAT DATA
  // ==========================================

  const rows = mismatches.map((m) => ({
    "Policy No": m.policyNo,

    Driver: m.driver,

    Vehicle: String(m.vehicle || "")
      .replace(/\t/g, " ")
      .trim(),

    "Factor Type": m.type,

    Coverage: m.coverage,

    "UI Factor": Number(m.uiValue.toFixed(3)),

    "Rater Factor": Number(m.raterValue.toFixed(3)),
  }));

  // ==========================================
  // CREATE NEW SHEET DIRECTLY
  // ==========================================

  const worksheet = xlsx.utils.json_to_sheet(rows);

  // ==========================================
  // REPLACE SHEET
  // ==========================================

  wb.Sheets[sheetName] = worksheet;

  // ==========================================
  // ENSURE SHEET EXISTS
  // ==========================================

  if (!wb.SheetNames.includes(sheetName)) {
    wb.SheetNames.push(sheetName);
  }

  console.log(`${rows.length} mismatches written`);
}

/**
 * Save workbook
 */
export function saveWorkbook(workbook, filePath) {
  xlsx.writeFile(workbook, filePath);
}
