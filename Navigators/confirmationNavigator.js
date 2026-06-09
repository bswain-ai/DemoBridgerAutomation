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
  async completeESign(testData) {
    // ===== Wait for Confirmation Page =====
    await expect(this.page.locator(locators.identityPreflightPage)).toBeVisible(
      {
        timeout: 60000,
      },
    );

    // ==============================
    // Begin to Signin Process
    // ==============================
    await this.safeClick(this.page.locator(locators.handoffDeviceCheckbox));
    await this.safeClick(this.page.locator(locators.beginSigningBtn));

    // ==============================
    // Identity-Preflight Sign
    // ==============================
    await this.safeClick(this.page.locator(locators.reviewedGaragingAddress));
    await this.safeClick(this.page.locator(locators.reviewedCoverages));
    await this.safeClick(this.page.locator(locators.confirmedESignature));
    await this.safeClick(this.page.locator(locators.eSignatureCheckbox));

    await this.safeClick(this.page.locator(locators.nxtButton));

    // ==============================
    // Electronic Delivery & TCPA Consent
    // ==============================

    await this.safeClick(
      this.page.locator(locators.electronicDeliveryCheckbox),
    );

    const fullLegalNameText = await this.page
      .locator(locators.fullLegalNamePlaceholder)
      .getAttribute("placeholder");

    await this.page
      .locator(locators.fullLegalName(fullLegalNameText))
      .fill(fullLegalNameText);

    await this.safeClick(this.page.locator(locators.marketingConsentCheckbox));

    await this.safeClick(this.page.locator(locators.nxtButton));

    // ==============================
    // Consolidated Disclosures
    // ==============================

    await this.safeClick(this.page.locator(locators.selectAllCheckbox));

    await this.page
      .locator(locators.fullLegalName(fullLegalNameText))
      .fill(fullLegalNameText);

    await this.page.locator(locators.caaSection).hover({ timeout: 30000 });

    await this.scrollModal();

    await this.safeClick(this.page.locator(locators.nxtButton));

    /*
    if (process.env.STATE === "TX") {
      // ==============================
      // Coverage Waivers
      // ==============================
      await expect(this.page.locator(locators.pipWaiverAgreement)).toBeVisible({
        timeout: 60000,
      });
      await this.safeClick(this.page.locator(locators.pipWaiverAgreement));

      await expect(
        this.page.locator(locators.umuimWaiverAgreement),
      ).toBeVisible({
        timeout: 60000,
      });
      await this.safeClick(this.page.locator(locators.umuimWaiverAgreement));

      const names = this.page.locator(
        locators.fullLegalName(fullLegalNameText),
      );

      await names.nth(0).fill(fullLegalNameText);
      await names.nth(1).fill(fullLegalNameText);

      await this.safeClick(this.page.locator(locators.nxtButton));
    }
      */

    if (process.env.STATE === "TX") {
      // ======================================
      // Coverage Waivers (Dynamic Handling)
      // ======================================

      const pipSelection = Number(testData["PIP Selection"]);
      const umbiSelection = Number(testData["UMBI Selection"]);
      const umpdSelection = Number(testData["UMPD Selection"]);

      // ======================================
      // PIP Waiver
      // Show when PIP = 0
      // ======================================
      if (pipSelection === 0) {
        await expect(
          this.page.locator(locators.pipWaiverAgreement),
        ).toBeVisible({
          timeout: 60000,
        });

        await this.safeClick(this.page.locator(locators.pipWaiverAgreement));
      }

      // ======================================
      // UM/UIM Waiver
      // Show when UMBI = 0 OR UMPD = 0
      // ======================================
      if (umbiSelection === 0 || umpdSelection === 0) {
        await expect(
          this.page.locator(locators.umuimWaiverAgreement),
        ).toBeVisible({
          timeout: 60000,
        });

        await this.safeClick(this.page.locator(locators.umuimWaiverAgreement));
      }

      // ======================================
      // Fill Signature Names
      // ======================================
      if (pipSelection === 0 || umbiSelection === 0 || umpdSelection === 0) {
        const names = this.page.locator(
          locators.fullLegalName(fullLegalNameText),
        );

        const count = await names.count();

        for (let i = 0; i < count; i++) {
          await names.nth(i).fill(fullLegalNameText);
        }

        await this.safeClick(this.page.locator(locators.nxtButton));
      }
    }




    // ==============================
    // Agent eSignature
    // ==============================
    await this.safeClick(this.page.locator(locators.returnToProducer));
    await this.safeClick(this.page.locator(locators.agentAgreementCheckbox));

    const producerFullLegalNameText = await this.page
      .locator(locators.producerFullLegalNamePlaceholder)
      .getAttribute("placeholder");

    await this.page
      .locator(locators.fullLegalName(producerFullLegalNameText))
      .fill(producerFullLegalNameText);

    // ==============================
    // Purchase (Ultimate Pattern)
    // ==============================
    const purchaseBtn = this.page.locator(locators.PurchasePolicyBtn);

    await expect(purchaseBtn).toBeEnabled({ timeout: 30000 });
    await expect(purchaseBtn).toBeVisible({ timeout: 30000 });

    console.log("Initiating Purchase...");

    // Handle navigation + backend transaction safely
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
      "//h5[contains(text(),'successfully purchased')]",
    );

    await expect(successLocator).toBeVisible({
      timeout: 90000, // heavy transaction safe
    });

    console.log("Policy Purchase Completed Successfully");
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
      this.page.locator(locators.disabledagreeButton),
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
  async completeFullConfirmationFlow(testData) {
    await this.completeESign(testData);
    console.log("Confirmation Flow Completed");
  }
}