import { test } from "@playwright/test";
import { credentials } from "../config/credentials.js";
import { getRaterPremium, buildRaterData } from "../helpers/raterHelper.js";
import { createPremiumComparison } from "../helpers/excelWriter.js";

import xlsx from "xlsx";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import os from "os";

test("Create Rater File and Calculate Premium", async () => {
  test.setTimeout(600000);

  // =========================
  // Read Input Excel
  // =========================
  const wb = xlsx.readFile(credentials.dataFile);

  console.log("Available Sheets:", wb.SheetNames);

  // TC_Template has a 4-row header block before data rows:
  //   Row 1 (index 0) = document title — "BridgerAuto V2 – TX Rating Test Cases"
  //   Row 2 (index 1) = column category labels — "IDENTIFIER", "POLICY", etc.
  //   Row 3 (index 2) = actual column headers — "TC_ID", "State", "V1 VIN", etc.
  //   Row 4 (index 3) = input type legend — "INPUT TYPE ▶", "UI", "🔵 [UI+R]", etc.
  //   Row 5+ (index 4+) = test case data rows — "TC001", "TC002", etc.
  const inputSheet = wb.Sheets["TC_Template"];

  if (!inputSheet) {
    throw new Error(`Input sheet "TC_Template" not found in ${credentials.dataFile}`);
  }

  // Read with header:1 to get raw row arrays, then manually build objects
  // using row 3 as the key source and row 5+ as data. sheet_to_json's built-in
  // range skipping cannot handle this 4-row header structure cleanly.
  const rawRows = xlsx.utils.sheet_to_json(inputSheet, { header: 1, defval: "", raw: false });
  const templateHeaders = rawRows[2] || []; // row 3 (0-indexed: 2) = column headers

  const rows = rawRows
    .slice(4)                               // skip title + categories + headers + type legend
    .map((rowArr) => {
      const obj = {};
      templateHeaders.forEach((h, i) => {
        // Strip asterisks from header names (e.g. "VIN*" -> "VIN") to match
        // the cleaned keys that buildRaterData() and validateInputSchema() expect.
        const key = h ? String(h).replace(/\*/g, "").trim() : null;
        if (key) obj[key] = rowArr[i] ?? "";
      });
      return obj;
    })
    .filter((row) => row["TC_ID"]);         // skip empty trailing rows at bottom of sheet

  console.log("Headers in Input Sheet (first 10):", templateHeaders.slice(0, 10));
  console.log("Rows Found:", rows.length);

  // =========================
  // Rater Output Folder
  // =========================
  // Use credentials.raterOutput (BASE_DIR + RATER_OUTPUT from .env) — single
  // source of truth instead of re-constructing the path from resultFile.
  const raterFolder = credentials.raterOutput;

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
    // then look up by the TC_ID read from the input row — the same value
    // createPolicy.spec.js wrote into the output sheet. The match is now
    // always exact regardless of how many rows were skipped or their order.
    const uiByTcNo = new Map(
      uiData.map((r) => [r["TestCase No"]?.toString().trim(), r])
    );

    // Read TC identity from TC_ID column.
    // Multi-template uses "TC_ID" (underscore) — old template used "TC NO" (space).
    const tcNo =
      row["TC_ID"]?.toString().trim() ||
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
    // Keep .xlsm extension — source rater template is macro-enabled (.xlsm).
    // Saving as .xlsx risks Excel stripping VBA macros that CalcPolicyTotalPremium
    // depends on, which would cause the rater.ps1 macro invocation to fail.
    const testCaseId = tcNo;

    const newRaterFile = path.join(
      raterFolder,
      `${testCaseId}_${policyNumber}.xlsm`,
    );

    console.log("Creating Rater File:", newRaterFile);

    fs.copyFileSync(credentials.raterFile, newRaterFile);

    if (!fs.existsSync(newRaterFile)) {
      throw new Error("Failed to create rater file");
    }

    // =========================
    // Build Rater Data
    // =========================
    // buildRaterData(row) returns { policy: {...}, vehicles: [...], drivers: [...] }.
    // The structured object is passed directly to rater.ps1 as JSON — no key
    // lowercasing or cleanData transformation needed.
    const raterData = buildRaterData(row);

    // =========================
    // Run PowerShell Rater
    // =========================
    // Write rater input to a temp JSON file instead of passing Base64 on the
    // command line. Multi-vehicle payloads (8 vehicles + 8 drivers) can exceed
    // Windows' 32,767-character CLI limit — temp file has no size restriction.
    // File is written to os.tmpdir() and deleted in the finally block below.
    const tempJsonPath = path.join(os.tmpdir(), `rater_input_${testCaseId}.json`);
    console.log("[RATER] Input JSON:", tempJsonPath);

    try {
      fs.writeFileSync(tempJsonPath, JSON.stringify(raterData, null, 2), "utf8");

      console.log("Executing Rater Script...");
      execSync(
        `powershell.exe -ExecutionPolicy Bypass -File "./rater.ps1" "${newRaterFile}" "${tempJsonPath}"`,
        { stdio: "inherit" },
      );
    } finally {
      // Delete the temp file whether rater.ps1 succeeded or failed —
      // prevents accumulation of JSON files in the OS temp directory.
      if (fs.existsSync(tempJsonPath)) {
        fs.unlinkSync(tempJsonPath);
      }
    }

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
      // testCase must be the TC_ID read from the input Excel — this is the
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
