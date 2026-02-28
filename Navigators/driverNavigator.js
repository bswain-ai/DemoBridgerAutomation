import { expect } from "@playwright/test";
import { locators } from "../Locators/selectors.js";

export class DriverNavigator {
  constructor(page) {
    this.page = page;
  }

  async completeDriverSection(policyData) {
    await this.page.locator(locators.updateDriver).click({ timeout: 10000 });

    await this.page
      .locator(locators.driverGender)
      .selectOption({ label: policyData.DriverGender });

    await this.page
      .locator(locators.driverMaritalStatus)
      .selectOption({ label: policyData.DMaritalStatus });

    await this.page
      .locator(locators.driverDOB)
      .fill(policyData.DriverDob.toString());

    await this.page
      .locator(locators.licenseTxtBox)
      .fill(policyData.LicenseNo.toString());

    await this.page
      .locator(locators.driverLicenseStatus)
      .selectOption({ label: policyData.DLicenseStatus });

    await this.page
      .locator(locators.driverLicenseYears)
      .fill(policyData.DLicenseYears.toString());

    await this.page
      .locator(locators.driverLicenseMonths)
      .fill(policyData.DLicenseMonths.toString());

    // SR22 handled here
    await this.handleSR22(policyData);

    await this.page.locator(locators.driverOccupation).click();

    await this.page
      .locator(locators.selectOccupation(policyData.DOccupation))
      .click();

    await this.page
      .locator(locators.driverSubmitBtn)
      .click({ timeout: 10000 });

    await this.page.locator(locators.nextButton).click({ timeout: 10000 });
    await this.page.locator(locators.nextButton).click({ timeout: 10000 });
  }

  // =========================================
  // SR22 Logic (Clean & Stable)
  // =========================================
  async handleSR22(policyData) {
    const sr22Value = Number(policyData.SR22);

    if (sr22Value !== 1) {
      console.log("SR22 not required");
      return;
    }

    const sr22Checkbox = this.page.locator(locators.sr22CheckBox);

    await expect(sr22Checkbox).toBeVisible({ timeout: 10000 });

    const isChecked = await sr22Checkbox.isChecked();

    if (!isChecked) {
      await sr22Checkbox.click({ force: true });
      console.log("SR22 enabled");
    } else {
      console.log("SR22 already enabled");
    }
  }
}