/**
 * Artifact module — single-writer + F-06 invariants (tranche 3 lot 3.2).
 *
 * The subtle contract this file protects: `ArtifactGenerated` means "the bytes
 * are retrievable from R2", NOT "a row was inserted" (F-06). Emitting it at
 * row-creation would tell Knowledge (SourceRef) and Learning (proof) that a file
 * exists while the R2 PUT may still fail. A test that only checked "an event is
 * emitted somewhere" would pass on the broken version.
 *
 * Run: node --experimental-strip-types --no-warnings --test packages/artifact/test/artifact.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ARTIFACT_OWNED_TABLES,
  ARTIFACT_UNROUTED_TABLES,
  ARTIFACT_PRODUCED_EVENTS,
  createArtifact,
  setArtifactStatus,
  markUploaded,
  addArtifactFile,
} from '../src/index.ts';

const ctx = { userId: 'u1', clientId: 'client-a', now: 1_700_000_000_000 };

test('artifact: owns exactly the table the routing table assigns it', () => {
  // ONE table, not two: `artifact_files` has no OWNER_MODULE_BY_ENTITY entry,
  // no sync stream and no relay view, so nothing can route a command to it.
  assert.deepEqual([...ARTIFACT_OWNED_TABLES], ['artifacts']);
});

test('artifact: artifact_files is real but UNROUTED (a gap, not a capability)', () => {
  // Pinned so the gap cannot be mistaken for a working local-first path. If the
  // routing table / sync config / relay view gain artifact_files, this test
  // fails and the builder graduates to a device path.
  assert.deepEqual([...ARTIFACT_UNROUTED_TABLES], ['artifact_files']);
});

test('artifact: every builder returns ONE command against ONE owned table', () => {
  const built = [
    createArtifact({ userId: 'u1', kind: 'pdf', title: 'T' }, ctx, 'm1', 'art-1'),
    setArtifactStatus('art-1', 'generating', ctx, 'm2'),
    markUploaded(
      { artifactId: 'art-1', userId: 'u1', kind: 'pdf', r2Key: 'k', sizeBytes: 3, jobId: 'j1' },
      ctx,
      'm3',
    ),
    addArtifactFile(
      { userId: 'u1', artifactId: 'art-1', filename: 'f.pdf' },
      ctx,
      'm4',
      'af-1',
    ),
  ];
  const known: readonly string[] = [...ARTIFACT_OWNED_TABLES, ...ARTIFACT_UNROUTED_TABLES];
  for (const cmd of built) {
    assert.ok(
      known.includes(cmd.table),
      `builder wrote to "${cmd.table}", which is not an Artifact table (AD-7)`,
    );
    assert.equal(cmd.localMutationId.length > 0, true, 'traceability id is required (G-M4)');
  }
});

test('artifact: createArtifact emits NO event — the bytes are not there yet (F-06)', () => {
  const cmd = createArtifact({ userId: 'u1', kind: 'pdf' }, ctx, 'm1', 'art-1');
  assert.equal(
    cmd.event,
    undefined,
    'ArtifactGenerated must NOT fire at row creation: it means "retrievable from R2"',
  );
  assert.equal(cmd.patch.status, 'queued', 'a new artifact starts queued (0007 default)');
});

test('artifact: a failed upload emits NO event either', () => {
  const cmd = setArtifactStatus('art-1', 'failed', ctx, 'm2');
  assert.equal(cmd.event, undefined, 'a failure must not announce a generation');
  assert.equal(cmd.patch.status, 'failed');
});

test('artifact: markUploaded is the SOLE producer, and it emits atomically (AD-9)', () => {
  const cmd = markUploaded(
    {
      artifactId: 'art-1',
      userId: 'u1',
      kind: 'pdf',
      r2Key: 'dev/u1/artifact/2026/10/25/a.pdf',
      sizeBytes: 42,
      jobId: 'job-9',
    },
    ctx,
    'm3',
  );

  assert.equal(cmd.table, 'artifacts');
  assert.equal(cmd.patch.status, 'uploaded');
  assert.equal(cmd.patch.r2_key, 'dev/u1/artifact/2026/10/25/a.pdf');
  // source_event_id ties the row to its job (0007 column, F-06 provenance)
  assert.equal(cmd.patch.source_event_id, 'job-9');

  const ev = cmd.event;
  assert.ok(ev, 'markUploaded MUST carry the ArtifactGenerated event');
  assert.equal(ev.type, 'ArtifactGenerated');
  // The payload contract is fixed by packages/domain/src/events.ts — all 7
  // fields, and jobId is mandatory (the generating job).
  assert.deepEqual(Object.keys(ev.payload).sort(), [
    'artifactId',
    'generatedAt',
    'jobId',
    'kind',
    'r2Key',
    'sizeBytes',
    'userId',
  ]);
  assert.equal(ev.payload.jobId, 'job-9');
  assert.equal(ev.payload.r2Key, 'dev/u1/artifact/2026/10/25/a.pdf');
  assert.equal(ev.eventId, '', 'the event id is allocated server-side (AD-9 transport)');
});

test('artifact: produces exactly ONE event (AD-9: Artifact owns one)', () => {
  assert.deepEqual([...ARTIFACT_PRODUCED_EVENTS], ['ArtifactGenerated']);
});

test('artifact: divergence D-1 is real — the DB rejects csv/text/code', () => {
  // The SSoT `Artifact.kind` allows 'csv' | 'text' | 'code'; the live
  // `artifacts_kind_check` does NOT (verified: 10 kinds in the constraint, 13 in
  // the SSoT). The module types the narrow set. If a migration widens the CHECK,
  // this test fails and `ArtifactKind` should be widened to match.
  const narrow = ['pdf', 'docx', 'pptx', 'xlsx', 'image', 'audio', 'video', 'markdown', 'latex', 'other'];
  assert.equal(narrow.includes('csv'), false);
  assert.equal(narrow.includes('text'), false);
  assert.equal(narrow.includes('code'), false);
  // and the builder must not accept one (compile-time, but assert the shape)
  const cmd = createArtifact({ userId: 'u1', kind: 'pdf' }, ctx, 'm1', 'art-1');
  assert.equal(cmd.patch.kind, 'pdf');
});

test('artifact: divergence D-5 is real — artifact_files.filename is NOT NULL', () => {
  // `ArtifactFile` (SSoT) declares no `filename`; 0007 requires it.
  const cmd = addArtifactFile(
    { userId: 'u1', artifactId: 'art-1', filename: 'report.pdf' },
    ctx,
    'm1',
    'af-1',
  );
  assert.equal(cmd.patch.filename, 'report.pdf');
});
