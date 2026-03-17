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

  if (!raterSheet) {
    throw new Error("Sheet Output_RaterPremium not found");
  }

  const rows = xlsx.utils.sheet_to_json(raterSheet, { defval: "" });

  console.log("Headers in Output_RaterPremium:", Object.keys(rows[0] || {}));
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

  console.log("Rater Output Folder:", raterFolder);

  // =========================
  // Validate Rater Template
  // =========================

  if (!fs.existsSync(credentials.raterFile)) {
    throw new Error(`Rater template not found: ${credentials.raterFile}`);
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

    console.log("Creating Rater File:", newRaterFile);

    fs.copyFileSync(credentials.raterFile, newRaterFile);

    if (!fs.existsSync(newRaterFile)) {
      throw new Error("Failed to create rater file");
    }

    // =========================
    // Payload
    // =========================

    const payload = {
      // DRIVER INFORMATION
      "Effective Date": row["Effective Date"] || "",
      "Driver DOB": row["Driver DOB"] || "",
      "Driver Marital Status": row["Driver Marital Status"] || "",
      "Driver Gender": row["Driver Gender"] || "",
      "License State": row["License State"] || "",
      "License Status": row["License Status"] || "",

      // BASIC POLICY
      Zip: row["Garage Zip"] || "",
      LicenseType: row["License Type"] || "",

      DriverCount: Number(row["DriverCount"]) || 1,
      VehicleCount: Number(row["VehicleCount"]) || 1,

      VIN: row["VIN"] || "",
      Year: row["Year"] || "",
      Make: row["Make"] || "",
      Model: row["Model"] || "",

      // SYMBOLS
      CompSymbol: Number(row["Comp"]) || 0,
      CollSymbol: Number(row["Coll"]) || 0,

      // LIABILITY
      UMBI: Number(row["UMBI"]) || 0,
      UIMBI: Number(row["UIMBI"]) || 0,
      MED: Number(row["MED"]) || 0,
      UMPD: Number(row["UMPD"]) || 0,
      UIMPD: Number(row["UIMPD"]) || 0,
      PIP: Number(row["PIP"]) || 0,

      // VEHICLE COVERAGE
      CompFlag: Number(row["COMP"]) === 1 ? 1 : 0,
      CollFlag: Number(row["COLL"]) === 1 ? 1 : 0,

      CompDed: row["CompDed"] || 250,
      CollDed: row["CollDed"] || 250,

      // ADDONS
      RoadSide: Number(row["ROAD-SIDE"]) || 0,
      Rental: Number(row["RENTAL"]) || 0,

      RSALimit: row["RSALimit"] || 0,
      RentalValue: row["RentalValue"] || "",

      // FLAGS
      NonOwner: row["NonOwner"] || 0,
      SR22: row["SR22"] || 0,
      DefensiveDriver: row["DefensiveDriver"] || 0,
      DrugDiscount: row["DrugDiscount"] || 0,

      Term: row["Term"] || 6,
      "Prior Coverage": row["Prior Coverage"] || 0,

      VehUse: row["VehUse"] || "",

      // DRIVER RISK
      IsRenew: row["IsRenew"] || 0,
      DaysInForce: row["DaysInForce"] || 0,
      MajorViolation: row["MajorViolation"] || 0,
      MinorViolation: row["MinorViolation"] || 0,
      ChargableViolation: row["ChargableViolation"] || 0,

      "Unacceptable Risk": row["Unacceptable Risk"] || 0,
    };

    // =========================
    // Encode JSON
    // =========================

    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64");

    // =========================
    // Run PowerShell Rater
    // =========================

    console.log("Executing Rater Script...");

    execSync(
      `powershell.exe -ExecutionPolicy Bypass -File "./rater.ps1" "${newRaterFile}" "${encoded}"`,
      { stdio: "inherit" },
    );

    console.log("Rater execution completed.");

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
