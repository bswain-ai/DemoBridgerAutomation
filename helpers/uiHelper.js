
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