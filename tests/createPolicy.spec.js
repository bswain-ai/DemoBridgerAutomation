import { test, expect } from "@playwright/test";
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

const filePath = credentials.dataFile;
const resultPath = credentials.resultFile;

const excelData = readSheetAsJson(filePath, "InputData_Policy&RateAccelator");

excelData.forEach((policyData, index) => {
  test(`Create Policy ${index + 1}`, async ({ page }) => {
    if (!policyData?.VIN) test.skip();

    // ================= Initialize =================
    const nameInsured = new NameInsuredNavigator(page);
    const addressNavigator = new AddressNavigator(page);
    const vehicleNavigator = new VehicleNavigator(page);
    const driverNavigator = new DriverNavigator(page);
    const violationsNavigator = new ViolationsNavigator(page);
    const coverageNavigator = new CoverageNavigator(page);
    const underwriterNavigator = new UnderwriterNavigator(page);
    const paymentNavigator = new PaymentNavigator(page);
    const confirmationNavigator = new ConfirmationNavigator(page);

    const { workbook: resultWorkbook, sheet: resultSheet } = openWorkbook(
      resultPath,
      "Output_PolicyUIPremium",
    );

    // ================= Login =================
    await login(page, "agent");

    // ================= Policy Flow =================

    const insuredData = FakerData.generateNamedInsured();
    await nameInsured.completeNamedInsured(policyData, insuredData);
    await addressNavigator.enterAddress(policyData);
    await vehicleNavigator.addVehicle(policyData);
    await driverNavigator.completeDriverSection(policyData);
    await violationsNavigator.withoutViolation();
    await coverageNavigator.applyCoverages(policyData);

    // ================= Payment + UW =================
    await paymentNavigator.handleValidateEligibility();

    const uwQuestions = [
      { id: "allHouseholdMembersListed", answer: "Yes" },
      { id: "excludedSpouse", answer: "No" },
      { id: "selfEmployedDriver", answer: "No" },
      { id: "impairedDriver", answer: "No" },
      { id: "convictedDriver", answer: "No" },
      { id: "ridesharingDriver", answer: "No" },
      { id: "vehicleNotRegisteredToDriver", answer: "No" },
      { id: "modifiedAuto", answer: "No" },
      { id: "businessAuto", answer: "No" },
    ];

    await underwriterNavigator.completeEligibilityQuestions(uwQuestions);

    await paymentNavigator.completePaymentSigning(policyData);

    await confirmationNavigator.completeESignAndPurchase();

    // ================= Capture Policy Data =================
    const policyNo =
      (await page.locator(locators.policyNumber).textContent())?.trim() || "";

    const policyHolder =
      (await page.locator(locators.insuredName).textContent())?.trim() || "";

    const policyTerm =
      (await page.locator(locators.policyTerm).textContent())?.trim() || "";

    const paymentPlan =
      (await page.locator(locators.paymentPlan).textContent())?.trim() || "";

    // ================= Coverage Summary =================
    await confirmationNavigator.goToCoverageSummary();

    const totalPremium =
      (await page.locator(locators.coveragePremium).textContent())?.trim() ||
      "";

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
      Number(policyData.CompCollSection) === 1
        ? await getPremium(page, locators.compPremium)
        : "";

    const CollPremium =
      Number(policyData.CompCollSection) === 1
        ? await getPremium(page, locators.collPremium)
        : "";

    const SR22Fee =
      Number(policyData.SR22) === 1
        ? await getPremium(page, locators.frFee)
        : "";

    const fraudFee = await getPremium(page, locators.fraudFee);
    const policyFee = await getPremium(page, locators.policyFee);

    // ================= Write Results =================
    const resultData = {
      "TestCase No": `TestCase No:${index + 1}`,
      nameInsured: policyHolder,
      policyTerm: policyTerm,
      totalPremium: totalPremium,
      paymentPlan: paymentPlan,
      BiPremium: BiPremium,
      PdPremium: PdPremium,
      PipPremium: PipPremium,
      MedpayPremium: MedpayPremium,
      UmbiPremium: UmbiPremium,
      UmpdPremium: UmpdPremium,
      UimpdPremium: UimpdPremium,
      OtherThanCollision: CompPremium,
      Collision: CollPremium,
      "Rental Reimbursement": RentalPremium,
      "Roadside Assistance": RoadPremium,
      SR22Fee: SR22Fee,
      PolicyFee: policyFee,
      FraudFee: fraudFee,
      "Policy Number": policyNo,
    };

    writeRow(resultSheet, resultData, index);
    saveWorkbook(resultWorkbook, resultPath);

    console.log(`Policy ${index + 1} created successfully`);
  });
});
