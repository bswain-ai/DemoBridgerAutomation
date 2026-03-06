import { locators } from "../Locators/selectors.js";
import { expect } from "@playwright/test";

export class CoverageNavigator {
  constructor(page) {
    this.page = page;
  }

  // ==========================================
  // Safe Toggle (Handles Missing Elements)
  // ==========================================
  async toggleIfNeeded(locator, shouldEnable) {
    const element = this.page.locator(locator);

    const count = await element.count();

    if (count === 0) {
      console.log(`Coverage not present → skipping: ${locator}`);
      return;
    }

    await element.scrollIntoViewIfNeeded();

    const isVisible = await element.isVisible().catch(() => false);

    if (!isVisible) {
      console.log(`Coverage hidden → skipping: ${locator}`);
      return;
    }

    const isChecked = await element.isChecked().catch(() => false);

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
  // Coverage Map (Excel Driven)
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
      const rawValue = policyData[coverage.key];
      const value = rawValue && Number(rawValue) === 1;

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

    await this.toggleIfNeeded(locators.compToggle, compSelected);
    await this.toggleIfNeeded(locators.collToggle, collSelected);

    if (compSelected && policyData.CompDeductible) {
      await this.selectDeductible(
        locators.compDeductible,
        locators.compDeductibleOption,
        policyData.CompDeductible
      );
    }

    if (collSelected && policyData.CollDeductible) {
      await this.selectDeductible(
        locators.collDeductible,
        locators.collDeductibleOption,
        policyData.CollDeductible
      );
    }
  }

  // ==========================================
  // Rental + Roadside Values
  // ==========================================
  async applyAddonValues(policyData) {

    // ---------- Rental ----------
    if (Number(policyData["RR Selection"]) === 1) {

      const rrLimit = policyData["RR Limit"];
      const rrDuration = policyData["RR Duration"];

      if (rrLimit) {
        const limitDropdown = this.page.locator(locators.rrLimit);

        if (await limitDropdown.count()) {
          await limitDropdown.selectOption(String(rrLimit));
          console.log("RR Limit selected:", rrLimit);
        }
      }

      if (rrDuration) {
        const durationDropdown = this.page.locator(locators.rrDuration);

        if (await durationDropdown.count()) {
          await durationDropdown.selectOption(String(rrDuration));
          console.log("RR Duration selected:", rrDuration);
        }
      }
    }

    // ---------- Roadside ----------
    if (Number(policyData["RSA Selection"]) === 1) {

      const rsaVal = policyData["RSA Val"];

      if (rsaVal) {
        const rsaDropdown = this.page.locator(locators.rsaLimit);

        if (await rsaDropdown.count()) {
          await rsaDropdown.selectOption(String(rsaVal));
          console.log("RSA selected:", rsaVal);
        }
      }
    }
  }

  // ==========================================
  // Select Deductible
  // ==========================================
  async selectDeductible(dropdownLocator, optionLocatorFn, value) {
    const formattedValue = Number(value).toLocaleString("en-US");

    const dropdown = this.page.locator(dropdownLocator);

    const count = await dropdown.count();

    if (count === 0) return;

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

    const count = await refreshBtn.count();

    if (count === 0) return;

    await expect(refreshBtn).toBeVisible({ timeout: 20000 });
    await expect(refreshBtn).toBeEnabled({ timeout: 20000 });

    await refreshBtn.click();

    await expect(this.page.locator(locators.premiumValue)).toBeVisible({
      timeout: 50000,
    });

    await this.page.waitForLoadState("networkidle");
  }

  // ==========================================
  // Proceed → Back → Restore
  // ==========================================
  async proceedThenBackAndRestore(policyData) {
    console.log("Running coverage stability cycle");

    const proceedBtn = this.page.locator(locators.proceedQuoteBtn);

    await expect(proceedBtn).toBeEnabled({ timeout: 20000 });
    await proceedBtn.click();

    await expect(this.page.locator(locators.paymentOptions)).toBeVisible({
      timeout: 20000,
    });

    await this.page.locator(locators.backBtn).click();

    await this.page.waitForLoadState("networkidle");

    await this.applySimpleCoverages(policyData);
    await this.applyCompAndColl(policyData);
    await this.applyAddonValues(policyData);

    await this.refreshPrice();
  }

  // ==========================================
  // Apply All Coverages
  // ==========================================
  async applyCoverages(policyData) {
    console.log("Applying coverages");

    await this.applySimpleCoverages(policyData);
    await this.applyCompAndColl(policyData);
    await this.applyAddonValues(policyData);

    await this.refreshPrice();

    await this.proceedThenBackAndRestore(policyData);

    await this.proceedToPaymentWithRetry();
  }

  // ==========================================
  // Proceed to Payment (Retry Safe)
  // ==========================================
  async proceedToPaymentWithRetry() {
    const proceedBtn = this.page.locator(locators.proceedQuoteBtn);

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`Proceed attempt ${attempt}`);

        const disabledBtn = this.page.locator(
          locators.disabledProceedBtn
        );

        const disabledCount = await disabledBtn.count();

        if (disabledCount > 0) {
          await expect(disabledBtn).not.toBeVisible({ timeout: 5000 });
        }

        await expect(this.page.locator(locators.premiumValue)).toBeVisible({
          timeout: 10000,
        });

        await expect(proceedBtn).toBeVisible({ timeout: 10000 });
        await expect(proceedBtn).toBeEnabled({ timeout: 10000 });

        await proceedBtn.click();

        await expect(this.page.locator(locators.paymentOptions)).toBeVisible({
          timeout: 50000,
        });

        console.log("Proceed successful");
        return;
      } catch (error) {
        console.log(`Proceed failed attempt ${attempt}`);

        if (attempt === 3) {
          throw new Error("Proceed Quote failed after 3 attempts");
        }

        await this.page.waitForTimeout(2000);
      }
    }
  }
}