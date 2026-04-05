import { locators } from "../Locators/selectors.js";

export class PremiumService {
  constructor(page) {
    this.page = page;
  }

  async getText(locator) {
    try {
      const txt = await this.page.locator(locator).textContent({
        timeout: 5000,
      });
      return txt?.trim() ?? "";
    } catch {
      return "";
    }
  }

  async capturePremiums(policyData) {
    return {
      totalPremium: await this.getText(locators.coveragePremium),
      BiPremium: await this.getText(locators.BiPremium),
      PdPremium: await this.getText(locators.PdPremium),

      PipPremium:
        policyData.PIPSection === 1
          ? await this.getText(locators.PipPremium)
          : "",

      MedpayPremium:
        policyData.MEDPAY === 1
          ? await this.getText(locators.medpayPremium)
          : "",

      UmbiPremium:
        policyData.UMBI === 1
          ? await this.getText(locators.umbiPremium)
          : "",

      UimbiPremium:
        policyData.UMBI === 1
          ? await this.getText(locators.uimbiPremium)
          : "",

      UmpdPremium:
        policyData.UMPD === 1
          ? await this.getText(locators.umpdPremium)
          : "",

      UimpdPremium:
        policyData.UMPD === 1
          ? await this.getText(locators.uimpdPremium)
          : "",

      CompPremium:
        policyData.CompCollSection === 1
          ? await this.getText(locators.compPremium)
          : "",

      CollPremium:
        policyData.CompCollSection === 1
          ? await this.getText(locators.collPremium)
          : "",

      RentalPremium:
        policyData["Rental Reimbursement"] === 1
          ? await this.getText(locators.rentalPremium)
          : "",

      RoadPremium:
        policyData["Roadside Assistance"] === 1
          ? await this.getText(locators.roadPremium)
          : "",
    };
  }

  // drivers[] is the structured array from buildRaterData() — one entry per D{n} slot.
  // Default to [] so existing callers that pass only policyData don't break.
  async captureFees(policyData, drivers = []) {
    return {
      SR22Fee:
        // SR22 fee is displayed if ANY driver on the policy has sr22 = 1.
        // Old code read flat policyData.SR22 which no longer exists in the
        // multi-template — it always evaluated false, so SR22Fee was always "".
        drivers.some((d) => d.sr22 === 1)
          ? await this.getText(locators.frFee)
          : "",
      fraudFee: await this.getText(locators.fraudFee),
      policyFee: await this.getText(locators.policyFee),
    };
  }
}