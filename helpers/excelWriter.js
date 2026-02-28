import xlsx from "xlsx";

/**
 * Overwrites data starting from Row 2 (keeps header)
 */
export function writeRow(sheet, rowData, rowIndex) {
  // Get existing header row
  const range = xlsx.utils.decode_range(sheet["!ref"]);

  const headers = [];

  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = xlsx.utils.encode_cell({ r: 0, c: col }); // header row
    const cell = sheet[cellAddress];
    headers.push(cell ? cell.v : "");
  }

  // Build row aligned to headers
  const rowArray = headers.map((header) => rowData[header] ?? "");

  // Excel row index (Row 2 = index 0)
  const excelRow = rowIndex + 1;

  headers.forEach((_, colIndex) => {
    const cellAddress = xlsx.utils.encode_cell({
      r: excelRow,
      c: colIndex,
    });

    sheet[cellAddress] = {
      t: "s",
      v: rowArray[colIndex],
    };
  });

  // Update sheet range properly
  const newRange = {
    s: { r: 0, c: 0 },
    e: { r: excelRow, c: headers.length - 1 },
  };

  sheet["!ref"] = xlsx.utils.encode_range(newRange);
}

/**
 * Save workbook
 */
export function saveWorkbook(workbook, filePath) {
  xlsx.writeFile(workbook, filePath);
}