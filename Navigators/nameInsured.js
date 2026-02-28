import { locators } from "../Locators/selectors.js";
import { expect } from "@playwright/test";
import { login } from "../helpers/loginHelper.js";

export class NameInsuredNavigator {
  constructor(page) {
    this.page = page;
  }

  // ==================================================
  // Ultimate Safe Click
  // ==================================================
  async safeClick(locator, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const element =
          (await locator.count()) > 1 ? locator.first() : locator;

        await this.page
          .locator(".MuiBackdrop-root")
          .waitFor({ state: "hidden", timeout: 5000 })
          .catch(() => {});

        await element.waitFor({ state: "visible", timeout: 20000 });
        await expect(element).toBeEnabled({ timeout: 20000 });

        await element.scrollIntoViewIfNeeded();
        await element.click({ trial: true });
        await element.click();

        return;
      } catch (error) {
        console.log(`Click retry ${attempt}`);

        if (attempt === maxRetries) {
          throw error;
        }

        await this.page.waitForTimeout(1500);
      }
    }
  }

  // ==================================================
  // Recovery: Re-login & Retry
  // ==================================================
  async recoverAndRetryNewSubmission(policyData) {
    console.log("⚠ Recovering by re-login...");

    await this.page.goto(process.env.BASE_URL);

    await login(this.page);

    await expect(
      this.page.locator(locators.dashboardHome)
    ).toBeVisible({ timeout: 60000 });

    console.log("Re-login successful. Retrying New Submission...");

    const newSubmissionBtn =
      this.page.locator(locators.newSubmissionBtn).first();

    await this.safeClick(newSubmissionBtn);

    await expect(
      this.page.locator(locators.selectState)
    ).toBeVisible({ timeout: 60000 });

    await this.page.selectOption(locators.selectState, {
      label: policyData.State,
    });

    await this.page.selectOption(locators.selectProgram, {
      label: policyData.Program,
    });
  }

  // ==================================================
  // Start New Submission (With Recovery)
  // ==================================================
  async startNewSubmission(policyData) {
    const newSubmissionBtn =
      this.page.locator(locators.newSubmissionBtn).first();

    try {
      await this.safeClick(newSubmissionBtn);

      await expect(
        this.page.locator(locators.selectState)
      ).toBeVisible({ timeout: 60000 });

    } catch (error) {
      console.log("❌ New Submission failed. Attempting recovery...");
      await this.recoverAndRetryNewSubmission(policyData);
      return;
    }

    // If first attempt succeeded, continue normally
    await this.page.selectOption(locators.selectState, {
      label: policyData.State,
    });

    await this.page.selectOption(locators.selectProgram, {
      label: policyData.Program,
    });

    // ===============================
    // Effective Date
    // ===============================
    if (policyData.EffectiveDate) {
      const effectiveDate = policyData.EffectiveDate
        .toString()
        .replace(/-/g, "/");

      const dateField = this.page.locator(locators.effectiveDate);

      await expect(dateField).toBeVisible({ timeout: 20000 });

      await dateField.fill("");
      await dateField.type(effectiveDate);
      await this.page.keyboard.press("Tab");

      console.log("Effective Date entered:", effectiveDate);
    }

    await this.page.selectOption(
      locators.selectTerm,
      policyData.TermLength.toString()
    );
  }

  // ==================================================
  // Fill Name Details
  // ==================================================
  async fillNameDetails(firstName, lastName) {
    await expect(this.page.locator(locators.fName)).toBeVisible({
      timeout: 20000,
    });

    await this.page.locator(locators.fName).fill(firstName);
    await this.page.locator(locators.lName).fill(lastName);

    await this.safeClick(this.page.locator(locators.continueBtn));
  }

  // ==================================================
  // Fill Contact Details
  // ==================================================
  async fillContactDetails(phone, email) {
    await expect(this.page.locator(locators.cellPhone)).toBeVisible({
      timeout: 20000,
    });

    await this.page.fill(locators.cellPhone, phone);
    await this.page.fill(locators.emailid, email);

    await this.safeClick(this.page.locator(locators.nextBtn));
  }

  // ==================================================
  // Complete Flow
  // ==================================================
  async completeNamedInsured(policyData, insuredData) {
    await this.startNewSubmission(policyData);
    await this.fillNameDetails(
      insuredData.firstName,
      insuredData.lastName
    );
    await this.fillContactDetails(
      insuredData.phone,
      insuredData.email
    );
  }
}