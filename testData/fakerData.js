import { faker } from "@faker-js/faker";

export class FakerData {

  static getFirstName() {
    return faker.person.firstName();
  }

  static getLastName() {
    return faker.person.lastName();
  }

  static getPhone() {
    return faker.phone.number("(###) ###-####");
  }

  static getEmail(firstName, lastName) {
    return faker.internet.email({
      firstName,
      lastName,
    });
  }

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