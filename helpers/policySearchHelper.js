import { expect } from "@playwright/test";
import { locators } from "../Locators/selectors.js";

export async function searchPolicy(page, policyNumber) {
  console.log(`Searching Policy: ${policyNumber}`);

  const searchBox = page.locator(locators.searchTextBox);
  const policyLists = page.locator(locators.policyList).first();

  await expect(searchBox).toBeVisible({ timeout: 50000 });
  await expect(policyLists).toBeVisible({ timeout: 50000 });

  await searchBox.clear();

  // type policy number like user
  await searchBox.pressSequentially(policyNumber);

  const policyResult = page.locator(locators.searchPolicy(policyNumber));

  await expect(policyResult).toBeVisible({ timeout: 20000 });

  await policyResult.click();

  await page.waitForLoadState("networkidle");

  console.log(`Opened Policy: ${policyNumber}`);
}
