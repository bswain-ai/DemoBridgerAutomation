import { locators } from "../Locators/selectors.js";
import { expect } from "@playwright/test";

export class VehicleNavigator {
  constructor(page) {
    this.page = page;
  }

  async addVehicle(policyData) {
    await this.page.locator(locators.addVehicleBtn).click({ timeout: 10000 });

    await this.page.locator(locators.vehicleYear).click({ timeout: 10000 });

    await this.page
      .locator(locators.selectYear(policyData.VehYear))
      .click({ timeout: 10000 });

    await this.searchVIN(policyData.VIN);

    await this.fillVehicleDetails(policyData);

    await this.page.locator(locators.saveButton).click({ timeout: 10000 });

    await expect(
      this.page.locator(locators.addedVehicle(policyData.VIN)),
    ).toBeVisible();

    await this.page.locator(locators.nextButton).click({ timeout: 10000 });

    await expect(this.page.locator(locators.insuredRated)).toBeVisible({
      timeout: 10000,
    });
  }

  /*
  async searchVIN(vin) {
    const vinInput = this.page.locator(locators.vehicleVin);
    const searchVinButton = this.page.locator(locators.searchVinBtn);
    const makeField = this.page.locator(locators.filledMakeTextBox);
    const loader = this.page.locator(locators.loader);

    for (let i = 0; i < 5; i++) {
      console.log(`VIN Search Attempt: ${i + 1}`);

      if (await loader.isVisible().catch(() => false)) {
        await loader.waitFor({ state: "hidden", timeout: 60000 });
      }

      await vinInput.fill("");
      await vinInput.type(vin.toString(), { delay: 300 });

      await expect(searchVinButton).toBeEnabled({ timeout: 10000 });
      await searchVinButton.click();

      try {
        await loader
          .waitFor({ state: "visible", timeout: 50000 })
          .catch(() => {});
        await loader.waitFor({ state: "hidden", timeout: 60000 });

        await expect(makeField).toBeVisible({ timeout: 30000 });

        const makeValue = await makeField.inputValue();

        if (makeValue && makeValue.trim() !== "") {
          console.log("VIN loaded successfully");
          return;
        }
      } catch {
        if (i === 4) {
          throw new Error("VIN search failed after multiple attempts");
        }

        await this.page.waitForTimeout(2000);
      }
    }
  }
    */

  async searchVIN(vin) {
    const vinInput = this.page.locator(locators.vehicleVin);
    const searchVinButton = this.page.locator(locators.searchVinBtn);
    const makeField = this.page.locator(locators.filledMakeTextBox);

    await vinInput.fill("");
    await vinInput.type(vin.toString(), { delay: 300 });
    await expect(searchVinButton).toBeEnabled({ timeout: 10000 });
    await searchVinButton.click();
    await expect(makeField).toBeVisible({ timeout: 30000 });
  }

  async fillVehicleDetails(policyData) {
    const mrspCost = this.page.locator(locators.vehicleCost);
    await expect(mrspCost).toBeVisible({
      timeout: 10000,
    });
    await this.page
      .locator(locators.vehicleCost)
      .fill(policyData["Veh MSRP/Cost New"]?.toString() || "");

    await this.page
      .locator(locators.vehicleUse)
      .selectOption({ label: policyData.VehUse });

    const purchaseDate = policyData["PurchaseDate"];

    await this.page
      .locator(locators.purchasedDate)
      .fill(purchaseDate ? purchaseDate.toString() : "");

    await this.page
      .locator(locators.purchasedStatus)
      .selectOption({ label: policyData.PurchaseStatus });

    await this.page
      .locator(locators.damageStatus)
      .selectOption({ label: policyData.VehDamage });

    const salvageValue = Number(policyData["Salvage"]) || 0;

    if (salvageValue === 1) {
      await this.page.getByText("Yes", { exact: true }).click();
    } else {
      await this.page.getByText("No", { exact: true }).click();
    }
  }

  async openFirstVehicleDetails() {
    await this.page.locator(locators.vehiclesBtn).click();
    await this.page.locator(locators.addedfirstVehicle).click();
    await this.page.locator(locators.vehicleYear).waitFor();
  }
}
