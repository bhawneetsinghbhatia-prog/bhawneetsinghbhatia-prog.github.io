import test from 'node:test';
import assert from 'node:assert/strict';
import { attachChanges } from '../src/store.mjs';

const offer = { hotelId: 'h', sourceId: 's', checkIn: '2026-07-17', nights: 1, roomType: 'Deluxe', mealPlan: 'Breakfast included', cancellationPolicy: 'Free cancellation', status: 'VERIFIED', currency: 'INR', finalAmount: 11000 };

test('compares an equivalent verified offer with the previous run', () => {
  const previous = { results: [{ ...offer, finalAmount: 10000 }] };
  const [current] = attachChanges([offer], previous);
  assert.equal(current.changeAmount, 1000);
  assert.equal(current.changePercent, 10);
});
