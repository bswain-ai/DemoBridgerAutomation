// services/policyService.js

import { locators } from "../Locators/selectors.js";

export class PolicyService {
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

  async capturePolicyHeader() {
    return {
      policyNo: await this.getText(locators.policyNumber),
      policyholder: await this.getText(locators.insuredName),
      policyTerm: await this.getText(locators.policyTerm),
      paymentPlan: await this.getText(locators.paymentPlan),
    };
  }
}