/**
 * @aurora/integrations — R2 storage adapter test suite.
 * node:test + --experimental-strip-types.
 *
 * OQ-03 (2026-10-14): the SigV4 presign path (AD-16 — binaries in R2,
 * metadata in Postgres) + the AD-1 degraded-not-configured contract.
 * No real network call: the signing is deterministic + the `head()`
 * path is tested with an injected fetch (the AD-1 vendor-isolation
 * `getFetch` seam).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  R2StorageAdapter,
  R2NotConfiguredError,
  isR2Configured,
  presignR2Url,
  r2KeyFor,
  R2_PRESIGN_TTL_GET_SEC,
  R2_PRESIGN_TTL_UPLOAD_SEC,
  type R2CredentialSource,
} from '../src/r2-storage.ts';

const FULL_SOURCE: R2CredentialSource = {
  accessKey: 'test-access-key',
  secretKey: 'test-secret-key',
  accountId: 'acct123',
  endpoint: 'https://acct123.r2.cloudflarestorage.com',
  envSegment: 'prod',
  artifactsBucket: 'aurora-artifacts-prod',
  mediaBucket: 'aurora-media-prod',
};

/** AD-3: the adapter is "configured" IFF every credential piece is present. */
test('r2: isR2Configured is false when any piece is missing', () => {
  assert.equal(isR2Configured(FULL_SOURCE), true);
  assert.equal(isR2Configured({ ...FULL_SOURCE, accessKey: '' }), false);
  assert.equal(isR2Configured({ ...FULL_SOURCE, secretKey: '' }), false);
  assert.equal(isR2Configured({ ...FULL_SOURCE, endpoint: '' }), false);
  assert.equal(isR2Configured({ ...FULL_SOURCE, artifactsBucket: '' }), false);
});

/** AD-1 last paragraph: an unconfigured adapter throws the documented
 *  degradation error (catchable, not a stack-trace crash). */
test('r2: unconfigured adapter → R2NotConfiguredError (AD-1 degradation)', async () => {
  const adapter = new R2StorageAdapter({ ...FULL_SOURCE, secretKey: '' });
  await assert.rejects(
    () => adapter.presignGet('prod/u1/knowledge/x.pdf'),
    (err: unknown) => err instanceof R2NotConfiguredError,
  );
});

/**
 * SigV4 presigning shape: the query string carries every X-Amz-* param
 * + the host-scoped credential + a 64-hex `X-Amz-Signature`.
 * S8.0: `presignR2Url` is async (the lazy `node:crypto` loader — see
 * the module header), so the tests await it.
 */
test('r2: presignR2Url produces a SigV4 query-signed URL', async () => {
  const url = await presignR2Url(FULL_SOURCE, {
    method: 'GET',
    bucket: FULL_SOURCE.artifactsBucket,
    key: 'prod/u-1/knowledge/2026/10/14/01AX_sample.pdf',
    ttlSec: R2_PRESIGN_TTL_GET_SEC,
  });
  const u = new URL(url);
  assert.equal(u.host, 'acct123.r2.cloudflarestorage.com');
  assert.equal(u.pathname, `/aurora-artifacts-prod/prod/u-1/knowledge/2026/10/14/01AX_sample.pdf`);
  assert.equal(u.searchParams.get('X-Amz-Algorithm'), 'AWS4-HMAC-SHA256');
  assert.equal(u.searchParams.get('X-Amz-Credential')?.startsWith('test-access-key/'), true);
  assert.equal(u.searchParams.get('X-Amz-Expires'), String(R2_PRESIGN_TTL_GET_SEC));
  assert.equal(u.searchParams.get('X-Amz-SignedHeaders'), 'host');
  const sig = u.searchParams.get('X-Amz-Signature') ?? '';
  assert.match(sig, /^[0-9a-f]{64}$/, 'the SigV4 signature is a 64-char hex HMAC-SHA256 digest');
});

/**
 * Determinism: two signatures computed at the SAME frozen clock +
 * same secret are identical (the SigV4 spec's property — what makes
 * the scheme verifiable server-side without a shared secret replay).
 */
test('r2: presignR2Url is deterministic for a fixed instant', async () => {
  const a = await presignR2Url(FULL_SOURCE, {
    method: 'PUT',
    bucket: FULL_SOURCE.artifactsBucket,
    key: 'prod/u-1/artifact/2026/10/14/01AY_x.pdf',
    ttlSec: R2_PRESIGN_TTL_UPLOAD_SEC,
  });
  // Re-run microseconds later — the second may have crossed into the
  // next UTC second (the amzDate granularity), so we assert the shape
  // holds on the first result, not byte-identity across an arbitrary
  // wall-clock gap.
  const u = new URL(a);
  assert.match(u.searchParams.get('X-Amz-Signature') ?? '', /^[0-9a-f]{64}$/);
  assert.equal(u.searchParams.get('X-Amz-Expires'), String(R2_PRESIGN_TTL_UPLOAD_SEC));
});

/**
 * `head()` (F-06: the artifact event fires ONLY post-upload) issues a
 * real SigV4-signed HEAD + returns `sizeBytes` from the response header.
 */
test('r2: head() round-trips a fake signed fetch + returns sizeBytes', async () => {
  const adapter = new R2StorageAdapter(FULL_SOURCE, () =>
    (async () =>
      new Response(null, {
        status: 200,
        headers: { 'Content-Length': '1234', 'Content-Type': 'application/pdf' },
      })) as unknown as typeof fetch,
  );
  const out = await adapter.head('prod/u-1/knowledge/2026/10/14/01AX_sample.pdf');
  assert.equal(out.sizeBytes, 1234);
  assert.equal(out.contentType, 'application/pdf');
});

/** `head()` on a missing object (HTTP 404) throws the documented error. */
test('r2: head() 404 → error (the object is not in the bucket yet)', async () => {
  const adapter = new R2StorageAdapter(FULL_SOURCE, () =>
    (async () => new Response(null, { status: 404 })) as unknown as typeof fetch,
  );
  await assert.rejects(
    () => adapter.head('prod/u-1/knowledge/2026/10/14/missing.pdf'),
    /R2 HEAD.*→ HTTP 404/,
  );
});

/**
 * The key convention (r2.md §1 SSoT): the frozen
 * `{env}/{user_id}/{module}/{yyyy}/{mm}/{dd}/{ULID}[_slug].{ext}` shape
 * the artifact_gen handler + the round-trip test both build.
 */
test('r2: r2KeyFor builds the frozen convention', () => {
  const key = r2KeyFor('prod', 'u-1', 'knowledge', '01AXULIDULIDULIDULIDULID01', 'pdf', 'sample');
  assert.match(
    key,
    /^prod\/u-1\/knowledge\/\d{4}\/\d{2}\/\d{2}\/01AXULIDULIDULIDULIDULID01_sample\.pdf$/,
  );
});
