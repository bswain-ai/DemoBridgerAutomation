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
      // ================= GO TO BASE URL =================
      await page.goto(credentials.baseUrl, { waitUntil: "networkidle" });

      // ================= PORTAL CLICK =================
      if (role === "agent") {
        const agentBtn = page.locator(locators.agentPortal);

        await expect(agentBtn).toBeVisible({ timeout: 20000 });
        await agentBtn.click();
      } else {
        const uwBtn = page.locator(locators.underwriterPortal);
        await expect(uwBtn).toBeVisible({ timeout: 20000 });
        await uwBtn.click();
      }

      // ================= WAIT LOGIN FORM =================
      const userInput = page.locator(locators.userNameLoc);

      try {
        await userInput.waitFor({ state: "visible", timeout: 10000 });
      } catch {
        console.log("Login page not loaded correctly. Reloading...");

        await page.goto(credentials.baseUrl, { waitUntil: "networkidle" });

        const agentBtn = page.locator(locators.agentPortal);
        await expect(agentBtn).toBeVisible({ timeout: 20000 });
        await agentBtn.click();

        await userInput.waitFor({ state: "visible", timeout: 20000 });
      }

      // ================= ENTER USERNAME =================
      await userInput.clear();
      await userInput.fill(user.username);

      // ================= ENTER PASSWORD =================
      const passInput = page.locator(locators.passwordLoc);
      await passInput.clear();
      await passInput.fill(user.password);

      // ================= SUBMIT =================
      await page.locator(locators.submitButton).click();

      // ================= SUCCESS CHECK =================
      await expect(page.locator(locators.bridgerLogo)).toBeVisible({
        timeout: 20000,
      });

      console.log(`${role.toUpperCase()} login successful`);
      return;
    } catch (error) {
      console.log("Login failed, retrying...");

      if (attempt === 2) {
        throw new Error(`Login failed after 3 attempts for ${role}`);
      }

      await page.waitForTimeout(3000);
    }
  }
}
