/**
 * R2 storage adapter (AD-1 vendor isolation; AD-3 no client-held
 * credentials; F-06: binaries in R2, metadata in Postgres).
 *
 * The SSoT contract (`R2StoragePort`, the presign TTL constants, the
 * key-naming helpers) is declared in `@aurora/scientific-engine`
 * (packages/scientific-engine/src/r2.ts). This adapter is the
 * **dependency-free SigV4 implementation** that the scientific-engine
 * header defers to @aurora/integrations (AD-1): a plain `node:crypto`
 * signer over the S3-compatible R2 endpoint — the real presigning path,
 * not a stub shape. The earlier Bearer-token round-trip test
 * (`scripts/r2-roundtrip.mjs`) documents that the Bearer PUT is
 * rejected with "Please use AWS4-HMAC-SHA256"; a presigned S3 URL is
 * signed with SigV4, which is what this adapter produces.
 *
 * **No vendor SDK, no new dependency** (AD-1): `node:crypto`
 * `createHmac` / `createHash` + the global `fetch` only. The EF
 * (fn-job-dispatcher's `artifact_gen` handler, when it lands — gap
 * OQ-03) is the sole consumer that holds the credentials in its env
 * (`R2_ACCESS_KEY` + `R2_SECRET_KEY` + `CF_ACCOUNT_ID` +
 * `R2_S3_ENDPOINT`, all Supabase EF secrets, AD-3: never in the app
 * bundle, never in this repo). The device ever holds only a short-TTL
 * presigned URL.
 *
 * Degraded (AD-1 last paragraph): `isR2Configured()` is `false` when
 * the env is incomplete → callers catch `R2NotConfiguredError` and
 * degrade to the documented `r2_not_configured` result instead of a
 * stack trace (an optional capability, matching the OneSignal /
 * Research provider adapter pattern in this package).
 *
 * NOTE: the `R2StoragePort` interface below is a **structural
 * re-declaration** of the scientific-engine SSoT (same method
 * signatures) kept local so this package's `tsconfig` (references only
 * `@aurora/domain`) typechecks standalone — the two stay in sync by
 * the AD-15 "one contract, no drift" review, not by an import edge.
 *
 * S8.0 (plan 2026-10-17): NO static `node:crypto` import. This
 * package's index re-exports this module and the mobile app bundles
 * the package — a static `import { createHash } from 'node:crypto'`
 * therefore reaches the mobile `vite build:web` and hard-fails: Vite
 * externalizes `node:` builtins as `__vite-browser-external`, which
 * exports neither `createHmac` nor `createHash`. The module is
 * EF-side only (AD-3: presigning happens in the EF; the device ever
 * holds a short-TTL URL, never credentials), so in the browser bundle
 * `_loadNodeCrypto` resolves to `undefined` and any R2 call throws at
 * use time instead of at import time. In the node runtime (Supabase
 * EF, the `node --experimental-strip-types` test runner, plain `node`
 * ESM) `import.meta.resolve('node:crypto')` resolves and a dynamic
 * `import()` yields the real builtin.
 */
async function _loadNodeCrypto(): Promise<typeof import('node:crypto')> {
  // `import.meta.resolve` is a bare-specifier resolver available in
  // every Node ≥ 20.6 ESM context (incl. strip-types) and in the
  // browser (returns a shim URL — the dynamic import then either
  // yields the external module or throws, both caught below). A bare
  // `await import('node:crypto')` in browser source throws
  // "Uncaught [module] not found", so the URL form keeps the browser
  // path degrading instead of crashing the bundle at import time.
  try {
    const url: string = import.meta.resolve('node:crypto');
    return await import(url);
  } catch {
    // browser bundle: degrade — EF-side only (AD-3). Every R2 call
    // then throws at use time, which the app never does.
    return {} as typeof import('node:crypto');
  }
}

// ——— The SSoT contract (structural copy of R2StoragePort, AD-15) ———

export interface R2UploadPlan {
  r2Key: string;
  contentType: string;
  /** the presigned PUT URL the client uploads to directly */
  uploadUrl: string;
  ttlSec: number;
}

export interface R2StoragePort {
  presignGet(r2Key: string, ttlSec?: number): Promise<string>;
  presignUpload(r2Key: string, contentType: string, ttlSec?: number): Promise<R2UploadPlan>;
  /** confirm an upload actually landed (F-06: event fires ONLY post-upload) */
  head(r2Key: string): Promise<{ sizeBytes: number; contentType?: string }>;
}

/** Presign TTLs (01 §5.4 / scientific-engine r2.ts SSoT): 15 min GET, 5 min PUT. */
export const R2_PRESIGN_TTL_GET_SEC = 15 * 60;
export const R2_PRESIGN_TTL_UPLOAD_SEC = 5 * 60;

// ——— The credential source (AD-3: env ONLY, server-side) ———

