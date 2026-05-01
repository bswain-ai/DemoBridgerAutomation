import { test } from "@playwright/test";
import xlsx from "xlsx";
import { credentials } from "../config/credentials.js";
import { login } from "../helpers/loginHelper.js";
import { FakerData } from "../testData/fakerData.js";
import { openWorkbook } from "../helpers/excelReader.js";
import { buildRaterData } from "../helpers/raterHelper.js";
import { writeRow, saveWorkbook } from "../helpers/excelWriter.js";
import { getPremium } from "../helpers/uiHelper.js";
import { locators } from "../Locators/selectors.js";

import { NameInsuredNavigator } from "../Navigators/nameInsured.js";
import { AddressNavigator } from "../Navigators/addressNavigator.js";
import { VehicleNavigator } from "../Navigators/vehicleNavigator.js";
import { DriverNavigator } from "../Navigators/driverNavigator.js";
import { ViolationsNavigator } from "../Navigators/violationsNavigator.js";
import { CoverageNavigator } from "../Navigators/coverageNavigator.js";
import { UnderwriterNavigator } from "../Navigators/underwriterNavigator.js";
import { PaymentNavigator } from "../Navigators/paymentNavigator.js";
import { ConfirmationNavigator } from "../Navigators/confirmationNavigator.js";

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
const rawRows = xlsx.utils.sheet_to_json(ws_tc, { header: 1, defval: "" });

// Row index 2 (0-based) = Row 3 of the sheet = column headers
const headers = rawRows[2];

// Build an array of plain objects keyed by column header.
// Filter by r[0] (TC_ID column) to skip blank / spacer rows.
const excelData = rawRows
  .slice(4)
  .filter((r) => r[0])
  .map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""])));

console.log("Total Rows:", excelData.length);

// ─────────────────────────────────────────────────────────────────────────────
// TEST LOOP
// ─────────────────────────────────────────────────────────────────────────────
for (let index = 0; index < excelData.length; index++) {
  // raw row — passed as-is to navigators that read column names directly
  // (State, Program, "Effective Date", address fields, coverage fields, UW, etc.)
  const row = excelData[index];

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
    // Skip if no VIN
    if (!vehicles[0]?.vin) {
      console.log("Skipping row due to missing VIN");
      test.skip();
    }

    // ─── RETRY CONFIG ───────────────────────────────────────────────────────
    const MAX_RETRIES = 2;
    let attempt = 0;
    let success = false;

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
        const coverageNavigator = new CoverageNavigator(page);
        const underwriterNavigator = new UnderwriterNavigator(page);
        const paymentNavigator = new PaymentNavigator(page);
        const confirmationNavigator = new ConfirmationNavigator(page);

        const { workbook, sheet: uiPremiumSheet } = openWorkbook(
          resultPath,
          "Output_PolicyUIPremium",
        );

        // LOGIN
        await login(page, "agent");

        const insuredData = FakerData.generateNamedInsured();

        // ─── POLICY FLOW ────────────────────────────────────────────────────

        // Pass raw row to navigators that read policy / address / coverage /
        // UW columns directly by their original header names.
        await nameInsured.completeNamedInsured(row, insuredData);
        await addressNavigator.enterAddress(row);

        // Vehicle loop — addVehicle receives the structured vehicle object plus
        // its index and total count so the navigator knows when to click Next.
        // The same [data-test="add-vehicle-button"] is used for every vehicle;
        // the first shows as "Update", subsequent as "+ Add vehicle".
        for (let v = 0; v < vehicles.length; v++) {
          console.log(` Adding Vehicle ${v + 1}`);
          await vehicleNavigator.addVehicle(vehicles[v], v, vehicles.length);
        }

        // Driver loop — completeDriverSection receives the structured driver
        // object plus index and total count.
        //   driverIndex 0 → "Update" button (primary insured, pre-populated)
        //   driverIndex 1+ → "Add driver" button (additional drivers)
        //   Next×2 is only clicked after the last driver.
        for (let d = 0; d < drivers.length; d++) {
          console.log(` Adding Driver ${d + 1}`);
          await driverNavigator.completeDriverSection(
            drivers[d],
            d,
            drivers.length,
          );
        }

        await violationsNavigator.withoutViolation();
        await coverageNavigator.applyCoverages(row);

        // ─── UNDERWRITING ───────────────────────────────────────────────────
        await paymentNavigator.handleValidateEligibility();

        // Read UW answers from the raw row; safe defaults applied per question
        const uw = (col, def) => row[col]?.toString().trim() || def;

        await underwriterNavigator.completeEligibilityQuestions([
          { id: "allHouseholdMembersListed", answer: uw("UW_AllHouseholdMembersListed", "Yes")},
          { id: "excludedSpouse", answer: uw("UW_ExcludedSpouse", "No") },
          { id: "selfEmployedDriver", answer: uw("UW_SelfEmployedDriver", "No") },
          { id: "impairedDriver", answer: uw("UW_ImpairedDriver", "No") },
          { id: "convictedDriver", answer: uw("UW_ConvictedDriver", "No") },
          { id: "ridesharingDriver", answer: uw("UW_RidesharingDriver", "No") },
          { id: "vehicleNotRegisteredToDriver", answer: uw("UW_VehicleNotRegisteredToDriver", "No") },
          { id: "modifiedAuto", answer: uw("UW_ModifiedAuto", "No") },
          { id: "businessAuto", answer: uw("UW_BusinessAuto", "No") },
        ]);

        // PAYMENT
        await paymentNavigator.completePaymentSigning(row);
        await confirmationNavigator.completeESign();

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

        writeRow(uiPremiumSheet, uiPremiumData, tcNo);
        saveWorkbook(workbook, resultPath);

        success = true;

        console.log(` ${tcLabel} Passed on Attempt ${attempt + 1}`);
      } catch (error) {
        console.log(` ${tcLabel} Failed on Attempt ${attempt + 1}`);

        if (attempt === MAX_RETRIES - 1) {
          throw error;
        }
      } finally {
        await page.close();
        await context.close();
      }

      attempt++;
    }
  });
}
