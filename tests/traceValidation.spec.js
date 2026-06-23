import { test } from "@playwright/test";
import xlsx from "xlsx";
import fs from "fs";
import path from "path";
import { credentials } from "../config/credentials.js";

import { getFailedPolicies } from "../helpers/excelReader.js";
import { login } from "../helpers/loginHelper.js";
import { searchPolicy } from "../helpers/policySearchHelper.js";
import { UwTraceHelper } from "../helpers/uwTraceHelper.js";

import {
  getDynamicDriverVehicleMappings,
  applyRateMapping,
  createTempRaterFile,
} from "../helpers/raterHelper.js";

import {
  buildComparisonJSON,
  getMismatches,
  writeFactorMismatch,
  saveWorkbook,
} from "../helpers/excelWriter.js";

test("Underwriter validation for failed policies", async ({ page }) => {
  test.setTimeout(60000000);

  // ==========================================
  // STATE FROM ENV
  // ==========================================

  const state = process.env.STATE;

  console.log("Current State:", state);

  // ==========================================
  // RESULT FILE
  // ==========================================

  const filePath = credentials.resultFile;

  console.log("FILE PATH:", filePath);

  // ==========================================
  // LOAD WORKBOOK
  // ==========================================

  const wb = xlsx.readFile(filePath);

  const allMismatches = [];

  // ==========================================
  // GET FAILED POLICIES
  // ==========================================

  const failedPolicies = getFailedPolicies(filePath);

  if (!failedPolicies.length) {
    console.log("No failed policies found.");

    return;
  }

  // ==========================================
  // LOGIN
  // ==========================================

  await login(page, "underwriter");

  const traceHelper = new UwTraceHelper(page);

  // ==========================================
  // PROCESS EACH POLICY
  // ==========================================

  for (const policy of failedPolicies) {
    try {
      console.log(`\n====================================`);
      console.log(`Processing Policy: ${policy.policyNumber}`);
      console.log(`====================================`);

      // ======================================
      // SEARCH POLICY
      // ======================================

      await searchPolicy(page, policy.policyNumber);

      // ======================================
      // OPEN COVERAGE SUMMARY
      // ======================================

      await traceHelper.openCoverageSummary();

      // ======================================
      // CAPTURE TRACE
      // ======================================

      const traceData = await traceHelper.openViewPriceTrace(state);

      if (!traceData || Object.keys(traceData).length === 0) {
        console.log("No trace data found");

        await traceHelper.closePriceTrace();

        await traceHelper.goToUnderwriting();

        continue;
      }

      console.log("Trace Data Captured");

      // ======================================
      // GET RATER FILE
      // ======================================

      const files = fs.readdirSync(credentials.raterOutput);

      console.log("Available Rater Files:", files);

      const fileName = files.find((f) => f.includes(policy.policyNumber));

      if (!fileName) {
        console.log(`Rater file not found for ${policy.policyNumber}`);

        continue;
      }

      const raterFile = path.join(credentials.raterOutput, fileName);

      console.log("Using Rater File:", raterFile);

      // ======================================
      // TEXAS FLOW
      // ======================================

      if (state === "TX" || state === "Texas") {
        console.log("\nUsing Texas Comparison Flow");

        // ======================================
        // GET MAPPINGS
        // ======================================

        const mappings = getDynamicDriverVehicleMappings(raterFile);

        console.log("Mappings:", mappings);

        if (!mappings.length) {
          console.log("No mappings found");

          await traceHelper.closePriceTrace();

          await traceHelper.goToUnderwriting();

          continue;
        }

        // ======================================
        // BUILD UI SECTION LIST
        // ======================================

        const uiSections = [];

        Object.entries(traceData).forEach(([driverName, vehicles]) => {
          Object.keys(vehicles).forEach((vehicleName) => {
            uiSections.push({
              driverName,
              vehicleName,
            });
          });
        });

        console.log("UI Sections:", uiSections);

        // ======================================
        // LOOP THROUGH EACH MAPPING
        // ======================================

        for (const [index, map] of mappings.entries()) {
          let tempRaterFile = null;

          try {
            console.log(`Processing Mapping ${index + 1}`);

            tempRaterFile = createTempRaterFile(raterFile, index + 1);

            applyRateMapping(tempRaterFile, map.vehicle, map.driver);

            global.currentRaterFile = tempRaterFile;

            const uiSection = uiSections[index];

            if (!uiSection) {
              console.log("No matching UI section");
              continue;
            }

            const filteredTraceData = {
              [uiSection.driverName]: {
                [uiSection.vehicleName]:
                  traceData[uiSection.driverName][uiSection.vehicleName],
              },
            };

            const comparisonJSON = buildComparisonJSON(
              policy.policyNumber,
              filteredTraceData,
            );

            const mismatches = getMismatches(comparisonJSON);

            if (mismatches.length > 0) {
              allMismatches.push(...mismatches);
            }
          } catch (mappingError) {
            console.log(
              `Error processing mapping ${index + 1}:`,
              mappingError.message,
            );
          } finally {
            // ==================================
            // ALWAYS CLEANUP TEMP FILE
            // ==================================
            
            try {
              if (tempRaterFile && fs.existsSync(tempRaterFile)) {
                fs.unlinkSync(tempRaterFile);

                console.log(`Temp File Deleted: ${tempRaterFile}`);
              }
            } catch (cleanupError) {
              console.log(`Temp File Cleanup Failed: ${cleanupError.message}`);
            }
              
          }
        }
      }

      // ======================================
      // CALIFORNIA FLOW
      // ======================================

      if (state === "CA" || state === "California") {
        console.log("\nUsing California Comparison Flow");

        // ======================================
        // DIRECT FILE
        // ======================================

        global.currentRaterFile = raterFile;

        // ======================================
        // BUILD COMPARISON
        // ======================================

        const comparisonJSON = buildComparisonJSON(
          policy.policyNumber,
          traceData,
        );

        console.log("Comparison JSON Built");

        // ======================================
        // GET MISMATCHES
        // ======================================

        const mismatches = getMismatches(comparisonJSON);

        console.log("Mismatch Count:", mismatches.length);

        if (mismatches.length > 0) {
          allMismatches.push(...mismatches);

          console.log(`${mismatches.length} mismatches found`);
        } else {
          console.log("No mismatches found");
        }
      }

      // ======================================
      // CLOSE TRACE
      // ======================================

      await traceHelper.closePriceTrace();

      await traceHelper.goToUnderwriting();
    } catch (error) {
      console.error(`Error processing ${policy.policyNumber}:`, error);
    }
  }

  // ==========================================
  // WRITE MISMATCHES
  // ==========================================

  if (allMismatches.length > 0) {
    console.log(`Writing ${allMismatches.length} mismatches to Excel...`);

    writeFactorMismatch(wb, allMismatches);
  } else {
    console.log("No mismatches to write");
  }

  // ==========================================
  // SAVE WORKBOOK
  // ==========================================

  saveWorkbook(wb, filePath);

  console.log("Excel saved successfully");
});
