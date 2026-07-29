import { locators } from "../Locators/selectors.js";
import { expect } from "@playwright/test";

export class VehicleNavigator {
  constructor(page) {
    this.page = page;
  }

  /**
   * Add or update one vehicle on the quote.
   *
   * Button behavior (confirmed from UI screenshots):
   * Both "Update" (first vehicle) and "+ Add vehicle" (additional vehicles)
   * use the same [data-test="add-vehicle-button"] element.
   *
   * Improvements:
   * - Wait for page to stabilize before clicking.
   * - Wait for button to be visible & enabled.
   * - Scroll button into view.
   * - Wait for drawer animation.
   * - Wait for save to complete.
   * - Wait for Next button before navigation.
   */
  async addVehicle(vehicle, vehicleIndex, totalVehicles) {
    const addVehicleBtn = this.page.locator(locators.addVehicleBtn);

    // Wait until the vehicle page is fully rendered.
    await this.page.waitForLoadState("networkidle");

    await expect(addVehicleBtn).toBeVisible({
      timeout: 30000,
    });

    await expect(addVehicleBtn).toBeEnabled({
      timeout: 30000,
    });

    await addVehicleBtn.scrollIntoViewIfNeeded();

    console.log(`Adding Vehicle ${vehicleIndex + 1}`);

    await addVehicleBtn.click();

    // Wait until the drawer is completely opened.
    await expect(this.page.locator(locators.vehicleYear)).toBeVisible({
      timeout: 30000,
    });

    // ================= Vehicle Year =================

    await this.page.locator(locators.vehicleYear).click();

    await this.page.locator(locators.selectYear(vehicle.year)).click();

    // ================= VIN =================

    await this.searchVIN(vehicle.vin);

    // ================= Remaining Details =================

    await this.fillVehicleDetails(vehicle);

    // ================= Save =================

    const saveButton = this.page.locator(locators.saveButton);

    await expect(saveButton).toBeVisible({
      timeout: 30000,
    });

    await expect(saveButton).toBeEnabled({
      timeout: 30000,
    });

    await saveButton.click();

    // Wait until saved vehicle appears on page.
    await expect(
      this.page.locator(locators.addedVehicle(vehicle.vin)),
    ).toBeVisible({
      timeout: 30000,
    });

    // Wait until drawer disappears completely.
    await expect(saveButton).toBeHidden({
      timeout: 30000,
    });

    console.log(`Vehicle ${vehicleIndex + 1} saved successfully.`);

    // ================= Next Page =================

    if (vehicleIndex === totalVehicles - 1) {
      const nextButton = this.page.locator(locators.nextButton);

      await expect(nextButton).toBeVisible({
        timeout: 30000,
      });

      await expect(nextButton).toBeEnabled({
        timeout: 30000,
      });

      await nextButton.click();

      await expect(this.page.locator(locators.insuredRated)).toBeVisible({
        timeout: 30000,
      });

      console.log("Navigated to Drivers page.");
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VIN SEARCH
  // Clears the VIN field, types the VIN character-by-character (delay avoids
  // race conditions), clicks Search, then waits for the Make autocomplete
  // label to appear — which confirms the VIN lookup returned a result.
  // ─────────────────────────────────────────────────────────────────────────
  async searchVIN(vin) {
    const vinInput = this.page.locator(locators.vehicleVin);
    const searchVinButton = this.page.locator(locators.searchVinBtn);
    const makeField = this.page.locator(locators.filledMakeTextBox);

    await vinInput.fill("");
    await vinInput.type(vin.toString(), { delay: 300 });
    await expect(searchVinButton).toBeEnabled({ timeout: 10000 });
    await searchVinButton.click();
    // filledMakeTextBox uses data-shrink='true' — only visible after VIN resolves
    await expect(makeField).toBeVisible({ timeout: 30000 });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VEHICLE DETAIL FIELDS
  // Receives the structured vehicle object from buildRaterData().
  // All properties map directly to "V{n} ..." columns in TC_Template.
  // ─────────────────────────────────────────────────────────────────────────
  async fillVehicleDetails(vehicle) {
    // Wait for MSRP field to appear — signals the form is fully rendered
    const msrpField = this.page.locator(locators.vehicleCost);
    await expect(msrpField).toBeVisible({ timeout: 10000 });

    // MSRP / Cost New — from "V{n} MSRP/Cost New" column (UI-only, not rated)
    await msrpField.fill(vehicle.msrpCostNew?.toString() || "");

    // Vehicle Use — normalizeVehUse() in raterHelper maps "Business" →
    // "BusinessUse" for the rater, but the UI dropdown uses the original
    // label values from the application. vehicleUse stores the normalized
    // value; pass it directly and ensure the template uses the UI label.
    //
    // Explicit waitFor before selectOption: for the second (and subsequent)
    // vehicles, the drawer DOM may reuse existing nodes — the MSRP field
    // becomes visible before Vehicle Use re-renders. Without this wait,
    // selectOption fires on a stale or not-yet-ready element, silently
    // leaving the dropdown at its default value.
    await this.page
      .locator(locators.vehicleUse)
      .waitFor({ state: "visible", timeout: 10000 });
    await this.page
      .locator(locators.vehicleUse)
      .selectOption({ label: vehicle.vehicleUse });

    // Purchase Date — from "V{n} Purchase Date" column (UI-only)
    await this.page
      .locator(locators.purchasedDate)
      .fill(vehicle.purchaseDate ? vehicle.purchaseDate.toString() : "");

    // Purchase Status — "New" or "Used" from "V{n} Purchase Status" column
    await this.page
      .locator(locators.purchasedStatus)
      .selectOption({ label: vehicle.purchaseStatus });

    // Vehicle Damage — e.g. "None", "Minor", "Major" from "V{n} Veh Damage"
    await this.page
      .locator(locators.damageStatus)
      .selectOption({ label: vehicle.vehDamage });

    // Salvage title flag — use dedicated data-test selectors; avoids unscoped
    // getByText("Yes"/"No") which matched Named Owner radio buttons still in DOM.
    // (from "V{n} Salvage" column, coerced to number by buildRaterData)
    if (vehicle.salvage === 1) {
      await this.page.locator(locators.vehicleSalvageYes).click();
    } else {
      await this.page.locator(locators.vehicleSalvageNo).click();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // OPEN FIRST VEHICLE DETAILS
  // Used by policyValidation.spec.js to navigate into the first vehicle
  // card on the policy summary page for post-bind validation.
  // ─────────────────────────────────────────────────────────────────────────
  async openFirstVehicleDetails() {
    await this.page.locator(locators.vehiclesBtn).click();
    await this.page.locator(locators.addedfirstVehicle).click();
    await this.page.locator(locators.vehicleYear).waitFor();
  }
}
