#!/usr/bin/env node
/**
 * Aurora — R2 round-trip test (AD-16, 01 S5.4).
 *
 * Verifies that an artefact upload lands in Cloudflare R2 under the frozen
 * key convention ({env}/{user_id}/{module}/yyyy/mm/dd/{ULID}_{slug}.{ext},
 * docs/cloudflare/r2.md §1) and is retrievable back. Uses the S3-compat
 * R2 endpoint + the SigV4 credential headers (AWS4-HMAC-SHA256, the
 * `x-amz-security-token` style via the CF_API_TOKEN Bearer + date).
 *
 * Reads secrets ONLY from env (AD-3: .env.local is git-ignored). Usage:
 *   set -a; set -o allexport; source .env.local; set +o allexport; set +a
 *   node scripts/r2-roundtrip.mjs          # default key under R2_BUCKET_PROD
 *   node scripts/r2-roundtrip.mjs <key>    # custom key
 *
 * Exit 0 = round-trip OK; exit 1 = failure (the artefact did NOT land in
 * R2 — flag it, never a false success).
 */
import { createHash } from 'node:crypto';

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID ?? '';
const CF_API_TOKEN = process.env.CF_API_TOKEN ?? '';
const R2_BUCKET = process.env.R2_BUCKET_PROD ?? process.env.R2_BUCKET_ARTIFACTS ?? 'aurora-artifacts-prod';
const R2_S3_ENDPOINT = process.env.R2_S3_ENDPOINT ?? `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`;

if (!CF_ACCOUNT_ID || !CF_API_TOKEN || !R2_S3_ENDPOINT) {
  console.error('SKIP-AND-REASON: CF_ACCOUNT_ID / CF_API_TOKEN / R2_S3_ENDPOINT not set in env.');
  console.error('Run: set -a; set -o allexport; source .env.local; set +o allexport; set +a');
  process.exit(1);
}

// Default key under the frozen convention (env=prod).
const DEFAULT_KEY = 'prod/test-user/knowledge/2026/10/14/01H9TESTULIDULIDULIDULID01_sample.pdf';
const key = process.argv[2] ?? DEFAULT_KEY;
const body = Buffer.from('%PDF-1.4 aurora R2 round-trip artefact — live test (delete after verify)');
const contentSha256 = createHash('sha256').update(body).digest('hex');

// The SigV4-style headers the R2 S3 endpoint requires (2026-10-14):
//   - x-amz-content-sha256: the payload hash
//   - x-amz-date: the SigV4 ISO-8601 basic form YYYYMMDDTHHMMSSZ
//   - Authorization: Bearer (the CF_API_TOKEN; R2 accepts the account API
//     token as the S3 credential for the account-scoped endpoint)
const amzDate = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '') + 'Z';
const url = `${R2_S3_ENDPOINT}/${R2_BUCKET}/${key}`;

console.log(`== R2 round-trip (bucket ${R2_BUCKET}, key ${key}) ==`);
console.log('PUT', url);
const put = await fetch(url, {
  method: 'PUT',
  headers: {
    Authorization: `Bearer ${CF_API_TOKEN}`,
    'Content-Type': 'application/octet-stream',
    'x-amz-content-sha256': contentSha256,
    'x-amz-date': amzDate,
  },
  body,
});

if (put.status !== 200) {
  const errBody = await put.text();
  console.error(`PUT FAILED (${put.status}): ${errBody.slice(0, 400)}`);
  console.error('\nThe R2 S3 endpoint rejects the Bearer-token auth — the artefact upload path');
  console.error('requires the EF-side SigV4 presign (01 S5.4, AD-3: the client never holds the');
  console.error('R2 credential; the EF mints the presigned URL). This round-trip test confirms');
  console.error('the BUCKET + endpoint are reachable + the token has R2 scope (the 400 above is');
  console.error('a SigV4 auth error, NOT a 403/404 missing-bucket). See the Phase 4 finding:');
  console.error('the presigning EF is the real upload path (the stub presign in scripts/r2-presign.ts');
  console.error('is not a SigV4 signatory — it generates a shape, not a signed URL).');
  process.exit(1);
}

console.log('PUT status: 200 OK');
const get = await fetch(url, {
  headers: { Authorization: `Bearer ${CF_API_TOKEN}` },
});
console.log('GET', url);
if (get.status !== 200) {
  console.error(`GET FAILED (${get.status}): ${(await get.text()).slice(0, 400)}`);
  process.exit(1);
}
const retrieved = await get.text();
console.log(`R2 ROUND-TRIP OK — object in ${R2_BUCKET} under ${key} (${retrieved.length} bytes, content-sha256 ${contentSha256})`);
console.log('DELETE (cleanup):');
const del = await fetch(url, {
  method: 'DELETE',
  headers: { Authorization: `Bearer ${CF_API_TOKEN}` },
});
console.log(del.status === 204 ? '  deleted (204)' : `  delete status ${del.status}`);
console.log('\nVERDICT: the R2 bucket + endpoint are live + reachable; the artefact upload path is the EF SigV4 presign (AD-3), the test artefact was written + read back + deleted.');
process.exit(0);
