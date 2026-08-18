import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isHourWithinOperatingHours,
  parseOperatingHours,
} from '../src/components/utils/crossingMeta.js';
import { pickLightestHour } from '../src/lib/recommendations.js';

const crossing = (hours) => ({ hours });

test('recognizes 24-hour crossings', () => {
  const c = crossing('24 hrs/day');
  assert.equal(parseOperatingHours(c.hours).kind, 'always');
  assert.equal(isHourWithinOperatingHours(c, 0, 0), true);
  assert.equal(isHourWithinOperatingHours(c, 6, 23), true);
});

test('uses half-open daytime boundaries', () => {
  const c = crossing('6 am-10 pm');
  assert.equal(isHourWithinOperatingHours(c, 1, 5), false);
  assert.equal(isHourWithinOperatingHours(c, 1, 6), true);
  assert.equal(isHourWithinOperatingHours(c, 1, 21), true);
  assert.equal(isHourWithinOperatingHours(c, 1, 22), false);
});

test('supports midnight and overnight schedules', () => {
  const midnight = crossing('6 am-Midnight');
  assert.equal(isHourWithinOperatingHours(midnight, 2, 23), true);
  assert.equal(isHourWithinOperatingHours(midnight, 2, 0), false);

  const overnight = crossing('6 pm-2 am');
  assert.equal(isHourWithinOperatingHours(overnight, 1, 18), true);
  assert.equal(isHourWithinOperatingHours(overnight, 1, 23), true);
  assert.equal(isHourWithinOperatingHours(overnight, 2, 0), true);
  assert.equal(isHourWithinOperatingHours(overnight, 2, 1), true);
  assert.equal(isHourWithinOperatingHours(overnight, 2, 2), false);
});

test('supports clearly day-specific schedules', () => {
  const c = crossing('Mon-Fri: 6 am-10 pm; Sat-Sun: 8 am-8 pm');
  assert.equal(isHourWithinOperatingHours(c, 1, 6), true);
  assert.equal(isHourWithinOperatingHours(c, 5, 21), true);
  assert.equal(isHourWithinOperatingHours(c, 6, 7), false);
  assert.equal(isHourWithinOperatingHours(c, 6, 8), true);
  assert.equal(isHourWithinOperatingHours(c, 0, 19), true);
  assert.equal(isHourWithinOperatingHours(c, 0, 20), false);
});

test('suppresses malformed and unresolved seasonal schedules', () => {
  for (const hours of ['', 'Seasonal hours vary', 'ask operator', 'not published']) {
    const c = crossing(hours);
    assert.equal(parseOperatingHours(hours).kind, 'unknown');
    assert.equal(isHourWithinOperatingHours(c, 1, 6), false);
  }
});

test('Los Indios regression rejects the mathematically lowest closed hour', () => {
  const c = crossing('6 am-10 pm');
  const byHour = [
    { day: 1, hour: 5, median: 0, samples: 5 },
    { day: 1, hour: 6, median: 10, samples: 5 },
    { day: 1, hour: 7, median: 15, samples: 5 },
  ];
  assert.deepEqual(pickLightestHour(c, byHour, 1), byHour[1]);
});
