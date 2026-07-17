import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFairmontRate } from '../src/adapters/fairmont.mjs';

test('parses a complete Fairmont public rate and exact payable total', () => {
  const result = parseFairmontRate(`HOTEL SALE
Guarantee Policy:
Online payment
Cancellation Policy:
Non-refundable
Meal Plan:
Breakfast included
Loyalty Discount Description
Sign in or join to book the member rate
Public:
IN₹25,500 for your stay
Member:
IN₹22,950 for your stay
Taxes not included : ₹4,590.00.
CHOOSE THIS RATE`);

  assert.deepEqual(result, {
    rateName: 'HOTEL SALE',
    publicAmount: 25500,
    taxAmount: 4590,
    finalAmount: 30090,
    mealPlan: 'Breakfast included',
    cancellationPolicy: 'Non-refundable',
    guaranteePolicy: 'Online payment'
  });
});

test('rejects a Fairmont candidate that lacks required policy details', () => {
  assert.equal(parseFairmontRate('IN₹25,500 for your stay'), null);
});
