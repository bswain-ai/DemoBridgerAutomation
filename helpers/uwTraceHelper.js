import { expect } from "@playwright/test";
import { locators } from "../Locators/selectors.js";

export class UwTraceHelper {
  constructor(page) {
    this.page = page;
  }

  // ================= COMMON SAFE CLICK =================
  async safeClick(locator, name) {
    await locator.waitFor({ state: "visible", timeout: 20000 });
    await locator.scrollIntoViewIfNeeded();
    await locator.click();
    console.log(`Clicked: ${name}`);
  }

  // ================= OPEN COVERAGE SUMMARY =================
  async openCoverageSummary() {
    await this.safeClick(
      this.page.locator(locators.coverageSummaryBtn),
      "Coverage Summary",
    );

    await this.ensureCoverageSummaryLoaded();
  }

  // ================= CHECK DATA LOAD =================
  async ensureCoverageSummaryLoaded() {
    const coverageData = this.page.locator(locators.coverageSummaryData);

    try {
      await coverageData.first().waitFor({ state: "visible", timeout: 7000 });
      console.log("Coverage data loaded");
    } catch {
      console.log("Data not loaded → Refreshing...");

      await this.page.reload();
      await this.page.waitForLoadState("networkidle");

      await coverageData.first().waitFor({ state: "visible", timeout: 15000 });
      console.log("Loaded after refresh");
    }
  }

  // ================= OPEN VIEW TRACE =================
  async openViewPriceTrace(state) {
    await this.safeClick(
      this.page.locator(locators.viewPriceTraceBtn),
      "View Price Trace",
    );

    await this.page.locator(locators.priceTraceDialog).waitFor({
      state: "visible",
      timeout: 30000,
    });

    await expect(
      this.page.locator('tr:has(td:text-is("Base"))').first(),
    ).toBeVisible({
      timeout: 30000,
    });

    console.log(`Current State Inside Helper: ${state}`);

    // =========================================
    // TEXAS TRACE
    // =========================================

    if (state === "TX" || state === "Texas") {
      console.log("Using Texas Trace Parser");

      return await this.captureTexasTraceValues();
    }

    // =========================================
    // CALIFORNIA TRACE
    // =========================================

    if (state === "CA" || state === "California") {
      console.log("Using California Trace Parser");

      return await this.captureCaliforniaTraceValues();
    }

    // =========================================
    // UNSUPPORTED STATE
    // =========================================

    throw new Error(`Unsupported State: ${state}`);
  }

