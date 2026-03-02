import xlsx from "xlsx";

/**
 * =============================
 * Read entire sheet as JSON
 * =============================
 * - Header row starts from row 2
 * - Removes * from headers
 * - Trims spaces
 * - Prevents undefined values
 */
export function readSheetAsJson(filePath, sheetName) {

  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found in ${filePath}`);
  }

  const rawData = xlsx.utils.sheet_to_json(sheet, {
    range: 1,       // Header row = Excel Row 2
    defval: ""      // Prevent undefined
  });

  const cleanedData = rawData.map((row) => {

    const newRow = {};

    for (const key in row) {

      const cleanKey = key
        .replace(/\*/g, "")      // remove *
        .replace(/\s+/g, " ")    // normalize spaces
        .trim();

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
 * Example: getCellValue(sheet,"Q3")
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
 * Example: VehUse column
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
 * Example: TC001, TC002, TC003
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
    testCaseId: nextTC

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
 * Example: find VIN row
 * ===================================
 */
export function findRowByColumnValue(sheetData, columnName, value) {

  return sheetData.find(row => row[columnName] === value);

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