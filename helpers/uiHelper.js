
export async function getPremium(page, locator) {
  try {
    const txt = await page.locator(locator).textContent({
      timeout: 5000,
    });

    return txt?.trim() ?? "";
  } catch {
    return "";
  }
}