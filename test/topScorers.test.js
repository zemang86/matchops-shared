import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arm } from '../dist/arming.js';
import { MANIFEST } from '../dist/playout.js';

const def = MANIFEST.find((d) => d.id === 'topScorers');
const match = { homeTeam: { shortName: 'PRK' }, awayTeam: { shortName: 'JDTII' } };
const row = (rank, name, teamShort, goals, side = null, added = 0) => ({
  rank, name, player: name, team: teamShort, teamShort, logo: null, goals, added, side,
});
const context = (league) => ({ match, live: null, lineup: null, stats: null, league });

test('a pre-match panel down the side, not a full frame', () => {
  assert.equal(def.group, 'prematch');
  assert.equal(def.layer, 'full');
  assert.deepEqual(def.hides, [], 'clear of the bug, so it does not duck it');
  assert.equal(def.feed, 'live');
  assert.equal(def.autoOut, null);
});

test('no league is dark, with the same reason as the league straps', () => {
  const a = arm(def, context(null));
  assert.equal(a.ready, false);
  assert.match(a.summary, /No league table/);
});

test('a league feed from before the chart was served is dark, not an empty panel', () => {
  const a = arm(def, context({ facts: [] }));
  assert.equal(a.ready, false);
  assert.match(a.summary, /needs updating/);
});

test('an empty chart is dark and says so', () => {
  const a = arm(def, context({ topScorers: { rows: [], tiedBeyond: null } }));
  assert.equal(a.ready, false);
  assert.match(a.summary, /empty/);
});

test('ready: the leader, and how many rows are tonight\'s clubs', () => {
  const rows = [row(1, 'MACIAS', 'JDTII', 7, 'away'), row(2, 'SYUKUR', 'JDTII', 5, 'away'), row(2, 'MUSA J.', 'USM', 5)];
  const a = arm(def, context({ topScorers: { rows, tiedBeyond: null } }));
  assert.equal(a.ready, true);
  assert.equal(a.summary, "MACIAS (JDTII) leads on 7 · 2 of 3 from tonight's clubs");
});

test('a shared lead names both, a crowded one counts them, tonight\'s goals are said', () => {
  const two = [row(1, 'LUAN BORGES', 'PRK', 4, 'home', 2), row(1, 'SYUKUR', 'JDTII', 4, 'away')];
  assert.equal(
    arm(def, context({ topScorers: { rows: two, tiedBeyond: null } })).summary,
    "LUAN BORGES (PRK) and SYUKUR (JDTII) lead on 4 · 2 of 2 from tonight's clubs · tonight's goals counted",
  );
  const three = [row(1, 'A', 'X', 3), row(1, 'B', null, 3), row(1, 'C', 'Y', 3)];
  assert.match(arm(def, context({ topScorers: { rows: three, tiedBeyond: null } })).summary, /^3 players lead on 3/);
});
