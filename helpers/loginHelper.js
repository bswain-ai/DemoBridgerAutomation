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

  // Navigate once
  await page.goto(credentials.baseUrl, { waitUntil: "networkidle" });

  for (let attempt = 0; attempt < 3; attempt++) {
    console.log(`Login Attempt ${attempt + 1}`);

    try {
      // ================= PORTAL CLICK =================
      if (role === "agent") {
        const agentBtn = page.locator(locators.agentPortal);

        await expect(agentBtn).toBeVisible({ timeout: 20000 });
        await expect(agentBtn).toBeEnabled({ timeout: 20000 });
        await agentBtn.click();
      } else {
        await page
          .locator(locators.underwriterPortal)
          .waitFor({ timeout: 50000 });
        await page.locator(locators.underwriterPortal).click();
      }

      // ================= USERNAME =================
      const userInput = page.locator(locators.userNameLoc);
      await userInput.waitFor({ state: "visible", timeout: 50000 });
      await userInput.clear();
      await userInput.fill(user.username);

      // ================= PASSWORD =================
      const passInput = page.locator(locators.passwordLoc);
      await passInput.waitFor({ state: "visible" });
      await passInput.clear();
      await passInput.fill(user.password);

      // ================= SUBMIT =================
      await page.locator(locators.submitButton).click();

      // ================= SUCCESS CHECK =================
      await expect(page.locator(locators.bridgerLogo)).toBeVisible({
        timeout: 20000,
      });

      console.log(`${role.toUpperCase()} login successful`);
      return; // EXIT on success
    } catch (error) {
      console.log("Login failed, retrying...");

      if (attempt === 2) {
        throw new Error(`Login failed after 3 attempts for ${role}`);
      }

      await page.waitForTimeout(3000);
    }
  }
}
