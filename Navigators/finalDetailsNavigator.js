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

      // Current Policy Number
      await this.page
        .locator(locators.priorCurrentPolicyNumber)
        .fill(String(testData["Prior Policy No"] ?? ""));

      // ============================================================
      // Prior Coverage Duration
      // ============================================================

      const priorCovMonths = String(testData["Prior Cov Months"] ?? "").trim();

      console.log("Prior Cov Months from Excel:", priorCovMonths);
      console.log("Excel value type:", typeof testData["Prior Cov Months"]);

      const durationDropdown = this.page.locator(
        locators.priorCoverageDuration,
      );

      await durationDropdown.waitFor({
        state: "visible",
      });

      console.log(
        "Duration Options:",
        await durationDropdown.locator("option").evaluateAll((options) =>
          options.map((option) => ({
            text: option.textContent?.trim(),
            value: option.value,
          })),
        ),
      );

      await durationDropdown.selectOption({
        value: priorCovMonths,
      });

      const selectedDuration = await durationDropdown.inputValue();

      console.log(`Duration Expected: ${priorCovMonths}`);

      console.log(`Duration Actual: ${selectedDuration}`);

      if (selectedDuration !== priorCovMonths) {
        throw new Error(
          `Prior Cov Months was not selected. ` +
            `Expected: ${priorCovMonths}, ` +
            `Actual: ${selectedDuration}`,
        );
      }

      // ============================================================
      // Expiration Date
      // ============================================================

      if (testData["Prior Exp Date"]) {
        await this.page
          .locator(locators.priorCoverageExpirationDate)
          .fill(String(testData["Prior Exp Date"]));
      }

      // ============================================================
      // BI Limits
      // ============================================================

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
    const nextButton = this.page.locator(locators.nextButton);

    // 1. Wait until Next is visible
    await expect(nextButton).toBeVisible({
      timeout: 60000,
    });

    // 2. Wait until Next becomes enabled
    await expect(nextButton).toBeEnabled({
      timeout: 30000,
    });

    // 3. Make sure the button is in the viewport
    await nextButton.scrollIntoViewIfNeeded();

    // 4. Verify Playwright considers the button actionable
    await nextButton.click({
      trial: true,
      timeout: 10000,
    });

    console.log("Next button is actionable. Clicking...");

    // 5. Actual click
    await nextButton.click({
      timeout: 10000,
    });
    const coverageStep = this.page.getByText("Coverages", {
      exact: true,
    });

    try {
      await expect(coverageStep).toBeVisible({
        timeout: 15000,
      });

      console.log("Final Details completed. Coverage step opened.");
    } catch (error) {
      console.log("Next click did not move to Coverage. Retrying...");
      await expect(nextButton).toBeVisible({
        timeout: 10000,
      });

      await expect(nextButton).toBeEnabled({
        timeout: 10000,
      });

      await nextButton.scrollIntoViewIfNeeded();
      await nextButton.click({
        timeout: 10000,
      });
      await expect(coverageStep).toBeVisible({
        timeout: 15000,
      });

      console.log("Retry successful. Coverage step opened.");
    }
  }
}
