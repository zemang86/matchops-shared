import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getMatchClock, getMatchMinute } from '../dist/index.js';

const T0 = Date.parse('2026-08-22T12:00:00Z');
const at = (secs, extra = {}) => getMatchClock({
  status: '1h', periodStartedAt: new Date(T0), now: T0 + secs * 1000, ...extra,
});

test('fixed statuses do not tick', () => {
  for (const [status, label, minute] of [['pre','PRE',0],['ht','HT',45],['ft','FT',90]]) {
    const c = getMatchClock({ status, now: T0 });
    assert.equal(c.label, label);
    assert.equal(c.minute, minute);
    assert.equal(c.isRunning, false);
  }
});

test('first half counts up from the period start', () => {
  assert.equal(at(0).label, "1'");          // 0:00 is the 1st minute
  assert.equal(at(30).label, "1'");
  assert.equal(at(60).label, "2'");
  assert.equal(at(600).clock, '10:00');
  assert.equal(at(600).label, "11'");
});

test('45:00 rolls into added time, it does not read 46', () => {
  assert.equal(at(2670).label, "45'");      // 44:30
  assert.equal(at(2700).label, '45+1');     // 45:00
  assert.equal(at(2820).label, '45+3');     // 47:00
  assert.equal(at(2820).minute, 45, 'minute stays capped for event logging');
  assert.equal(at(2820).added, 3);
});

test('second half continues the broadcast clock from 45:00', () => {
  const c = (s) => getMatchClock({ status: '2h', periodStartedAt: new Date(T0), now: T0 + s * 1000 });
  assert.equal(c(0).clock, '45:00');
  assert.equal(c(0).label, "46'");
  assert.equal(c(600).label, "56'");
  assert.equal(c(2700).label, '90+1');      // 90:00
});

test('operator offset shifts the clock', () => {
  assert.equal(at(600, { offsetSecs: 60 }).clock, '11:00');
  assert.equal(at(600, { offsetSecs: -60 }).clock, '9:00');
});

test('clock never runs backwards before its period start', () => {
  assert.equal(at(-120).clock, '0:00');
});

test('falls back to scheduled kickoff and flags it as an estimate', () => {
  const c = getMatchClock({ status: '1h', kickoffAt: new Date(T0), now: T0 + 600_000 });
  assert.equal(c.label, "11'");
  assert.equal(c.isEstimate, true, 'caller must be able to tell the clock is guessed');

  const real = getMatchClock({ status: '1h', periodStartedAt: new Date(T0), now: T0 + 600_000 });
  assert.equal(real.isEstimate, false);
});

test('second-half estimate subtracts the assumed half-time break', () => {
  // kickoff + 45 played + 15 break + 10 into 2H = 70 minutes wall clock
  const c = getMatchClock({ status: '2h', kickoffAt: new Date(T0), now: T0 + 70 * 60_000 });
  assert.equal(c.label, "56'");
  assert.equal(c.isEstimate, true);
});

test('period_started_at wins when both are supplied', () => {
  const c = getMatchClock({
    status: '1h',
    kickoffAt: new Date(T0),                 // scheduled
    periodStartedAt: new Date(T0 + 600_000), // actually kicked off 10 min late
    now: T0 + 900_000,
  });
  assert.equal(c.clock, '5:00', 'a late kickoff must not inflate the clock');
  assert.equal(c.isEstimate, false);
});

test('getMatchMinute keeps the simple number-only shape', () => {
  assert.equal(getMatchMinute({ status: '1h', periodStartedAt: new Date(T0), now: T0 + 600_000 }), 11);
});
