import xlsx from "xlsx";

/**
 * Writes a row aligned with sheet headers
 * Starts writing from Row 2 (RowIndex = 0)
 */
export function writeRow(sheet, rowData, rowIndex) {

  if (!sheet["!ref"]) {
    throw new Error("Sheet has no headers defined.");
  }

  const range = xlsx.utils.decode_range(sheet["!ref"]);

  // Read header row
  const headers = [];

  for (let col = range.s.c; col <= range.e.c; col++) {
    const headerCell = xlsx.utils.encode_cell({ r: 0, c: col });
    const cell = sheet[headerCell];
    headers.push(cell ? cell.v : "");
  }

  // Align row values to headers
  const rowValues = headers.map(header => rowData[header] ?? "");

  // Excel row (Row 2 = index 0)
  const excelRow = rowIndex + 1;

  rowValues.forEach((value, colIndex) => {

    const cellAddress = xlsx.utils.encode_cell({
      r: excelRow,
      c: colIndex
    });

    let cellType = "s";

    if (typeof value === "number") {
      cellType = "n";
    }

    sheet[cellAddress] = {
      t: cellType,
      v: value
    };

  });

  // Expand sheet range
  const newRange = xlsx.utils.decode_range(sheet["!ref"]);

  if (excelRow > newRange.e.r) {
    newRange.e.r = excelRow;
  }

  sheet["!ref"] = xlsx.utils.encode_range(newRange);
}

/**
 * Save workbook to file
 */
export function saveWorkbook(workbook, filePath) {
  xlsx.writeFile(workbook, filePath);
}