import { test } from "@playwright/test";
import { credentials } from "../config/credentials.js";
import xlsx from "xlsx";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";

test("Populate Intermediary Rater File", async () => {
  test.setTimeout(600000);

  // =========================
  // Read Result Excel
  // =========================

  const wb = xlsx.readFile(credentials.resultFile);

  const raterSheet = wb.Sheets["Output_RaterPremium"];
  const uiSheet = wb.Sheets["Output_PolicyUIPremium"];

  const rows = xlsx.utils.sheet_to_json(raterSheet);

  // 👇 ADD THIS LINE HERE
  console.log("Headers in Output_RaterPremium:", Object.keys(rows[0]));

  console.log("Rows Found:", rows.length);

  // =========================
  // Rater Output Folder
  // =========================

  const raterFolder = path.join(
    path.dirname(credentials.resultFile),
    "RaterOutput",
  );

  if (!fs.existsSync(raterFolder)) {
    fs.mkdirSync(raterFolder, { recursive: true });
  }

  // =========================
  // Loop each TestCase
  // =========================

  rows.forEach((row, index) => {
    const excelRow = index + 2;

    const policyNumber = uiSheet[`T${excelRow}`]?.v || `Policy_${index + 1}`;

    console.log("Processing:", policyNumber);

    // =========================
    // Create Rater File
    // =========================

    const newRaterFile = path.join(
      raterFolder,
      `${policyNumber}_Rater File.xlsx`,
    );

    fs.copyFileSync(credentials.raterFile, newRaterFile);

    // =========================
    // Payload
    // =========================

    const payload = {
      ASM: row["ASM"],
      Zip: row["Garage Zip"],
      LicenseType: row["License Type"],

      FullCoverage: row["FullCoverage"],
      DriverCount: row["DriverCount"],
      VehicleCount: row["VehicleCount"],

      VIN: row["VIN"],
      Year: row["Year"],
      Make: row["Make"],
      Model: row["Model"],

      CompSymbol: row["Comp"],
      CollSymbol: row["Coll"],

      CompFlag: row["COMP"],
      CollFlag: row["COLL"],

      CompDed: row["CompDed"],
      CollDed: row["CollDed"],

      NonOwner: row["NonOwner"],
      SR22: row["SR22"],

      Term: row["Term"],
      "Prior Coverage": row["Prior Coverage"],
      "Multi-Car": row["Multi-Car"],

      "BusinessUse BI": row["BusinessUse BI"],
      "BusinessUse PD": row["BusinessUse PD"],

      // IMPORTANT FIX
      VehUse: row["VehUse"] || "",
    };

    console.log("BusinessUse BI:", row["BusinessUse BI"]);
    console.log("BusinessUse PD:", row["BusinessUse PD"]);
    console.log("VehUse:", row["VehUse"]);

    // =========================
    // Encode JSON
    // =========================

    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64");

    // =========================
    // Run PowerShell Rater
    // =========================

    execSync(
      `powershell.exe -ExecutionPolicy Bypass -File "./rater.ps1" "${newRaterFile}" "${encoded}"`,

      { stdio: "inherit" },
    );

    console.log("Created Rater File:", newRaterFile);
  });
});