  // ================= CAPTURE FULL PRICE TRACE =================
  async captureTexasTraceValues() {
    console.log("Capturing Selected Price Trace Values...");

    try {
      const result = {};

      const labels = [
        "Base",
        "Region",
        "Profile",
        "Household",
        "Policy class",
        "Model year",
        "Symbol",
        "Non-Owner / FR",
        "Limits / Deductible",
        "Term",
        "License Type Surcharge",
        "Business Use",
        "Violations Surcharge",
        "Unacceptable Risk Surcharge",
        "Sum of Surcharges",
        "Multi-Car Discount",
        "Prior Coverage Discount",
        "Defensive Driver Discount",
        "Drug/Alcohol Awareness Discount",
        "Vehicle Discount",
        "Rollover Discount",
        "Sum of discounts",
        "Anti-Theft Discount",
      ];

      const headers = [
        "BI",
        "PD",
        "PIP",
        "MEDPAY",
        "UMBI",
        "UIMBI",
        "UMPD",
        "UIMPD",
        "COMP",
        "COLL",
        "RRB",
        "RSA",
      ];

      // ===================================================
      // FIND ALL BASE ROWS
      // EACH BASE ROW REPRESENTS ONE TRACE SECTION
      // ===================================================

      const baseRows = this.page.locator(`tr:has(td:text-is("Base"))`);

      const sectionCount = await baseRows.count();

      console.log(`Total Trace Sections: ${sectionCount}`);

      // ===================================================
      // LOOP EACH SECTION
      // ===================================================

      for (let s = 0; s < sectionCount; s++) {
        const baseRow = baseRows.nth(s);

        // ================================================
        // GET PARENT TABLE
        // ================================================

        const section = baseRow.locator("xpath=ancestor::table[1]");

        // ================================================
        // DRIVER / VEHICLE HEADER
        // ================================================

        let driverName = `Driver_${s + 1}`;
        let vehicleName = `Vehicle_${s + 1}`;

        try {
          const headerRow = section.locator("tr").nth(0);

          const headerText = await headerRow.innerText();

          const lines = headerText
            .split("\n")
            .map((x) => x.trim())
            .filter(Boolean);

          if (lines.length >= 2) {
            driverName = lines[0];
            vehicleName = lines[1];
          }
        } catch {
          console.log("Could not extract driver/vehicle");
        }

        console.log(`\n====================================`);
        console.log(`Driver : ${driverName}`);
        console.log(`Vehicle: ${vehicleName}`);
        console.log(`====================================`);

        // ================================================
        // CREATE JSON
        // ================================================

        if (!result[driverName]) {
          result[driverName] = {};
        }

        result[driverName][vehicleName] = {};

        // ================================================
        // PROCESS LABELS
        // ================================================

        for (const label of labels) {
          console.log(`\n Processing: ${label}`);

          result[driverName][vehicleName][label] = {};

          // ============================================
          // FIND ROW INSIDE CURRENT SECTION
          // ============================================

          const row = section
            .locator("tr")
            .filter({
              has: this.page.locator(`td:text-is("${label}")`),
            })
            .first();

          if (!(await row.count())) {
            console.log(`Row not found: ${label}`);
            continue;
          }

          // ============================================
          // COVERAGE LOOP
          // ============================================

          for (let col = 2; col <= 13; col++) {
            const coverage = headers[col - 2];

            const cell = row.locator(`td:nth-child(${col})`);

            if (!(await cell.count())) continue;

            let rawText = (await cell.innerText())?.trim();

            if (!rawText || rawText === "-" || rawText.includes("Policy")) {
              continue;
            }

            // ==========================================
            // FACTOR EXTRACTION
            // ==========================================

            let factorValue = null;

            const spans = cell.locator("span");

            let spanText = null;

            const spanCount = await spans.count();

            for (let i = 0; i < spanCount; i++) {
              const span = spans.nth(i);

              const text = (await span.textContent())?.trim();

              const style = await span.getAttribute("style");

              // ignore red span
              if (style && style.includes("red")) continue;

              if (text && /^\d+(\.\d+)?$/.test(text)) {
                spanText = text;
                break;
              }
            }

            const finalText = spanText || rawText;

            if (finalText) {
              const match = finalText.match(/[\d,.]+/);

              if (match) {
                factorValue = match[0].replace(/,/g, "");
              }
            }

            // ==========================================
            // CALC VALUE
            // ==========================================

            let calcValue = null;

            const redSpan = cell.locator("span[style*='red']");

            if (await redSpan.count()) {
              const raw = (await redSpan.first().textContent())?.trim();

              if (raw && /^[\d,.]+$/.test(raw)) {
                calcValue = raw.replace(/,/g, "");
              }
            }

            // ==========================================
            // STORE
            // ==========================================

            if (factorValue !== null || calcValue !== null) {
              result[driverName][vehicleName][label][coverage] = {
                factor: factorValue !== null ? Number(factorValue) : null,

                calc: calcValue !== null ? Number(calcValue) : null,
              };

              console.log(
                `➡️ ${label} | ${coverage} | Factor: ${
                  factorValue ?? "N/A"
                } | Calc: ${calcValue ?? "N/A"}`,
              );
            }
          }

          // ============================================
          // EMPTY CHECK
          // ============================================

          if (
            Object.keys(result[driverName][vehicleName][label]).length === 0
          ) {
            console.log(`${label} has no valid data (empty or '-')`);
          }
        }
      }

      console.log("\n Price Trace Capture Completed");

      return result;
    } catch (error) {
      console.log("Error while capturing trace:", error.message);

      return null;
    }
  }

