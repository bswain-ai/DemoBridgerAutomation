import { expect } from "@playwright/test";
import { locators } from "../Locators/selectors.js";

export async function searchPolicy(page, policyNumber) {
  console.log(`Searching Policy: ${policyNumber}`);

  const searchBox = page.locator(locators.searchTextBox);
  const policyLists = page.locator(locators.policyList).first();

  // Wait for page elements
  await expect(searchBox).toBeVisible({ timeout: 50000 });
  await expect(policyLists).toBeVisible({ timeout: 50000 });

  // Clear existing value properly
  await searchBox.click();
  await searchBox.click();
  await searchBox.fill("");

  // Type like real user
  await searchBox.pressSequentially(policyNumber, { delay: 100 });

  // Dynamic search result
  const policyResult = page.locator(locators.searchPolicy(policyNumber));

  // Wait until result appears
  await expect(policyResult).toBeVisible({ timeout: 30000 });

  // Scroll into view if needed
  await policyResult.scrollIntoViewIfNeeded();

  // Safe click
  await policyResult.click({ force: true });

  // Better stability than networkidle alone
  await page.waitForLoadState("domcontentloaded");

  console.log(`Opened Policy: ${policyNumber}`);
}
