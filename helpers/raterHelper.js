import xlsx from "xlsx";
import fs from "fs";
import path from "path";

/**
 * Safely get value from multiple possible keys
 */
function getValue(data, ...keys) {
  const normalizedData = {};

  // normalize all keys once
  for (const key in data) {
    normalizedData[key.toLowerCase().trim()] = data[key];
  }

  for (const key of keys) {
    const normalizedKey = key.toLowerCase().trim();

    if (
      normalizedData[normalizedKey] !== undefined &&
      normalizedData[normalizedKey] !== null &&
      normalizedData[normalizedKey] !== ""
    ) {
      return normalizedData[normalizedKey];
    }
  }

  return "";
}

/**
 * Convert date to MM-DD-YYYY
 */
function dateFormatUSA(dateValue) {
  if (!dateValue) return "";

  const d = new Date(dateValue);

  if (isNaN(d)) return dateValue;

  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();

  return `${mm}-${dd}-${yyyy}`;
}

/**
 * Normalize Vehicle Use
 * Only convert Business -> BusinessUse
 */
function normalizeVehUse(value) {
  if (!value) return "";

  const v = String(value).trim();

  if (v === "Business") return "BusinessUse";

  return v;
}

/**
 * Read Premium from generated Rater file
 */
export function getRaterPremium(raterFile) {
  const wb = xlsx.readFile(raterFile);
  const sheet = wb.Sheets["RateOrder"];

  if (!sheet) {
    console.log("RateOrder sheet not found");
    return 0;
  }

  const cell = sheet["C98"];
  const premium = Number(cell?.v || 0);

  console.log("Captured Premium:", premium);

  return premium;
}

/**
 * Build Rater Data Object
 */
export function buildRaterData(policyData, index, totalPremium = "") {
  const vehUseInput = getValue(policyData, "VehUse");

  const compSymbol = getValue(policyData, "Comp(Symbol)**", "Comp(Symbol)");
  const collSymbol = getValue(policyData, "Coll(Symbol)**", "Coll(Symbol)");

  const rrLimit = getValue(policyData, "RR Limit");
  const rrDuration = getValue(policyData, "RR Duration");

  const rentalValue = rrLimit && rrDuration ? `${rrLimit}-${rrDuration}` : "";

  const rsaVal = getValue(policyData, "RSA Val");

  // ================= LEARNERS PERMIT =================

  const learnersPermitValue = getValue(
    policyData,
    "Does any driver have a learner’s permit?",
  );

  const learnersPermit =
    String(learnersPermitValue).trim().toLowerCase() === "yes" ? 1 : 0;

  // ================= ROLLOVER DISCOUNT =================

  const rolloverDiscountValue = getValue(policyData, "Rollover Discount");

  const rolloverDiscount =
    String(rolloverDiscountValue).trim().toLowerCase() === "yes" ? 1 : 0;

  return {
    "TestCase No":
      getValue(policyData, "TC NO") ||
      `TC${String(index + 1).padStart(3, "0")}`,

    // ================= BASIC POLICY =================

    "Effective Date": dateFormatUSA(getValue(policyData, "EffectiveDate")),

    "Driver DOB": dateFormatUSA(
      getValue(policyData, "DriverDob", "Driver DOB"),
    ),
    "Driver Marital Status": getValue(
      policyData,
      "DMaritalStatus",
      "Driver Marital Status",
    ),

    "Driver Gender": getValue(policyData, "DriverGender", "Driver Gender"),

    "License State": getValue(policyData, "License State"),

    "License Status": getValue(policyData, "DLicenseStatus", "License Status"),

    "Garage Zip": getValue(policyData, "Zip"),

    "License Type": getValue(policyData, "License Type**", "License Type"),

    DriverCount:
      Number(getValue(policyData, "DriverCount**", "DriverCount")) || 1,

    VehicleCount:
      Number(getValue(policyData, "VehicleCount**", "VehicleCount")) || 1,

    VIN: getValue(policyData, "VIN*", "VIN"),

    Year: getValue(policyData, "VehYear"),

    Make: getValue(policyData, "Make*", "Make"),

    Model: getValue(policyData, "Model*", "Model"),

    // ================= SYMBOL VALUES =================

    Comp: Number(compSymbol) || 0,

    Coll: Number(collSymbol) || 0,

    // ================= LIABILITY COVERAGES =================

    UMBI: Number(getValue(policyData, "UMBI Selection")) || 0,

    UIMBI: Number(getValue(policyData, "UIMBI Selection")) || 0,

    MED: Number(getValue(policyData, "MEDPAY Selection")) || 0,

    UMPD: Number(getValue(policyData, "UMPD Selection")) || 0,

    UIMPD: Number(getValue(policyData, "UIMPD Selection")) || 0,

    PIP: Number(getValue(policyData, "PIPSection")) || 0,

    // ================= VEHICLE COVERAGE =================

    COMP:
      Number(
        getValue(policyData, "COMP", "Veh Comp Selection", "VehComp Selection"),
      ) || 0,

    COLL:
      Number(
        getValue(policyData, "COLL", "VehColl Selection", "Veh Coll Selection"),
      ) || 0,

    CompDed:
      Number(getValue(policyData, "CompDeductible")) > 0
        ? Number(getValue(policyData, "CompDeductible"))
        : 250,

    CollDed:
      Number(getValue(policyData, "CollDeductible")) > 0
        ? Number(getValue(policyData, "CollDeductible"))
        : 250,

    // ================= ADDONS =================

    "ROAD-SIDE": Number(getValue(policyData, "RSA Selection")) || 0,

    RENTAL: Number(getValue(policyData, "RR Selection")) || 0,

    RSALimit: rsaVal,

    RentalValue: rentalValue,

    // ================= FLAGS =================

    NonOwner: getValue(policyData, "NonOwner **", "NonOwner") === "Yes" ? 1 : 0,

    SR22: Number(getValue(policyData, "SR22")) || 0,

    DefensiveDriver: Number(policyData["DefensiveDriver"]) || 0,

    DrugDiscount: Number(policyData["DrugDiscount"]) || 0,

    Term: Number(getValue(policyData, "TermLength")) || 6,

    "Prior Coverage": Number(getValue(policyData, "Prior Coverage")) || 0,

    // ================= VEHICLE USE =================

    VehUse: normalizeVehUse(vehUseInput),

    // ================= DRIVER / RISK =================

    IsRenew: Number(getValue(policyData, "IsRenew")) || 0,

    DaysInForce: Number(getValue(policyData, "DaysInForce")) || 0,

    MajorViolation: Number(getValue(policyData, "MajorViolation")) || 0,

    MinorViolation: Number(getValue(policyData, "MinorViolation")) || 0,

    ChargableViolation: Number(getValue(policyData, "ChargableViolation")) || 0,

    // ================= LEARNERS PERMIT =================

    LearnersPermit: learnersPermit,

    // ================= UW FLAG =================

    "Unacceptable Risk":
      getValue(policyData, "Unacceptable Risk")?.trim() === "Yes" ? 1 : 0,

    // ================= ROLLOVER DISCOUNT =================

    "Rollover Discount": rolloverDiscount,

    Premium: totalPremium,
  };
}