  // ================= GET UI DRIVER/VEHICLE MAPPINGS =================
  async getDynamicMappings() {
    try {
      const mappings = [];

      // ==========================================
      // ALL MAPPING ROWS
      // ==========================================

      const rows = this.page.locator("tr:has(td:text-is('Base'))");

      const count = await rows.count();

      console.log(`Mapping Rows Found: ${count}`);

      // ==========================================
      // LOOP
      // ==========================================

      for (let i = 0; i < count; i++) {
        const row = rows.nth(i);

        const section = row.locator("xpath=ancestor::table[1]");

        let driverName = "";
        let vehicleName = "";

        // ======================================
        // HEADER
        // ======================================

        try {
          const headerRow = section.locator("tr").nth(0);

          const headerText = await headerRow.innerText();

          const lines = headerText
            .split("\n")
            .map((x) => x.trim())
            .filter(Boolean);

          if (lines.length >= 2) {
            driverName = lines[0];
            vehicleName = lines[1];
          }
        } catch {
          console.log("Unable to capture mapping");
        }

        // ======================================
        // CAPTURE VEHICLE SELECTOR
        // ======================================

        const vehicleLocator = section.locator("input[placeholder='Vehicle']");

        let vehicle = "";

        if (await vehicleLocator.count()) {
          vehicle = await vehicleLocator.first().inputValue();
        }

        // ======================================
        // CAPTURE DRIVER SELECTOR
        // ======================================

        const driverLocator = section.locator("input[placeholder='Driver']");

        let driver = "";

        if (await driverLocator.count()) {
          driver = await driverLocator.first().inputValue();
        }

        // ======================================
        // STORE
        // ======================================

        mappings.push({
          vehicle,
          driver,
          driverName,
          vehicleName,
        });

        console.log(`Mapping => Vehicle: ${vehicle} Driver: ${driver}`);
      }

      console.log("Dynamic Mappings:", mappings);

      return mappings;
    } catch (error) {
      console.log("Error getting mappings:", error.message);

      return [];
    }
  }

  // ================= CLOSE TRACE =================
  async closePriceTrace() {
    try {
      await this.safeClick(
        this.page.locator(locators.pricetraceCloseBtn),
        "Close Trace",
      );
    } catch {
      console.log("Using ESC to close trace");
      await this.page.keyboard.press("Escape");
    }
  }

  // ================= RETURN TO UW =================
  async goToUnderwriting() {
    await this.safeClick(
      this.page.locator(locators.underWritingBtn),
      "Underwriting Page",
    );

    await this.page.waitForLoadState("networkidle");
  }

  // =====================================================
  // SELECT RATED VEHICLE
  // =====================================================

  async selectRatedVehicle(vehicleNo) {
    try {
      console.log(`Selecting Vehicle: ${vehicleNo}`);

      // =========================================
      // CLICK VEHICLE DROPDOWN
      // =========================================

      const vehicleDropdown = this.page
        .locator("input")
        .filter({ hasText: "" })
        .nth(0);

      await vehicleDropdown.click();

      // =========================================
      // SELECT OPTION
      // =========================================

      await this.page.locator(`text="${vehicleNo}"`).last().click();

      console.log(`Vehicle Selected: ${vehicleNo}`);
    } catch (error) {
      console.log("Error selecting vehicle:", error.message);
    }
  }

  // ==========================================
  // For California Tracer
  // ==========================================