/**
 * The R2 S3 credential pair + endpoint. The values are Supabase EF
 * secrets (AD-3, never bundled): `R2_ACCESS_KEY` (the SigV4
 * `AccessKeyId` — the account R2 access key, or the `CF_API_TOKEN` as a
 * documented fallback for dev round-trips), `R2_SECRET_KEY` (the SigV4
 * `SecretAccessKey`), `CF_ACCOUNT_ID`, `R2_S3_ENDPOINT`
 * (`https://{accountId}.r2.cloudflarestorage.com`), `R2_ENV`
 * (the {env} key-convention segment, r2.md §1), and the two buckets.
 * The getters are indirection points so the EF wiring + tests can
 * inject values without a hard dependency on the Deno runtime here
 * (the adapter is pure TS, importable under `node --experimental-
 * strip-types`; the EF is where the env is actually read).
 */
export interface R2CredentialSource {
  accessKey: string;
  secretKey: string;
  accountId: string;
  /** the S3 endpoint host, e.g. `https://{accountId}.r2.cloudflarestorage.com` */
  endpoint: string;
  /** the env segment of the key convention ({env}/{user}/..., r2.md §1) */
  envSegment: string;
  /** the artifact bucket (01 S5.4 frozen convention = `aurora-files-{env}`;
   * the CURRENT operational names `aurora-artifacts-prod` /
   * `aurora-media-prod` are the existing prod deploy — OQ-03 documents
   * the divergence; this adapter is parameterized so both work). */
  artifactsBucket: string;
  mediaBucket: string;
}

/** Whether the adapter can actually reach R2 (all pieces present). */
export function isR2Configured(source: R2CredentialSource): boolean {
  return Boolean(
    source.accessKey &&
      source.secretKey &&
      source.accountId &&
      source.endpoint &&
      source.artifactsBucket,
  );
}

/**
 * The AD-1 degradation error: the caller (an EF, a test) catches this
 * and logs / degrades to the documented `r2_not_configured` result
 * instead of a stack trace (the module is an optional capability,
 * mirroring the OneSignal + Research provider adapters in this package).
 */
export class R2NotConfiguredError extends Error {
  constructor(source: R2CredentialSource) {
    super(
      `R2 not configured (AD-3): missing ${[
        !source.accessKey && 'R2_ACCESS_KEY',
        !source.secretKey && 'R2_SECRET_KEY',
        !source.accountId && 'CF_ACCOUNT_ID',
        !source.endpoint && 'R2_S3_ENDPOINT',
        !source.artifactsBucket && 'R2_BUCKET_ARTIFACTS',
      ]
        .filter(Boolean)
        .join(' / ')}`,
    );
    this.name = 'R2NotConfiguredError';
  }
}

// ——— SigV4 over the R2 S3 endpoint (the real presigning path) ———

/**
 * R2 is region-agnostic, but SigV4 requires a region in the credential
 * scope; the conventional value for R2 is `us-east-1` (an artifact of
 * the S3 SigV4 spec, not a geographic claim — Cloudflare's own SigV4
 * examples for R2 use it verbatim).
 */
const R2_SIGV4_REGION = 'us-east-1';
const R2_SIGV4_SERVICE = 's3';

function _cryptoGuard(c: typeof import('node:crypto') | undefined, fn: 'createHash' | 'createHmac'): asserts c {
  if (!c?.[fn]) {
    throw new Error(
      'R2 node:crypto unavailable in this runtime (browser bundle — AD-3: presigning is EF-side only)',
    );
  }
}

/**
 * SHA-256 hex via `node:crypto` (loaded lazily — see `_loadNodeCrypto`
 * and the S8.0 note). Async: the dynamic `import` is the only path that
 * works in BOTH the strip-types node ESM context and the browser
 * degrade path. Callers are already async (EF handlers, the test
 * suite).
 */
async function sha256Hex(input: string): Promise<string> {
  const c = await _loadNodeCrypto();
  _cryptoGuard(c, 'createHash');
  return c!.createHash('sha256').update(input).digest('hex');
}

/** The HMAC-SHA256 derived-key chain (the 4 SigV4 steps, synchronous node:crypto). */
async function deriveSigningKey(secret: string, dateStamp: string): Promise<string> {
  const c = await _loadNodeCrypto();
  _cryptoGuard(c, 'createHmac');
  const createHmac = c!.createHmac;
  const hmacHex = (key: string, msg: string) =>
    createHmac('sha256', key).update(msg).digest('hex');
  const kDate = hmacHex(`AWS4${secret}`, dateStamp);
  const kRegion = hmacHex(kDate, R2_SIGV4_REGION);
  const kService = hmacHex(kRegion, R2_SIGV4_SERVICE);
  return hmacHex(kService, 'aws4-request');
}

