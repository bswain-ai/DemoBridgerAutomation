import { test } from "@playwright/test";
import { credentials } from "../config/credentials.js";
import { login } from "../helpers/loginHelper.js";
import { FakerData } from "../testData/fakerData.js";
import { readSheetAsJson, openWorkbook, validateInputSchema } from "../helpers/excelReader.js";
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

// ================= FILE PATH =================
const filePath = credentials.dataFile;
const resultPath = credentials.resultFile;

// ================= READ EXCEL =================
const excelData = readSheetAsJson(
  filePath,
  "InputData_Policy&RateAccelator"
);

// TASK 3 — Phase 1 Schema Validation
// Validates that all 23 required columns are present in the input Excel
// before any test case or browser session starts. If any required column
// is missing, a named error is thrown here listing every missing column —
// the run stops immediately rather than failing mid-test with a cryptic
// "Cannot read properties of undefined" error 10 tests in.
// This call runs at module load time (outside any test block) so
// Playwright has not yet opened a browser when this check fires.
validateInputSchema(excelData);

console.log("Total Rows:", excelData.length);

// ================= TEST LOOP =================
for (let index = 0; index < excelData.length; index++) {

  const policyData = excelData[index];

  test(`Create Policy TC${index + 1}`, async ({ browser }) => {

    // ================= VALIDATION =================
    const vin =
      policyData["VIN*"] ||
      policyData["VIN"] ||
      policyData["Vin"] ||
      "";

    if (!vin) {
      console.log("Skipping row due to missing VIN");
      test.skip();
    }

    // ================= RETRY CONFIG =================
    const MAX_RETRIES = 2;
    let attempt = 0;
    let success = false;

    while (attempt < MAX_RETRIES && !success) {

      const context = await browser.newContext();
      const page = await context.newPage();

      try {
        console.log(`Running TC${index + 1} - Attempt ${attempt + 1}`);

        // ================= NAVIGATORS =================
        const nameInsured = new NameInsuredNavigator(page);
        const addressNavigator = new AddressNavigator(page);
        const vehicleNavigator = new VehicleNavigator(page);
        const driverNavigator = new DriverNavigator(page);
        const violationsNavigator = new ViolationsNavigator(page);
        const coverageNavigator = new CoverageNavigator(page);
        const underwriterNavigator = new UnderwriterNavigator(page);
        const paymentNavigator = new PaymentNavigator(page);
        const confirmationNavigator = new ConfirmationNavigator(page);

        // ================= EXCEL =================
        const { workbook, sheet: uiPremiumSheet } = openWorkbook(
          resultPath,
          "Output_PolicyUIPremium"
        );

        // ================= LOGIN =================
        await login(page, "agent");

        const insuredData = FakerData.generateNamedInsured();

        // ================= POLICY FLOW =================
        await nameInsured.completeNamedInsured(policyData, insuredData);
        await addressNavigator.enterAddress(policyData);
        await vehicleNavigator.addVehicle(policyData);
        await driverNavigator.completeDriverSection(policyData);
        await violationsNavigator.withoutViolation();
        await coverageNavigator.applyCoverages(policyData);

        // ================= UW =================
        await paymentNavigator.handleValidateEligibility();

        const uw = (col, def) =>
          policyData[col]?.toString().trim() || def;

        await underwriterNavigator.completeEligibilityQuestions([
          { id: "allHouseholdMembersListed",    answer: uw("UW_AllHouseholdMembersListed",    "Yes") },
          { id: "excludedSpouse",               answer: uw("UW_ExcludedSpouse",               "No")  },
          { id: "selfEmployedDriver",           answer: uw("UW_SelfEmployedDriver",           "No")  },
          { id: "impairedDriver",               answer: uw("UW_ImpairedDriver",               "No")  },
          { id: "convictedDriver",              answer: uw("UW_ConvictedDriver",              "No")  },
          { id: "ridesharingDriver",            answer: uw("UW_RidesharingDriver",            "No")  },
          { id: "vehicleNotRegisteredToDriver", answer: uw("UW_VehicleNotRegisteredToDriver", "No")  },
          { id: "modifiedAuto",                 answer: uw("UW_ModifiedAuto",                 "No")  },
          { id: "businessAuto",                 answer: uw("UW_BusinessAuto",                 "No")  },
        ]);

        // ================= PAYMENT =================
        await paymentNavigator.completePaymentSigning(policyData);
        await confirmationNavigator.completeESignAndPurchase();

        // ================= WAIT BEFORE CAPTURE =================
        await page.locator(locators.policyNumber).waitFor({ state: "visible", timeout: 15000 });

        // ================= CAPTURE POLICY =================
        const policyNo =
          (await page.locator(locators.policyNumber).textContent())?.trim() || "";

        const policyHolder =
          (await page.locator(locators.insuredName).textContent())?.trim() || "";

        const policyTerm =
          (await page.locator(locators.policyTerm).textContent())?.trim() || "";

        const paymentPlan =
          (await page.locator(locators.paymentPlan).textContent())?.trim() || "";

        // ================= COVERAGE =================
        await confirmationNavigator.goToCoverageSummary();

        const totalPremium =
          (await page.locator(locators.coveragePremium).textContent())?.trim() || "";

        // ================= PREMIUM =================
        const BiPremium = await getPremium(page, locators.BiPremium);
        const PdPremium = await getPremium(page, locators.PdPremium);
        const PipPremium = await getPremium(page, locators.PipPremium);
        const MedpayPremium = await getPremium(page, locators.medpayPremium);
        const UmbiPremium = await getPremium(page, locators.umbiPremium);
        const UmpdPremium = await getPremium(page, locators.umpdPremium);
        const UimpdPremium = await getPremium(page, locators.uimpdPremium);

        const RentalPremium = await getPremium(page, locators.rentalPremium);
        const RoadPremium = await getPremium(page, locators.roadPremium);

        const CompPremium =
          Number(policyData["Veh Comp Selection"]) === 1
            ? await getPremium(page, locators.compPremium)
            : "";

        const CollPremium =
          Number(policyData["VehColl Selection"]) === 1
            ? await getPremium(page, locators.collPremium)
            : "";

        const SR22Fee =
          Number(policyData["SR22"]) === 1
            ? await getPremium(page, locators.frFee)
            : "";

        const fraudFee = await getPremium(page, locators.fraudFee);
        const policyFee = await getPremium(page, locators.policyFee);

        // ================= WRITE EXCEL =================

        // TC_NO ANCHOR FIX — Phase 1 Task 1
        // Previously the output row position was driven by the loop counter
        // (index), which caused "row drift": if TC002 was skipped due to a
        // missing VIN, TC003 would be written to row 2 in the output sheet
        // instead of row 3, and every test case below it would be off by one.
        // This made the premium comparison in policyValidation completely
        // unreliable for any run that had at least one skipped test case.
        //
        // The fix: read the TC number from the "TC NO" column in the input
        // Excel row. The output writer then finds (or creates) the correct
        // row by matching that TC number — position in the loop no longer
        // determines where the result is written.
        //
        // Falls back to a generated TC number only if the "TC NO" column
        // is blank, so existing test cases without that column still work.
        const tcNo =
          policyData["TC NO"]?.toString().trim() ||
          `TC${String(index + 1).padStart(3, "0")}`;

        const uiPremiumData = {
          // Use tcNo (sourced from the input Excel) instead of the loop
          // counter. This label is also the key the comparison sheet uses
          // to join UI premium against rater premium — it must be stable.
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

        // Pass tcNo to writeRow so it locates the correct output row by
        // matching the TestCase No column — not by counting array positions.
        writeRow(uiPremiumSheet, uiPremiumData, tcNo);
        saveWorkbook(workbook, resultPath);

        success = true;

        console.log(` TC${index + 1} Passed on Attempt ${attempt + 1}`);

      } catch (error) {

        console.log(` TC${index + 1} Failed on Attempt ${attempt + 1}`);

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