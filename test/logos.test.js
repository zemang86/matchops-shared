import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getLogoStoragePath, getBroadcastLogoUrl, getLogoPublicUrl, getLogoCacheKey } from '../dist/index.js';

const URL_BASE = 'https://abc.supabase.co';

test('storage path matches the uploader convention', () => {
  assert.equal(getLogoStoragePath('t1', 512), 't1/logo-512.webp');
  assert.equal(getLogoStoragePath('t1', 1024, 'png'), 't1/logo-1024.png');
});

test('broadcast URL is always PNG at 1024', () => {
  assert.equal(
    getBroadcastLogoUrl(URL_BASE, 't1'),
    'https://abc.supabase.co/storage/v1/object/public/team-logos/t1/logo-1024.png',
  );
});

test('a trailing slash on the supabase url does not double up', () => {
  assert.equal(getBroadcastLogoUrl('https://abc.supabase.co/', 't1'), getBroadcastLogoUrl(URL_BASE, 't1'));
});

test('no DOM access — must work in Electron main and Node', () => {
  assert.equal(typeof globalThis.document, 'undefined');
  assert.match(getLogoPublicUrl(URL_BASE, 't1'), /logo-512\.webp$/);
});

test('cache key changes when the badge is re-uploaded', () => {
  const a = getLogoCacheKey('t1', 1024, '2026-01-01T00:00:00Z');
  const b = getLogoCacheKey('t1', 1024, '2026-02-01T00:00:00Z');
  assert.notEqual(a, b, 'a re-upload must invalidate the cached copy');
  assert.equal(getLogoCacheKey('t1', 1024, null), 't1-1024-none');
});
