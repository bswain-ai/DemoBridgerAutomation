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
