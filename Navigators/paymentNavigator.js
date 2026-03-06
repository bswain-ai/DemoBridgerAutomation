// Navigators/paymentNavigator.js

import { expect } from "@playwright/test";
import { locators } from "../Locators/selectors.js";

export class PaymentNavigator {
  constructor(page) {
    this.page = page;
  }

  // ====================================
  // Validate Eligibility (with retry)
  // ====================================
  async handleValidateEligibility() {
    const validateBtn = this.page.locator(
      locators.validateEligibilityBtn
    );

    await expect(validateBtn).toBeVisible({ timeout: 50000 });
    await expect(validateBtn).toBeEnabled({ timeout: 50000 });

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`Validate attempt ${attempt}`);

        await validateBtn.click();

        await this.page.locator(locators.uwQueryPage).waitFor({
          state: "visible",
          timeout: 10000,
        });

        console.log("UW page loaded successfully");
        return;
      } catch (error) {
        if (attempt === 2) {
          throw new Error("Validate Eligibility failed after retry");
        }

        console.log("Retrying Validate flow...");

        await this.page.locator(locators.backBtn).click();
        await this.page.waitForLoadState("networkidle");
        await this.page.waitForTimeout(2000);
      }
    }
  }

  // ====================================
  // Payment Signing Details
  // ====================================
  async completePaymentSigning(policyData) {
    console.log("Completing Payment Signing...");

    await this.page
      .locator(locators.officeEsign)
      .click({ timeout: 50000 });

    await this.page
      .locator(locators.checkNumberTextBox)
      .fill(policyData.ChkNumber.toString());

    await this.page
      .locator(locators.nextButton)
      .click({ timeout: 50000 });
  }
}