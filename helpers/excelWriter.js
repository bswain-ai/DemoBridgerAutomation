import xlsx from "xlsx";
import { getRaterCoverageData } from "../helpers/raterHelper.js";
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
export function writeRow(sheet, rowData, tcNo) {
  if (!sheet["!ref"]) {
    throw new Error("Sheet has no headers defined.");
  }

  const range = xlsx.utils.decode_range(sheet["!ref"]);

  const headers = [];

  for (let col = range.s.c; col <= range.e.c; col++) {
    const headerCell = xlsx.utils.encode_cell({ r: 0, c: col });

    const cell = sheet[headerCell];

    headers.push(cell ? cell.v : "");
  }

  const rowValues = headers.map((header) => rowData[header] ?? "");

  // Find which column contains the "TestCase No" header so we can search
  // existing rows for a match. Normalise to lowercase with no spaces to
  // handle minor header formatting differences (e.g. "TestCase No" vs
  // "testcaseno") without breaking.
  const tcColIndex = headers.findIndex(
    (h) => h.toString().toLowerCase().replace(/\s/g, "") === "testcaseno"
  );

  // Scan every existing data row (row 1 onwards; row 0 is the header) to
  // find one already written for this TC number. Finding a match means this
  // is a retry run — overwrite that row rather than appending a duplicate.
  let targetRow = null;

  if (tcColIndex !== -1) {
    for (let r = 1; r <= range.e.r; r++) {
      const cell = sheet[xlsx.utils.encode_cell({ r, c: tcColIndex })];
      if (cell && cell.v?.toString().trim() === tcNo.toString().trim()) {
        targetRow = r;
        break;
      }
    }
  }

  // No existing row found for this TC — append after the last written row.
  //
  // WHY THE BACKWARD SCAN: The output Excel template contains pre-formatted
  // blank rows 2–8 (Excel). The xlsx !ref covers these rows, so range.e.r
  // reflects the last blank row rather than the last row with actual data.
  // Using `range.e.r + 1` directly caused TC001 to land on Excel row 9
  // instead of row 2 — every subsequent TC was also offset by 7 rows.
  //
  // FIX: Scan backward from range.e.r to find the actual last populated row
  // by checking column 0 (the TC_NO column — first column of every data row).
  // If no data rows exist yet, lastDataRow stays 0 and targetRow becomes 1
  // (0-indexed) = Excel row 2. This guarantees the first write always lands
  // on the row immediately after the header regardless of how many blank
  // template rows the sheet contains.
  if (targetRow === null) {
    let lastDataRow = 0;
    for (let r = range.e.r; r >= 1; r--) {
      const cell = sheet[xlsx.utils.encode_cell({ r, c: 0 })];
      if (cell && cell.v !== undefined && cell.v !== null && cell.v !== "") {
        lastDataRow = r;
        break;
      }
    }
    targetRow = lastDataRow + 1;
  }

  rowValues.forEach((value, colIndex) => {
    const cellAddress = xlsx.utils.encode_cell({
      r: targetRow,
      c: colIndex,
    });

    let cellType = "s";

    if (typeof value === "number") {
      cellType = "n";
    }

    sheet[cellAddress] = {
      t: cellType,
      v: value,
    };
  });

  const newRange = xlsx.utils.decode_range(sheet["!ref"]);

  if (targetRow > newRange.e.r) {
    newRange.e.r = targetRow;
  }

  sheet["!ref"] = xlsx.utils.encode_range(newRange);
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
  const raterByTcNo = new Map(
    premiumResults.map((r) => [r.testCase, r])
  );

  for (const row of uiData) {
    // The "TestCase No" value was written by createPolicy.spec.js and is
    // now anchored to the source TC number from the input Excel — safe to
    // use as the join key between the UI output and the rater result.
    const tcNo = row["TestCase No"]?.toString().trim() || "";
    const raterResult = raterByTcNo.get(tcNo);

    const policyNo =
      raterResult?.policyNo ||
      row["Policy Number"] ||
      row["PolicyNo"] ||
      "";

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

  // ================= RATER WRITE =================
  const raterData = getRaterCoverageData(policyNo, type);

  if (raterData) {
    Object.entries(raterData).forEach(([coverage, values]) => {
      const cols = columnMap[coverage];
      if (!cols) return;

      const [factorCol, calcCol] = cols;

      // Factor
      sheet[`${factorCol}${excelRow}`] = {
        t: "n",
        v: Number(values.factor ?? 0),
      };

      // Calc (if allowed)
      if (!noCalcTypes.includes(type)) {
        sheet[`${calcCol}${excelRow}`] = {
          t: "n",
          v: Number(values.calc ?? 0),
        };
      } else {
        sheet[`${calcCol}${excelRow}`] = { t: "s", v: "" };
      }

      console.log(` ${coverage} → ${factorCol}${excelRow}:${values.factor}`);
    });
  }

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

  Object.entries(traceData).forEach(([type, uiData]) => {
    if (type === "Symbol") return;

    const raterData = getRaterCoverageData(policyNo, type);
    if (!raterData) return;

    result.data[type] = {};

    Object.entries(uiData).forEach(([coverage, uiValues]) => {
      const raterValues = raterData[coverage];
      if (!raterValues) return;

      result.data[type][coverage] = {
        ui: {
          factor: Number(uiValues.factor ?? 0),
          calc: Number(uiValues.calc ?? 0),
        },
        rater: {
          factor: Number(raterValues.factor ?? 0),
          calc: raterValues.calc !== null ? Number(raterValues.calc) : null,
        },
      };
    });
  });

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
  const SKIP_FACTOR_COVERAGE = {
    "Limits / Deductible": ["BI", "PD"],
  };

  for (const [type, coverages] of Object.entries(data)) {
    for (const [coverage, values] of Object.entries(coverages)) {
      // Skip combinations that are structurally mismatched between the UI
      // trace and the rater sheet — these are not genuine rating errors.
      if (SKIP_FACTOR_COVERAGE[type]?.includes(coverage)) {
        continue;
      }

      const { ui, rater } = values;

      // Factor comparison with tolerance
      if (Math.abs(ui.factor - rater.factor) > TOLERANCE) {
        mismatches.push({
          policyNo,
          type,
          coverage,
          field: "Factor",
          ui: ui.factor,
          rater: rater.factor,
          diff: ui.factor - rater.factor,
        });
      }

      // Calc comparison with tolerance.
      // Skip if rater.calc is null — null means this factor's contribution
      // is absorbed into a cumulative row (128/129) and no dedicated calc
      // cell exists. Comparing ui.calc against 0 (the JS coercion of null)
      // would produce false mismatches for any active factor in that group.
      if (rater.calc !== null && Math.abs(ui.calc - rater.calc) > TOLERANCE) {
        mismatches.push({
          policyNo,
          type,
          coverage,
          field: "Calculation",
          ui: ui.calc,
          rater: rater.calc,
          diff: ui.calc - rater.calc,
        });
      }
    }
  }

  return mismatches;
}

export function writeFactorMismatch(wb, mismatches) {
  const sheetName = "Coverage Factor Mismatch";

  let sheet = wb.Sheets[sheetName];

  // Create sheet if not exists
  if (!sheet) {
    console.log(" Creating 'Coverage Factor Mismatch' sheet");

    sheet = xlsx.utils.aoa_to_sheet([
      ["PolicyNo", "Type", "Coverage", "UI Value", "Rater Value"],
    ]);

    wb.Sheets[sheetName] = sheet;

    if (!wb.SheetNames.includes(sheetName)) {
      wb.SheetNames.push(sheetName);
    }
  }

  // Filter ONLY Factor mismatches
  const factorMismatches = mismatches.filter((m) => m.field === "Factor");

  const existingData = xlsx.utils.sheet_to_json(sheet);

  const newData = factorMismatches.map((m) => ({
    PolicyNo: m.policyNo,
    Type: m.type,
    Coverage: m.coverage,
    "UI Value": Number(m.ui.toFixed(3)),
    "Rater Value": Number(m.rater.toFixed(3)),
  }));

  const finalData = [...existingData, ...newData];

  wb.Sheets[sheetName] = xlsx.utils.json_to_sheet(finalData);

  console.log(`${newData.length} factor mismatches written`);
}

/**
 * Save workbook
 */
export function saveWorkbook(workbook, filePath) {
  xlsx.writeFile(workbook, filePath);
}
