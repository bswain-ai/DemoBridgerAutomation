import { expect } from "@playwright/test";
import { locators } from "../Locators/selectors.js";

export class UnderwriterNavigator {
  constructor(page) {
    this.page = page;
  }
  
  /**
   * Question Answers
   * ]
   */
  async completeEligibilityQuestions(questions) {
    console.log("Answering Underwriting Questions...");

    // Wait for UW page to load
    await expect(this.page.locator(locators.uwQueryPage)).toBeVisible({
      timeout: 20000,
    });

    for (const question of questions) {
      const value = question.answer.toLowerCase() === "yes" ? "true" : "false";

      const radioLocator = this.page.locator(
        `#${question.id} input[type="radio"][value="${value}"]`,
      );

      await expect(radioLocator).toBeAttached({ timeout: 15000 });

      await radioLocator.check({ force: true });

      console.log(`Answered ${question.id} → ${question.answer}`);
    }

    await this.page.locator(locators.nextButton).click();

    await expect(this.page.locator(locators.paymentSigningDetails)).toBeVisible(
      { timeout: 50000 },
    );

    console.log("Underwriting section completed.");
  }
}
