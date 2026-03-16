// Navigators/addressNavigator.js

import { expect } from "@playwright/test";
import { locators } from "../Locators/selectors.js";

export class AddressNavigator {
  constructor(page) {
    this.page = page;
  }

  /**
   * Enter and select address from MUI Autocomplete dropdown
   */

  async enterAddress(policyData) {
    try {
      const street = policyData.Address;
      const city = policyData.City;
      const state = policyData.State;
      const zip = policyData.Zip;

      if (!street || !city || !state || !zip) {
        console.error("Missing fields:", { street, city, state, zip });
        throw new Error("Address data missing from test data.");
      }

      const streetInput = this.page.locator(locators.streetAddress);

      // Focus on input
      await streetInput.click({ timeout: 10000 });

      // Clear existing value
      await streetInput.fill("");

      // Type address slowly to trigger autocomplete
      await streetInput.pressSequentially(street, { delay: 40 });

      // Small wait for API suggestions
      await this.page.waitForTimeout(1000);

      // Wait for dropdown container
      await this.page.waitForSelector("ul[role='listbox']", {
        timeout: 20000,
      });

      // Wait for options to appear
      await this.page.waitForSelector('[role="option"]', {
        timeout: 20000,
      });

      // Select first suggestion
      const firstOption = this.page.locator('[role="option"]').first();
      await firstOption.click();

      // Validate using house number (avoids Hwy vs Highway issue)
      const houseNumber = street.split(" ")[0];
      await expect(streetInput).toHaveValue(new RegExp(houseNumber), {
        timeout: 10000,
      });

      // Click Next
      await this.page.locator(locators.nextBtn).click({
        timeout: 10000,
      });

      console.log(
        "Address selected successfully:",
        `${street}, ${city}, ${state} ${zip}`,
      );
    } catch (error) {
      console.error("Address selection failed:", error.message);
      throw error;
    }
  }
  /**
   * Get currently entered address value
   */
  async getEnteredAddress() {
    return await this.page.locator(locators.streetAddress).inputValue();
  }
}
