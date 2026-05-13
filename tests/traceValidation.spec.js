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
  // STEP 1
  // GET FAILED POLICIES
  // ==========================================

  const failedPolicies = getFailedPolicies(filePath);

  if (!failedPolicies.length) {
    console.log("No failed policies found.");

    return;
  }

  // ==========================================
  // STEP 2
  // LOGIN
  // ==========================================

  await login(page, "underwriter");

  const traceHelper = new UwTraceHelper(page);

  // ==========================================
  // STEP 3
  // PROCESS EACH POLICY
  // ==========================================

  for (const policy of failedPolicies) {
    try {
      console.log(`\nProcessing Policy: ${policy.policyNumber}`);

      // ======================================
      // SEARCH POLICY
      // ======================================

      await searchPolicy(page, policy.policyNumber);

      await traceHelper.openCoverageSummary();

      await traceHelper.openViewPriceTrace();

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

      global.currentRaterFile = raterFile;

      // ======================================
      // GET MAPPINGS FROM RATER
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
      // CAPTURE UI TRACE ONCE
      // ======================================

      const traceData = await traceHelper.captureAllTraceValues();

      if (!traceData || Object.keys(traceData).length === 0) {
        console.log("No trace data found");

        continue;
      }

      console.log("Trace Data Captured");

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
        try {
          console.log(`\n==============================`);

          console.log(`Processing Mapping ${index + 1}`);

          console.log(`Vehicle: ${map.vehicle} Driver: ${map.driver}`);

          // ==================================
          // CREATE TEMP FILE
          // ==================================

          const tempRaterFile = createTempRaterFile(raterFile, index + 1);

          console.log("Using Temp File:", tempRaterFile);

          // ==================================
          // APPLY RATE MAPPING
          // ==================================

          applyRateMapping(tempRaterFile, map.vehicle, map.driver);

          // ==================================
          // SET CURRENT RATER FILE
          // ==================================

          global.currentRaterFile = tempRaterFile;

          // ==================================
          // GET MATCHING UI SECTION
          // ==================================

          const uiSection = uiSections[index];

          if (!uiSection) {
            console.log("No matching UI section");

            continue;
          }

          console.log(
            `Comparing UI Section -> Driver: ${uiSection.driverName}, Vehicle: ${uiSection.vehicleName}`,
          );

          // ==================================
          // FILTER TRACE DATA
          // ==================================

          const filteredTraceData = {
            [uiSection.driverName]: {
              [uiSection.vehicleName]:
                traceData[uiSection.driverName][uiSection.vehicleName],
            },
          };

          // ==================================
          // BUILD COMPARISON
          // ==================================

          const comparisonJSON = buildComparisonJSON(
            policy.policyNumber,
            filteredTraceData,
          );

          // ==================================
          // GET MISMATCHES
          // ==================================

          const mismatches = getMismatches(comparisonJSON);

          if (mismatches.length > 0) {
            console.log(`${mismatches.length} mismatches found`);

            allMismatches.push(...mismatches);
          } else {
            console.log("No mismatches found");
          }

          // ==================================
          // OPTIONAL CLEANUP
          // ==================================

          // fs.unlinkSync(tempRaterFile);
        } catch (mappingError) {
          console.log(
            `Error processing mapping ${index + 1}:`,
            mappingError.message,
          );
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
  }

  // ==========================================
  // SAVE WORKBOOK
  // ==========================================

  saveWorkbook(wb, filePath);

  console.log("Excel saved successfully");
});
