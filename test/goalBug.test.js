import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { arm } from '../dist/arming.js';
import * as playout from '../dist/playout.js';

const { MANIFEST } = playout;
const def = MANIFEST.find((d) => d.id === 'goalBug');
const match = { homeTeam: { shortName: 'JDT II' }, awayTeam: { shortName: 'SEL II' } };
const context = { match, live: null, lineup: null, stats: null };

beforeEach(() => {
  playout.hydrate({ seq: 0, panicSeq: null, layers: {}, actual: {} }, { timers: false });
});

test('it lives on the bug layer and clears itself', () => {
  assert.ok(def, 'goalBug is in the manifest');
  assert.equal(def.layer, 'bug');
  assert.ok(def.autoOut > 0, 'it must clear itself, or the bug never comes back off it');
  assert.equal(def.attachedTo, undefined, 'it replaces the bug rather than hanging off it');
});

test('one trigger per side, each carrying its side', () => {
  const armed = arm(def, context, new Set(['scorebug']));
  assert.equal(armed.ready, true);
  assert.deepEqual(armed.takes.map((t) => [t.key, t.label, t.data]), [
    ['home', 'JDT II', { side: 'home' }],
    ['away', 'SEL II', { side: 'away' }],
  ]);
});

test('dark without the bug, live while it or the celebration is up', () => {
  assert.equal(arm(def, context, new Set()).ready, false);
  assert.ok(arm(def, context, new Set()).takes.every((t) => !t.ready));
  assert.equal(arm(def, context, new Set(['goalBug'])).ready, true, 'a wrong side can be corrected mid-take');
  assert.equal(arm(def, context).ready, true, 'a caller with no playout state is not refused');
});

test('taking it over the bug takes what was docked to the bug off too', () => {
  playout.take('scorebug');
  playout.take('addedTime', { minutes: 3 });
  playout.take('miniStats', { stat: 'possession' });
  const state = playout.take('goalBug', { side: 'home' }).state;
  assert.equal(state.layers.bug.id, 'goalBug');
  assert.equal(state.layers.topper, null, 'added time went with the bug');
  assert.equal(state.layers.dock, null, 'the stat flash went with the bug');
});

test('re-taking the bug itself keeps what is docked to it', () => {
  playout.take('scorebug');
  playout.take('addedTime', { minutes: 3 });
  const state = playout.take('scorebug').state;
  assert.equal(state.layers.topper?.id, 'addedTime');
});
