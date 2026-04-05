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
  // ── PHASE 2 NOTE ──────────────────────────────────────────────────────────
  // Column names below are V1-specific (first vehicle only).
  // TC_Template stores per-vehicle physical damage selections as:
  //   "V1 Comp Selection", "V1 Coll Selection",
  //   "V1 Comp Deductible", "V1 Coll Deductible"
  //
  // For multi-vehicle support (Phase 2+) this method will need to loop over
  // all vehicles and apply comp/coll toggles and deductibles per vehicle.
  // ──────────────────────────────────────────────────────────────────────────
  async applyCompAndColl(policyData) {
    // V1 Comp/Coll Selection — "V1 Comp Selection" / "V1 Coll Selection" in TC_Template
    const compSelected = Number(policyData["V1 Comp Selection"]) === 1;

    const collSelected = Number(policyData["V1 Coll Selection"]) === 1;

    if (!compSelected && !collSelected) return;

    await this.toggleIfNeeded(locators.compToggle, compSelected);
    await this.toggleIfNeeded(locators.collToggle, collSelected);

    // V1 deductible values — "V1 Comp Deductible" / "V1 Coll Deductible" in TC_Template
    if (compSelected && policyData["V1 Comp Deductible"]) {
      await this.selectDeductible(
        locators.compDeductible,
        locators.compDeductibleOption,
        policyData["V1 Comp Deductible"],
      );
    }

    if (collSelected && policyData["V1 Coll Deductible"]) {
      await this.selectDeductible(
        locators.collDeductible,
        locators.collDeductibleOption,
        policyData["V1 Coll Deductible"],
      );
    }
  }

  async selectMuiDropdown(dropdownLocator, value) {
    // Open dropdown
    await dropdownLocator.click();

    // Wait for options to appear
    const option = this.page.locator('li[role="option"]', {
      hasText: String(value),
    });

    await option.waitFor({ state: "visible", timeout: 10000 });

    // Click option
    await option.click();
  }

  // ==========================================
  // Rental + Roadside Values
  // ==========================================
  async applyAddonValues(policyData) {
    // ---------- Rental ----------
    if (Number(policyData["RR Selection"]) === 1) {
      // "V1 RR Limit" / "V1 RR Duration" match the TC_Template column names.
      // Old flat names "RR Limit" / "RR Duration" returned undefined on TC_Template rows.
      const rrLimit = policyData["V1 RR Limit"];
      const rrDuration = policyData["V1 RR Duration"];

      // ===== RR LIMIT =====
      if (rrLimit) {
        const limitDropdown = this.page.locator(locators.rrLimit);

        if (await limitDropdown.count()) {
          await this.selectMuiDropdown(limitDropdown, rrLimit);
          console.log("RR Limit selected:", rrLimit);
        }
      }

      // ===== RR DURATION =====
      if (rrDuration) {
        const durationDropdown = this.page.locator(locators.rrDuration);

        if (await durationDropdown.count()) {
          await this.selectMuiDropdown(durationDropdown, rrDuration);
          console.log("RR Duration selected:", rrDuration);
        }
      }
    }

    // ---------- Roadside ----------
    if (Number(policyData["RSA Selection"]) === 1) {
      // "V1 RSA Value" matches the TC_Template column name.
      // Old flat name "RSA Val" returned undefined on TC_Template rows.
      const rsaVal = policyData["V1 RSA Value"];

      if (rsaVal) {
        const rsaDropdown = this.page.locator(locators.rsaLimit);

        if (await rsaDropdown.count()) {
          // open dropdown
          await rsaDropdown.click();

          // select option
          const option = this.page.locator(locators.rsaOption(rsaVal));

          await option.waitFor({ state: "visible", timeout: 10000 });

          await option.click();

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

    await expect(proceedBtn).toBeEnabled({ timeout: 50000 });
    await expect(proceedBtn).toBeVisible({ timeout: 50000 });
    await proceedBtn.click();

    await expect(this.page.locator(locators.paymentOptions)).toBeVisible({
      timeout: 50000,
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

        const disabledBtn = this.page.locator(locators.disabledProceedBtn);

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
