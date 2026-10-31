import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arm, flashPair, flashStat, FLASH_STATS } from '../dist/arming.js';
import { MANIFEST } from '../dist/playout.js';

const def = MANIFEST.find((d) => d.id === 'miniStats');
const match = { homeTeam: { shortName: 'KDA' }, awayTeam: { shortName: 'SEL' } };
const live = {
  stats: {
    possession: { home: 55, away: 45 },
    shots: { home: { total: 6, on: 0 }, away: { total: 3, on: 0 } },
    corners: { home: 4, away: 2 },
  },
};
const context = (l) => ({ match, live: l, lineup: null, stats: null });
const bugUp = new Set(['scorebug']);

test('the pair comes from where the full board reads it', () => {
  assert.deepEqual(flashPair(live, 'shots'), [6, 3]);
  assert.deepEqual(flashPair(live, 'shotsOnTarget'), [0, 0]);
  assert.deepEqual(flashPair(live, 'corners'), [4, 2]);
  assert.deepEqual(flashPair(live, 'offsides'), [0, 0], 'missing is zero');
  assert.deepEqual(flashPair(null, 'possession'), [0, 0]);
});

test('a payload from before the change, or one it does not know, is possession', () => {
  assert.equal(flashStat(null), 'possession');
  assert.equal(flashStat(undefined), 'possession');
  assert.equal(flashStat({ stat: 'fouls' }), 'possession');
  assert.equal(flashStat({ stat: 'corners' }), 'corners');
});

test('one take per stat, each lit only when its pair sums above zero', () => {
  const a = arm(def, context(live), bugUp);
  assert.deepEqual(a.takes.map((t) => t.key), [...FLASH_STATS]);
  const ready = Object.fromEntries(a.takes.map((t) => [t.key, t.ready]));
  assert.deepEqual(ready, {
    possession: true,
    shots: true,
    shotsOnTarget: false,
    corners: true,
    offsides: false,
  });
  const corners = a.takes.find((t) => t.key === 'corners');
  assert.deepEqual(corners.data, { stat: 'corners' });
  assert.match(corners.summary, /KDA 4 – 2 SEL/);
  assert.equal(a.ready, true);
});

test('without the scorebug every take is dark, but the takes are still there', () => {
  const a = arm(def, context(live), new Set());
  assert.equal(a.ready, false);
  assert.equal(a.takes.length, FLASH_STATS.length);
  assert.ok(a.takes.every((t) => !t.ready));
});

test('nothing typed: the graphic is dark', () => {
  const a = arm(def, context({ stats: {} }), bugUp);
  assert.equal(a.ready, false);
  assert.ok(a.takes.every((t) => !t.ready));
});
