// Navigators/addressNavigator.js

import { expect } from "@playwright/test";
import { locators } from "../Locators/selectors.js";

export class AddressNavigator {
  constructor(page) {
    this.page = page;
  }

  /**
   * Enter and select address from MUI Autocomplete dropdown
   * Accepts full policyData object (Excel driven)
   */
  async enterAddress(policyData) {
    try {
      // Extract required fields from Excel data
      const street = policyData.Address;
      const city = policyData.City;
      const state = policyData.State;
      const zip = policyData.Zip;

      // Debug once if needed
      // console.log("Policy Data:", policyData);

      if (!street || !city || !state || !zip) {
        console.error("Missing fields:", {
          street,
          city,
          state,
          zip,
        });
        throw new Error("Address data missing from test data.");
      }

      const streetInput = this.page.locator(locators.streetAddress);

      // Focus and clear
      await streetInput.click();
      await streetInput.fill("");

      // Type slowly to trigger autocomplete
      await streetInput.pressSequentially(street, { delay: 40 });

      // Wait for dropdown to appear
      await this.page.waitForSelector("ul[role='listbox']", {
        timeout: 10000,
      });

      // Build expected visible text
      const fullAddressText = `${street} ${city}, ${state} ${zip}`;

      // Select exact matching option (position doesn't matter)
      await this.page
        .getByRole("option", { name: fullAddressText })
        .click({ timeout: 10000 });

      // Validate selection
      await expect(streetInput).toHaveValue(street);

      // Click Next
      await this.page.locator(locators.nextBtn).click({
        timeout: 10000,
      });

      console.log("Address selected successfully:", fullAddressText);

    } catch (error) {
      console.error("Address selection failed:", error.message);
      throw error;
    }
  }

  /**
   * Get currently entered address value
   */
  async getEnteredAddress() {
    return await this.page
      .locator(locators.streetAddress)
      .inputValue();
  }
}