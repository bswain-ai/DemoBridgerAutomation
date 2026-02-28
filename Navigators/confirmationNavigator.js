// Navigators/confirmationNavigator.js

import { expect } from "@playwright/test";
import { locators } from "../Locators/selectors.js";

export class ConfirmationNavigator {
  constructor(page) {
    this.page = page;
  }

  // ==================================================
  // Generic Safe Click With Retry (Reusable)
  // ==================================================
  async safeClick(locator, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.page.waitForLoadState("domcontentloaded");

        // Wait for possible MUI backdrop
        await this.page
          .waitForSelector(".MuiBackdrop-root", {
            state: "hidden",
            timeout: 10000,
          })
          .catch(() => {});

        await expect(locator).toBeVisible({ timeout: 20000 });
        await expect(locator).toBeEnabled({ timeout: 20000 });

        await locator.scrollIntoViewIfNeeded();
        await locator.click({ trial: true });
        await locator.click();

        return;
      } catch (error) {
        console.log(`Click retry ${attempt} failed`);

        if (attempt === maxRetries) {
          throw new Error("Element click failed after retries");
        }

        await this.page.waitForTimeout(1500);
      }
    }
  }

  // ==================================================
  // Confirm & E-Sign Flow (Bulletproof)
  // ==================================================
  async completeESignAndPurchase() {
    // ===== Wait for Confirmation Page =====
    await expect(this.page.locator(locators.confirmPage)).toBeVisible({
      timeout: 60000,
    });

    // ==============================
    // Agent Signature
    // ==============================
    await this.safeClick(this.page.locator(locators.agentCheckBox));

    await this.scrollModal();

    await this.safeClick(this.page.locator(locators.agreeButton));

    const agentText = await this.page
      .locator(locators.agentSignaturePlaceholder)
      .getAttribute("placeholder");

    await this.page
      .locator(locators.agentSignature(agentText))
      .fill(agentText);

    // ==============================
    // Applicant Signature
    // ==============================
    await this.safeClick(this.page.locator(locators.applicantCheckBox));

    await this.page.locator(locators.AuthText).hover({ timeout: 30000 });

    await this.safeClick(this.page.locator(locators.agreeButton));

    const applicantText = await this.page
      .locator(locators.applicantSignaturePlaceholder)
      .getAttribute("placeholder");

    await this.page
      .locator(locators.applicantSignature)
      .fill(applicantText);

    // ==============================
    // Purchase (Ultimate Pattern)
    // ==============================
    const purchaseBtn = this.page.locator(locators.purchaseButton);

    await expect(purchaseBtn).toBeVisible({ timeout: 30000 });
    await expect(purchaseBtn).toBeEnabled({ timeout: 30000 });

    console.log("Initiating Purchase...");

    // 🔥 Handle navigation + backend transaction safely
    await Promise.all([
      this.page.waitForLoadState("domcontentloaded"),
      this.safeClick(purchaseBtn),
    ]);

    // Wait for possible heavy backend processing
    await this.page.waitForLoadState("networkidle").catch(() => {});

    // Wait for either:
    // 1. Success message
    // 2. URL change
    // 3. Confirmation container

    const successLocator = this.page.locator(
      "//h5[contains(text(),'successfully purchased')]"
    );

    await expect(successLocator).toBeVisible({
      timeout: 90000, // heavy transaction safe
    });

    console.log("✅ Policy Purchase Completed Successfully");
  }

  // ==================================================
  // Scroll Modal Until Agree Enabled
  // ==================================================
  async scrollModal() {
    for (let i = 0; i < 15; i++) {
      await this.page.mouse.wheel(0, 400);
      await this.page.waitForTimeout(150);
    }

    await expect(
      this.page.locator(locators.disabledagreeButton)
    ).not.toBeVisible({ timeout: 20000 });
  }

  // ==================================================
  // Navigate to Coverage Summary (Stable)
  // ==================================================
  async goToCoverageSummary() {
    await this.safeClick(this.page.locator(locators.policyPageBtn));

    await expect(this.page.locator(locators.coverageSummaryBtn)).toBeVisible({
      timeout: 30000,
    });

    await this.safeClick(this.page.locator(locators.coverageSummaryBtn));

    // Some portals require reload to refresh summary
    await this.page.reload({ waitUntil: "domcontentloaded" });

    await expect(this.page.locator(locators.coverageSummaryBtn)).toBeVisible({
      timeout: 30000,
    });

    await this.safeClick(this.page.locator(locators.coverageSummaryBtn));
  }

  // ==================================================
  // Combined Flow
  // ==================================================
  async completeFullConfirmationFlow() {
    await this.completeESignAndPurchase();
    console.log("🎉 Confirmation Flow Completed");
  }
}