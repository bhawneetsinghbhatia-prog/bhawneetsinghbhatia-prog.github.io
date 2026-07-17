function amount(value) {
  if (!value) return null;
  const parsed = Number(value.replaceAll(',', ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function field(text, label, nextLabel) {
  const start = text.search(new RegExp(`${label}:`, 'i'));
  if (start < 0) return null;
  const valueStart = start + text.slice(start).indexOf(':') + 1;
  const remainder = text.slice(valueStart);
  const candidates = [
    nextLabel ? remainder.search(new RegExp(`${nextLabel}\\s*:?`, 'i')) : -1,
    remainder.search(/Public:|(?:IN)?₹\s*[0-9]|CHOOSE THIS RATE/i)
  ].filter((index) => index >= 0);
  const end = candidates.length ? Math.min(...candidates) : remainder.length;
  return remainder.slice(0, end).replace(/\s+/g, ' ').trim() || null;
}

export function parseFairmontRate(text) {
  const normalized = text.replace(/â‚¹/g, '₹').replace(/\u00a0/g, ' ').trim();
  const lines = normalized.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const publicAmount = amount(normalized.match(/Public:\s*(?:IN)?₹\s*([0-9,]+(?:\.\d{1,2})?)/i)?.[1]
    || normalized.match(/(?:IN)?₹\s*([0-9,]+(?:\.\d{1,2})?)\s*for your stay/i)?.[1]);
  const taxAmount = amount(normalized.match(/Taxes not included\s*:\s*(?:IN)?₹\s*([0-9,]+(?:\.\d{1,2})?)/i)?.[1]);
  const mealPlan = field(normalized, 'Meal Plan', 'Loyalty Discount Description');
  const cancellationPolicy = field(normalized, 'Cancellation Policy', 'Meal Plan');
  const guaranteePolicy = field(normalized, 'Guarantee Policy', 'Cancellation Policy');

  if (publicAmount == null || taxAmount == null || !mealPlan || !cancellationPolicy) return null;
  return {
    rateName: lines[0] || 'Public rate',
    publicAmount,
    taxAmount,
    finalAmount: Number((publicAmount + taxAmount).toFixed(2)),
    mealPlan,
    cancellationPolicy,
    guaranteePolicy
  };
}

async function dismissCookies(page) {
  const choices = [
    page.getByRole('button', { name: /Continue without Accepting/i }),
    page.locator('#onetrust-reject-all-handler'),
    page.locator('#onetrust-accept-btn-handler')
  ];
  for (const button of choices) {
    try {
      await button.waitFor({ state: 'visible', timeout: 5000 });
      await button.click();
      return;
    } catch {
      // Consent controls vary by region; try the next supported button.
    }
  }
}

async function selectInr(page) {
  const inrButton = page.getByRole('button', { name: /INR \(₹\)/i });
  if (await inrButton.count() === 1) return;

  const currencyButton = page.locator('header button').filter({ hasText: /USD|EUR|GBP|₹|INR/ }).first();
  await currencyButton.waitFor({ state: 'visible', timeout: 10000 });
  await currencyButton.click();
  const area = page.getByLabel('Geographical Area', { exact: true });
  const currency = page.getByLabel('Currency', { exact: true });
  if (await area.count() !== 1 || await currency.count() !== 1) return;
  await area.selectOption({ label: 'Asia - Pacific' });
  await currency.selectOption({ label: 'INR - Indian Rupee' });
  await page.getByRole('button', { name: 'Confirm my currency', exact: true }).click();
  await inrButton.waitFor({ state: 'visible', timeout: 10000 });
}

export async function collectFairmont(page, { job, url }) {
  await dismissCookies(page);

  const roomButton = page.getByRole('button', { name: 'select this room', exact: true });
  const unavailableMessage = page.getByText(/there is no availability for your search/i);
  const firstState = await Promise.race([
    roomButton.first().waitFor({ state: 'visible', timeout: 25000 }).then(() => 'available'),
    unavailableMessage.waitFor({ state: 'visible', timeout: 25000 }).then(() => 'unavailable')
  ]).catch(() => 'incomplete');
  if (firstState === 'unavailable') {
    return { status: 'ROOM_NOT_AVAILABLE', failureReason: 'The official booking page reports no availability for the requested stay', bookingUrl: page.url() };
  }
  if (firstState === 'incomplete') {
    return { status: 'PRICE_DETAILS_INCOMPLETE', failureReason: 'The official booking page did not return room results', bookingUrl: page.url() };
  }
  await selectInr(page);
  const secondState = await Promise.race([
    roomButton.first().waitFor({ state: 'visible', timeout: 25000 }).then(() => 'available'),
    unavailableMessage.waitFor({ state: 'visible', timeout: 25000 }).then(() => 'unavailable')
  ]).catch(() => 'incomplete');
  if (secondState === 'unavailable') {
    return { status: 'ROOM_NOT_AVAILABLE', failureReason: 'The official booking page reports no availability for the requested stay', bookingUrl: page.url() };
  }
  if (secondState === 'incomplete') {
    return { status: 'PRICE_DETAILS_INCOMPLETE', failureReason: 'The official booking page did not return room results after setting INR', bookingUrl: page.url() };
  }
  const candidateCount = await roomButton.count();
  if (candidateCount === 0) {
    return { status: 'ROOM_NOT_AVAILABLE', failureReason: 'No public room was available for the requested stay', bookingUrl: page.url() };
  }
  await roomButton.first().click();

  const expanded = page.getByRole('button', { name: 'close room', exact: true });
  await expanded.waitFor({ state: 'visible', timeout: 15000 });
  const rateTexts = await page.locator('.Rate-card').allInnerTexts();
  const roomText = await page.locator('main').innerText();
  if (rateTexts.length === 0) {
    return {
      status: 'PRICE_DETAILS_INCOMPLETE',
      failureReason: `No complete rate cards were displayed; text=${roomText.slice(0, 600).replace(/\s+/g, ' ')}`,
      bookingUrl: page.url()
    };
  }
  const roomType = await page.locator('.Room-card__amenities-card h3').first().innerText().catch(() => 'Public room');
  const occupancy = roomText.match(/Number of occupants:\s*([0-9]+\s*pers\.\s*MAX)/i)?.[1] || null;
  const occupancyNumber = Number(occupancy?.match(/[0-9]+/)?.[0]);
  const requestedOccupancy = job.trackerStay.adults + job.trackerStay.children.length;
  if (!occupancy || occupancyNumber < requestedOccupancy) {
    return { status: 'PRICE_DETAILS_INCOMPLETE', failureReason: 'The displayed room occupancy could not be verified', bookingUrl: page.url() };
  }

  const rates = rateTexts.map(parseFairmontRate).filter(Boolean).sort((a, b) => a.finalAmount - b.finalAmount);
  const best = rates[0];
  if (!best) {
    return { status: 'PRICE_DETAILS_INCOMPLETE', failureReason: 'No complete public rate with taxes and policies was found', bookingUrl: page.url() };
  }

  return {
    status: 'VERIFIED',
    roomType: roomType.replace(/\s+/g, ' ').trim(),
    occupancy,
    mealPlan: best.mealPlan,
    cancellationPolicy: best.cancellationPolicy,
    guaranteePolicy: best.guaranteePolicy,
    taxes: `INR ${best.taxAmount.toFixed(2)} (shown separately by the hotel)`,
    taxAmount: best.taxAmount,
    additionalCharges: null,
    baseAmount: best.publicAmount,
    finalAmount: best.finalAmount,
    currency: 'INR',
    availability: 'AVAILABLE',
    rateName: best.rateName,
    verificationMethod: 'Official booking page public rate plus explicitly displayed taxes',
    bookingUrl: page.url(),
    requestedUrl: url
  };
}
