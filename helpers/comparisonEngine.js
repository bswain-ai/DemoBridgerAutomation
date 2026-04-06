/**
 * ==========================================
 * Comparison Engine
 * ==========================================
 * TASK 4 — Phase 1 Extraction
 *
 * This module owns the single responsibility of deciding whether a UI
 * premium matches a rater premium — producing a structured result object
 * with status and a signed delta.
 *
 * Extracted from the inline comparison logic that was previously buried
 * inside createPremiumComparison() in excelWriter.js. Keeping it here
 * means the comparison rule is defined in exactly one place — any future
 * change to tolerance or mode logic (e.g. Phase 3 Migration mode) is made
 * here and nowhere else.
 *
 * WHY SIGNED DELTA:
 * Delta is stored as (uiPremium - raterPremium) with its sign preserved.
 *   positive delta → UI is HIGHER than rater (UI overrating)
 *   negative delta → UI is LOWER  than rater (UI underrating)
 * Math.abs() is applied ONLY to the PASS/FAIL decision — not to the delta
 * value written to the output sheet. Stripping the sign before storing
 * would hide which direction the mismatch went, making diagnosis harder.
 *
 * WHY TOLERANCE PARAMETER:
 * Default is 0 — strict equality, matching current behaviour exactly.
 * Phase 3 Migration mode will pass a non-zero tolerance (e.g. 1.00) to
 * allow rounding differences between legacy and new rating systems.
 * The parameter is here now so callers can opt in without any further
 * changes to this function.
 */

/**
 * Compare a single policy's UI premium against its rater premium.
 *
 * @param {object} params
 * @param {string} params.tcNo          - Test case number (e.g. "TC003")
 * @param {string} params.policyNo      - Policy number from the UI
 * @param {number} params.uiPremium     - Total premium captured from the UI
 * @param {number} params.raterPremium  - Total premium calculated by the rater
 * @param {number} [params.tolerance]   - Max allowed absolute difference for PASS
 *                                        Default 0 = strict equality (current behaviour)
 *
 * @returns {{
 *   "TestCase No": string,
 *   PolicyNo:      string,
 *   "Policy Premium(UI)": number,
 *   "Rater Premium":      number,
 *   Delta:                number,
 *   Status:               "PASS" | "FAIL"
 * }}
 */
export function comparePolicy({
  tcNo,
  policyNo,
  uiPremium,
  raterPremium,
  tolerance = 0,
}) {
  // Signed delta — direction is preserved in the output sheet so analysts
  // can immediately see whether UI is overrating or underrating.
  //   positive = UI higher than rater
  //   negative = UI lower than rater
  const delta = uiPremium - raterPremium;

  // Math.abs used ONLY here for the binary PASS/FAIL decision.
  // The raw signed delta is stored separately — see Delta field below.
  const status = Math.abs(delta) <= tolerance ? "PASS" : "FAIL";

  return {
    "TestCase No": tcNo,
    PolicyNo:      policyNo,
    "Policy Premium(UI)": uiPremium,
    "Rater Premium":      raterPremium,
    // Signed delta — positive means UI over-reported, negative means under-reported.
    // Math.abs() is NOT applied here — direction matters for diagnosis.
    Delta:  delta,
    Status: status,
  };
}
