// Navigators/paymentNavigator.js

import { expect } from "@playwright/test";
import { locators } from "../Locators/selectors.js";

export class PaymentNavigator {
  constructor(page) {
    this.page = page;
  }

  // ====================================
  // Select Payment Option
  // ====================================
  async selectPaymentOption(policyData) {
    const paymentOption = String(
      policyData.PAYMENTOPTIONS || policyData["PAYMENT OPTIONS"] || "",
    ).trim();

    console.log(`Selecting Payment Option: ${paymentOption}`);

    const paymentMethodDropdown = this.page.getByLabel("Down Payment Method", {
      exact: true,
    });

    await paymentMethodDropdown.waitFor({
      state: "visible",
      timeout: 50000,
    });

    await paymentMethodDropdown.click();

    const option = this.page.getByRole("option", {
      name: paymentOption,
      exact: true,
    });

    await option.waitFor({
      state: "visible",
      timeout: 10000,
    });

    await option.click();

    console.log(`Selected Payment Option: ${paymentOption}`);
  }
  // ====================================
  // Validate Eligibility (with retry)
  // ====================================
  async handleValidateEligibility() {
    const validateBtn = this.page.locator(locators.validateEligibilityBtn);

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
      }
    }
  }

  // ====================================
  // Payment Signing Details
  // ====================================
  async completePaymentSigning(policyData) {
    console.log("Completing Payment Signing...");

    await this.page.locator(locators.officeEsign).click({
      timeout: 50000,
    });

    // Get Payment Option from Excel
    const paymentOption = String(
      policyData.PAYMENTOPTIONS || policyData["PAYMENT OPTIONS"] || "",
    ).trim();

    // Fill Check Number only for Pay in Full
    if (paymentOption === "Pay in Full") {
      console.log(`Payment Option = ${paymentOption}`);

      const checkNumberField = this.page.locator(locators.checkNumberTextBox);

      try {
        await checkNumberField.waitFor({
          state: "visible",
          timeout: 5000,
        });

        await checkNumberField.fill(String(policyData.ChkNumber || ""));

        console.log("Check Number filled successfully.");
      } catch {
        console.log(
          "Check Number field is not available in the new Payment UI. Continuing without Check Number.",
        );
      }
    }

    // Producer Checkbox
    const producerChkBox = this.page.locator(locators.producerOnlyChkBox);

    await producerChkBox.waitFor({
      state: "visible",
      timeout: 50000,
    });

    await producerChkBox.scrollIntoViewIfNeeded();

    if (!(await producerChkBox.isChecked())) {
      await producerChkBox.check({ force: true });
    }

    console.log("Producer checkbox checked.");

    // ====================================
    // Click Run Reports (Next)
    // ====================================
    await this.page.locator(locators.nextButton).click({
      timeout: 50000,
    });

    console.log("Clicked Run Reports button.");

    // Give UI time to trigger the MVR request
    await this.page.waitForLoadState("networkidle");

    // ====================================
    // Handle MVR Report Complete Popup
    // ====================================
    const mvrPopup = this.page.locator(locators.mvrReportCompletePopup);
    const continueBtn = this.page.locator(locators.mvrContinueButton);

    try {
      await mvrPopup.waitFor({
        state: "visible",
        timeout: 60000,
      });

      console.log("MVR Report Complete popup displayed.");

      await continueBtn.waitFor({
        state: "visible",
        timeout: 30000,
      });

      await continueBtn.click({
        timeout: 30000,
      });

      console.log("Clicked Continue button on MVR popup.");
    } catch (error) {
      console.log(
        "MVR Report Complete popup did not appear. Continuing execution.",
      );
    }

    console.log("Payment Signing completed.");
  }
}
