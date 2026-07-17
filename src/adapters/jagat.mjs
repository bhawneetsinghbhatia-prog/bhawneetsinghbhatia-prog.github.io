export async function collectJagat(page, { url }) {
  await page.locator('#rcc-decline-button').click({ timeout: 5000 }).catch(() => {});
  await page.locator('#guest-input').click();
  await page.getByRole('button', { name: 'incerase child', exact: true }).click();
  await page.getByRole('combobox', { name: 'child-1-age', exact: true }).selectOption('8');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  const rejected = page.getByText(/no availability for rooms that can accommodate up to 2 Adults & 1 Child/i);
  if (await rejected.waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false)) {
    return { status: 'ROOM_NOT_AVAILABLE', failureReason: 'Official engine: no one-room option accommodates 2 adults and 1 child', bookingUrl: url };
  }
  return { status: 'PRICE_DETAILS_INCOMPLETE', failureReason: 'The official engine did not expose a complete tax-inclusive payable amount for the requested party', bookingUrl: url };
}
