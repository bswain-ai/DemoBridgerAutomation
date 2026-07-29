
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

// Wait For Element

export async function waitForElement(page, locator) {
  let element;

  if (typeof locator === 'function') {
    element = page.locator(locator());
  } else if (typeof locator === 'string') {
    element = page.locator(locator);
  } else {
    element = locator; 
  }

  await element.waitFor({
    state: 'visible',
    timeout: 10000,
  });
}

export async function wait(page, ms = 600) {
  await page.waitForTimeout(ms);
}

export async function waitFor(page) {
  await wait(page, 1000);
}

// ====================================
// Get Total Coverage Premium
// ====================================
// Captures all vehicle premiums from the
// Pricing Breakdown section, sums them,
// and returns the Total Coverage Premium.
// Supports single and multi-vehicle quotes.
// ====================================

export async function getTotalCoveragePremium(page, locator) {
  const premiumLocator = page.locator(locator);

  const count = await premiumLocator.count();

  let totalCoveragePremium = 0;

  console.log(`Total Vehicles Found: ${count}`);

  for (let i = 0; i < count; i++) {
    const premiumText = (await premiumLocator.nth(i).textContent()).trim();

    const premium = Number(
      premiumText.replace(/\$/g, "").replace(/,/g, "")
    );

    console.log(`Vehicle ${i + 1} Premium: ${premium}`);

    totalCoveragePremium += premium;
  }

  console.log(`Total Coverage Premium: ${totalCoveragePremium}`);

  return totalCoveragePremium;
}