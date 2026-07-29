import lockfile from "proper-lockfile";
import fs from "fs";

export class ExcelLock {
  constructor(filePath) {
    this.filePath = filePath;
    this.release = null;
  }

  async lock() {
    // Ensure file exists
    if (!fs.existsSync(this.filePath)) {
      throw new Error(`Excel file not found: ${this.filePath}`);
    }

    // Wait until another worker releases the lock
    this.release = await lockfile.lock(this.filePath, {
      retries: {
        retries: 100,
        factor: 1.2,
        minTimeout: 100,
        maxTimeout: 1000,
      },
    });
  }

  async unlock() {
    if (this.release) {
      await this.release();
      this.release = null;
    }
  }
}