import { expect } from "@playwright/test";
import { credentials } from "../config/credentials.js";
import { locators } from "../Locators/selectors.js";

export async function login(page, role = "agent") {
  if (!["agent", "underwriter"].includes(role)) {
    throw new Error("Role must be agent or underwriter");
  }

  const user = credentials[role] || {
    username: credentials.username,
    password: credentials.password,
  };

  console.log("Logging in as:", role, user.username);

  for (let attempt = 0; attempt < 3; attempt++) {
    console.log(`Login Attempt ${attempt + 1}`);

    try {
      // Always start fresh
      await page.goto(credentials.baseUrl, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });

      await page.waitForLoadState("networkidle");

      // Portal selection
      const portalBtn =
        role === "agent"
          ? page.locator(locators.agentPortal)
          : page.locator(locators.underwriterPortal);

      await portalBtn.waitFor({
        state: "visible",
        timeout: 30000,
      });

      await portalBtn.click();

      // Login form
      const userInput = page.locator(locators.userNameLoc);
      const passInput = page.locator(locators.passwordLoc);

      await userInput.waitFor({
        state: "visible",
        timeout: 30000,
      });

      await userInput.fill("");
      await userInput.fill(user.username);

      await passInput.fill("");
      await passInput.fill(user.password);

      await page.locator(locators.submitButton).click();

      await expect(page.locator(locators.bridgerLogo)).toBeVisible({
        timeout: 30000,
      });

      console.log(`${role.toUpperCase()} login successful`);
      return;
    } catch (error) {
      console.log(`Login Attempt ${attempt + 1} failed: ${error.message}`);

      if (attempt === 2) {
        throw new Error("LOGIN_FAILED");
      }

      await page.context().clearCookies();

      await page.waitForTimeout(5000);
    }
  }
}
