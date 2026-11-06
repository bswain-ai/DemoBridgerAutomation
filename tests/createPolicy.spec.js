import { test } from "@playwright/test";
import xlsx from "xlsx";
import { credentials } from "../config/credentials.js";
import { login } from "../helpers/loginHelper.js";
import { FakerData } from "../testData/fakerData.js";
import {
  openWorkbook,
  filterTestCasesBySuite,
} from "../helpers/excelReader.js";
import { buildRaterData } from "../helpers/raterHelper.js";
import {
  writeRow,
  saveWorkbook,
} from "../helpers/excelWriter.js";
import { getPremium } from "../helpers/uiHelper.js";
import { locators } from "../Locators/selectors.js";
import { getTotalCoveragePremium } from "../helpers/uiHelper.js";
import { ExcelLock } from "../helpers/ExcelLock.js";

import { NameInsuredNavigator } from "../Navigators/nameInsured.js";
import { AddressNavigator } from "../Navigators/addressNavigator.js";
import { VehicleNavigator } from "../Navigators/vehicleNavigator.js";
import { DriverNavigator } from "../Navigators/driverNavigator.js";
import { ViolationsNavigator } from "../Navigators/violationsNavigator.js";
import { CoverageNavigator } from "../Navigators/coverageNavigator.js";
import { UnderwriterNavigator } from "../Navigators/underwriterNavigator.js";
import { PaymentNavigator } from "../Navigators/paymentNavigator.js";
import { ConfirmationNavigator } from "../Navigators/confirmationNavigator.js";
import { FinalDetailsNavigator } from "../Navigators/finalDetailsNavigator.js";

// ─────────────────────────────────────────────────────────────────────────────
// FILE PATHS
// ─────────────────────────────────────────────────────────────────────────────
const filePath = credentials.dataFile;
const resultPath = credentials.resultFile;

// ─────────────────────────────────────────────────────────────────────────────
// READ TC_TEMPLATE  (4-row header block)
//
// TC_Template uses a 4-row header block before data rows begin:
//   Row 1 — sheet title / label row   (skipped)
//   Row 2 — category groupings        (skipped)
//   Row 3 — column headers            ← becomes object keys
//   Row 4 — type legend (🔴 / 🔵)    (skipped)
//   Row 5+ — one test case per row    ← data we care about
//
// xlsx.utils.sheet_to_json({ header: 1 }) returns raw arrays so we can
// slice cleanly and map the correct header row ourselves, bypassing the
// auto-detect logic that would treat row 1 as the header row.
// ─────────────────────────────────────────────────────────────────────────────
const wb_input = xlsx.readFile(filePath);
const ws_tc = wb_input.Sheets["TC_Template"];

if (!ws_tc) {
  throw new Error(
    `Sheet "TC_Template" not found in ${filePath}. ` +
      `Available sheets: ${wb_input.SheetNames.join(", ")}`,
  );
}

// rawRows[0..3] = 4-row header block; rawRows[4+] = test case data rows
//const rawRows = xlsx.utils.sheet_to_json(ws_tc, { header: 1, defval: "" });

// Calculate actual used range instead of trusting Excel's !ref
const cellKeys = Object.keys(ws_tc).filter((key) => !key.startsWith("!"));

let maxRow = 0;
let maxCol = 0;

for (const key of cellKeys) {
  const { r, c } = xlsx.utils.decode_cell(key);

  if (r > maxRow) maxRow = r;
  if (c > maxCol) maxCol = c;
}

const actualRange = xlsx.utils.encode_range({
  s: { r: 0, c: 0 },
  e: { r: maxRow, c: maxCol },
});

console.log("Excel declared range:", ws_tc["!ref"]);
console.log("Excel actual range:", actualRange);
console.log("Max row:", maxRow + 1);
console.log("Max column:", maxCol + 1);

const rawRows = xlsx.utils.sheet_to_json(ws_tc, {
  range: actualRange,
  header: 1,
  defval: "",
  raw: false,
});

// Row index 2 (0-based) = Row 3 of the sheet = column headers
const headers = rawRows[2];

// Build an array of plain objects keyed by column header.
// Filter by r[0] (TC_ID column) to skip blank / spacer rows.
const excelData = rawRows
  .slice(4)
  .filter((r) => r[0])
  .map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""])));

const filteredData = filterTestCasesBySuite(excelData);

filteredData.forEach((row, index) => {
  row.outputRow = index + 2;
});

console.log("Execution Suite:", process.env.EXECUTION_SUITE || "ALL");
console.log("Total Rows:", excelData.length);
console.log("Rows to Execute:", filteredData.length);