/**
 * =======================
 * Extract Coverage Values
 * =======================
 */
export function getRaterCoverageData(policyNo, type) {
  const fs = require("fs");
  const path = require("path");

  const folderPath = process.env.RATER_OUTPUT;
  const files = fs.readdirSync(folderPath);

  const fileName = files.find((f) => f.includes(policyNo));

  if (!fileName) {
    console.log(`❌ File not found for ${policyNo}`);
    return null;
  }

  const fullPath = path.join(folderPath, fileName);
  const wb = xlsx.readFile(fullPath);
  const sheet = wb.Sheets["RateOrder"];

  // ✅ ROW MAPPING
  const rowMap = {
    Base: { factor: 48, calc: 80 },
    Region: { factor: 49, calc: 81 },
    Profile: { factor: 50, calc: 82 },
    Household: { factor: 51, calc: 83 },
    "Policy class": { factor: 52, calc: 84 },
    "Model year": { factor: 53, calc: 85 },
    Symbol: { factor: 54, calc: 86 },
    "Non-Owner / FR": { factor: 55, calc: 87 },
    "Limits / Deductible": { factor: 56, calc: 88 },
    Term: { factor: 57, calc: 89 },
    "Sum of Surcharges": { factor: 58, calc: 90 },

    "License Type Surcharge": { factor: 59, calc: 91 },
    "Business Use": { factor: 60, calc: 92 },
    "Violations Surcharge": { factor: 61, calc: 93 },
    "Unacceptable Risk Surcharge": { factor: 62, calc: 94 },

    "Sum of discounts": { factor: 65, calc: 91 },

    "Multi-Car Discount": { factor: 66, calc: 98 },
    "Prior Coverage Discount": { factor: 67, calc: 99 },
    "Defensive Driver Discount": { factor: 70, calc: 102 },
    "Drug/Alcohol Awareness Discount": { factor: 71, calc: 103 },
    "Rollover Discount": { factor: 72, calc: 104 },
  };

  const rows = rowMap[type];

  if (!rows) {
    console.log(`⚠️ No mapping for ${type}`);
    return null;
  }

  const get = (col, row) => Number(sheet[`${col}${row}`]?.v || 0);

  return {
    BI: { factor: get("C", rows.factor), calc: get("C", rows.calc) },
    PD: { factor: get("D", rows.factor), calc: get("D", rows.calc) },
    COMP: { factor: get("K", rows.factor), calc: get("K", rows.calc) },
    COLL: { factor: get("L", rows.factor), calc: get("L", rows.calc) },
  };
}
