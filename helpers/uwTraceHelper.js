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
  async openViewPriceTrace() {
    await this.safeClick(
      this.page.locator(locators.viewPriceTraceBtn),
      "View Price Trace",
    );

    await this.page.waitForTimeout(2000);

    return await this.captureAllTraceValues();
  }

  // ================= CAPTURE FULL PRICE TRACE =================
  async captureAllTraceValues() {
    console.log("📊 Capturing Selected Price Trace Values...");

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
        "Rollover Discount",
        "Sum of discounts",
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

      for (const label of labels) {
        console.log(`\n🔹 Processing: ${label}`);
        result[label] = {};

        // ✅ Strong locator
        const row = this.page
          .locator("tr", {
            has: this.page.locator(`td:has-text("${label}")`),
          })
          .first();

        if (!(await row.count())) {
          console.log(`❌ Row not found: ${label}`);
          continue;
        }

        // ===== LOOP ALL COLUMNS =====
        for (let col = 2; col <= 13; col++) {
          const coverage = headers[col - 2];
          const cell = row.locator(`td:nth-child(${col})`);

          if (!(await cell.count())) continue;

          // ================= GET RAW TEXT =================
          let rawText = (await cell.innerText())?.trim();

          //console.log("rawText = ", rawText);

          if (!rawText || rawText === "-" || rawText.includes("Policy")) {
            continue; // MOVE TO NEXT CELL (THIS IS KEY)
          }

          // ================= FACTOR EXTRACTION =================
          let factorValue = null;

          // 🔹 Step 1: Try extracting from NON-RED spans (best for Anti-Theft)
          const spans = cell.locator("span");
          let spanText = null;

          if (await spans.count()) {
            const spanCount = await spans.count();

            for (let i = 0; i < spanCount; i++) {
              const span = spans.nth(i);
              const text = (await span.textContent())?.trim();
              const style = await span.getAttribute("style");

              // Ignore red
              if (style && style.includes("red")) continue;

              // Only numeric
              if (text && /^\d+(\.\d+)?$/.test(text)) {
                spanText = text;
                break;
              }
            }
          }

          // 🔹 Step 2: Decide source (span preferred, fallback to rawText)
          const finalText = spanText || rawText;

          // 🔹 Step 3: Extract numeric value
          if (finalText && finalText !== "-" && finalText.trim() !== "") {
            const match = finalText.match(/[\d,.]+/);
            if (match && match[0].trim() !== "") {
              factorValue = match[0].replace(/,/g, "");
            }
          }

          // ================= CALCULATION (RED VALUE) =================
          let calcValue = null;

          const redSpan = cell.locator("span[style*='red']");

          if (await redSpan.count()) {
            const raw = (await redSpan.first().textContent())?.trim();

            if (raw && /^[\d,.]+$/.test(raw)) {
              calcValue = raw.replace(/,/g, "");
            }
          }

          // ================= STORE =================
          if (factorValue !== null || calcValue !== null) {
            result[label][coverage] = {
              factor: factorValue ? Number(factorValue) : null,
              calc: calcValue ? Number(calcValue) : null,
            };
            console.log(
              `➡️ ${label} | ${coverage} | Factor: ${
                factorValue && factorValue !== "" ? factorValue : "N/A"
              } | Calc: ${calcValue ?? "N/A"}`,
            );
          }
        }

        // Row-level fallback check
        if (Object.keys(result[label]).length === 0) {
          console.log(`${label} has no valid data (empty or '-')`);
        }
      }

      console.log("\n Price Trace Capture Completed");

      return result;
    } catch (error) {
      console.log("Error while capturing trace:", error.message);
      return null;
    }
  }

  // ================ CAPTURE DATA ======================
  // async captureBaseData() {
  //   const baseData = {};

  //   const rows = await this.page.locator("text=Base").locator("..").all();

  //   for (const row of rows) {
  //     const text = await row.textContent();

  //     const match = text.match(
  //       /Base\s*\|\s*(\w+)\s*\|\s*Factor:\s*([\d.]+)\s*\|\s*Calc:\s*([\d.]+)/,
  //     );

  //     if (match) {
  //       const coverage = match[1].toUpperCase();
  //       const factor = parseFloat(match[2]);
  //       const calc = parseFloat(match[3]);

  //       baseData[coverage] = { factor, calc };
  //     }
  //   }

  //   console.log("✅ Parsed Base Data:", baseData);

  //   return baseData;
  // }
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
}
