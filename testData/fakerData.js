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
  // Prevents real customer contact
  // Example: 555-010-1234
  // =====================================================
  static getPhone() {
    const last4 = faker.number.int({
      min: 1000,
      max: 9999,
    });

    return `555-010-${last4}`;
  }

  // =====================================================
  // SAFE / INVALID EMAIL
  // Uses reserved testing domain
  // =====================================================
  static getEmail(firstName, lastName) {

    const safeFirstName = firstName
      .replace(/[^a-zA-Z]/g, "")
      .toLowerCase();

    const safeLastName = lastName
      .replace(/[^a-zA-Z]/g, "")
      .toLowerCase();

    return `autotest.${safeFirstName}.${safeLastName}@example.com`;
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