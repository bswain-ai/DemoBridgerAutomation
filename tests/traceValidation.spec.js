import { test } from "@playwright/test";
import { getFailedPolicies } from "../helpers/excelReader.js";
import { login } from "../helpers/loginHelper.js";
import { searchPolicy } from "../helpers/policySearchHelper.js";
import { UwTraceHelper } from "../helpers/uwTraceHelper.js";
import {
  writeFailedPoliciesToSheet,
  writeCoverageData,
} from "../helpers/excelWriter.js";

test("Underwriter validation for failed policies", async ({ page }) => {
  const filePath = process.env.DATA_RESULT;

  // ✅ Step 1: Read failed policies
  const failedPolicies = getFailedPolicies(filePath);

  if (!failedPolicies.length) {
    console.log("⚠️ No failed policies found.");
    return;
  }

  // ✅ Step 2: Login
  await login(page, "underwriter");

  const traceHelper = new UwTraceHelper(page);

  // ✅ Step 3: Write Policy Numbers FIRST
  writeFailedPoliciesToSheet(filePath, failedPolicies);

  // ✅ Step 4: Process each policy
  for (const policy of failedPolicies) {
    console.log(`\n🔍 Processing Policy: ${policy.policyNumber}`);

    await searchPolicy(page, policy.policyNumber);

    await traceHelper.openCoverageSummary();

    // ✅ CAPTURE TRACE DATA
    const traceData = await traceHelper.openViewPriceTrace();

    if (!traceData || Object.keys(traceData).length === 0) {
      console.log("⚠️ No trace data found. Skipping...");
      await traceHelper.closePriceTrace();
      await traceHelper.goToUnderwriting();
      continue;
    }

    console.log("📊 Full Trace Data:", traceData);

    await traceHelper.closePriceTrace();
    await traceHelper.goToUnderwriting();

    // ✅ Define only required sections
    const requiredTypes = [
      "Base",
      "Region",
      "Profile",
      "Household",
      "Policy class",
      "Model year",
      "Symbol",
      "Non-Owner / FR",
      "Limits / Deductible",
      "Term",
      "License Type Surcharge",
      "Business Use",
      "Violations Surcharge",
      "Unacceptable Risk Surcharge",
      "Sum of Surcharges",
      "Multi-Car Discount",
      "Prior Coverage Discount",
      "Defensive Driver Discount",
      "Drug/Alcohol Awareness Discount",
      "Rollover Discount",
      "Sum of discounts"
    ];

    // ✅ SAFE LOOP (use for...of instead of forEach)
    for (const type of requiredTypes) {
      const data = traceData[type];

      if (!data || Object.keys(data).length === 0) {
        console.log(`⚠️ No data for ${type}`);
        continue;
      }

      console.log(`📝 Writing ${type} data...`);

      try {
        writeCoverageData(filePath, policy.policyNumber, type, data);
      } catch (error) {
        console.log(`❌ Failed writing ${type}:`, error.message);
      }
    }
  }

  console.log("\n✅ Underwriter validation completed successfully");
});
