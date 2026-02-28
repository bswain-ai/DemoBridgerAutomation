// data/testDataBuilder.js

import { FakerData } from "./fakerData.js";
import { StaticData } from "./staticData.js";

export class TestDataBuilder {

  constructor() {
    this.data = {};
  }

  withRandomInsured() {
    const firstName = FakerData.getFirstName();
    const lastName = FakerData.getLastName();

    this.data.insured = {
      firstName,
      lastName,
      phone: FakerData.getPhone(),
      email: FakerData.getEmail(firstName, lastName),
    };

    return this;
  }

  withAddressFromExcel(policyData) {
    this.data.address = {
      street: policyData.Address,
    };

    return this;
  }

  withVehicleFromExcel(policyData) {
    this.data.vehicle = {
      vin: policyData.VIN,
      year: policyData.Vyear,
      cost: policyData.Vcost,
      use: policyData.Vuse,
    };

    return this;
  }

  withDriverFromExcel(policyData) {
    this.data.driver = {
      gender: policyData.Dgender,
      maritalStatus: policyData.DMaritalStatus,
      dob: policyData.Ddob,
      licenseNo: policyData.LicenseNo,
      licenseStatus: policyData.DLicenseStatus,
      licenseYears: policyData.DLicenseYears,
      licenseMonths: policyData.DLicenseMonths,
      occupation: policyData.DOccupation,
    };

    return this;
  }

  withCoveragesFromExcel(policyData) {
    this.data.coverages = {
      ...policyData
    };

    return this;
  }

  build() {
    return this.data;
  }
}