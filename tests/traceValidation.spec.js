import { test } from "@playwright/test";
import xlsx from "xlsx";

import { getFailedPolicies } from "../helpers/excelReader.js";
import { login } from "../helpers/loginHelper.js";
import { searchPolicy } from "../helpers/policySearchHelper.js";
import { UwTraceHelper } from "../helpers/uwTraceHelper.js";

import {
  buildComparisonJSON,
  getMismatches,
  writeFactorMismatch,
  saveWorkbook,
} from "../helpers/excelWriter.js";

test("Underwriter validation for failed policies", async ({ page }) => {
  test.setTimeout(600000);

  const filePath = process.env.DATA_RESULT;

  console.log("FILE PATH:", filePath);

  // LOAD WORKBOOK ONCE
  const wb = xlsx.readFile(filePath);

  // ================= STEP 1 =================
  const failedPolicies = getFailedPolicies(filePath);

  if (!failedPolicies.length) {
    console.log("No failed policies found.");
    return;
  }

  // ================= STEP 2 =================
  await login(page, "underwriter");

  const traceHelper = new UwTraceHelper(page);

  // ================= STEP 3 =================
  for (const policy of failedPolicies) {
    try {
      console.log(`\n Processing Policy: ${policy.policyNumber}`);

      await searchPolicy(page, policy.policyNumber);
      await traceHelper.openCoverageSummary();

      const traceData = await traceHelper.openViewPriceTrace();

      if (!traceData || Object.keys(traceData).length === 0) {
        console.log(" No trace data found. Skipping...");
        await traceHelper.closePriceTrace();
        await traceHelper.goToUnderwriting();
        continue;
      }

      console.log("Trace Data Captured");

      await traceHelper.closePriceTrace();
      await traceHelper.goToUnderwriting();

      // ================= BUILD JSON =================
      const comparisonJSON = buildComparisonJSON(
        policy.policyNumber,
        traceData,
      );

      const mismatches = getMismatches(comparisonJSON);

      if (mismatches.length > 0) {
        console.log(`${mismatches.length} mismatches found`);

        // WRITE BOTH TYPES
        writeFactorMismatch(wb, mismatches); // Factor Sheet
      } else {
        console.log(" No mismatches");
      }
    } catch (error) {
      console.error(`Error processing ${policy.policyNumber}:`, error);
    }
  }

  // ================= SAVE ONCE =================
  saveWorkbook(wb, filePath);

  console.log(" Excel saved successfully");
  console.log("\n Underwriter Trace validation completed successfully");
});
