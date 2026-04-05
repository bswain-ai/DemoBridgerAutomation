import { test } from "@playwright/test";
import { login } from "../helpers/loginHelper.js";
import { searchPolicy } from "../helpers/policySearchHelper.js";
import { locators } from "../Locators/selectors.js";

test("Inspect Vehicle Discount row DOM", async ({ page }) => {
  test.setTimeout(120000);

  await login(page, "underwriter");
  await searchPolicy(page, "TXRPBG-2684563-00");

  await page.locator(locators.coverageSummaryBtn).click();
  await page.locator(locators.coverageSummaryData).first().waitFor({ state: "visible", timeout: 15000 });

  await page.locator(locators.viewPriceTraceBtn).click();
  await page.waitForTimeout(3000);

  const allRows = page.locator("tr");
  const count = await allRows.count();
  console.log("Total tr rows:", count);

  for (let i = 0; i < count; i++) {
    const cells = allRows.nth(i).locator("td");
    const cellCount = await cells.count();
    if (cellCount === 0) continue;
    const firstCellText = (await cells.first().innerText()).trim();
    if (!firstCellText) continue;

    if (
      firstCellText.toLowerCase().includes("vehicle") ||
      firstCellText.toLowerCase().includes("discount") ||
      firstCellText.toLowerCase().includes("sum of")
    ) {
      const rowCells = [];
      for (let c = 0; c < Math.min(cellCount, 6); c++) {
        const ct = (await cells.nth(c).innerText()).trim().replace(/\n/g, "/");
        rowCells.push("col" + (c+1) + ":\"" + ct + "\"");
      }
      console.log("TR[" + i + "] " + rowCells.join(" | "));
    }
  }
});