  async captureCaliforniaTraceValues() {
    console.log("Capturing California Trace...");

    try {
      const result = {};

      // ======================================
      // CALIFORNIA LABELS
      // ======================================

      const labels = [
        "Frequency factor",
        "Severity Factor",
        "Driving Record Points Factor",
        "Driver Class Factor",
        "Driver Experience",
        "Increased Limit/Deductible Factor",
        "Symbol Factor",
        "BI/PD Model Year Factor",
        "Policy Term Factor",
        "Vehicle Factor",
        "Mature Driver Improvement Course Discount",
        "Youthful Driver Training Discount",
        "Good Student Discount",
        "Renewal Discount",
        "Deductible Discount Endorsement Factor",
        "Business Use Surcharge",
        "Mileage Surcharge",
        "Salvaged vehicle surcharge",
        "Good Driver Discount",
        "Subtotal 1",
        "Subtotal 2",
        "Subtotal 3",
        "Subtotal 4",
        "Subtotal 5",
        "Subtotal 6",
        "Total",
      ];

      // ======================================
      // CALIFORNIA HEADERS
      // ======================================

      const headers = [
        "BI",
        "PD",
        "MEDPAY",
        "UMBI",
        "UMPD",
        "COLDW",
        "COMP",
        "COLL",
      ];

      // ======================================
      // GET ALL TRACE TABLES
      // ======================================

      const tables = this.page.locator(
        "table:has-text('MEDPAY'):has-text('COMP'):has-text('COLL')",
      );

      const tableCount = await tables.count();

      console.log(`California Trace Tables: ${tableCount}`);

      // ======================================
      // LOOP TABLES
      // ======================================

      for (let t = 0; t < tableCount; t++) {
        const section = tables.nth(t);

        let driverName = `Driver_${t + 1}`;
        let vehicleName = `Vehicle_${t + 1}`;

        try {
          const headerText = await section.locator("tr").nth(0).innerText();

          const lines = headerText
            .split("\n")
            .map((x) => x.trim())
            .filter(Boolean);

          if (lines.length >= 2) {
            driverName = lines[0];
            vehicleName = lines[1];
          }
        } catch {
          console.log("Unable to capture CA driver/vehicle");
        }

        console.log(`\n========================`);
        console.log(`Driver : ${driverName}`);
        console.log(`Vehicle: ${vehicleName}`);
        console.log(`========================`);

        if (!result[driverName]) {
          result[driverName] = {};
        }

        result[driverName][vehicleName] = {};

        // ======================================
        // PROCESS LABELS
        // ======================================

        for (const label of labels) {
          console.log(`\nProcessing: ${label}`);

          result[driverName][vehicleName][label] = {};

          // ==================================
          // FIND ROW
          // ==================================

          const row = section
            .locator(`tr`)
            .filter({
              has: this.page.locator(`td:text-is("${label}")`),
            })
            .first();

          if (!(await row.count())) {
            console.log(`Row not found: ${label}`);

            continue;
          }

          // ==================================
          // COVERAGE LOOP
          // ==================================

          for (let col = 2; col <= 9; col++) {
            const coverage = headers[col - 2];

            const cell = row.locator(`td:nth-child(${col})`);

            if (!(await cell.count())) continue;

            let rawText = (await cell.innerText())?.trim();

            if (!rawText || rawText === "-") {
              continue;
            }

            const lines = rawText
              .split("\n")
              .map((x) => x.trim())
              .filter(Boolean);

            let factor = null;
            let calc = null;

            // ==============================
            // FACTOR
            // ==============================

            if (lines.length >= 1) {
              const val = lines[0].match(/[\d,.]+/);

              if (val) {
                factor = Number(val[0].replace(/,/g, ""));
              }
            }

            // ==============================
            // CALC
            // ==============================

            if (lines.length >= 2) {
              const val = lines[1].match(/[\d,.]+/);

              if (val) {
                calc = Number(val[0].replace(/,/g, ""));
              }
            }

            // ==============================
            // STORE
            // ==============================

            result[driverName][vehicleName][label][coverage] = {
              factor,
              calc,
              raw: rawText,
            };

            console.log(
              `➡️ ${label} | ${coverage} | Factor=${factor} | Calc=${calc}`,
            );
          }

          // ==================================
          // REMOVE EMPTY LABEL
          // ==================================

          if (
            Object.keys(result[driverName][vehicleName][label]).length === 0
          ) {
            delete result[driverName][vehicleName][label];
          }
        }
      }

      console.log("California Trace Capture Completed");

      return result;
    } catch (error) {
      console.log("Error capturing California trace:", error.message);

      return null;
    }
  }
}
