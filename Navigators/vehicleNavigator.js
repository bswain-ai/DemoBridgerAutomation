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
   *   Both "Update" (first vehicle) and "+ Add vehicle" (additional vehicles)
   *   use the same [data-test="add-vehicle-button"] element — locators.addVehicleBtn.
   *   We always click the same locator regardless of vehicleIndex.
   *
   * Next button behavior:
   *   Only clicked when vehicleIndex === totalVehicles - 1 (last vehicle).
   *   Clicking Next after an intermediate vehicle would navigate away from
   *   the vehicles page before subsequent vehicles have been entered.
   *
   * @param {object} vehicle       - One entry from buildRaterData().vehicles[]
   * @param {number} vehicleIndex  - 0-based position of this vehicle in the loop
   * @param {number} totalVehicles - Total number of vehicles on this policy
   */
  async addVehicle(vehicle, vehicleIndex, totalVehicles) {

    // ─── OPEN VEHICLE DRAWER ────────────────────────────────────────────────
    // Same button for "Update" (vehicle 1) and "+ Add vehicle" (vehicles 2–8)
    await this.page.locator(locators.addVehicleBtn).click({ timeout: 10000 });

    // Wait for the vehicle year dropdown to be visible before clicking it.
    // For the second vehicle, the "+ Add vehicle" button triggers a drawer
    // open animation. Without this wait, vehicleYear.click() fires before
    // the drawer is fully interactive, causing a timeout or stale-element error.
    await this.page
      .locator(locators.vehicleYear)
      .waitFor({ state: "visible", timeout: 10000 });

    // ─── VEHICLE YEAR ───────────────────────────────────────────────────────
    // year comes from "V{n} Year" column via buildRaterData()
    await this.page.locator(locators.vehicleYear).click({ timeout: 10000 });

    await this.page
      .locator(locators.selectYear(vehicle.year))
      .click({ timeout: 10000 });

    // ─── VIN SEARCH ─────────────────────────────────────────────────────────
    // Triggers the VIN lookup API; waits for Make field to auto-populate
    await this.searchVIN(vehicle.vin);

    // ─── REMAINING VEHICLE FIELDS ───────────────────────────────────────────
    await this.fillVehicleDetails(vehicle);

    // ─── SAVE ───────────────────────────────────────────────────────────────
    await this.page.locator(locators.saveButton).click({ timeout: 10000 });

    // Confirm save succeeded — VIN card visible in list means drawer closed cleanly.
    // Not waiting for saveButton hidden: a validation error keeps the drawer open
    // indefinitely, masking the real failure. 30s covers slow API responses.
    await expect(
      this.page.locator(locators.addedVehicle(vehicle.vin))
    ).toBeVisible({ timeout: 30000 });

    // ─── ADVANCE PAGE (last vehicle only) ───────────────────────────────────
    // Intermediate vehicles: save and stay on the vehicles page.
    // Last vehicle: click Next to transition to the drivers page.
    if (vehicleIndex === totalVehicles - 1) {
      await this.page.locator(locators.nextButton).click({ timeout: 10000 });

      // Wait for the drivers page heading to confirm navigation succeeded
      await expect(this.page.locator(locators.insuredRated)).toBeVisible({
        timeout: 10000,
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VIN SEARCH
  // Clears the VIN field, types the VIN character-by-character (delay avoids
  // race conditions), clicks Search, then waits for the Make autocomplete
  // label to appear — which confirms the VIN lookup returned a result.
  // ─────────────────────────────────────────────────────────────────────────
  async searchVIN(vin) {
    const vinInput        = this.page.locator(locators.vehicleVin);
    const searchVinButton = this.page.locator(locators.searchVinBtn);
    const makeField       = this.page.locator(locators.filledMakeTextBox);

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
    await this.page.locator(locators.vehicleUse)
      .waitFor({ state: "visible", timeout: 10000 });
    await this.page.locator(locators.vehicleUse)
      .selectOption({ label: vehicle.vehicleUse });

    // Purchase Date — from "V{n} Purchase Date" column (UI-only)
    await this.page.locator(locators.purchasedDate)
      .fill(vehicle.purchaseDate ? vehicle.purchaseDate.toString() : "");

    // Purchase Status — "New" or "Used" from "V{n} Purchase Status" column
    await this.page.locator(locators.purchasedStatus)
      .selectOption({ label: vehicle.purchaseStatus });

    // Vehicle Damage — e.g. "None", "Minor", "Major" from "V{n} Veh Damage"
    await this.page.locator(locators.damageStatus)
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
