// Navigators/violationsNavigator.js

import { expect } from "@playwright/test";
import { locators } from "../Locators/selectors.js";

export class ViolationsNavigator {
  constructor(page) {
    this.page = page;
  }

  // ==================================================
  // Complete Violations Section
  // ==================================================
  async completeViolations(policyData) {
    // Wait until Violations page is loaded
    await expect(this.page.locator(locators.hasViolationNoRadio)).toBeVisible({
      timeout: 50000,
    });

    let hasAnyViolation = false;

    // Check all drivers (D1 - D8)
    for (let i = 1; i <= 8; i++) {
      const required = String(policyData[`D${i} Violation Required`] || "")
        .trim()
        .toLowerCase();

      if (required === "yes") {
        hasAnyViolation = true;
        break;
      }
    }

    // ============================================
    // No Violations
    // ============================================
    if (!hasAnyViolation) {
      console.log("No violations found in input file.");

      await this.page.locator(locators.hasViolationNoRadio).click();

      await this.page.locator(locators.nextButton).click();

      console.log("Violations page completed.");

      return;
    }

    // ============================================
    // Violations Exist
    // ============================================
    console.log("Violation(s) found.");

    await this.page.locator(locators.hasViolationYesRadio).click();

    // Process every driver
    for (let driverNo = 1; driverNo <= 8; driverNo++) {
      const required = String(
        policyData[`D${driverNo} Violation Required`] || "",
      )
        .trim()
        .toLowerCase();

      if (required !== "yes") {
        continue;
      }

      console.log(`Processing Driver ${driverNo} violation`);

      const violation = {
        driverNo,

        incidentCode: policyData[`D${driverNo} Incident Code`],

        violationDate: policyData[`D${driverNo} Violation Date`],

        convictionDate: policyData[`D${driverNo} Conviction Date`],
      };

      await this.addViolation(violation);
    }

    await this.page.locator(locators.nextButton).click({ timeout: 10000 });
    await this.page.locator(locators.nextButton).click({ timeout: 10000 });

    console.log("Violation section completed.");
  }

  // ==================================================
  // Add Single Driver Violation
  // ==================================================
  async addViolation(violation) {
    // ==============================
    // Click Add Violation
    // ==============================
    await this.page.locator(locators.addViolationBtn).click();

    // Wait for drawer
    await expect(
      this.page.locator(locators.violationDriverDropdown),
    ).toBeVisible({
      timeout: 30000,
    });

    // ==============================
    // Driver
    // ==============================

    await this.page.locator(locators.violationDriverDropdown).selectOption({
      value: String(violation.driverNo - 1),
    });

    console.log(`Driver ${violation.driverNo} selected`);

    // ==============================
    // Incident Code
    // ==============================
    if (violation.incidentCode) {
      const incidentField = this.page.locator(
        locators.violationIncidentCodeDropdown,
      );

      await incidentField.click();

      await incidentField.fill("");

      await incidentField.type(violation.incidentCode, { delay: 80 });

      await this.page
        .locator(locators.selectViolationIncidentCode(violation.incidentCode))
        .click();

      console.log(`Incident Code : ${violation.incidentCode}`);
    }

    // ==============================
    // Violation Date
    // ==============================
    if (violation.violationDate) {
      const violationDate = this.formatDate(violation.violationDate);

      const violationField = this.page.locator(locators.violationDate);

      await violationField.click();
      await violationField.press("Control+A");
      await violationField.press("Delete");

      await violationField.fill(violationDate);
      await violationField.press("Tab");

      console.log(`Violation Date : ${violationDate}`);
      console.log(`Violation Date UI : ${await violationField.inputValue()}`);
    }

    // ==============================
    // Conviction Date
    // ==============================
    if (violation.convictionDate) {
      const convictionDate = this.formatDate(violation.convictionDate);

      const convictionField = this.page.locator(locators.convictionDate);

      await convictionField.click();
      await convictionField.press("Control+A");
      await convictionField.press("Delete");

      await convictionField.fill(convictionDate);
      await convictionField.press("Tab");

      console.log(`Conviction Date : ${convictionDate}`);
      console.log(`Conviction Date UI : ${await convictionField.inputValue()}`);
    }

    // ==============================
    // Save
    // ==============================
    await this.page.locator(locators.violationSaveBtn).click();

    // Wait until drawer closes
    await expect(
      this.page.locator(locators.violationDriverDropdown),
    ).toBeHidden({
      timeout: 30000,
    });

    console.log(`Driver ${violation.driverNo} violation saved.`);
  }

  // ==================================================
  // Date Formatter
  // ==================================================
  formatDate(rawDate) {
    if (!rawDate) return "";

    // Excel serial number
    if (typeof rawDate === "number") {
      const jsDate = new Date(Math.round((rawDate - 25569) * 86400 * 1000));

      const mm = String(jsDate.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(jsDate.getUTCDate()).padStart(2, "0");
      const yyyy = jsDate.getUTCFullYear();

      return `${mm}/${dd}/${yyyy}`;
    }

    // Already a string
    return rawDate.toString().replace(/-/g, "/");
  }
}
