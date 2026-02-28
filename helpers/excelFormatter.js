// helpers/excelFormatter.js

/**
 * Format number with US commas
 */
export function formatWithComma(value) {
  if (!value) return "";
  return Number(value).toLocaleString("en-US");
}

/**
 * Safe string conversion
 */
export function toSafeString(value) {
  if (value === null || value === undefined) return "";
  return value.toString().trim();
}

/**
 * Convert Excel toggle value to number (1/0 safe)
 */
export function toNumber(value) {
  return Number(value) || 0;
}
