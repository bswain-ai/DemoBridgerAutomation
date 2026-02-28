import { locators } from "../Locators/selectors.js";
import { expect } from "@playwright/test";

export class CoverageNavigator {
  constructor(page) {
    this.page = page;
  }

  // ==========================================
  // Utility: Safe Toggle
  // ==========================================
  async toggleIfNeeded(locator, shouldEnable) {
    const element = this.page.locator(locator);

    await expect(element).toBeVisible({ timeout: 20000 });
    await expect(element).toBeEnabled({ timeout: 20000 });

    await element.scrollIntoViewIfNeeded();

    const isChecked = await element.isChecked();

    if (shouldEnable && !isChecked) {
      await element.click();
      await this.page.waitForLoadState("networkidle");
    }

    if (!shouldEnable && isChecked) {
      await element.click();
      await this.page.waitForLoadState("networkidle");
    }
  }

  // ==========================================
  // Coverage Mapping (Excel Driven)
  // ==========================================
  getCoverageMap() {
    return [
      { key: "PIPSection", locator: locators.pipToggle },
      { key: "MEDPAY Selection", locator: locators.medpayToggle },
      { key: "UMBI Selection", locator: locators.umbiToggle },
      { key: "UMPD Selection", locator: locators.umpdToggle },
      { key: "Motorclub Selection", locator: locators.motorclubToggle },
      { key: "RR Selection", locator: locators.rentalToggle },
      { key: "RSA Selection", locator: locators.roadsideToggle },
    ];
  }

  // ==========================================
  // Apply Simple Coverages
  // ==========================================
  async applySimpleCoverages(policyData) {
    const coverageMap = this.getCoverageMap();

    for (const coverage of coverageMap) {
      const value = Number(policyData[coverage.key]) === 1;

      await this.toggleIfNeeded(coverage.locator, value);
    }
  }

  // ==========================================
  // Apply Comp + Coll
  // ==========================================
  async applyCompAndColl(policyData) {
    const compSelected =
      Number(policyData["Veh Comp Selection"]) === 1;

    const collSelected =
      Number(policyData["VehColl Selection"]) === 1;

    if (!compSelected && !collSelected) return;

    // Toggle Comp
    await this.toggleIfNeeded(locators.compToggle, compSelected);

    // Toggle Coll
    await this.toggleIfNeeded(locators.collToggle, collSelected);

    // Select Comp Deductible
    if (compSelected && policyData.CompDeductible) {
      await this.selectDeductible(
        locators.compDeductible,
        locators.compDeductibleOption,
        policyData.CompDeductible
      );
    }

    // Select Coll Deductible
    if (collSelected && policyData.CollDeductible) {
      await this.selectDeductible(
        locators.collDeductible,
        locators.collDeductibleOption,
        policyData.CollDeductible
      );
    }
  }

  // ==========================================
  // Deductible Selector
  // ==========================================
  async selectDeductible(dropdownLocator, optionLocatorFn, value) {
    const formattedValue = Number(value).toLocaleString("en-US");

    const dropdown = this.page.locator(dropdownLocator);

    await expect(dropdown).toBeVisible({ timeout: 15000 });
    await dropdown.scrollIntoViewIfNeeded();
    await dropdown.click();

    const option = this.page.locator(optionLocatorFn(formattedValue));

    await expect(option).toBeVisible({ timeout: 15000 });
    await option.click();

    await this.page.waitForLoadState("networkidle");
  }

  // ==========================================
  // Refresh Premium
  // ==========================================
  async refreshPrice() {
    const refreshBtn = this.page.locator(locators.refreshPriceBtn);

    await expect(refreshBtn).toBeVisible({ timeout: 20000 });
    await expect(refreshBtn).toBeEnabled({ timeout: 20000 });

    await refreshBtn.click();

    await expect(this.page.locator(locators.premiumValue)).toBeVisible({
      timeout: 50000,
    });

    await this.page.waitForLoadState("networkidle");
  }

  // ==========================================
  // Proceed → Back → Restore Cycle
  // ==========================================
  async proceedThenBackAndRestore(policyData) {
    console.log("Running stability cycle...");

    const proceedBtn = this.page.locator(locators.proceedQuoteBtn);

    await expect(proceedBtn).toBeEnabled({ timeout: 20000 });
    await proceedBtn.click();

    await expect(this.page.locator(locators.paymentOptions)).toBeVisible({
      timeout: 20000,
    });

    await this.page.locator(locators.backBtn).click();

    await this.page.waitForLoadState("networkidle");

    // Reapply coverages
    await this.applySimpleCoverages(policyData);
    await this.applyCompAndColl(policyData);
    await this.refreshPrice();
  }

  // ==========================================
  // Master Coverage Flow
  // ==========================================
  async applyCoverages(policyData) {
    console.log("==== APPLYING COVERAGES ====");
    console.log(policyData);

    // Initial Apply
    await this.applySimpleCoverages(policyData);
    await this.applyCompAndColl(policyData);
    await this.refreshPrice();

    // Stability cycle
    await this.proceedThenBackAndRestore(policyData);

    // Final proceed
    await this.proceedToPaymentWithRetry();
  }

  // ==========================================
  // Final Proceed (Retry Safe)
  // ==========================================
  async proceedToPaymentWithRetry() {
    const proceedBtn = this.page.locator(locators.proceedQuoteBtn);

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`Proceed attempt ${attempt}`);

        await expect(
          this.page.locator(locators.disabledProceedBtn)
        ).not.toBeVisible({ timeout: 5000 });

        await expect(this.page.locator(locators.premiumValue)).toBeVisible({
          timeout: 5000,
        });

        await expect(proceedBtn).toBeVisible({ timeout: 5000 });
        await expect(proceedBtn).toBeEnabled({ timeout: 5000 });

        await proceedBtn.click();

        await expect(this.page.locator(locators.paymentOptions)).toBeVisible({
          timeout: 50000,
        });

        console.log("Proceed successful");
        return;
      } catch (error) {
        console.log(`Proceed failed on attempt ${attempt}`);

        if (attempt === 3) {
          throw new Error("Proceed Quote failed after 3 attempts");
        }

        await this.page.waitForTimeout(2000);
      }
    }
  }
}