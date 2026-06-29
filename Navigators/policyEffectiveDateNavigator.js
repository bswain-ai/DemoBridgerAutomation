import { expect } from "@playwright/test";
import { locators } from "../Locators/selectors.js";

export class PolicyEffectiveDateNavigator {
  constructor(page) {
    this.page = page;
  }

  async continueToCoverage() {

    // Wait until Policy Effective Date page loads
    await expect(
      this.page.locator(locators.policyEffectiveDate)
    ).toBeVisible({
      timeout: 60000,
    });

    // Next button
    await expect(
      this.page.locator(locators.nextButton)
    ).toBeVisible();

    await expect(
      this.page.locator(locators.nextButton)
    ).toBeEnabled();

    await this.page
      .locator(locators.nextButton)
      .click({ timeout: 10000 });

    console.log("Policy Effective Date completed.");
  }
}