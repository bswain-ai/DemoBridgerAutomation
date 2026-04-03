import { test } from "@playwright/test";
import { credentials } from "../config/credentials.js";
import { login } from "../helpers/loginHelper.js";
import { FakerData } from "../testData/fakerData.js";
import { readSheetAsJson, openWorkbook } from "../helpers/excelReader.js";
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

        await underwriterNavigator.completeEligibilityQuestions([
          { id: "allHouseholdMembersListed", answer: "Yes" },
          { id: "excludedSpouse", answer: "No" },
          { id: "selfEmployedDriver", answer: "No" },
          { id: "impairedDriver", answer: "No" },
          { id: "convictedDriver", answer: "No" },
          { id: "ridesharingDriver", answer: "No" },
          { id: "vehicleNotRegisteredToDriver", answer: "No" },
          { id: "modifiedAuto", answer: "No" },
          { id: "businessAuto", answer: "No" },
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
        const uiPremiumData = {
          "TestCase No": `TC${String(index + 1).padStart(3, "0")}`,
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

        writeRow(uiPremiumSheet, uiPremiumData, index);
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