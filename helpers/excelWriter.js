import xlsx from "xlsx";
import { getRaterCoverageData } from "../helpers/raterHelper.js";

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

    const policyNo =
      uiData[i]?.["Policy Number"] || uiData[i]?.["PolicyNumber"] || "";

    const uiPremium =
      Number(String(uiData[i]["totalPremium"] || "").replace(/[$,]/g, "")) || 0;

    const raterPremium = Number(raterData[i]["Premium"]) || 0;

    const status = uiPremium === raterPremium ? "PASS" : "FAIL";

    result.push({
      "TestCase No": testCase,
      PolicyNo: policyNo,
      "Policy Premium(UI)": uiPremium,
      "Rater Premium": raterPremium,
      Status: status,
    });
  }

  wb.Sheets[compareSheetName] = xlsx.utils.json_to_sheet(result);
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
    "Symbol Failed Scenarios",
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
  console.log("✅ Policy numbers written");
}

/**
 * ================= Write Coverage Data =================
 */
export function writeCoverageData(resultFile, policyNo, type, data) {
  const wb = xlsx.readFile(resultFile);

  const sheetNameMap = {
    Base: "Base Failed Scenarios",
    Region: "Region Failed Scenarios",
    Profile: "Profile Failed Scenarios",
    Household: "Household Failed Scenarios",
    "Policy class": "PolicyClass Failed Scenarios",
    "Model year": "ModelYear Failed Scenarios",
    Symbol: "Symbol Failed Scenarios",
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

  // 🔍 Find row
  let row = 2;
  while (sheet[`A${row}`]?.v !== policyNo) {
    row += 2;
  }

  console.log(`📌 Writing ${type} → Row ${row}`);

  // ================= UI WRITE =================
  Object.entries(data).forEach(([coverage, values]) => {
    const cols = columnMap[coverage.toUpperCase()];
    if (!cols) return;

    const [factorCol, calcCol] = cols;

    sheet[`${factorCol}${row}`] = { t: "n", v: Number(values.factor) };
    sheet[`${calcCol}${row}`] = { t: "n", v: Number(values.calc) };
  });

  // ================= RATER BASE WRITE =================
  const raterData = getRaterCoverageData(policyNo, type);

  if (raterData) {
    const excelRow = row + 1;

    Object.entries(raterData).forEach(([coverage, values]) => {
      const cols = columnMap[coverage];

      if (!cols) return;

      const [factorCol, calcCol] = cols;

      sheet[`${factorCol}${excelRow}`] = {
        t: "n",
        v: values.factor,
      };

      sheet[`${calcCol}${excelRow}`] = {
        t: "n",
        v: values.calc,
      };

      console.log(
        `📥 ${coverage} → ${factorCol}${excelRow}:${values.factor}, ${calcCol}${excelRow}:${values.calc}`,
      );
    });
  }

  // SAVE FILE
  wb.Sheets[sheetName] = sheet;
  xlsx.writeFile(wb, resultFile);
}

/**
 * Save workbook
 */
export function saveWorkbook(workbook, filePath) {
  xlsx.writeFile(workbook, filePath);
}

