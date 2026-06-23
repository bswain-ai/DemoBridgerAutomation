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
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Click Attempt ${attempt}`);

        // Wait for page to stabilize
        await this.page.waitForLoadState("domcontentloaded");

        // Handle MUI overlays/backdrops
        await this.page
          .waitForSelector(".MuiBackdrop-root", {
            state: "hidden",
            timeout: 5000,
          })
          .catch(() => {});

        // Wait for locator to exist
        await locator.waitFor({
          state: "visible",
          timeout: 15000,
        });

        // Scroll into view
        await locator.scrollIntoViewIfNeeded();

        // Ensure element is actionable
        await expect(locator).toBeVisible({
          timeout: 10000,
        });

        await expect(locator).toBeEnabled({
          timeout: 10000,
        });

        // Trial click verifies no overlay intercept
        await locator.click({
          trial: true,
          timeout: 5000,
        });

        // Actual click
        await locator.click({
          timeout: 10000,
        });

        console.log("Click Successful");
        return true;
      } catch (error) {
        lastError = error;

        console.log(`Click Attempt ${attempt} Failed`);
        console.log(error.message);

        await Promise.race([
          this.page.waitForLoadState("networkidle").catch(() => {}),
          locator
            .waitFor({
              state: "visible",
              timeout: 3000,
            })
            .catch(() => {}),
        ]);

        await this.page
          .waitForSelector(".MuiBackdrop-root", {
            state: "hidden",
            timeout: 3000,
          })
          .catch(() => {});
      }
    }

    throw new Error(
      `Element click failed after ${maxRetries} retries.\n\n${lastError?.message}`,
    );
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

    // Vehicle Release (CA/TX safe)
    const vehicleReleaseCheckbox = this.page.locator(
      locators.vehicleReleaseCheckbox,
    );

    if (await vehicleReleaseCheckbox.isVisible().catch(() => false)) {
      await this.safeClick(vehicleReleaseCheckbox);
    }

    const eDeliveryNameField = this.page.locator(locators.eDeliveryNameField);

    const vehicleReleaseField = this.page.locator(
      locators.vehicleReleaseNameField,
    );

    // Get insured name from placeholder
    const insuredFullName =
      await eDeliveryNameField.getAttribute("placeholder");

    console.log("Insured Name:", insuredFullName);

    if (insuredFullName) {
      await eDeliveryNameField.fill(insuredFullName);

      if (await vehicleReleaseField.isVisible().catch(() => false)) {
        await vehicleReleaseField.fill(insuredFullName);
      }
    }

    // Marketing consent (optional)
    const marketingConsent = this.page.locator(
      locators.marketingConsentCheckbox,
    );

    if (await marketingConsent.isVisible().catch(() => false)) {
      await this.safeClick(marketingConsent);
    }

    console.log("E-Delivery Name:", await eDeliveryNameField.inputValue());

    if (await vehicleReleaseField.isVisible().catch(() => false)) {
      console.log(
        "Vehicle Release Name:",
        await vehicleReleaseField.inputValue(),
      );
    }

    await this.safeClick(this.page.locator(locators.nxtButton));

    // ==============================
    // Consolidated Disclosures
    // ==============================

    await this.safeClick(this.page.locator(locators.selectAllCheckbox));

    // Full Legal Name field
    const disclosureNameField = this.page.locator(
      locators.consolidatedDisclosureNameField,
    );

    await disclosureNameField.waitFor({
      state: "visible",
      timeout: 15000,
    });

    // Read current value
    let disclosureFullName = await disclosureNameField.inputValue();

    console.log("Disclosure Name Value:", disclosureFullName);

    // If empty, populate with insured name
    if (!disclosureFullName?.trim()) {
      disclosureFullName = insuredFullName;

      await disclosureNameField.click();
      await disclosureNameField.fill(disclosureFullName);

      // Trigger MUI validation
      await disclosureNameField.press("Tab");
    }

    // Scroll disclosure section
    await this.page.locator(locators.caaSection).hover({
      timeout: 30000,
    });

    await this.scrollModal();

    // Debugging
    console.log("Disclosure Name:", await disclosureNameField.inputValue());

    console.log(
      "Select All Checked:",
      await this.page
        .locator(locators.selectAllCheckbox)
        .isChecked()
        .catch(() => false),
    );

    console.log(
      "Next Enabled:",
      await this.page.locator(locators.nxtButton).isEnabled(),
    );

    // ======================================================
    // Move Forward From Consolidated Disclosure
    // ======================================================

    await expect(this.page.locator(locators.nxtButton)).toBeEnabled({
      timeout: 15000,
    });

    await this.safeClick(this.page.locator(locators.nxtButton));

    // ======================================================
    // TX Coverage Waivers (Conditional)
    // ======================================================

    if (process.env.STATE === "TX") {
      const coverageWaiverHeader = this.page.locator(
        locators.coverageWaiverHeader,
      );

      await this.page.waitForTimeout(3000);
      const waiverPageVisible = await coverageWaiverHeader
        .waitFor({
          state: "visible",
          timeout: 10000,
        })
        .then(() => true)
        .catch(() => false);

      if (waiverPageVisible) {
        console.log("Coverage Waiver page detected");

        const pipSelection = Number(testData["PIP Selection"]);
        const umbiSelection = Number(testData["UMBI Selection"]);
        const uimbiSelection = Number(testData["UIMBI Selection"]);
        const umpdSelection = Number(testData["UMPD Selection"]);
        const uimpdSelection = Number(testData["UIMPD Selection"]);

        const showUMUIMWaiver =
          umbiSelection === 0 &&
          uimbiSelection === 0 &&
          umpdSelection === 0 &&
          uimpdSelection === 0;

        // ======================================
        // UM/UIM Waiver
        // ======================================

        if (showUMUIMWaiver) {
          console.log("Handling UM/UIM Waiver");

          const umuimCheckbox = this.page.locator(
            locators.umuimWaiverAgreement,
          );

          await umuimCheckbox.scrollIntoViewIfNeeded();

          await expect(umuimCheckbox).toBeVisible({
            timeout: 30000,
          });

          console.log("UM/UIM Checkbox Count:", await umuimCheckbox.count());

          console.log("UM/UIM Before Click:", await umuimCheckbox.isChecked());

          if (!(await umuimCheckbox.isChecked())) {
            await umuimCheckbox.evaluate((el) => el.click());
          }

          await expect(umuimCheckbox).toBeChecked({
            timeout: 10000,
          });

          console.log("UM/UIM After Click:", await umuimCheckbox.isChecked());

          const umuimNameField = this.page.locator(
            locators.umuimWaiverNameField,
          );

          console.log("UM/UIM Name Field Count:", await umuimNameField.count());

          await umuimNameField.waitFor({
            state: "visible",
            timeout: 30000,
          });

          const currentValue = await umuimNameField.inputValue();

          if (!currentValue?.trim()) {
            await umuimNameField.fill(insuredFullName);
            await umuimNameField.press("Tab");
          }

          console.log("UM/UIM Name Value:", await umuimNameField.inputValue());

          console.log(
            "Next Enabled After UM/UIM:",
            await this.page.locator(locators.nxtButton).isEnabled(),
          );
        }

        // ======================================
        // PIP Waiver
        // ======================================

        if (pipSelection === 0) {
          console.log("Handling PIP Waiver");

          const pipCheckbox = this.page.locator(locators.pipWaiverAgreement);

          await pipCheckbox.scrollIntoViewIfNeeded();

          await expect(pipCheckbox).toBeVisible({
            timeout: 30000,
          });

          if (!(await pipCheckbox.isChecked())) {
            await pipCheckbox.evaluate((el) => el.click());
          }

          await expect(pipCheckbox).toBeChecked({
            timeout: 10000,
          });

          const pipNameField = this.page.locator(locators.pipWaiverNameField);

          await pipNameField.waitFor({
            state: "visible",
            timeout: 30000,
          });

          const currentValue = await pipNameField.inputValue();

          if (!currentValue?.trim()) {
            await pipNameField.fill(insuredFullName);
            await pipNameField.press("Tab");
          }

          console.log("PIP Name Value:", await pipNameField.inputValue());
        }

        // ======================================
        // Next After Waivers
        // ======================================

        await expect(this.page.locator(locators.nxtButton)).toBeEnabled({
          timeout: 30000,
        });

        await this.safeClick(this.page.locator(locators.nxtButton));
      } else {
        console.log("Coverage Waiver page not displayed");
      }
    }

    // ======================================================
    // Return To Producer Popup
    // ======================================================

    const returnToProducerBtn = this.page.locator(locators.returnToProducer);
    await returnToProducerBtn.waitFor({
      state: "visible",
      timeout: 60000,
    });

    await returnToProducerBtn.click({
      force: true,
    });

    console.log("Returned To Producer");

    // ======================================================
    // Agent eSignature
    // ======================================================

    await this.safeClick(this.page.locator(locators.agentAgreementCheckbox));

    const producerNameField = this.page.locator(
      locators.producerFullLegalNamePlaceholder,
    );

    await producerNameField.waitFor({
      state: "visible",
      timeout: 30000,
    });

    const producerFullLegalName =
      await producerNameField.getAttribute("placeholder");

    console.log("Producer Full Legal Name:", producerFullLegalName);

    if (producerFullLegalName) {
      await producerNameField.fill(producerFullLegalName);
      await producerNameField.press("Tab");
    }

    console.log("Producer Name Value:", await producerNameField.inputValue());

    console.log(
      "Purchase Button Enabled:",
      await this.page.locator(locators.PurchasePolicyBtn).isEnabled(),
    );

    // ======================================================
    // Purchase Policy
    // ======================================================

    const purchaseBtn = this.page.locator(locators.PurchasePolicyBtn);

    await expect(purchaseBtn).toBeVisible({
      timeout: 30000,
    });

    await expect(purchaseBtn).toBeEnabled({
      timeout: 30000,
    });

    console.log("Initiating Purchase...");

    await Promise.all([
      this.page.waitForLoadState("domcontentloaded"),
      this.safeClick(purchaseBtn),
    ]);

    await this.page.waitForLoadState("networkidle").catch(() => {});

    const successLocator = this.page.locator(
      "//h5[contains(text(),'successfully purchased')]",
    );

    await expect(successLocator).toBeVisible({
      timeout: 90000,
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
  // Navigate to Coverage Summary (Highly Stable)
  // ==================================================
  async goToCoverageSummary() {
    // ==========================================
    // Wait for Purchase Success Page
    // ==========================================
    const successIcon = this.page.locator('img[alt="Success Icon"]');

    await expect(successIcon).toBeVisible({
      timeout: 60000,
    });

    await expect(
      this.page.getByText("You've successfully purchased the policy."),
    ).toBeVisible({
      timeout: 60000,
    });

    console.log("Policy purchase confirmation page loaded.");

    // Small stabilization wait
    await this.page.waitForTimeout(3000);

    // ==========================================
    // Go To Policy Page
    // ==========================================

    let policyPageOpened = false;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const policyBtn = this.page.locator(locators.policyPageBtn);

        await policyBtn.waitFor({
          state: "visible",
          timeout: 60000,
        });

        await expect(policyBtn).toBeEnabled({
          timeout: 60000,
        });

        await policyBtn.scrollIntoViewIfNeeded();

        console.log(`Policy Page Click Attempt ${attempt}`);

        console.log("URL Before Policy Page Click:", this.page.url());

        await policyBtn.click({
          force: true,
          timeout: 30000,
        });

        await this.page.waitForLoadState("networkidle", {
          timeout: 30000,
        });

        await this.page.waitForTimeout(5000);

        console.log("URL After Policy Page Click:", this.page.url());

        policyPageOpened = true;
        break;
      } catch (error) {
        console.log(`Policy Page Click Attempt ${attempt} Failed`);

        console.log(error.message);

        if (attempt < 3) {
          console.log("Refreshing page and retrying...");

          await this.page.reload({
            waitUntil: "networkidle",
            timeout: 60000,
          });

          await this.page.waitForTimeout(5000);
        } else {
          throw new Error(`POLICY_PAGE_NAVIGATION_FAILED\n${error.message}`);
        }
      }
    }

    if (!policyPageOpened) {
      throw new Error("POLICY_PAGE_NAVIGATION_FAILED");
    }
    // ==========================================
    // Coverage Summary
    // ==========================================
    const coverageSummary = this.page.locator(locators.coverageSummaryBtn);

    let coverageVisible = false;

    try {
      await coverageSummary.waitFor({
        state: "visible",
        timeout: 60000,
      });

      coverageVisible = true;
    } catch {
      console.log("Coverage Summary not visible. Refreshing page...");
    }

    // ==========================================
    // Refresh Once if Coverage Summary Missing
    // ==========================================
    if (!coverageVisible) {
      await this.page.reload({
        waitUntil: "networkidle",
      });

      await this.page.waitForTimeout(5000);

      try {
        await coverageSummary.waitFor({
          state: "visible",
          timeout: 30000,
        });

        coverageVisible = true;
      } catch {
        coverageVisible = false;
      }
    }

    if (!coverageVisible) {
      throw new Error("COVERAGE_SUMMARY_NOT_FOUND");
    }

    console.log("Coverage Summary found.");

    await expect(coverageSummary).toBeVisible({
      timeout: 30000,
    });

    // ==========================================
    // Open Coverage Summary
    // ==========================================
    await coverageSummary.click({
      force: true,
      timeout: 30000,
    });

    await this.page.waitForLoadState("networkidle");

    console.log("Coverage Summary opened successfully.");
  }
  // ==================================================
  // Combined Flow
  // ==================================================
  async completeFullConfirmationFlow(testData) {
    await this.completeESign(testData);
    console.log("Confirmation Flow Completed");
  }
}
