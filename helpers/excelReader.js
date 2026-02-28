import xlsx from "xlsx";

/**
 * Read entire sheet as JSON
 * - Header row starts from row 2
 * - Removes * from headers
 * - Trims spaces
 */
export function readSheetAsJson(filePath, sheetName) {
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found in ${filePath}`);
  }

  // Read sheet starting from row index 1 (Excel row 2)
  const rawData = xlsx.utils.sheet_to_json(sheet, {
    range: 1,       // Header is in row 2
    defval: "",     // Prevent undefined
  });

  // Normalize headers (remove * and trim)
  const cleanedData = rawData.map((row) => {
    const newRow = {};

    for (const key in row) {
      const cleanKey = key
        .replace(/\*/g, "")  // remove *
        .replace(/\s+/g, " ") // normalize spaces
        .trim();

      newRow[cleanKey] = row[key];
    }

    return newRow;
  });

  return cleanedData;
}

/**
 * Open workbook + sheet
 */
export function openWorkbook(filePath, sheetName) {
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found in ${filePath}`);
  }

  return { workbook, sheet };
}

//====================================== For Rater Details =================================================

/*
  Finds next empty row based on Column A
  Generates TC001 / TC002 / TC003...
*/
export function getNextRowAndTC(sheet) {
  let row = 2; // start after header
  let lastTC = 0;

  while (true) {
    const cell = sheet[`A${row}`];

    if (!cell || !cell.v || cell.v.toString().trim() === "") {
      break;
    }

    const match = cell.v.toString().match(/TC(\d+)/i);
    if (match) lastTC = parseInt(match[1]);

    row++;
  }

  const nextTC = `TC${String(lastTC + 1).padStart(3, "0")}`;

  return {
    excelRow: row,
    testCaseId: nextTC,
  };
}

/*
  Safely expands sheet range
*/
export function expandSheet(sheet, row) {
  const range = xlsx.utils.decode_range(sheet["!ref"] || "A1:AB1");

  if (row - 1 > range.e.r) {
    range.e.r = row - 1;
    sheet["!ref"] = xlsx.utils.encode_range(range);
  }
}