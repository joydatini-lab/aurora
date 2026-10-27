/**
 * Identity module — single-writer + key invariants (tranche 3 lot 3.3).
 *
 * Run: node --experimental-strip-types --no-warnings --test packages/identity/test/identity.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  IDENTITY_OWNED_TABLES,
  IDENTITY_PRODUCED_EVENTS,
  ensureUserContext,
  setTheme,
  updateCoachingPrefs,
} from '../src/index.ts';

const ctx = { userId: 'u1', clientId: 'client-a', now: 1_700_000_000_000 };

test('identity: owns exactly user_context (the routing table assigns it one table)', () => {
  assert.deepEqual([...IDENTITY_OWNED_TABLES], ['user_context']);
});

test('identity: the USER is the upsert key (0001: user_id is the PK, not a surrogate)', () => {
  const cmd = setTheme('u1', { theme: 'aurora', style: 'dark' }, ctx, 'm1');
  assert.equal(cmd.id, 'u1', 'user_context is keyed by the user, not by a row id');
  assert.equal(cmd.patch.theme, 'aurora');
  assert.equal(cmd.patch.theme_style, 'dark');
});

test('identity: setTheme writes the AD-17 pair (theme + orthogonal axis)', () => {
  const cmd = setTheme('u1', { theme: 'aurora', style: 'light' }, ctx, 'm1');
  assert.equal(cmd.table, 'user_context');
  assert.equal(cmd.patch.theme_style, 'light');
  // AD-17: the axis is orthogonal to the theme — both must be written together
  // or the UI can render a theme with a stale axis.
  assert.equal('theme' in cmd.patch, true);
  assert.equal('theme_style' in cmd.patch, true);
});

test('identity: ensureUserContext seeds the SSoT default theme (AD-17)', () => {
  const cmd = ensureUserContext('u1', ctx, 'm1');
  assert.equal(cmd.patch.theme, 'aurora', "'aurora' is the AD-17 default");
  assert.equal(cmd.patch.user_id, 'u1');
  assert.deepEqual(cmd.patch.prefs_added, { 'client-a': ctx.now });
});

test('identity: produces NO event (AD-9 vocabulary is closed at 9)', () => {
  assert.deepEqual([...IDENTITY_PRODUCED_EVENTS], []);
  const cmd = setTheme('u1', { theme: 'aurora', style: 'dark' }, ctx, 'm1');
  assert.equal(cmd.event, undefined);
});

test('identity: divergence D-7 is real — coaching prefs live in ONE jsonb column', () => {
  const cmd = updateCoachingPrefs('u1', { cadence: 'low', quietHours: ['22:00-07:00'] }, ctx, 'm1');
  assert.equal('coaching_prefs' in cmd.patch, true);
  // The SSoT declares coachCadence/quietHours as first-class fields; the table
  // does not. If a migration adds them, this test fails and the builder should
  // start writing them directly.
  assert.equal('coach_cadence' in cmd.patch, false);
  assert.equal('quiet_hours' in cmd.patch, false);
});

test('identity: divergence D-6 is real — user_context has no display_name column', () => {
  // The SSoT `UserContext` declares `displayName`; 0001 has no such column.
  const cmd = ensureUserContext('u1', ctx, 'm1');
  assert.equal('display_name' in cmd.patch, false);
});
