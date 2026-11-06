import { test } from "@playwright/test";
import * as dotenv from "dotenv";

import { login } from "../helpers/loginHelper.js";
import { searchPolicy } from "../helpers/policySearchHelper.js";
import { UwTraceHelper } from "../helpers/uwTraceHelper.js";
import { locators } from "../Locators/selectors.js";

dotenv.config();

test("Get Policy Premium From Agent UI", async ({ page }) => {

  const policyNumber = process.env.UI_PREMIUM_POLICY_NUMBER;

  if (!policyNumber) {
    throw new Error("UI_PREMIUM_POLICY_NUMBER is missing in .env");
  }

  console.log(`Policy Number: ${policyNumber}`);

  // Login as Agent
  await login(page, "underwriter");

  const traceHelper = new UwTraceHelper(page);

  // Search Policy
  await searchPolicy(page, policyNumber);

  // ======================================
  // OPEN COVERAGE SUMMARY
  // ======================================

  await traceHelper.openCoverageSummary();

  // Wait for Coverage Summary page
  await page.waitForSelector(locators.coveragePremium, {
    timeout: 60000,
  });

  // Read Premium
  const premium = (
    await page.locator(locators.coveragePremium).textContent()
  )?.trim();

  console.log("================================");
  console.log("Policy Number :", policyNumber);
  console.log("Coverage Premium :", premium);
  console.log("================================");

  console.log(
  "RESULT_JSON:" +
  JSON.stringify({
    success: true,
    policyNumber,
    premium
  })
);
});
