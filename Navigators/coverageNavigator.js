import { locators } from "../Locators/selectors.js";
import { expect } from "@playwright/test";

export class CoverageNavigator {
  constructor(page) {
    this.page = page;
  }

  getVehicles(data) {
    return [
      ...new Set(
        Object.keys(data)
          .map((k) => k.match(/V\d+/))
          .filter(Boolean)
          .map((m) => m[0]),
      ),
    ];
  }

  // ==========================================
  // Safe Toggle (Handles Missing Elements)
  // ==========================================/
  /*
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
    */

  async toggleIfNeeded(locator, shouldEnable) {
    const element = this.page.locator(locator).first();

    // Check existence
    if (!(await element.isVisible().catch(() => false))) {
      console.log(`Coverage not present/visible → skipping: ${locator}`);
      return;
    }

    // Scroll into view
    await element.scrollIntoViewIfNeeded();

    // Ensure element is stable
    await element.waitFor({ state: "visible" });

    // Get current state
    const isChecked = await element.isChecked().catch(() => false);

    // Toggle only if needed
    if (shouldEnable !== isChecked) {
      await element.click({ force: true });

      // Better than networkidle
      await this.page.waitForTimeout(300);

      console.log(`Toggled ${locator} → ${shouldEnable ? "ON" : "OFF"}`);
    } else {
      console.log(`No change needed for ${locator}`);
    }
  }

  // ==========================================
  // Coverage Map (Excel Driven)
  // ==========================================
  getCoverageMap() {
    return [
      { key: "PIP Section", locator: locators.pipToggle },
      { key: "MedPay Selection", locator: locators.medpayToggle },
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

      await this.page.waitForTimeout(2000);
      await this.toggleIfNeeded(coverage.locator, value);
    }
  }

  // ==========================================
  // Apply Comp + Coll
  // ==========================================
  // ── PHASE 2 NOTE ──────────────────────────────────────────────────────────
  // Column names below are V-specific (first vehicle only).
  // TC_Template stores per-vehicle physical damage selections as:
  //   "Comp Selection", "Coll Selection",
  //   "V Comp Deductible", "V Coll Deductible"
  //
  // For multi-vehicle support (Phase 2+) this method will need to loop over
  // all vehicles and apply comp/coll toggles and deductibles per vehicle.
  // ──────────────────────────────────────────────────────────────────────────

  async applyCompAndColl(policyData) {
    const vehicles = this.getVehicles(policyData);

    for (const v of vehicles) {
      console.log(`Processing ${v}`);

      const compSelected = Number(policyData[`${v} Comp Selection`]) === 1;
      const collSelected = Number(policyData[`${v} Coll Selection`]) === 1;

      if (!compSelected && !collSelected) continue;

      // Toggle
      await this.page.waitForTimeout(2000);
      await this.toggleIfNeeded(locators.compToggle(v), compSelected);
      await this.page.waitForTimeout(2000);
      await this.toggleIfNeeded(locators.collToggle(v), collSelected);

      // Deductibles
      if (compSelected && policyData[`${v} Comp Deductible`]) {
        await this.selectDeductible(
          locators.compDeductible(v),
          locators.compDeductibleOption,
          policyData[`${v} Comp Deductible`],
        );
      }

      if (collSelected && policyData[`${v} Coll Deductible`]) {
        await this.selectDeductible(
          locators.collDeductible(v),
          locators.collDeductibleOption,
          policyData[`${v} Coll Deductible`],
        );
      }
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
    const vehicles = this.getVehicles(policyData);

    for (const v of vehicles) {
      console.log(`Processing Addons for ${v}`);

      // ================= RENTAL =================
      const rentalSelected = Number(policyData[`${v} RR Selection`]) === 1;
      const roadsideSelected = Number(policyData[`${v} RSA Selection`]) === 1;

      if (!rentalSelected && !roadsideSelected) continue;

      await this.page.waitForTimeout(2000);
      await this.toggleIfNeeded(locators.rentalToggle(v), rentalSelected);
      await this.page.waitForTimeout(2000);
      await this.toggleIfNeeded(locators.roadsideToggle(v), roadsideSelected);

      // ================= RENTAL =================
      if (rentalSelected) {
        const rrLimit = policyData[`${v} RR Limit`];
        const rrDuration = policyData[`${v} RR Duration`];

        // wait for dropdowns after toggle
        await this.page.waitForTimeout(500);

        // ===== RR LIMIT =====
        if (rrLimit) {
          const limitDropdown = this.page.locator(locators.rrLimit(v));

          console.log("rrLimit locator:", locators.rrLimit(v));

          await limitDropdown.waitFor({ state: "visible" });
          await limitDropdown.click();

          await this.page.waitForTimeout(300);

          await this.page
            .locator('li[role="option"]', {
              hasText: String(rrLimit),
            })
            .click({ force: true });

          console.log(`${v} RR Limit selected: ${rrLimit}`);
        }

        // ===== RR DURATION =====
        if (rrDuration) {
          const durationDropdown = this.page.locator(locators.rrDuration(v));

          await durationDropdown.click({ timeout: 20000 });
          await this.page.waitForTimeout(300);

          await this.page
            .locator('li[role="option"]', {
              hasText: String(rrDuration),
            })
            .click({ force: true });

          console.log(`${v} RR Duration selected: ${rrDuration}`);
        }
      }

      // ================= ROADSIDE =================
      if (roadsideSelected) {
        const rsaValue = policyData[`${v} RSA Value`];

        await this.page.waitForTimeout(500);

        if (rsaValue) {
          const rsaDropdown = this.page.locator(locators.rsaLimit(v));

          await rsaDropdown.waitFor({ state: "visible" });
          await rsaDropdown.click({ timeout: 50000 });

          //await this.page.waitForTimeout(300);

          await this.page
            .locator('li[role="option"]', {
              hasText: String(rsaValue),
            })
            .click({ force: true });

          console.log(`${v} RSA selected: ${rsaValue}`);
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
    await this.applyAddonValues(policyData);
    await this.applyCompAndColl(policyData);

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
