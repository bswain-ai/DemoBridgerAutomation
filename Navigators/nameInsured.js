import { locators } from "../Locators/selectors.js";
import { expect } from "@playwright/test";
import { login } from "../helpers/loginHelper.js";

export class NameInsuredNavigator {
  constructor(page) {
    this.page = page;
  }

  // ==================================================
  // Safe Click
  // ==================================================
  async safeClick(locator, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const element = (await locator.count()) > 1 ? locator.first() : locator;

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
  // Named Owner Questions
  // ==================================================
  async namedOwnerQuestions(policyData) {
    const namedOwnerValue = String(
      policyData["Submission for a Named Owner policy?"] || "",
    )
      .trim()
      .toLowerCase();

    // wait for radio section to appear
    await this.page
      .locator(locators.namedOwnerYes)
      .waitFor({ state: "visible", timeout: 50000 });

    if (namedOwnerValue === "no") {
      // only click when No is required
      await this.safeClick(this.page.locator(locators.namedOwnerNo));

      console.log("Named Owner = NO");

      // second question appears
      await this.page
        .locator(locators.vehicleRegisteredNo)
        .waitFor({ state: "visible", timeout: 50000 });

      await this.safeClick(this.page.locator(locators.vehicleRegisteredNo));

      console.log("Vehicle Registered = NO");
    } else {
      console.log("Named Owner = YES (default selected)");
    }
  }

  // ==================================================
  // Retry New Submission
  // ==================================================
  async retryNewSubmission(policyData, insuredData) {
    console.log("Recovering by re-login...");

    await this.page.goto(process.env.BASE_URL);

    await login(this.page);

    await expect(this.page.locator(locators.dashboardHome)).toBeVisible({
      timeout: 60000,
    });

    console.log("Re-login successful. Retrying New Submission...");

    await this.startNewSubmission(policyData, insuredData);
  }

  // ==================================================
  // Start New Submission
  // ==================================================
  async startNewSubmission(policyData, insuredData) {
    await expect(this.page.locator(locators.quoteList).first()).toBeVisible({
      timeout: 60000,
    });

    const newSubmissionBtn = this.page
      .locator(locators.newSubmissionBtn)
      .first();

    try {
      await this.safeClick(newSubmissionBtn);
    } catch (error) {
      console.log("New Submission failed. Attempting recovery...");
      await this.retryNewSubmission(policyData, insuredData);
      return;
    }

    // ===============================
    // State
    // ===============================

    await this.page.selectOption(locators.selectState, {
      label: policyData.State,
    });

    // ===============================
    // Program
    // ===============================

    await this.page.selectOption(locators.selectProgram, {
      label: policyData.Program,
    });

    // ===============================
    // Effective Date
    // ===============================

    if (policyData.EffectiveDate) {
      const effectiveDate = policyData.EffectiveDate.toString().replace(
        /-/g,
        "/",
      );

      const dateField = this.page.locator(locators.effectiveDate);

      await expect(dateField).toBeVisible({ timeout: 50000 });

      await dateField.fill("");
      await dateField.type(effectiveDate);

      await this.page.keyboard.press("Tab");

      console.log("Effective Date entered:", effectiveDate);
    }

    // ===============================
    // First Name
    // ===============================

    await expect(this.page.locator(locators.fName)).toBeVisible({
      timeout: 50000,
    });

    await this.page.locator(locators.fName).fill(insuredData.firstName);

    // ===============================
    // Last Name
    // ===============================

    await this.page.locator(locators.lName).fill(insuredData.lastName);

    // ===============================
    // Term Length
    // ===============================

    await this.page.selectOption(
      locators.selectTerm,
      policyData.TermLength.toString(),
    );

    // ===============================
    // Named Owner Questions
    // ===============================

    await this.namedOwnerQuestions(policyData);

    // ===============================
    // Continue
    // ===============================

    await this.safeClick(this.page.locator(locators.continueBtn));
  }

  // ==================================================
  // Fill Contact Details
  // ==================================================
  async fillContactDetails(phone, email) {
    await expect(this.page.locator(locators.cellPhone)).toBeVisible({
      timeout: 50000,
    });

    await this.page.fill(locators.cellPhone, phone);
    await this.page.fill(locators.emailid, email);

    await this.safeClick(this.page.locator(locators.nextBtn));
  }

  // ==================================================
  // Complete Flow
  // ==================================================
  async completeNamedInsured(policyData, insuredData) {
    await this.startNewSubmission(policyData, insuredData);

    await this.fillContactDetails(insuredData.phone, insuredData.email);
  }
}
