import { test } from 'node:test';
import assert from 'node:assert/strict';
import { asPlan, hasFeature } from '../src/plans.ts';

test('free keeps every core tool and may show ads; premium never shows ads', () => {
  assert.equal(hasFeature('free', 'ads'), true);
  assert.equal(hasFeature(undefined, 'ads'), true); // signed out = free
  assert.equal(hasFeature('premium', 'ads'), false);
  assert.equal(hasFeature('free', 'compareBuilds'), false);
  assert.equal(asPlan('admin'), 'free'); // unknown values never grant anything
});
