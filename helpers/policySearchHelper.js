import { expect } from "@playwright/test";
import { locators } from "../Locators/selectors.js";

export async function searchPolicy(page, policyNumber) {
  console.log(`Searching Policy: ${policyNumber}`);

  const searchBox = page.locator(locators.searchTextBox);
  const policyLists = page.locator(locators.policyList).first();

  // Wait for page elements
  await expect(searchBox).toBeVisible({ timeout: 50000 });
  await expect(policyLists).toBeVisible({ timeout: 50000 });

  // Clear previous search
  await searchBox.click();
  await searchBox.press("Control+A");
  await searchBox.press("Backspace");

  // Type policy number
  await searchBox.pressSequentially(policyNumber, { delay: 100 });

  // Wait for loader (only if it exists)
  const loader = page.locator(locators.loader);

  if (await loader.count()) {
    await loader.waitFor({
      state: "hidden",
      timeout: 30000,
    });
  }

  // Create locator AFTER typing
  const policyResult = page.locator(locators.searchPolicy(policyNumber));

  // Wait for result
  await expect(policyResult).toBeVisible({ timeout: 30000 });

  // Open policy
  await policyResult.scrollIntoViewIfNeeded();
  await policyResult.click();

  await page.waitForLoadState("domcontentloaded");

  console.log(`Opened Policy: ${policyNumber}`);
}
