const BLOCK_PATTERNS = [
  ['CAPTCHA_BLOCKED', /captcha|verify you are human|unusual traffic|robot check/i],
  ['LOGIN_REQUIRED', /sign in to continue|log in to continue|login required/i],
  ['ACCESS_DENIED', /access denied|request blocked|forbidden|not authorized/i],
  ['LOCATION_RESTRICTED', /not available in your (country|region|location)/i]
];

function normalizeSpace(value = '') {
  return value.replace(/\s+/g, ' ').trim();
}

function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return normalizeSpace(match[1]);
  }
  return null;
}

function parseMoney(text, preferredCurrency) {
  const currencyPattern = preferredCurrency === 'INR' ? '(?:₹|INR|Rs\\.?)' : preferredCurrency;
  const expressions = [
    new RegExp(`(?:total|final price|payable)[^₹$€£0-9]{0,50}${currencyPattern}\\s*([0-9][0-9,]*(?:\\.[0-9]{1,2})?)`, 'i'),
    new RegExp(`${currencyPattern}\\s*([0-9][0-9,]*(?:\\.[0-9]{1,2})?)[^\\n]{0,40}(?:total|including taxes|taxes included)`, 'i')
  ];
  for (const expression of expressions) {
    const match = text.match(expression);
    if (match) return Number(match[1].replaceAll(',', ''));
  }
  return null;
}

function dateTokens(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return [
    isoDate,
    `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`,
    new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }).format(date),
    new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }).format(date)
  ];
}

function containsDate(text, isoDate) {
  return dateTokens(isoDate).some((token) => text.toLowerCase().includes(token.toLowerCase()));
}

export function interpretPage({ bodyText, title, url, expectedHotel, expectedStay, expectedGuests, currency }) {
  const text = normalizeSpace(bodyText).slice(0, 250000);
  for (const [status, pattern] of BLOCK_PATTERNS) {
    if (pattern.test(`${title} ${text.slice(0, 10000)}`)) {
      return { status, failureReason: status.replaceAll('_', ' ').toLowerCase(), bookingUrl: url };
    }
  }

  const hotelPresent = expectedHotel
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .filter((word) => text.toLowerCase().includes(word)).length >= 2;
  const finalAmount = parseMoney(text, currency);
  const roomType = firstMatch(text, [
    /(?:room type|you selected|your room)\s*[:\-]?\s*([^|]{3,80}?)(?:bed|sleeps|guests|$)/i,
    /((?:deluxe|superior|heritage|palace|suite|standard)[^|]{0,55}(?:room|suite))/i
  ]);
  const mealPlan = firstMatch(text, [/(breakfast included|room only|half board|full board|all-inclusive)/i]);
  const cancellationPolicy = firstMatch(text, [/(free cancellation[^|.]{0,100}|non-refundable|refundable[^|.]{0,100})/i]);
  const taxes = firstMatch(text, [/(taxes (?:and fees )?(?:included|excluded)[^|.]{0,100}|includes? [^|.]{0,70}tax(?:es)?)/i]);
  const occupancy = firstMatch(text, [/(?:sleeps|max(?:imum)? occupancy|up to)\s*[:\-]?\s*([0-9]+\s*(?:guests?|persons?|adults?))/i]);
  const datesPresent = expectedStay
    ? containsDate(text, expectedStay.checkIn) && containsDate(text, expectedStay.checkOut)
    : false;
  const unavailable = /sold out|no availability|not available for (?:your|these) dates|no rooms/i.test(text);

  if (unavailable && hotelPresent) {
    return { status: 'ROOM_NOT_AVAILABLE', failureReason: 'No room was available for the requested stay', bookingUrl: url };
  }

  const requestedOccupancy = expectedGuests ? expectedGuests.adults + expectedGuests.children.length : null;
  const occupancyNumber = occupancy ? Number(occupancy.match(/[0-9]+/)?.[0]) : null;
  const occupancyAllowed = occupancyNumber != null && requestedOccupancy != null && occupancyNumber >= requestedOccupancy;
  const required = { hotelPresent, datesPresent, finalAmount, roomType, occupancyAllowed, mealPlan, cancellationPolicy, taxes };
  const missing = Object.entries(required).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length > 0) {
    return {
      status: 'PRICE_DETAILS_INCOMPLETE',
      failureReason: `Could not verify required fields: ${missing.join(', ')}`,
      bookingUrl: url,
      candidateAmount: finalAmount
    };
  }

  return {
    status: 'VERIFIED',
    roomType,
    occupancy,
    mealPlan,
    cancellationPolicy,
    taxes,
    additionalCharges: null,
    finalAmount,
    currency,
    availability: 'AVAILABLE',
    bookingUrl: url
  };
}
