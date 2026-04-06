import xlsx from "xlsx";

/**
 * =============================
 * Read entire sheet as JSON
 * =============================
 */
export function readSheetAsJson(filePath, sheetName) {
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found in ${filePath}`);
  }

  // Read normally first
  let data = xlsx.utils.sheet_to_json(sheet, {
    defval: "",
    raw: false,
  });

  // Detect broken headers
  const hasEmptyHeaders =
    data.length &&
    Object.keys(data[0]).some((key) => key.startsWith("__EMPTY"));

  if (hasEmptyHeaders) {
    // Re-read by skipping first row
    data = xlsx.utils.sheet_to_json(sheet, {
      range: 1,
      defval: "",
      raw: false,
    });
  }

  // Clean keys
  const cleanedData = data.map((row) => {
    const newRow = {};

    for (const key in row) {
      const cleanKey = key.replace(/\*/g, "").replace(/\s+/g, " ").trim();

      newRow[cleanKey] = row[key];
    }

    return newRow;
  });

  return cleanedData;
}
/**
 * =============================
 * Open workbook and sheet
 * =============================
 */
export function openWorkbook(filePath, sheetName) {
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found in ${filePath}`);
  }

  return { workbook, sheet };
}

/**
 * =============================
 * Get value from a specific cell
 * =============================
 */
export function getCellValue(sheet, cellAddress) {
  const cell = sheet[cellAddress];

  if (!cell) return "";

  return cell.v;
}

/**
 * =============================
 * Get entire column values
 * =============================
 */
export function getColumnValues(sheet, columnLetter, startRow = 2) {
  const values = [];

  let row = startRow;

  while (true) {
    const cell = sheet[`${columnLetter}${row}`];

    if (!cell || cell.v === undefined || cell.v === "") {
      break;
    }

    values.push(cell.v);

    row++;
  }

  return values;
}

/**
 * ============================================
 * Get next empty row + generate TestCase ID
 * ============================================
 */
export function getNextRowAndTC(sheet) {
  let row = 2;
  let lastTC = 0;

  while (true) {
    const cell = sheet[`A${row}`];

    if (!cell || !cell.v || cell.v.toString().trim() === "") {
      break;
    }

    const match = cell.v.toString().match(/TC(\d+)/i);

    if (match) {
      lastTC = parseInt(match[1]);
    }

    row++;
  }

  const nextTC = `TC${String(lastTC + 1).padStart(3, "0")}`;

  return {
    excelRow: row,
    testCaseId: nextTC,
  };
}

/**
 * =============================
 * Expand sheet safely
 * =============================
 */
export function expandSheet(sheet, row) {
  const range = xlsx.utils.decode_range(sheet["!ref"] || "A1:AB1");

  if (row - 1 > range.e.r) {
    range.e.r = row - 1;

    sheet["!ref"] = xlsx.utils.encode_range(range);
  }
}

/**
 * ===================================
 * Find row by column value
 * ===================================
 */
export function findRowByColumnValue(sheetData, columnName, value) {
  return sheetData.find((row) => row[columnName] === value);
}

/**
 * ===================================
 * Get VehUse directly by row index
 * ===================================
 */
export function getVehUseFromInput(inputData, index) {
  if (!inputData[index]) return "";

  return inputData[index].VehUse || "";
}

// ==========================================================================================================================

/**

===================================

Get Failed Policies from Output Sheet

===================================

Reads Output_UIPremVsRatePrem sheet

Returns all policies where Status = FAIL
*/
export function getFailedPolicies(
  filePath,
  sheetName = "Output_UIPremVsRatePrem",
) {
  const sheetData = readSheetAsJson(filePath, sheetName);

  console.log("All Excel Rows:", sheetData); // DEBUG

  const failedPolicies = sheetData
    .filter((row) => {
      const status = Object.keys(row).find((k) =>
        k.toLowerCase().includes("status"),
      );

      const value = String(row[status] || "")
        .trim()
        .toUpperCase();

      return value === "FAIL";
    })
    .map((row) => {
      const policyKey = Object.keys(row).find((k) =>
        k.toLowerCase().includes("policyno"),
      );

      const tcKey = Object.keys(row).find((k) =>
        k.toLowerCase().includes("testcase"),
      );

      return {
        testCase: row[tcKey],
        policyNumber: row[policyKey],
      };
    });

  return failedPolicies;
}

