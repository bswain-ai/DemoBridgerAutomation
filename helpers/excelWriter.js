import xlsx from "xlsx";

/**
 * Write premium value dynamically based on header
 */
export function writePremium(resultFile, sheetName, rowIndex, premium) {
  const wb = xlsx.readFile(resultFile);
  const sheet = wb.Sheets[sheetName];

  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  const headerRow = data[0];

  const premiumColIndex = headerRow.indexOf("Premium");

  if (premiumColIndex === -1) {
    throw new Error("Premium column not found in sheet");
  }

  if (!data[rowIndex]) {
    data[rowIndex] = [];
  }

  data[rowIndex][premiumColIndex] = Number(premium) || 0;

  const newSheet = xlsx.utils.aoa_to_sheet(data);

  wb.Sheets[sheetName] = newSheet;

  xlsx.writeFile(wb, resultFile);
}

/**
 * Writes row aligned with headers
 */
export function writeRow(sheet, rowData, rowIndex) {
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

  const excelRow = rowIndex + 1;

  rowValues.forEach((value, colIndex) => {
    const cellAddress = xlsx.utils.encode_cell({
      r: excelRow,
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

  if (excelRow > newRange.e.r) {
    newRange.e.r = excelRow;
  }

  sheet["!ref"] = xlsx.utils.encode_range(newRange);
}

/**
 * Create UI vs Rater Premium comparison sheet
 */
export function createPremiumComparison(resultFile) {
  const wb = xlsx.readFile(resultFile);

  const uiSheet = wb.Sheets["Output_PolicyUIPremium"];
  const raterSheet = wb.Sheets["Output_RaterPremium"];

  const compareSheetName = "Output_UIPremVsRatePrem";

  const uiData = xlsx.utils.sheet_to_json(uiSheet);
  const raterData = xlsx.utils.sheet_to_json(raterSheet);

  const result = [];

  for (let i = 0; i < raterData.length; i++) {
    const testCase = raterData[i]["TestCase No"];

    const policyNo = uiData[i]["Policy Number"] || uiData[i]["PolicyNumber"];

    const uiPremiumRaw = uiData[i]["totalPremium"] || uiData[i]["TotalPremium"];

    const raterPremium = Number(raterData[i]["Premium"]) || 0;

    const uiPremium = Number(String(uiPremiumRaw).replace(/[$,]/g, "")) || 0;

    const status = uiPremium === raterPremium ? "PASS" : "FAIL";

    result.push({
      "TestCase No": testCase,
      PolicyNo: policyNo,
      "Policy Premium(UI)": uiPremium,
      "Rater Premium": raterPremium,
      Status: status,
    });
  }

  const newSheet = xlsx.utils.json_to_sheet(result);

  wb.Sheets[compareSheetName] = newSheet;

  xlsx.writeFile(wb, resultFile);

  console.log("Premium comparison sheet created successfully");
}

/**
 * Save workbook
 */
export function saveWorkbook(workbook, filePath) {
  xlsx.writeFile(workbook, filePath);
}
