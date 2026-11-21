import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { offsetFrom, measureOffset } from '../dist/clocksync.js';
import * as playout from '../dist/playout.js';

test('the offset comes from the quickest round trip, at its midpoint', () => {
  // This device is 136s slow. The slow sample's midpoint guess is 400ms out; the quick one's is right.
  const samples = [
    { sent: 1_000, server: 137_800, received: 2_000 }, // 1000ms trip, server answered late in it
    { sent: 5_000, server: 141_050, received: 5_100 }, // 100ms trip
    { sent: 9_000, server: 145_100, received: 9_300 }, // 300ms trip
  ];
  assert.deepEqual(offsetFrom(samples), { offset: 136_000, roundTrip: 100 });
});

test('a device that is fast gets a negative offset', () => {
  assert.equal(offsetFrom([{ sent: 200_000, server: 64_050, received: 200_100 }])?.offset, -136_000);
});

test('samples a moved clock or a bad answer would corrupt are discarded, not believed', () => {
  const backwards = { sent: 10_000, server: 999_999, received: 9_000 };
  const garbage = { sent: 1_000, server: Number.NaN, received: 1_050 };
  const good = { sent: 1_000, server: 1_550, received: 1_100 };
  assert.deepEqual(offsetFrom([backwards, garbage, good]), { offset: 500, roundTrip: 100 });
  assert.equal(offsetFrom([backwards, garbage]), null);
  assert.equal(offsetFrom([]), null);
});

test('measureOffset asks one at a time, survives a failed sample, and returns null when all fail', async () => {
  let t = 0;
  const now = () => t;
  let inFlight = 0;
  let calls = 0;
  const ask = async () => {
    calls += 1;
    assert.equal(inFlight, 0, 'samples must not overlap');
    inFlight += 1;
    t += calls === 2 ? 40 : 200; // the second sample is the quick one
    inFlight -= 1;
    if (calls === 3) throw new Error('dropped');
    return t - (calls === 2 ? 20 : 100) + 5_000; // server is 5s ahead
  };
  assert.deepEqual(await measureOffset(ask, 3, now), { offset: 5_000, roundTrip: 40 });
  assert.equal(calls, 3);

  assert.equal(await measureOffset(async () => { throw new Error('down'); }, 3, now), null);
});

beforeEach(() => {
  playout.hydrate({ seq: 0, panicSeq: null, layers: {}, actual: {} }, { timers: false });
});

test('take stamps the time it is given, so a panel on server time stamps server time', () => {
  const at = 1_795_270_000_000;
  const result = playout.take('miniStats', null, at);
  // miniStats hangs off the scorebug, so it is refused alone; take the host first.
  assert.equal(result.ok, false);
  playout.take('scorebug', null, at);
  const taken = playout.take('miniStats', null, at);
  assert.equal(taken.ok, true);
  const entry = taken.state.layers.dock;
  assert.equal(entry.takenAt, at);
  assert.equal(entry.autoOutAt, at + 12_000);
  assert.equal(taken.state.layers.bug.autoOutAt, null, 'the scorebug has no auto-out');
});

test('take without a time behaves exactly as before: stamped with this device clock', () => {
  const before = Date.now();
  const { state } = playout.take('goal', { side: 'home' });
  const after = Date.now();
  const entry = state.layers.lower;
  assert.ok(entry.takenAt >= before && entry.takenAt <= after);
  assert.equal(entry.autoOutAt - entry.takenAt, 8_000);
});
