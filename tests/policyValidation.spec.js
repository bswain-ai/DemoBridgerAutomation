import { test } from "@playwright/test";
import { credentials } from "../config/credentials.js";
import { getRaterPremium } from "../helpers/raterHelper.js";
import {
  writePremium,
  createPremiumComparison,
} from "../helpers/excelWriter.js";

import xlsx from "xlsx";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";

test("Create Rater File and Calculate Premium", async () => {
  test.setTimeout(600000);

  // =========================
  // Read Result Excel
  // =========================

  const wb = xlsx.readFile(credentials.resultFile);

  const raterSheet = wb.Sheets["Output_RaterPremium"];
  const uiSheet = wb.Sheets["Output_PolicyUIPremium"];

  const rows = xlsx.utils.sheet_to_json(raterSheet);

  console.log("Headers in Output_RaterPremium:", Object.keys(rows[0]));
  console.log("Rows Found:", rows.length);

  // =========================
  // Rater Output Folder
  // =========================

  const raterFolder = path.join(
    path.dirname(credentials.resultFile),
    "RaterOutput",
  );

  if (!fs.existsSync(raterFolder)) {
    fs.mkdirSync(raterFolder, { recursive: true });
  }

  // =========================
  // Loop each TestCase
  // =========================

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];

    const excelRow = index + 2;

    const policyNumber = uiSheet[`T${excelRow}`]?.v || `Policy_${index + 1}`;

    console.log("Processing Policy:", policyNumber);

    // =========================
    // Create Rater File
    // =========================

    const testCaseId = `TC${String(index + 1).padStart(3, "0")}`;

    const newRaterFile = path.join(
      raterFolder,
      `${testCaseId}_${policyNumber}.xlsx`,
    );

    fs.copyFileSync(credentials.raterFile, newRaterFile);

    // =========================
    // Payload
    // =========================

    const payload = {
      ASM: row["ASM"],
      Zip: row["Garage Zip"],
      LicenseType: row["License Type"],

      FullCoverage: row["FullCoverage"],
      DriverCount: row["DriverCount"],
      VehicleCount: row["VehicleCount"],

      VIN: row["VIN"],
      Year: row["Year"],
      Make: row["Make"],
      Model: row["Model"],

      // SYMBOLS
      CompSymbol: row["Comp"],
      CollSymbol: row["Coll"],

      // LIABILITY COVERAGES
      UMBI: row["UMBI"] || 0,
      UIMBI: row["UIMBI"] || 0,
      MED: row["MED"] || 0,
      UMPD: row["UMPD"] || 0,
      UIMPD: row["UIMPD"] || 0,
      PIP: row["PIP"] || 0,

      // VEHICLE COVERAGE
      CompFlag: row["COMP"],
      CollFlag: row["COLL"],

      CompDed: row["CompDed"],
      CollDed: row["CollDed"],

      // ADDONS (Correct Columns)
      RoadSide: row["ROAD-SIDE"] || 0,
      Rental: row["RENTAL"] || 0,

      // ACTUAL VALUES
      RSALimit: row["RSALimit"] || 0,
      RentalValue: row["RentalValue"] || "",

      NonOwner: row["NonOwner"],
      SR22: row["SR22"],
      DefensiveDriver: row["DefensiveDriver"] || 0,
      DrugDiscount: row["DrugDiscount"] || 0,

      Term: row["Term"],
      "Prior Coverage": row["Prior Coverage"],
      "Multi-Car": row["Multi-Car"],

      "BusinessUse BI": row["BusinessUse BI"],
      "BusinessUse PD": row["BusinessUse PD"],

      VehUse: row["VehUse"] || "",

      // NEW FIELDS
      IsRenew: row["IsRenew"],
      DaysInForce: row["DaysInForce"],
      
      MajorViolation: row["MajorViolation"],
      MinorViolation: row["MinorViolation"],
      ChargableViolation: row["ChargableViolation"],
      UnacceptableRisk: row["Unacceptable Risk"],
    };

    // =========================
    // Debug Logs
    // =========================

    console.log("UMBI:", payload.UMBI);
    console.log("UIMBI:", payload.UIMBI);
    console.log("MED:", payload.MED);
    console.log("UMPD:", payload.UMPD);
    console.log("UIMPD:", payload.UIMPD);
    console.log("PIP:", payload.PIP);

    console.log("RoadSide Flag:", payload.RoadSide);
    console.log("Rental Flag:", payload.Rental);

    console.log("RSALimit:", payload.RSALimit);
    console.log("RentalValue:", payload.RentalValue);

    // =========================
    // Encode JSON
    // =========================

    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64");

    // =========================
    // Run PowerShell Rater
    // =========================

    execSync(
      `powershell.exe -ExecutionPolicy Bypass -File "./rater.ps1" "${newRaterFile}" "${encoded}"`,
      { stdio: "inherit" },
    );

    console.log("Created Rater File:", newRaterFile);

    // =========================
    // Capture Premium
    // =========================

    const premium = getRaterPremium(newRaterFile);

    console.log("Captured Premium:", premium);

    // =========================
    // Write Premium to Excel
    // =========================

    writePremium(
      credentials.resultFile,
      "Output_RaterPremium",
      index + 1,
      premium,
    );
  }

  console.log("All rater files processed successfully.");

  // =========================
  // Create Comparison Sheet
  // =========================

  createPremiumComparison(credentials.resultFile);

  console.log("Premium comparison sheet generated.");
});
