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
  // Payment Authorization
  // ==================================================
  async handlePaymentAuthorization(testData) {
    console.log("Handling Payment Authorization - Step 5/6");

    // ==========================================
    // Payment Authorization Checkbox
    // ==========================================
    const authorizationCheckbox = this.page.locator(
      locators.paymentAuthorizationCheckbox,
    );

    await authorizationCheckbox.waitFor({
      state: "visible",
      timeout: 60000,
    });

    await authorizationCheckbox.scrollIntoViewIfNeeded();

    if (!(await authorizationCheckbox.isChecked())) {
      await authorizationCheckbox.check({ force: true });
    }

    await expect(authorizationCheckbox).toBeChecked({
      timeout: 10000,
    });

    console.log("Payment Authorization checkbox checked.");

    // ==========================================
    // Full Legal Name
    // ==========================================
    const fullLegalNameField = this.page.getByRole("textbox", {
      name: "Full Legal Name",
    });

    await fullLegalNameField.waitFor({
      state: "visible",
      timeout: 60000,
    });

    const fullLegalName = await fullLegalNameField.getAttribute("placeholder");

    console.log("Full Legal Name:", fullLegalName);

    if (await fullLegalNameField.isEditable()) {
      await fullLegalNameField.fill(fullLegalName);
      console.log("Full Legal Name entered.");
    }

    // ==========================================
    // Click Next
    // ==========================================
    const nextButton = this.page.locator(locators.nxtButton);

    await expect(nextButton).toBeVisible({
      timeout: 30000,
    });

    await expect(nextButton).toBeEnabled({
      timeout: 30000,
    });

    await this.safeClick(nextButton);

    console.log("Payment Authorization completed.");
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

    await this.safeClick(this.page.locator(locators.vehicleReleaseCheckbox));

    // Vehicle Release (CA/TX safe)
    // const vehicleReleaseCheckbox = this.page.locator(
    //   locators.vehicleReleaseCheckbox,
    // );

    // if (await vehicleReleaseCheckbox.isVisible().catch(() => false)) {
    //   await this.safeClick(vehicleReleaseCheckbox);
    // }

    //const eDeliveryNameField = this.page.locator(locators.eDeliveryNameField);
    const vehicleReleaseField = this.page.locator(
      locators.vehicleReleaseNameField,
    );

    const insuredFullName = (
      await vehicleReleaseField.getAttribute("placeholder")
    )?.trim();

    //console.log("Insured Name from placeholder:", insuredFullName);

    if (insuredFullName) {
      await vehicleReleaseField.fill(insuredFullName);

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

    //console.log("Vehicle Release Name:", await vehicleReleaseField.inputValue());

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
    // CA Coverage Waivers
    // ======================================================

    if (process.env.STATE === "CA") {
      const umbiSelection = Number(testData["UMBI Selection"]);
      const umpdSelection = Number(testData["UMPD Selection"]);

      console.log("========================================");
      console.log("CA DISCLOSURES");
      console.log("UMBI :", umbiSelection);
      console.log("UMPD :", umpdSelection);
      console.log("========================================");

      // ======================================================
      // Generic Function
      // ======================================================

      const completeDisclosure = async (
        headerLocator,
        checkboxLocator,
        nameLocator,
        sectionName,
      ) => {
        console.log(`========== ${sectionName} ==========`);

        const header = this.page.locator(headerLocator);

        await header.waitFor({
          state: "visible",
          timeout: 30000,
        });

        await header.scrollIntoViewIfNeeded();

        //---------------------------------------
        // Checkbox
        //---------------------------------------

        const checkbox = this.page.locator(checkboxLocator);

        await checkbox.waitFor({
          state: "attached",
          timeout: 30000,
        });

        await checkbox.scrollIntoViewIfNeeded();

        console.log("Checkbox Count :", await checkbox.count());
        console.log("Visible :", await checkbox.isVisible());
        console.log("Enabled :", await checkbox.isEnabled());
        console.log("Checked Before :", await checkbox.isChecked());

        if (!(await checkbox.isChecked())) {
          try {
            await checkbox.check({
              force: true,
            });
          } catch {
            try {
              await checkbox.click({
                force: true,
              });
            } catch {
              await checkbox.evaluate((el) => el.click());
            }
          }
        }

        await expect(checkbox).toBeChecked();

        console.log("Checked After :", await checkbox.isChecked());

        //---------------------------------------
        // Name
        //---------------------------------------

        const nameField = this.page.locator(nameLocator);

        await nameField.waitFor({
          state: "visible",
          timeout: 30000,
        });

        await nameField.scrollIntoViewIfNeeded();

        const existing = (await nameField.inputValue()).trim();

        console.log("Existing :", existing);

        if (existing !== insuredFullName) {
          await nameField.click();

          await nameField.press("Control+A");

          await nameField.press("Delete");

          await nameField.fill(insuredFullName);

          await nameField.press("Tab");
        }

        await expect(nameField).toHaveValue(insuredFullName);

        console.log("Final :", await nameField.inputValue());

        await this.page.waitForTimeout(300);
      };

      // ======================================================
      // Business Use (Always)
      // ======================================================

      await completeDisclosure(
        locators.businessUseHeader,
        locators.businessUseExclusionCheckbox,
        locators.businessUseExclusionNameField,
        "Business Use Exclusion",
      );

      // ======================================================
      // UMBI Waiver
      // ======================================================

      if (umbiSelection === 0) {
        await completeDisclosure(
          locators.umbiWaiverHeader,
          locators.umbiWaiverAgreement,
          locators.umbiWaiverNameField,
          "UMBI Waiver",
        );
      }

      // ======================================================
      // UMPD Waiver
      // ======================================================

      if (umbiSelection === 1 && umpdSelection === 0) {
        await completeDisclosure(
          locators.umpdWaiverHeader,
          locators.umpdWaiverAgreement,
          locators.umpdWaiverNameField,
          "UMPD Waiver",
        );
      }

      // ======================================================
      // Next
      // ======================================================

      await expect(this.page.locator(locators.nxtButton)).toBeEnabled({
        timeout: 30000,
      });

      await this.safeClick(this.page.locator(locators.nxtButton));
    }

    // ======================================================
    // TX Coverage Waivers (Conditional)
    // ======================================================

    if (process.env.STATE === "TX") {
      const coverageWaiverHeader = this.page.locator(
        locators.coverageWaiverHeader,
      );

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

    // ==================================================
    // Payment Authorization
    // ==================================================
    await this.handlePaymentAuthorization();

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
    }

    await expect(
      this.page.locator(locators.disabledagreeButton),
    ).not.toBeVisible({ timeout: 20000 });
  }

  // ==================================================
  // Navigate to Coverage Summary - Highly Stable
  // ==================================================
  async goToCoverageSummary() {
    // ==================================================
    // Helper: Wait for MUI Backdrop / Loader
    // ==================================================
    const waitForBackdropToDisappear = async () => {
      const backdrop = this.page.locator(".MuiBackdrop-root");

      try {
        const count = await backdrop.count();

        if (count === 0) {
          return;
        }

        for (let i = 0; i < count; i++) {
          try {
            await backdrop.nth(i).waitFor({
              state: "hidden",
              timeout: 15000,
            });
          } catch {
            // Backdrop may have been removed from DOM.
            // Continue execution.
          }
        }
      } catch {
        console.log("No active MUI backdrop.");
      }
    };

    // ==================================================
    // Helper: Wait for element to be visible + enabled
    // ==================================================
    const waitForReady = async (locator, timeout = 60000) => {
      await locator.waitFor({
        state: "attached",
        timeout,
      });

      await locator.waitFor({
        state: "visible",
        timeout,
      });

      await expect(locator).toBeEnabled({
        timeout: 30000,
      });
    };

    // ==================================================
    // 1. Wait for Purchase Success Page
    // ==================================================

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

    // ==================================================
    // 2. Wait for Loader / Backdrop
    // ==================================================

    await waitForBackdropToDisappear();

    // ==================================================
    // 3. Navigate to Policy Page
    // ==================================================

    let policyPageOpened = false;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`Policy Page Click Attempt ${attempt}`);

        // IMPORTANT:
        // Re-create locator every attempt because React
        // may replace the element during re-render.
        const policyBtn = this.page.locator(locators.policyPageBtn);

        await waitForReady(policyBtn);

        await waitForBackdropToDisappear();

        await policyBtn.scrollIntoViewIfNeeded();

        console.log("Policy Page button is visible and enabled.");

        // ------------------------------------------
        // Normal Playwright click
        // ------------------------------------------

        await policyBtn.click({
          timeout: 20000,
        });

        console.log("Policy Page button clicked.");

        // ------------------------------------------
        // Wait for Policy page / Coverage Summary
        // ------------------------------------------

        const coverageSummary = this.page.locator(locators.coverageSummaryBtn);

        try {
          await coverageSummary.waitFor({
            state: "visible",
            timeout: 30000,
          });

          console.log("Policy page loaded successfully.");

          policyPageOpened = true;
          break;
        } catch {
          // If Coverage Summary is not immediately
          // visible, wait for DOM to settle.
          await this.page
            .waitForLoadState("domcontentloaded", {
              timeout: 30000,
            })
            .catch(() => {});

          await waitForBackdropToDisappear();

          await coverageSummary.waitFor({
            state: "visible",
            timeout: 30000,
          });

          console.log("Policy page loaded successfully.");

          policyPageOpened = true;
          break;
        }
      } catch (error) {
        console.log(
          `Policy Page Click Attempt ${attempt} Failed: ${
            error?.message || error
          }`,
        );

        await this.page.screenshot({
          path: `PolicyPage_Attempt_${attempt}_${Date.now()}.png`,
          fullPage: true,
        });

        if (attempt === 3) {
          throw new Error(
            `POLICY_PAGE_NAVIGATION_FAILED\n${error?.message || error}`,
          );
        }

        console.log("Policy page navigation failed. Retrying...");

        await waitForBackdropToDisappear();
      }
    }

    // ==================================================
    // 4. Final Policy Page Validation
    // ==================================================

    if (!policyPageOpened) {
      throw new Error("POLICY_PAGE_NAVIGATION_FAILED");
    }

    // ==================================================
    // 5. Locate Coverage Summary
    // ==================================================

    let coverageSummary = this.page.locator(locators.coverageSummaryBtn);

    let coverageVisible = false;

    // ==================================================
    // 6. Wait for Coverage Summary
    // ==================================================

    try {
      await waitForBackdropToDisappear();

      await waitForReady(coverageSummary, 60000);

      coverageVisible = true;

      console.log("Coverage Summary button is ready.");
    } catch (error) {
      console.log("Coverage Summary not ready after navigation.");

      console.log("Reloading Policy page once...");
    }

    // ==================================================
    // 7. Reload Once If Coverage Summary Is Missing
    // ==================================================

    if (!coverageVisible) {
      await this.page.reload({
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });

      console.log("Policy page reloaded.");

      await waitForBackdropToDisappear();

      // IMPORTANT:
      // Re-create locator after reload.
      coverageSummary = this.page.locator(locators.coverageSummaryBtn);

      try {
        await waitForReady(coverageSummary, 60000);

        coverageVisible = true;

        console.log("Coverage Summary found after reload.");
      } catch (error) {
        console.log("Coverage Summary still not available.");

        coverageVisible = false;
      }
    }

    // ==================================================
    // 8. Coverage Summary Not Found
    // ==================================================

    if (!coverageVisible) {
      await this.page.screenshot({
        path: `CoverageSummary_NotFound_${Date.now()}.png`,
        fullPage: true,
      });

      throw new Error("COVERAGE_SUMMARY_NOT_FOUND");
    }

    // ==================================================
    // 9. Coverage Summary Content Locator
    // ==================================================

    const coverageTotal = this.page.locator('[data-test="coverages-total"]');

    // ==================================================
    // 10. Click Coverage Summary
    // ==================================================

    let coverageClicked = false;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`Coverage Summary Click Attempt ${attempt}`);

        // ------------------------------------------
        // IMPORTANT:
        // Re-create locator every attempt.
        // ------------------------------------------

        coverageSummary = this.page.locator(locators.coverageSummaryBtn);

        // ------------------------------------------
        // Wait for UI
        // ------------------------------------------

        await waitForBackdropToDisappear();

        await waitForReady(coverageSummary, 30000);

        await coverageSummary.scrollIntoViewIfNeeded();

        // ------------------------------------------
        // Normal Playwright click
        // ------------------------------------------

        console.log("Attempting normal Coverage Summary click...");

        await coverageSummary.click({
          timeout: 20000,
        });

        console.log("Coverage Summary button clicked.");

        // ------------------------------------------
        // IMPORTANT:
        // Validate actual result of click
        // ------------------------------------------

        console.log("Waiting for Coverage Summary content...");

        await expect(coverageTotal).toBeVisible({
          timeout: 30000,
        });

        console.log("Coverage Summary content is visible.");

        coverageClicked = true;

        break;
      } catch (error) {
        console.log(
          `Coverage Summary Click Attempt ${attempt} Failed: ${
            error?.message || error
          }`,
        );

        // ------------------------------------------
        // Screenshot for debugging
        // ------------------------------------------

        await this.page.screenshot({
          path: `CoverageSummary_Click_Attempt_${attempt}_${Date.now()}.png`,
          fullPage: true,
        });

        // ------------------------------------------
        // If this is the final attempt, try one
        // controlled force click before failing.
        // ------------------------------------------

        if (attempt === 3) {
          console.log("Normal click failed 3 times.");

          console.log("Trying final force click...");

          try {
            coverageSummary = this.page.locator(locators.coverageSummaryBtn);

            await waitForBackdropToDisappear();

            await coverageSummary.waitFor({
              state: "visible",
              timeout: 15000,
            });

            await coverageSummary.scrollIntoViewIfNeeded();

            await coverageSummary.click({
              force: true,
              timeout: 15000,
            });

            console.log("Coverage Summary force click executed.");

            // --------------------------------------
            // Validate actual content
            // --------------------------------------

            await expect(coverageTotal).toBeVisible({
              timeout: 30000,
            });

            console.log(
              "Coverage Summary content is visible after force click.",
            );

            coverageClicked = true;

            break;
          } catch (forceError) {
            await this.page.screenshot({
              path: `CoverageSummary_ForceClick_Failed_${Date.now()}.png`,
              fullPage: true,
            });

            throw new Error(
              `COVERAGE_SUMMARY_CLICK_FAILED\n` +
                `Normal Click Error:\n${error?.message || error}\n\n` +
                `Force Click Error:\n${forceError?.message || forceError}`,
            );
          }
        }

        // ------------------------------------------
        // Retry
        // ------------------------------------------

        console.log("Coverage Summary click failed. Retrying...");

        await waitForBackdropToDisappear();

        // Re-create locator on retry
        coverageSummary = this.page.locator(locators.coverageSummaryBtn);
      }
    }

    // ==================================================
    // 11. Final Validation
    // ==================================================

    if (!coverageClicked) {
      throw new Error("COVERAGE_SUMMARY_CLICK_FAILED");
    }

    // ==================================================
    // 12. Final Coverage Summary Validation
    // ==================================================

    await expect(coverageTotal).toBeVisible({
      timeout: 30000,
    });

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
