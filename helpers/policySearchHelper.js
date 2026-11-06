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

  // Wait for loader if present
  const loader = page.locator(locators.loader);

  if (await loader.count()) {
    await loader.waitFor({
      state: "hidden",
      timeout: 30000,
    });
  }

  // ---------------------------------------------
  // Find policy with or without -00 suffix
  // ---------------------------------------------

  const basePolicyNumber = policyNumber.replace(/-00$/, "");

  const policyResult = page.getByText(
    new RegExp(
      `Policy\\s*-\\s*${basePolicyNumber}(?:-00)?`
    )
  ).first();

  // Wait for result
  await expect(policyResult).toBeVisible({
    timeout: 30000,
  });

  console.log(
    `Policy result found: ${await policyResult.textContent()}`
  );

  // Open policy
  await policyResult.scrollIntoViewIfNeeded();
  await policyResult.click();

  await page.waitForLoadState("domcontentloaded");

  console.log(`Opened Policy: ${policyNumber}`);
}