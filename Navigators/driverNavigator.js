import { expect } from "@playwright/test";
import { locators } from "../Locators/selectors.js";
import { FakerData } from "../testData/fakerData.js";

export class DriverNavigator {
  constructor(page, state) {
    this.page = page;
    this.state = state;
  }

  async completeDriverSection(driver, driverIndex, totalDrivers) {
    // ─── OPEN DRIVER DRAWER ────────────────────────────────────────────────
    if (driverIndex === 0) {
      await this.page.locator(locators.updateDriver).click({ timeout: 10000 });
    } else {
      await this.page.locator(locators.addDriverBtn).click({ timeout: 10000 });
    }

    // ─── BASIC DETAILS ─────────────────────────────────────────────────────
    if (driverIndex > 0) {
      await this.page
        .locator(locators.driverFirstName)
        .fill(FakerData.getFirstName());

      await this.page
        .locator(locators.driverLastName)
        .fill(FakerData.getLastName());
    }

    await this.page
      .locator(locators.driverGender)
      .selectOption({ label: driver.gender });

    await this.page
      .locator(locators.driverMaritalStatus)
      .selectOption({ label: driver.maritalStatus });

    await this.page
      .locator(locators.driverDOB)
      .fill(driver.dob.toString().replace(/-/g, "/"));

    if (driverIndex > 0) {
      const relation = driver.relationship || "Spouse";
      await this.page
        .locator(locators.driverRelation)
        .selectOption({ label: relation });
    }

    // ─── LICENSE STATE (MUI AUTOCOMPLETE) ─────────────────────────────────
    const licenseStateField = this.page.locator(locators.driverLicenseState);

    await licenseStateField.waitFor({ state: "visible" });
    await licenseStateField.click();
    await licenseStateField.fill("");
    await licenseStateField.type(driver.licenseState, { delay: 100 });

    const stateOption = this.page.locator(
      `//li[contains(text(),'${driver.licenseState}')]`,
    );

    await stateOption.waitFor({ state: "visible", timeout: 10000 });
    await stateOption.click();

    // ─── LICENSE DETAILS ───────────────────────────────────────────────────
    await this.page
      .locator(locators.licenseTxtBox)
      .fill(driver.licenseNo.toString());

    await this.page
      .locator(locators.driverLicenseStatus)
      .selectOption({ label: driver.licenseStatus });

    await this.page
      .locator(locators.driverLicenseYears)
      .fill(driver.licenseYears.toString());

    await this.page
      .locator(locators.driverLicenseMonths)
      .fill(driver.licenseMonths.toString());

    // ───  CALIFORNIA FIELDS ──────────────────────────────────────────────
    if (this.state === "California") {
      console.log("Handling California driver fields");

      // Driving Experience
      await this.page
        .locator(locators.driverExperience)
        .fill(driver.drivingExp?.toString() || "1");
      await this.handleAge55Plus(driver);
      await this.handleGoodStudent(driver);
      await this.handleYouthfulDriver(driver);
    }

    // ─── COMMON SR22 (BOTH STATES) ─────────────────────────────────────────
    await this.handleSR22(driver);

    // ─── TEXAS ONLY ────────────────────────────────────────────────────────
    if (this.state === "Texas") {
      await this.handleDefensiveDriver(driver);
      await this.handleDrugDiscount(driver);
    }

    // ─── OCCUPATION ───────────────────────────────────────────────────────
    await this.page.locator(locators.driverOccupation).click();
    await this.page
      .locator(locators.selectOccupation(driver.occupation))
      .click();

    // ─── SAVE DRIVER ──────────────────────────────────────────────────────
    await this.page.locator(locators.driverSubmitBtn).click({ timeout: 10000 });

    await this.page
      .locator(locators.driverSubmitBtn)
      .waitFor({ state: "hidden", timeout: 10000 });

    // ─── NEXT BUTTON (LAST DRIVER ONLY) ───────────────────────────────────
    if (driverIndex === totalDrivers - 1) {
      await this.page.locator(locators.nextButton).click({ timeout: 10000 });
      await this.page.locator(locators.nextButton).click({ timeout: 10000 });
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // SR22 (COMMON)
  // ────────────────────────────────────────────────────────────────────────
  async handleSR22(driver) {
    if (Number(driver.sr22) !== 1) return;

    const checkbox = this.page.locator(locators.sr22CheckBox);
    await expect(checkbox).toBeVisible({ timeout: 50000 });

    if (!(await checkbox.isChecked())) {
      await checkbox.click({ force: true });
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // Age 55+ Driver
  // ────────────────────────────────────────────────────────────────────────

  async handleAge55Plus(driver) {
    if (Number(driver.age55OrOlder) !== 1) return;

    const checkbox = this.page.locator(locators.age55Checkbox);
    await expect(checkbox).toBeVisible({ timeout: 50000 });

    if (!(await checkbox.isChecked())) {
      await checkbox.click({ force: true });
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // Good Student Discount
  // ────────────────────────────────────────────────────────────────────────

  async handleGoodStudent(driver) {
    if (Number(driver.goodStudent) !== 1) return;

    const checkbox = this.page.locator(locators.goodStudentCheckbox);
    await expect(checkbox).toBeVisible({ timeout: 50000 });

    if (!(await checkbox.isChecked())) {
      await checkbox.click({ force: true });
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // Good Student Discount
  // ────────────────────────────────────────────────────────────────────────

  async handleYouthfulDriver(driver) {
    if (Number(driver.goodStudent) !== 1) return;

    const checkbox = this.page.locator(locators.youthfulDriverCheckbox);
    await expect(checkbox).toBeVisible({ timeout: 50000 });

    if (!(await checkbox.isChecked())) {
      await checkbox.click({ force: true });
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // TEXAS - DEFENSIVE DRIVER
  // ────────────────────────────────────────────────────────────────────────
  async handleDefensiveDriver(driver) {
    if (Number(driver.defensiveDriver) !== 1) return;

    const checkbox = this.page.locator(locators.defensiveDriverCheckBox);
    await expect(checkbox).toBeVisible();

    if (!(await checkbox.isChecked())) {
      await checkbox.click({ force: true });
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // TEXAS - DRUG DISCOUNT
  // ────────────────────────────────────────────────────────────────────────
  async handleDrugDiscount(driver) {
    if (Number(driver.drugDiscount) !== 1) return;

    const checkbox = this.page.locator(locators.drugDiscountCheckBox);
    await expect(checkbox).toBeVisible();

    if (!(await checkbox.isChecked())) {
      await checkbox.click({ force: true });
    }
  }
}
