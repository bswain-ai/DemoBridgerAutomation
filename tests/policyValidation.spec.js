import { test } from "@playwright/test";
import { credentials } from "../config/credentials.js";
import { getRaterPremium, buildRaterData } from "../helpers/raterHelper.js";
import { createPremiumComparison } from "../helpers/excelWriter.js";

import xlsx from "xlsx";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";

test("Create Rater File and Calculate Premium", async () => {
  test.setTimeout(600000);

  // =========================
  // Read Input Excel
  // =========================
  const wb = xlsx.readFile(credentials.dataFile);

  console.log("Available Sheets:", wb.SheetNames);

  const inputSheet = wb.Sheets["InputData_Policy&RateAccelator"];

  if (!inputSheet) {
    throw new Error("Input sheet not found");
  }

  const rows = xlsx.utils.sheet_to_json(inputSheet, {
    defval: "",
    range: 1,
  });

  console.log("Headers in Input Sheet:", Object.keys(rows[0] || {}));
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
  // STORE RESULTS (IMPORTANT)
  // =========================
  const premiumResults = [];

  // =========================
  // Loop each TestCase
  // =========================
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];

    // =========================
    // Read UI Output Excel
    // =========================
    const outputWb = xlsx.readFile(credentials.resultFile);
    const uiSheet = outputWb.Sheets["Output_PolicyUIPremium"];

    const uiData = xlsx.utils.sheet_to_json(uiSheet, { defval: "" });

    const policyNumber =
      uiData[index]?.["Policy Number"] || `Policy_${index + 1}`;

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
    // Build Rater Data
    // =========================
    const raterData = buildRaterData(row, index);

    console.log("Raw Input EffectiveDate:", row["EffectiveDate"]);
    console.log("EffectiveDate JSON:", raterData["Effective Date"]);

    console.log("Raw Zip:", row["Zip"]);
    console.log("Zip JSON:", raterData["Zip"]);

    // =========================
    // Encode JSON (Fix duplicate keys issue)
    // =========================
    const cleanData = {};

    Object.keys(raterData).forEach((key) => {
      const lowerKey = key.toLowerCase();
      if (!cleanData[lowerKey]) {
        cleanData[lowerKey] = raterData[key];
      }
    });

    const encoded = Buffer.from(JSON.stringify(cleanData)).toString("base64");

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
    // STORE RESULT (CRITICAL FIX)
    // =========================
    premiumResults.push({
      testCase: testCaseId,
      policyNo: policyNumber,
      raterPremium: premium,
    });
  }

  console.log("All rater files processed successfully.");

  // =========================
  // Create Comparison Sheet
  // =========================
  createPremiumComparison(credentials.resultFile, premiumResults);

  console.log("Premium comparison sheet generated.");
});
