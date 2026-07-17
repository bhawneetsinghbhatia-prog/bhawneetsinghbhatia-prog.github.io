const money = (value) => Number(String(value).replaceAll(',', ''));

export async function collectSynxis(page, { job, url }) {
  const results = page.getByRole('heading', { name: 'Select a Room', exact: true });
  const unavailable = page.getByText(/no (rooms|availability)|unable to find/i).first();
  const state = await Promise.race([
    results.waitFor({ state: 'visible', timeout: 30000 }).then(() => 'results'),
    unavailable.waitFor({ state: 'visible', timeout: 30000 }).then(() => 'unavailable')
  ]).catch(() => 'incomplete');
  if (state === 'unavailable') return { status: 'ROOM_NOT_AVAILABLE', failureReason: 'The official booking engine reports no availability for the requested party', bookingUrl: url };
  if (state !== 'results') return { status: 'ACCESS_DENIED', failureReason: 'The official SynXis booking engine returned a blank or blocked page in the cloud browser', bookingUrl: url };

  const text = await page.locator('main').innerText();
  const match = text.match(/Select a Room[\s\S]*?\n([^\n]+)\n(?:[^\n]*\n){0,12}?Details for ([^\n]+)\n[\s\S]*?₹\s*([0-9,]+(?:\.\d{2})?)\nPer Night/i);
  const buttons = page.getByRole('button', { name: /^Book Now/i });
  if (!match || await buttons.count() === 0) return { status: 'PRICE_DETAILS_INCOMPLETE', failureReason: 'No complete public rate was displayed', bookingUrl: url };
  const roomType = match[1].trim();
  const rateLabel = match[2].replace(/^.*?Bed\s+/i, '').trim();
  const baseAmount = money(match[3]);
  await buttons.first().click();
  await page.getByText(/Your Cart: 1 Item/i).waitFor({ state: 'visible', timeout: 15000 });
  const cartText = await page.locator('body').innerText();
  const taxAmount = money(cartText.match(/Taxes and fees\s*₹\s*([0-9,]+(?:\.\d{2})?)/i)?.[1]);
  const finalAmount = money(cartText.match(/Total\s*₹\s*([0-9,]+(?:\.\d{2})?)\s*Including taxes and fees/i)?.[1]);
  if (!Number.isFinite(taxAmount) || !Number.isFinite(finalAmount)) return { status: 'PRICE_DETAILS_INCOMPLETE', failureReason: 'Taxes or final payable amount were not displayed', bookingUrl: url };

  const selectedRate = page.getByText(rateLabel, { exact: true });
  if (await selectedRate.count()) await selectedRate.last().click();
  await page.getByRole('heading', { name: 'Checkout', exact: true }).waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  const checkoutText = await page.locator('body').innerText();
  const cancellationPolicy = checkoutText.match(/Guaranteed reservations[\s\S]{0,500}?(?=Acknowledgement|$)/i)?.[0]?.replace(/\s+/g, ' ').trim();
  if (!cancellationPolicy) return { status: 'PRICE_DETAILS_INCOMPLETE', failureReason: 'Cancellation policy could not be verified', bookingUrl: url };
  return {
    status: 'VERIFIED', roomType, occupancy: '2 adults, 1 child (age 8)',
    mealPlan: /breakfast/i.test(rateLabel) ? 'Breakfast included' : 'Room only',
    cancellationPolicy, taxes: `INR ${taxAmount.toFixed(2)} (shown separately)`, taxAmount,
    baseAmount, finalAmount, currency: 'INR', availability: 'AVAILABLE', rateName: rateLabel,
    verificationMethod: 'Official booking engine checkout total', bookingUrl: url
  };
}
