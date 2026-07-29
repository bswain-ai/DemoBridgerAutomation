import { expect } from "@playwright/test";
import { locators } from "../Locators/selectors.js";

export class FinalDetailsNavigator {
  constructor(page) {
    this.page = page;
  }

  // ============================================================
  // PRIOR COVERAGE
  // ============================================================

  async fillPriorCoverageDetails(testData) {
    const priorCoverageSelection = String(
      testData["Prior Coverage Selection"] ?? "0",
    ).trim();

    console.log(`Prior Coverage Selection : ${priorCoverageSelection}`);

    // ============================================================
    // 0 = No Prior Insurance
    // ============================================================

    if (priorCoverageSelection === "0") {
      await this.page.locator(locators.priorCoverageNo).click();

      console.log("Selected : No Prior Insurance");

      // Nothing else to fill
      return;
    }

    // ============================================================
    // 1 = Bridger Insurance
    // ============================================================

    if (priorCoverageSelection === "1") {
      await this.page.locator(locators.priorCoverageBridger).click();

      console.log("Selected : Bridger Insurance");

      // Current Policy Number (Only for Bridger)
      await this.page
        .locator(locators.priorCurrentPolicyNumber)
        .fill(String(testData["Prior Policy No"] ?? ""));

      // Duration
      await this.page
        .locator(locators.priorCoverageDuration)
        .selectOption(String(testData["Prior Cov Months"] ?? "0"));

      // Expiration Date
      if (testData["Prior Exp Date"]) {
        await this.page
          .locator(locators.priorCoverageExpirationDate)
          .fill(String(testData["Prior Exp Date"]));
      }

      // BI Limits
      await this.page
        .locator(locators.priorCurrentBILimits)
        .selectOption(String(testData["Prior BI Limits"] ?? ""));

      console.log("Bridger Prior Coverage Completed.");

      return;
    }

    // ============================================================
    // 2 = Other Company
    // ============================================================

    if (priorCoverageSelection === "2") {
      await this.page.locator(locators.priorCoverageOther).click();

      console.log("Selected : Other Company");

      // Prior In Agency

      const priorInAgency = String(testData["Prior In Agency"] ?? "No")
        .trim()
        .toLowerCase();

      if (priorInAgency === "yes") {
        await this.page.locator(locators.priorInAgencyYes).click();
      } else {
        await this.page.locator(locators.priorInAgencyNo).click();
      }

      // Duration
      await this.page
        .locator(locators.priorCoverageDuration)
        .selectOption(String(testData["Prior Cov Months"] ?? "0"));

      // Expiration Date
      if (testData["Prior Exp Date"]) {
        await this.page
          .locator(locators.priorCoverageExpirationDate)
          .fill(String(testData["Prior Exp Date"]));
      }

      // BI Limits
      await this.page
        .locator(locators.priorCurrentBILimits)
        .selectOption(String(testData["Prior BI Limits"] ?? ""));

      console.log("Other Company Prior Coverage Completed.");

      return;
    }

    throw new Error(
      `Invalid Prior Coverage Selection : ${priorCoverageSelection}`,
    );
  }

  // ============================================================
  // NEXT BUTTON
  // ============================================================

  async continueToCoverage() {
    await expect(this.page.locator(locators.nextButton)).toBeVisible({
      timeout: 60000,
    });

    await expect(this.page.locator(locators.nextButton)).toBeEnabled();

    await this.page.locator(locators.nextButton).click({ timeout: 10000 });

    console.log("Final Details completed.");
  }
}