/**
 * A SigV4 **query-string presigned URL** (the "query" variant — no
 * request body to sign; the signature lands in `X-Amz-Signature`).
 * `ttlSec` = the `X-Amz-Expires` value. This is the ONLY surface a
 * device ever holds (a bounded-TTL URL, AD-3 — never the raw
 * credential).
 *
 * S8.0: async (the lazy `node:crypto` loader is async — see the file
 * header). Every caller in this module + the EF + the round-trip test
 * is already on a `Promise` path.
 */
export async function presignR2Url(
  source: R2CredentialSource,
  opts: { method: 'GET' | 'PUT' | 'HEAD'; bucket: string; key: string; ttlSec: number },
): Promise<string> {
  const { method, bucket, key, ttlSec } = opts;
  const { accessKey, secretKey, endpoint } = source;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ''); // YYYYMMDDTHHMMSSZ
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${R2_SIGV4_REGION}/${R2_SIGV4_SERVICE}/aws4_request`;

  const host = new URL(endpoint).host;
  const encodedKey = key.split('/').map(encodeURIComponent).join('/');

  const params = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${accessKey}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(ttlSec),
    'X-Amz-SignedHeaders': 'host',
  });

  // The canonical request the signature freezes (empty payload hash —
  // a presigned URL signs no body; the `host` header is the single
  // signed header, carried via `X-Amz-SignedHeaders`).
  const canonicalRequest = [
    method,
    `/${bucket}/${encodedKey}`,
    `${params.toString()}&X-Amz-Signature=UNSIGNED`,
    `host:${host}\n`,
    'host',
    await sha256Hex(''),
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join('\n');

  const signingKey = await deriveSigningKey(secretKey, dateStamp);
  const c = await _loadNodeCrypto();
  _cryptoGuard(c, 'createHmac');
  const signature = c!.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  return `${endpoint}/${bucket}/${encodedKey}?${params.toString()}&X-Amz-Signature=${signature}`;
}

// ——— The SSoT port implementation ———

/**
 * The `R2StoragePort` (AD-15 contract) over Cloudflare R2. The `head()`
 * call issues a real SigV4-signed `HEAD` request — confirming an upload
 * landed (F-06: the artifact event fires ONLY post-upload) + returning
 * `sizeBytes` (the `artifacts.size_bytes` column, 01 S5.4).
 */
export class R2StorageAdapter implements R2StoragePort {
  private readonly source: R2CredentialSource;
  private readonly getFetch: () => typeof fetch;

  constructor(source: R2CredentialSource, getFetch: () => typeof fetch = () => fetch) {
    this.source = source;
    this.getFetch = getFetch;
  }

  private assertConfigured() {
    if (!isR2Configured(this.source)) throw new R2NotConfiguredError(this.source);
  }

  async presignGet(r2Key: string, ttlSec: number = R2_PRESIGN_TTL_GET_SEC): Promise<string> {
    this.assertConfigured();
    return presignR2Url(this.source, {
      method: 'GET',
      bucket: this.source.artifactsBucket,
      key: r2Key,
      ttlSec,
    });
  }

  async presignUpload(
    r2Key: string,
    contentType: string,
    ttlSec: number = R2_PRESIGN_TTL_UPLOAD_SEC,
  ): Promise<R2UploadPlan> {
    this.assertConfigured();
    const uploadUrl = await presignR2Url(this.source, {
      method: 'PUT',
      bucket: this.source.artifactsBucket,
      key: r2Key,
      ttlSec,
    });
    return { r2Key, contentType, uploadUrl, ttlSec };
  }

  async head(r2Key: string): Promise<{ sizeBytes: number; contentType?: string }> {
    this.assertConfigured();
    const url = await presignR2Url(this.source, {
      method: 'HEAD',
      bucket: this.source.artifactsBucket,
      key: r2Key,
      ttlSec: 60, // a short-lived HEAD, not a client download
    });
    const res = await this.getFetch()(url, { method: 'HEAD' });
    if (!res.ok) {
      throw new Error(`R2 HEAD ${r2Key} → HTTP ${res.status} (the object is not in the bucket yet)`);
    }
    return {
      sizeBytes: Number(res.headers.get('Content-Length') ?? 0),
      contentType: res.headers.get('Content-Type') ?? undefined,
    };
  }
}

/**
 * Key-convention helper (r2.md §1 SSoT = `{env}/{user_id}/{module}/
 * {yyyy}/{mm}/{dd}/{ULID}[_slug].{ext}`) — kept here so the EF's
 * `artifact_gen` handler + the round-trip test build keys identically.
 * ULIDs stay stable + sortable.
 */
export function r2KeyFor(
  env: string,
  userId: string,
  module: string,
  ulid: string,
  ext: string,
  slug?: string,
): string {
  const d = new Date();
  const yyyy = d.getUTCFullYear().toString();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const slugPart = slug ? `_${slug}` : '';
  return `${env}/${userId}/${module}/${yyyy}/${mm}/${dd}/${ulid}${slugPart}.${ext}`;
}
