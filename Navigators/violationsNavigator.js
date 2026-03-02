// Navigators/violationsNavigator.js

import { expect } from "@playwright/test";
import { locators } from "../Locators/selectors.js";

export class ViolationsNavigator {
  constructor(page) {
    this.page = page;
  }

  async withoutViolation() {
    // Wait for violations page to load (optional safety check)
    await expect(
      this.page.locator(locators.policyEffectiveDate)
    ).toBeVisible({ timeout: 50000 });

    const nextBtn = this.page.locator(locators.nextButton);

    await expect(nextBtn).toBeVisible({ timeout: 50000 });
    await expect(nextBtn).toBeEnabled({ timeout: 50000 });

    await nextBtn.click({ timeout: 10000 });

    console.log("Violations page → Next clicked");
  }
}