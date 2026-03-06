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

    // ===============================
    // Handle Checkboxes
    // ===============================
    await this.handleSR22(policyData);
    await this.handleDefensiveDriver(policyData);
    await this.handleDrugDiscount(policyData);

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
  // SR22 Logic
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

  // =========================================
  // Defensive Driver Logic
  // =========================================
  async handleDefensiveDriver(policyData) {
    const defensiveValue = Number(policyData.DefensiveDriver);

    if (defensiveValue !== 1) {
      console.log("Defensive Driver not selected");
      return;
    }

    const defensiveCheckbox = this.page.locator(
      locators.defensiveDriverCheckBox
    );

    await expect(defensiveCheckbox).toBeVisible({ timeout: 10000 });

    const isChecked = await defensiveCheckbox.isChecked();

    if (!isChecked) {
      await defensiveCheckbox.click({ force: true });
      console.log("Defensive Driver enabled");
    } else {
      console.log("Defensive Driver already enabled");
    }
  }

  // =========================================
  // Drug Discount Logic
  // =========================================
  async handleDrugDiscount(policyData) {
    const drugValue = Number(policyData.DrugDiscount);

    if (drugValue !== 1) {
      console.log("Drug Discount not selected");
      return;
    }

    const drugCheckbox = this.page.locator(
      locators.drugDiscountCheckBox
    );

    await expect(drugCheckbox).toBeVisible({ timeout: 10000 });

    const isChecked = await drugCheckbox.isChecked();

    if (!isChecked) {
      await drugCheckbox.click({ force: true });
      console.log("Drug Discount enabled");
    } else {
      console.log("Drug Discount already enabled");
    }
  }
}