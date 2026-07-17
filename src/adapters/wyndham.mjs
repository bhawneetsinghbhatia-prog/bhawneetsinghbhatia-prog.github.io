const amount = (value) => Number(String(value).replaceAll(',', ''));

export async function collectWyndham(page, { url }) {
  const hotel = page.getByRole('heading', { name: 'Wyndham Grand Udaipur Fateh Sagar Lake', exact: true });
  const accessible = await hotel.first().waitFor({ state: 'visible', timeout: 30000 }).then(() => true).catch(() => false);
  if (!accessible || await page.locator('main').count() === 0) return { status: 'ACCESS_DENIED', failureReason: 'Wyndham did not return its rate page to the cloud browser', bookingUrl: url };
  const mainText = await page.locator('main').innerText();
  if (/no rooms|no availability|sold out/i.test(mainText)) return { status: 'ROOM_NOT_AVAILABLE', failureReason: 'The official booking engine reports no availability', bookingUrl: url };
  const match = mainText.match(/heading "?([^\n]+)"?|([A-Za-z][^\n]+)\n[\s\S]*?Standard Rate with Breakfast[\s\S]*?([0-9,]+)\s*\n?00\s*\n?INR \/Night/i)
    || mainText.match(/([A-Za-z][^\n]+)\n[\s\S]*?Standard Rate with Breakfast[\s\S]*?([0-9,]+)\s*00\s*INR \/Night/i);
  const book = page.getByRole('button', { name: 'Book', exact: true }).first();
  if (await book.count() === 0) return { status: 'PRICE_DETAILS_INCOMPLETE', failureReason: 'No public non-member rate was displayed', bookingUrl: url };
  await book.click();
  await page.getByText('Total for Stay', { exact: true }).waitFor({ state: 'visible', timeout: 20000 });
  const body = await page.locator('body').innerText();
  const baseAmount = amount(body.match(/([0-9,]+\.\d{2}) INR\s*Taxes & Fees/i)?.[1]);
  const taxAmount = amount(body.match(/Taxes & Fees[\s\S]{0,100}?([0-9,]+\.\d{2}) INR/i)?.[1]);
  const finalAmount = amount(body.match(/Total for Stay\s*([0-9,]+\.\d{2}) INR/i)?.[1]);
  const roomType = body.match(/1 Night\s*Room Details\s*([^\n]+)/i)?.[1]?.trim();
  const rateName = body.match(new RegExp(`${roomType?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*([^\\n]+)\\s*[0-9,]+\\.\\d{2} INR`, 'i'))?.[1]?.trim() || 'Standard Rate with Breakfast';
  if (![baseAmount, taxAmount, finalAmount].every(Number.isFinite) || !roomType) return { status: 'PRICE_DETAILS_INCOMPLETE', failureReason: 'Checkout did not expose a complete payable total', bookingUrl: url };
  const policyLink = page.getByRole('link', { name: 'Cancellation & Rate Details', exact: true }).first();
  await policyLink.click();
  const policyDialog = page.getByRole('dialog');
  await policyDialog.waitFor({ state: 'visible', timeout: 8000 });
  const policyText = await policyDialog.innerText();
  const cancellationPolicy = policyText.match(/Reservation Policies\s*([\s\S]+)$/i)?.[1]?.replace(/\s+/g, ' ').trim();
  if (!cancellationPolicy) return { status: 'PRICE_DETAILS_INCOMPLETE', failureReason: 'Cancellation policy could not be verified', bookingUrl: url };
  return { status: 'VERIFIED', roomType, occupancy: '2 adults, 1 child (age 8)', mealPlan: 'Breakfast included', cancellationPolicy, taxes: `INR ${taxAmount.toFixed(2)} (shown separately)`, taxAmount, baseAmount, finalAmount, currency: 'INR', availability: 'AVAILABLE', rateName, verificationMethod: 'Official Wyndham checkout total and rate-policy dialog', bookingUrl: url };
}