// ─────────────────────────────────────────────────────────────────────────────
// TEST LOOP
// ─────────────────────────────────────────────────────────────────────────────
for (let index = 0; index < filteredData.length; index++) {
  // raw row — passed as-is to navigators that read column names directly
  // (State, Program, "Effective Date", address fields, coverage fields, UW, etc.)
  const row = filteredData[index];

  // Structured objects from buildRaterData():
  //   policy   — 16 policy-level rating fields
  //   vehicles — one entry per V1–V8 slot that has a VIN
  //   drivers  — one entry per D1–D8 slot that has a DOB
  const { policy, vehicles, drivers } = buildRaterData(row);

  // TC_ID replaces the old "TC NO" column as the stable test case identifier.
  // Falls back to a generated label only if the column is blank.
  const tcLabel =
    row["TC_ID"]?.toString().trim() ||
    `TC${String(index + 1).padStart(3, "0")}`;

  test(`Create Policy ${tcLabel}`, async ({ browser }) => {
    /*
    // Skip if no VIN
    if (!vehicles[0]?.vin) {
      console.log("Skipping row due to missing VIN");
      test.skip();
    }
      */

    // ─── RETRY CONFIG ───────────────────────────────────────────────────────
    const MAX_RETRIES = 3;
    let attempt = 0;
    let success = false;

    let quoteNumber = "";

    while (attempt < MAX_RETRIES && !success) {
      const context = await browser.newContext();
      const page = await context.newPage();

      try {
        console.log(`\n Running ${tcLabel} - Attempt ${attempt + 1}`);
        console.log(` State: ${row["State"]}`);

        // ─── NAVIGATORS ─────────────────────────────────────────────────────
        const nameInsured = new NameInsuredNavigator(page);
        const addressNavigator = new AddressNavigator(page);
        const vehicleNavigator = new VehicleNavigator(page);

        //  IMPORTANT CHANGE (STATE PASSING)
        const driverNavigator = new DriverNavigator(page, row["State"]);

        const violationsNavigator = new ViolationsNavigator(page);
        await page.waitForTimeout(10000);
        const finalDetailsNavigator = new FinalDetailsNavigator(page);
        const coverageNavigator = new CoverageNavigator(page);
        const underwriterNavigator = new UnderwriterNavigator(page);
        const paymentNavigator = new PaymentNavigator(page);
        const confirmationNavigator = new ConfirmationNavigator(page);

        // LOGIN
        await login(page, "agent");

        const insuredData = FakerData.generateNamedInsured();

        // ─── POLICY FLOW ────────────────────────────────────────────────────

        // Pass raw row to navigators that read policy / address / coverage /
        // UW columns directly by their original header names.
        await nameInsured.completeNamedInsured(row, insuredData);
        await addressNavigator.enterAddress(row);

        // ─── VEHICLE SECTION ──────────────────────────────────────────────────────
        // Named Owner = Yes  → Vehicle/VIN is required and vehicles are added.
        // Named Owner = No + Non-Owner = Yes → Skip Vehicle/VIN and move to Driver.

        const namedOwnerValue = String(row["Named Owner?"] || "")
          .trim()
          .toLowerCase();

        const nonOwnerValue = String(row["Non-Owner"] || "")
          .trim()
          .toLowerCase();

        if (namedOwnerValue === "yes") {
          // VIN is mandatory for Named Owner policies.
          if (!vehicles[0]?.vin) {
            console.log("VIN missing for Named Owner. Skipping test.");
            test.skip();
          }

          // Add all vehicles configured for the test case.
          for (let v = 0; v < vehicles.length; v++) {
            await vehicleNavigator.addVehicle(vehicles[v], v, vehicles.length);
          }
        } else if (nonOwnerValue === "yes") {
          // Non-Owner policy does not require a vehicle/VIN.
          // Skip Vehicle section and continue directly to Driver section.
          console.log("Non-Owner = Yes → Skipping Vehicle/VIN section.");
        }

        // ─── DRIVER SECTION ───────────────────────────────────────────────────────
        // Driver section is executed after Vehicle section.
        // For Non-Owner policies, execution reaches here directly without Vehicle.

        for (let d = 0; d < drivers.length; d++) {
          console.log(` Adding Driver ${d + 1}`);

          await driverNavigator.completeDriverSection(
            drivers[d],
            d,
            drivers.length,
          );
        }

        await violationsNavigator.completeViolations(row);
        await finalDetailsNavigator.fillPriorCoverageDetails(row);
        await finalDetailsNavigator.continueToCoverage();
        await coverageNavigator.applyCoverages(row);

        if (nonOwnerValue === "yes") {
          const premiumElements = page.locator(
            '[data-test^="coverage-premium-"]',
          );

          await premiumElements.first().waitFor({
            state: "visible",
            timeout: 15000,
          });

          const premiums = await premiumElements.allTextContents();

          const totalPremium = premiums.reduce((sum, value) => {
            return sum + (parseFloat(value.replace(/[$,]/g, "")) || 0);
          }, 0);

          console.log("Non-Owner Coverage Premiums:", premiums);
          console.log("Non-Owner Total Premium:", totalPremium.toFixed(2));
        }

        try {
          await page.locator(locators.quoteNumber).waitFor({
            state: "visible",
            timeout: 10000,
          });

          quoteNumber =
            (await page.locator(locators.quoteNumber).textContent())?.trim() ||
            "";

          console.log("Quote Number:", quoteNumber);
        } catch {
          console.log("Quote Number not available yet.");
        }

        const isProd = credentials.environment === "PROD";

        if (isProd) {
          console.log("=============== Production Mode ===============");

          // Wait until Quote Number is visible
          await page.locator(locators.quoteNumber).waitFor({
            state: "visible",
            timeout: 30000,
          });

          const quoteNumber = (
            await page.locator(locators.quoteNumber).textContent()
          ).trim();

          console.log("Quote Number:", quoteNumber);

          // ─── CAPTURE PREMIUM ──────────────────────────────────────────
          let totalCoveragePremium;

          if (nonOwnerValue === "yes") {
            // Non-Owner: capture all coverage premiums
            const premiumLocators = page.locator(
              '[data-test^="coverage-premium-"]:visible',
            );

            await premiumLocators.first().waitFor({
              state: "visible",
              timeout: 30000,
            });

            const premiums = await premiumLocators.allTextContents();

            totalCoveragePremium = premiums.reduce((total, premium) => {
              return total + (parseFloat(premium.replace(/[$,]/g, "")) || 0);
            }, 0);

            totalCoveragePremium = Math.round(totalCoveragePremium);

            console.log("Non-Owner Premiums:", premiums);
            console.log(
              "Non-Owner Total Coverage Premium:",
              totalCoveragePremium,
            );
          } else {
            // Named Owner: existing vehicle-based calculation
            await page
              .locator(locators.vehicleCoveragePremiums)
              .first()
              .waitFor({
                state: "visible",
                timeout: 30000,
              });

            totalCoveragePremium = await getTotalCoveragePremium(
              page,
              locators.vehicleCoveragePremiums,
            );

            console.log("Total Coverage Premium:", totalCoveragePremium);
          }

          // ─── WRITE QUOTE RESULTS (PRODUCTION) ──────────────────────────────

          // TC_ID from the input row is used as the row anchor.
          const tcNo =
            row["TC_ID"]?.toString().trim() ||
            `TC${String(index + 1).padStart(3, "0")}`;

          const uiPremiumData = {
            "TestCase No": tcNo,
            totalPremium: totalCoveragePremium,
            "Policy Number": quoteNumber,
            Status: "Passed",
          };

          // ===========================
          // Thread-safe Excel write
          // ===========================
          const excelLock = new ExcelLock(resultPath);

          await excelLock.lock();

          try {
            const { workbook, sheet: uiPremiumSheet } = openWorkbook(
              resultPath,
              "Output_PolicyUIPremium",
            );

            writeRow(uiPremiumSheet, uiPremiumData, tcNo, row.outputRow);

            saveWorkbook(workbook, resultPath);
          } finally {
            await excelLock.unlock();
          }

          console.log("Quote Details written to Output Excel.");

          return;
        }

        // ─── UNDERWRITING ───────────────────────────────────────────────────
        await paymentNavigator.handleValidateEligibility();

        // Read UW answers from the raw row; safe defaults applied per question
        const uw = (col, def) => row[col]?.toString().trim() || def;

        await underwriterNavigator.completeEligibilityQuestions([
          {
            id: "allHouseholdMembersListed",
            answer: uw("UW_AllHouseholdMembersListed", "Yes"),
          },
          { id: "excludedSpouse", answer: uw("UW_ExcludedSpouse", "No") },
          {
            id: "selfEmployedDriver",
            answer: uw("UW_SelfEmployedDriver", "No"),
          },
          { id: "impairedDriver", answer: uw("UW_ImpairedDriver", "No") },
          { id: "convictedDriver", answer: uw("UW_ConvictedDriver", "No") },
          { id: "ridesharingDriver", answer: uw("UW_RidesharingDriver", "No") },
          {
            id: "vehicleNotRegisteredToDriver",
            answer: uw("UW_VehicleNotRegisteredToDriver", "No"),
          },
          { id: "modifiedAuto", answer: uw("UW_ModifiedAuto", "No") },
          { id: "businessAuto", answer: uw("UW_BusinessAuto", "No") },
        ]);

        // PAYMENT
        await paymentNavigator.completePaymentSigning(row);
        await confirmationNavigator.completeESign(row);

        // ─── CAPTURE POLICY DATA ────────────────────────────────────────────
        await page
          .locator(locators.policyNumber)
          .waitFor({ state: "visible", timeout: 15000 });

        const policyNo =
          (await page.locator(locators.policyNumber).textContent())?.trim() ||
          "";

        const policyHolder =
          (await page.locator(locators.insuredName).textContent())?.trim() ||
          "";

        const policyTerm =
          (await page.locator(locators.policyTerm).textContent())?.trim() || "";

        const paymentPlan =
          (await page.locator(locators.paymentPlan).textContent())?.trim() ||
          "";

        // ─── COVERAGE SUMMARY ───────────────────────────────────────────────
        await confirmationNavigator.goToCoverageSummary();

        const totalPremium =
          (
            await page.locator(locators.coveragePremium).textContent()
          )?.trim() || "";

        // ─── INDIVIDUAL PREMIUMS ────────────────────────────────────────────
        const BiPremium = await getPremium(page, locators.BiPremium);
        const PdPremium = await getPremium(page, locators.PdPremium);
        const PipPremium = await getPremium(page, locators.PipPremium);
        const MedpayPremium = await getPremium(page, locators.medpayPremium);
        const UmbiPremium = await getPremium(page, locators.umbiPremium);
        const UmpdPremium = await getPremium(page, locators.umpdPremium);
        const UimpdPremium = await getPremium(page, locators.uimpdPremium);
        const RentalPremium = await getPremium(page, locators.rentalPremium);
        const RoadPremium = await getPremium(page, locators.roadPremium);

        // Comp and Coll are captured only when vehicle 1 has the coverage
        // selected. vehicles[0].compSelection / .collSelection come from the
        // "V1 Comp Selection" / "V1 Coll Selection" columns (1 = selected).
        const CompPremium =
          vehicles[0].compSelection === 1
            ? await getPremium(page, locators.compPremium)
            : "";

        const CollPremium =
          vehicles[0].collSelection === 1
            ? await getPremium(page, locators.collPremium)
            : "";

        // SR22 fee is captured if ANY driver on the policy has sr22 = 1.
        // drivers.some() scans all D1–D8 driver entries in one pass.
        const SR22Fee = drivers.some((d) => d.sr22 === 1)
          ? await getPremium(page, locators.frFee)
          : "";

        const fraudFee = await getPremium(page, locators.fraudFee);
        const policyFee = await getPremium(page, locators.policyFee);

        // ─── WRITE RESULTS ──────────────────────────────────────────────────
        // TC_ID from the input row is used as the row anchor in the results
        // sheet. This prevents "row drift" when test cases are skipped — the
        // output row is located by TC_ID match, not by loop counter.
        const tcNo =
          row["TC_ID"]?.toString().trim() ||
          `TC${String(index + 1).padStart(3, "0")}`;

        const uiPremiumData = {
          "TestCase No": tcNo,
          nameInsured: policyHolder,
          policyTerm,
          totalPremium,
          paymentPlan,
          BiPremium,
          PdPremium,
          PipPremium,
          MedpayPremium,
          UmbiPremium,
          UmpdPremium,
          UimpdPremium,
          OtherThanCollision: CompPremium,
          Collision: CollPremium,
          "Rental Reimbursement": RentalPremium,
          "Roadside Assistance": RoadPremium,
          SR22Fee,
          PolicyFee: policyFee,
          FraudFee: fraudFee,
          "Policy Number": policyNo,
        };

        const excelLock = new ExcelLock(resultPath);

        await excelLock.lock();

        try {
          const { workbook, sheet: uiPremiumSheet } = openWorkbook(
            resultPath,
            "Output_PolicyUIPremium",
          );

          writeRow(uiPremiumSheet, uiPremiumData, tcNo, row.outputRow);

          saveWorkbook(workbook, resultPath);

          const verify = xlsx.readFile(resultPath);
          const verifySheet = verify.Sheets["Output_PolicyUIPremium"];
        } finally {
          await excelLock.unlock();
        }

        success = true;

        console.log(` ${tcLabel} Passed on Attempt ${attempt + 1}`);
      } catch (error) {
        console.log(` ${tcLabel} Failed on Attempt ${attempt + 1}`);
        console.log(`Error: ${error.message}`);

        const recoverableErrors = [
          "NEW_SUBMISSION_FAILED",
          "COVERAGE_SUMMARY_NOT_FOUND",
          "LOGIN_FAILED",
          "Element is not attached to the DOM",
        ];

        const isRecoverable = recoverableErrors.some((err) =>
          error.message.includes(err),
        );

        // Non-recoverable error → fail immediately
        if (!isRecoverable) {
          throw error;
        }

        console.log(`Recoverable error detected. Retrying ${tcLabel}...`);

        // If last retry, fail
        if (attempt === MAX_RETRIES - 1) {
          throw error;
        }
      } finally {
        await page?.close().catch(() => {});
        await context?.close().catch(() => {});
      }
      attempt++;
    }
  });
}
