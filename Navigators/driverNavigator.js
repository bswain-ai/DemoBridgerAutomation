import { expect } from "@playwright/test";
import { locators } from "../Locators/selectors.js";

export class DriverNavigator {
  constructor(page) {
    this.page = page;
  }

  /**
   * Fill in one driver's details on the quote.
   *
   * Button behavior (confirmed from UI screenshots):
   *   driverIndex === 0  → click locators.updateDriver
   *                        ("Update" — primary insured pre-populated on page load)
   *   driverIndex > 0    → click locators.addDriverBtn
   *                        ([data-test="add-driver-button"] — "Add driver" button)
   *
   * Next button behavior:
   *   Only clicked twice when driverIndex === totalDrivers - 1 (last driver).
   *   Intermediate drivers are saved via driverSubmitBtn but the page stays
   *   on the drivers list until all drivers have been entered.
   *
   * @param {object} driver        - One entry from buildRaterData().drivers[]
   * @param {number} driverIndex   - 0-based position of this driver in the loop
   * @param {number} totalDrivers  - Total number of drivers on this policy
   */
  async completeDriverSection(driver, driverIndex, totalDrivers) {

    // ─── OPEN DRIVER DRAWER ─────────────────────────────────────────────────
    if (driverIndex === 0) {
      // Primary insured — always pre-populated on the drivers page as "Update"
      await this.page.locator(locators.updateDriver).click({ timeout: 10000 });
    } else {
      // Additional drivers — "Add driver" button adds a new driver slot
      await this.page.locator(locators.addDriverBtn).click({ timeout: 10000 });
    }

    // ─── GENDER ─────────────────────────────────────────────────────────────
    // From "D{n} Gender" column — e.g. "Male", "Female"
    await this.page
      .locator(locators.driverGender)
      .selectOption({ label: driver.gender });

    // ─── MARITAL STATUS ─────────────────────────────────────────────────────
    // From "D{n} Marital Status" column — e.g. "Single", "Married"
    await this.page
      .locator(locators.driverMaritalStatus)
      .selectOption({ label: driver.maritalStatus });

    // ─── DATE OF BIRTH ──────────────────────────────────────────────────────
    // dob is pre-formatted MM-DD-YYYY by dateFormatUSA() in raterHelper
    await this.page
      .locator(locators.driverDOB)
      .fill(driver.dob.toString());

    // ─── LICENSE STATE (MUI Autocomplete) ───────────────────────────────────
    // MUI Autocomplete requires typing into the field to open the dropdown,
    // then clicking the matching list item. A plain selectOption() won't work.
    const licenseStateField = this.page.locator(locators.driverLicenseState);

    await licenseStateField.waitFor({ state: "visible" });
    await licenseStateField.click();
    await licenseStateField.fill("");
    await licenseStateField.type(driver.licenseState, { delay: 100 });

    const stateOption = this.page.locator(
      `//li[contains(text(),'${driver.licenseState}')]`
    );
    await stateOption.waitFor({ state: "visible", timeout: 10000 });
    await stateOption.click();

    // ─── LICENSE NUMBER ─────────────────────────────────────────────────────
    // From "D{n} License No" column (UI-only — not a rating factor in rater.ps1)
    await this.page
      .locator(locators.licenseTxtBox)
      .fill(driver.licenseNo.toString());

    // ─── LICENSE STATUS ─────────────────────────────────────────────────────
    // From "D{n} License Status" column — e.g. "Valid", "Suspended"
    await this.page
      .locator(locators.driverLicenseStatus)
      .selectOption({ label: driver.licenseStatus });

    // ─── LICENSE EXPERIENCE ─────────────────────────────────────────────────
    // Years and months licensed — from "D{n} License Years/Months" columns
    await this.page
      .locator(locators.driverLicenseYears)
      .fill(driver.licenseYears.toString());

    await this.page
      .locator(locators.driverLicenseMonths)
      .fill(driver.licenseMonths.toString());

    // ─── CHECKBOXES ─────────────────────────────────────────────────────────
    // Each handler reads a flag (0/1) from the driver object and only
    // interacts with the checkbox when the discount/surcharge is applicable.
    await this.handleSR22(driver);
    await this.handleDefensiveDriver(driver);
    await this.handleDrugDiscount(driver);

    // ─── OCCUPATION ─────────────────────────────────────────────────────────
    // Click the occupation dropdown then select the matching list item
    await this.page.locator(locators.driverOccupation).click();
    await this.page
      .locator(locators.selectOccupation(driver.occupation))
      .click();

    // ─── SAVE DRIVER ────────────────────────────────────────────────────────
    await this.page.locator(locators.driverSubmitBtn).click({ timeout: 10000 });

    // Brief pause for the drawer close animation before any next action
    await this.page.waitForTimeout(1000);

    // ─── ADVANCE PAGE (last driver only) ────────────────────────────────────
    // Intermediate drivers: save and stay on the drivers page.
    // Last driver: click Next twice — first advances past the drivers summary,
    // second advances past the violations page to coverages.
    if (driverIndex === totalDrivers - 1) {
      await this.page.locator(locators.nextButton).click({ timeout: 10000 });
      await this.page.locator(locators.nextButton).click({ timeout: 10000 });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SR22
  // sr22 = 1 means this driver requires an SR-22 financial responsibility
  // filing. The checkbox is unchecked by default — only interact when sr22 = 1.
  // ─────────────────────────────────────────────────────────────────────────
  async handleSR22(driver) {
    if (Number(driver.sr22) !== 1) {
      console.log("SR22 not required");
      return;
    }

    const sr22Checkbox = this.page.locator(locators.sr22CheckBox);
    await expect(sr22Checkbox).toBeVisible({ timeout: 50000 });

    const isChecked = await sr22Checkbox.isChecked();
    if (!isChecked) {
      await sr22Checkbox.click({ force: true });
      console.log("SR22 enabled");
    } else {
      console.log("SR22 already enabled");
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DEFENSIVE DRIVER DISCOUNT
  // defensiveDriver = 1 means this driver completed an approved defensive
  // driving course and qualifies for the discount.
  // ─────────────────────────────────────────────────────────────────────────
  async handleDefensiveDriver(driver) {
    if (Number(driver.defensiveDriver) !== 1) {
      console.log("Defensive Driver not selected");
      return;
    }

    const defensiveCheckbox = this.page.locator(locators.defensiveDriverCheckBox);
    await expect(defensiveCheckbox).toBeVisible({ timeout: 10000 });

    const isChecked = await defensiveCheckbox.isChecked();
    if (!isChecked) {
      await defensiveCheckbox.click({ force: true });
      console.log("Defensive Driver enabled");
    } else {
      console.log("Defensive Driver already enabled");
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DRUG / ALCOHOL AWARENESS DISCOUNT
  // drugDiscount = 1 means this driver completed an approved drug/alcohol
  // awareness program and qualifies for the discount.
  // ─────────────────────────────────────────────────────────────────────────
  async handleDrugDiscount(driver) {
    if (Number(driver.drugDiscount) !== 1) {
      console.log("Drug Discount not selected");
      return;
    }

    const drugCheckbox = this.page.locator(locators.drugDiscountCheckBox);
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
