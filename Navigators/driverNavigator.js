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
      const updateDriver = this.page.locator(locators.updateDriver);

      await updateDriver.waitFor({
        state: "visible",
        timeout: 30000,
      });

      await updateDriver.click({
        timeout: 10000,
      });
    } else {
      const addDriver = this.page.locator(locators.addDriverBtn);

      await addDriver.waitFor({
        state: "visible",
        timeout: 30000,
      });

      await addDriver.click({
        timeout: 10000,
      });
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
      // ─── DRIVER RELATIONSHIP ─────────────────────────────────────────────
        const relation = driver.relationship?.toString().trim();

        console.log(
          `Driver ${driverIndex + 1} - Relationship from Excel:`,
          JSON.stringify(relation),
        );

        if (!relation) {
          throw new Error(
            `Relationship to Named Insured is missing for Driver ${driverIndex + 1}`,
          );
        }

        const relationshipDropdown = this.page.locator(locators.driverRelation);

        await relationshipDropdown.waitFor({
          state: "visible",
          timeout: 30000,
        });

        await expect(relationshipDropdown).toBeEnabled({
          timeout: 10000,
        });

        // Excel contains the visible text, e.g. "Child"
        await relationshipDropdown.selectOption({
          label: relation,
        });

        const selectedValue = await relationshipDropdown.inputValue();

        console.log(
          `Driver ${driverIndex + 1} - Relationship selected:`,
          JSON.stringify(selectedValue),
        );

        const selectedLabel = await relationshipDropdown
          .locator("option:checked")
          .textContent();

        console.log(
          `Driver ${driverIndex + 1} - Relationship selected label:`,
          JSON.stringify(selectedLabel?.trim()),
        );

        if (selectedLabel?.trim() !== relation) {
          throw new Error(
            `Failed to select Relationship for Driver ${driverIndex + 1}. ` +
              `Expected label: "${relation}", ` +
              `Actual label: "${selectedLabel?.trim()}"`,
          );
        }
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

    // ─── CALIFORNIA FIELDS ────────────────────────────────────────────────
    if (this.state === "California") {
      await this.page
        .locator(locators.driverExperience)
        .fill(driver.drivingExp?.toString() || "1");

      await this.handleAge55Plus(driver);
      await this.handleGoodStudent(driver);
      await this.handleYouthfulDriver(driver);
    }

    // ─── COMMON SR22 ──────────────────────────────────────────────────────
    await this.handleSR22(driver);

    // ─── ARIZONA FIELDS ────────────────────────────────────────────────
    if (this.state === "Arizona") {
      await this.handlePhysiciansReport(driver);
    }

    // ─── TEXAS ONLY ───────────────────────────────────────────────────────
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
    await this.page.locator(locators.driverSubmitBtn).click({
      timeout: 10000,
    });

    await this.page.locator(locators.driverSubmitBtn).waitFor({
      state: "hidden",
      timeout: 10000,
    });
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

  // ────────────────────────────────────────────────────────────────────────
  // ARIZONA - PHYSICIAN'S REPORT
  // ────────────────────────────────────────────────────────────────────────
  async handlePhysiciansReport(driver) {
    if (Number(driver.physiciansReport) !== 1) return;

    const checkbox = this.page.locator(locators.physiciansReportCheckbox);

    await expect(checkbox).toBeVisible({ timeout: 50000 });

    if (!(await checkbox.isChecked())) {
      await checkbox.check();
    }
  }
}
