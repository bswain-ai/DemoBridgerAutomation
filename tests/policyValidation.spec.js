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

    // TC_NO ANCHOR FIX — Phase 1 Task 1 (policyValidation)
    // The old lookup used uiData[index] — the array position of the current
    // input row — to find the matching policy number in the UI output sheet.
    // If any test case was skipped in createPolicy (e.g. missing VIN), that
    // TC left no row in the output sheet, so every row below it shifted up
    // by one position. uiData[index] then read the wrong row, attaching
    // this rater run to the wrong policy number, wrong rater file name, and
    // wrong entry in the premiumResults array fed into the comparison sheet.
    //
    // Fix: build a lookup Map from the UI output sheet keyed on TestCase No,
    // then look up by the TC_NO read from the input row — the same value
    // createPolicy.spec.js wrote into the output sheet. The match is now
    // always exact regardless of how many rows were skipped or their order.
    const uiByTcNo = new Map(
      uiData.map((r) => [r["TestCase No"]?.toString().trim(), r])
    );

    // Read TC_NO from the input row. This must use the same column ("TC NO")
    // and the same fallback logic as createPolicy.spec.js so the key written
    // to the output sheet and the key used here are always identical.
    const tcNo =
      row["TC NO"]?.toString().trim() ||
      `TC${String(index + 1).padStart(3, "0")}`;

    // Look up this TC's UI output row by TC number — not by position.
    const policyNumber =
      uiByTcNo.get(tcNo)?.["Policy Number"] || `Policy_${index + 1}`;

    console.log("Processing Policy:", policyNumber);

    // =========================
    // Create Rater File
    // =========================
    // Use tcNo as the rater file prefix so the file name always reflects
    // the true TC identity from the input Excel, not the loop position.
    const testCaseId = tcNo;

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
      // testCase must be the TC_NO read from the input Excel — this is the
      // key that createPremiumComparison() uses to join rater results against
      // UI output rows. If it doesn't match the value createPolicy wrote into
      // the output sheet, every comparison row will show the wrong premium.
      testCase: tcNo,
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