/**
 * ===================================
 * Input Schema Validator
 * ===================================
 * TASK 3 — Phase 1 Schema Validation
 *
 * Runs before the test loop starts. Reads the first data row's keys
 * (which represent the actual Excel column headers after asterisk-stripping)
 * and compares them against the REQUIRED_COLUMNS list.
 *
 * WHY THIS ORDER MATTERS:
 * readSheetAsJson() already strips asterisks from all header keys
 * (e.g. "VIN*" → "VIN", "Make*" → "Make"). The REQUIRED_COLUMNS list
 * uses the cleaned names — so no asterisk variants are needed here.
 *
 * If any required column is missing, a single named error is thrown
 * immediately listing every missing column. The run does not start.
 * This prevents silent wrong-data runs where a misnamed column causes
 * the rater to receive empty or zero values with no warning.
 *
 * @param {Array<object>} rows - Parsed rows from readSheetAsJson().
 *                               First row's keys are the column headers.
 */
export function validateInputSchema(rows) {

  // Guard: catch completely empty sheet before accessing rows[0]
  if (!rows || rows.length === 0) {
    throw new Error(
      "[Schema Validation Failed] Input Excel sheet is empty — no data rows found " +
      "in 'InputData_Policy&RateAccelator'."
    );
  }

  // The 23 columns that MUST be present for the run to proceed.
  // Any missing column here means the UI automation or rater will either
  // throw a cryptic error mid-run or silently use the wrong value.
  // Keeping this list here (not in credentials.js) so it stays co-located
  // with the Excel reader — the layer that owns column-name knowledge.
  const REQUIRED_COLUMNS = [
    // ── Policy / Submission ──────────────────────────────
    "State",            // selectOption in nameInsured — throws if missing
    "Program",          // selectOption in nameInsured — throws if missing
    "EffectiveDate",    // date field in nameInsured + rater premium input
    "TermLength",       // selectOption in nameInsured — throws if missing
    // ── Address ─────────────────────────────────────────
    "Address",          // explicit throw in addressNavigator if missing
    "City",             // explicit throw in addressNavigator if missing
    "Zip",              // explicit throw in addressNavigator if missing
    // ── Vehicle ─────────────────────────────────────────
    "VIN",              // test skips entirely if missing (createPolicy guard)
    "VehYear",          // year dropdown click — throws if missing
    "VehUse",           // selectOption({label}) — throws if missing/invalid
    "PurchaseStatus",   // selectOption({label}) — throws if missing
    "VehDamage",        // selectOption({label}) — throws if missing
    "Make",             // rater field — wrong premium if missing
    "Model",            // rater field — wrong premium if missing
    // ── Driver ──────────────────────────────────────────
    "DriverGender",     // selectOption({label}) — throws if missing
    "DMaritalStatus",   // selectOption({label}) — throws if missing
    "DriverDob",        // .toString() called directly — throws if undefined
    "License State",    // MUI autocomplete type — throws if missing
    "LicenseNo",        // .toString() called directly — throws if undefined
    "DLicenseStatus",   // selectOption({label}) — throws if missing
    "DLicenseYears",    // .toString() called directly — throws if undefined
    "DLicenseMonths",   // .toString() called directly — throws if undefined
    "DOccupation",      // occupation dropdown click — throws if missing
  ];

  // Extract the actual column names present in the parsed Excel data.
  // rows[0] is the first data row — its keys are the cleaned header names.
  const availableColumns = Object.keys(rows[0]);

  // Collect every missing column before throwing — report all problems at
  // once so the QA analyst can fix the Excel in one pass, not one by one.
  const missingColumns = REQUIRED_COLUMNS.filter(
    (col) => !availableColumns.includes(col)
  );

  if (missingColumns.length > 0) {
    throw new Error(
      `[Schema Validation Failed] ${missingColumns.length} required column(s) missing ` +
      `from 'InputData_Policy&RateAccelator':\n` +
      missingColumns.map((c) => `  • ${c}`).join("\n") +
      "\n\nAdd these columns to the input Excel before running."
    );
  }

  // All required columns present — safe to proceed with the test run.
  console.log(`[Schema Validation] OK — all ${REQUIRED_COLUMNS.length} required columns present.`);
}