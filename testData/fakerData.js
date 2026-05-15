import { faker } from "@faker-js/faker";

export class FakerData {
  // =====================================================
  // FIRST NAME
  // =====================================================
  static getFirstName() {
    return faker.person.firstName();
  }

  // =====================================================
  // LAST NAME
  // =====================================================
  static getLastName() {
    return faker.person.lastName();
  }

  // =====================================================
  // SAFE / INVALID PHONE NUMBER
  // =====================================================
  static getPhone() {
    return faker.helpers.replaceSymbols("555-###-####");
  }

  // =====================================================
  // SAFE / INVALID EMAIL
  // =====================================================
  static getEmail() {
    return faker.internet.exampleEmail();
  }
  // =====================================================
  // GENERATE NAMED INSURED
  // =====================================================
  static generateNamedInsured() {
    const firstName = this.getFirstName();
    const lastName = this.getLastName();

    return {
      firstName,
      lastName,
      phone: this.getPhone(),
      email: this.getEmail(firstName, lastName),
    };
  }
}
