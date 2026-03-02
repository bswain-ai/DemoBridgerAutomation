function getValue(data, ...keys) {
  for (const key of keys) {
    if (data[key] !== undefined && data[key] !== null && data[key] !== "") {
      return data[key];
    }
  }
  return "";
}

/**
 * Normalize VehUse values for rater
 */
function normalizeVehUse(value) {
  if (!value) return "";

  const v = value.toString().trim().toLowerCase();

  if (v === "business") return "BusinessUse";
  if (v === "artisan") return "Artisan";
  if (v === "commute") return "Commute to work";
  if (v === "farm") return "Farm";
  if (v === "pleasure") return "Pleasure";

  return value;
}

export function buildRaterData(policyData, index, totalPremium = "") {
  const vehUseInput = getValue(policyData, "VehUse");

  // ⭐ Symbols (these go to Q76 / Q77 in rater)
  const compSymbol = getValue(policyData, "Comp(Symbol)**", "Comp(Symbol)");
  const collSymbol = getValue(policyData, "Coll(Symbol)**", "Coll(Symbol)");

  return {
    "TestCase No": getValue(policyData, "TC NO") || `TC00${index + 1}`,

    ASM: getValue(policyData, "ASM**", "ASM"),

    "Garage Zip": getValue(policyData, "Zip"),

    "License Type": getValue(policyData, "License Type**", "License Type"),

    FullCoverage: getValue(policyData, "FullCoverage") || 0,

    DriverCount: getValue(policyData, "DriverCount**", "DriverCount"),

    VehicleCount: getValue(policyData, "VehicleCount**", "VehicleCount"),

    VIN: getValue(policyData, "VIN*", "VIN"),

    Year: getValue(policyData, "VehYear"),

    Make: getValue(policyData, "Make*", "Make"),

    Model: getValue(policyData, "Model*", "Model"),

    // ⭐ SYMBOL VALUES (Q76 / Q77)
    Comp: Number(compSymbol) || 0,
    Coll: Number(collSymbol) || 0,

    // ⭐ COVERAGE SELECTIONS (K52 / L52 etc)
    UMBI: Number(getValue(policyData, "UMBI Selection")) || 0,
    UIMBI: Number(getValue(policyData, "UIMBI Selection")) || 0,
    MED: Number(getValue(policyData, "MEDPAY Selection")) || 0,
    UMPD: Number(getValue(policyData, "UMPD Selection")) || 0,
    UIMPD: Number(getValue(policyData, "UIMPD Selection")) || 0,
    PIP: Number(getValue(policyData, "PIPSection")) || 0,

    // ⭐ VEHICLE COVERAGE (THIS FIXES YOUR K52 / L52 ISSUE)
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

    // ⭐ ADD-ONS
    "ROAD-SIDE": Number(getValue(policyData, "RSA Selection")) || 0,
    RENTAL: Number(getValue(policyData, "RR Selection")) || 0,

    NonOwner: getValue(policyData, "NonOwner **", "NonOwner") === "Yes" ? 1 : 0,

    SR22: getValue(policyData, "SR22") || 0,

    Term: getValue(policyData, "TermLength"),

    "Prior Coverage": getValue(policyData, "Prior Coverage") || 0,

    "Multi-Car": getValue(policyData, "Multi-Car") || "N",

    // ⭐ VEHICLE USE
    VehUse: normalizeVehUse(vehUseInput),

    // ⭐ BUSINESS USE FLAGS
    "BusinessUse BI": vehUseInput === "Business" ? 1 : 0,
    "BusinessUse PD": vehUseInput === "Business" ? 1 : 0,

    Premium: totalPremium,
  };
}
