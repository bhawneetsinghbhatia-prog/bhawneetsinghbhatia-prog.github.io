import test from 'node:test';
import assert from 'node:assert/strict';
import { interpretPage } from '../src/extract.mjs';

const expectedStay = { checkIn: '2026-07-17', checkOut: '2026-07-18' };
const expectedGuests = { adults: 2, children: [8] };

test('blocks CAPTCHA pages without exposing a price', () => {
  const result = interpretPage({ bodyText: 'Verify you are human ₹12,000', title: 'Robot check', url: 'https://example.test', expectedHotel: 'Example Palace Hotel', expectedStay, expectedGuests, currency: 'INR' });
  assert.equal(result.status, 'CAPTCHA_BLOCKED');
  assert.equal(result.finalAmount, undefined);
});

test('verifies only a complete final-price record', () => {
  const result = interpretPage({
    bodyText: 'Example Palace Hotel Check-in 17 July 2026 Check-out 18 July 2026 Your room: Deluxe Palace Room bed Sleeps 3 guests Breakfast included Free cancellation until tomorrow Taxes included Total ₹ 12,345',
    title: 'Checkout',
    url: 'https://example.test/book',
    expectedHotel: 'Example Palace Hotel',
    expectedStay,
    expectedGuests,
    currency: 'INR'
  });
  assert.equal(result.status, 'VERIFIED');
  assert.equal(result.finalAmount, 12345);
});

test('does not confirm a bare search-result price', () => {
  const result = interpretPage({ bodyText: 'Example Palace Hotel from ₹8,000', title: 'Search', url: 'https://example.test', expectedHotel: 'Example Palace Hotel', expectedStay, expectedGuests, currency: 'INR' });
  assert.equal(result.status, 'PRICE_DETAILS_INCOMPLETE');
  assert.equal(result.candidateAmount, null);
});
