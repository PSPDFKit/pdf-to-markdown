import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  PACKAGE, compareVersions, integrity, pack, publicationState, publishRelease,
  readManifest, remoteState, request, tagCommit, validateContext, validatePackage,
  validateReviews, validateWorkflow,
} from './release.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const sha = 'a'.repeat(40);
const manifest = {name: PACKAGE, version: '0.6.1', commit: sha, integrity: integrity('tarball')};
const published = {name: PACKAGE, version: manifest.version, dist: {integrity: manifest.integrity}};
const env = {BUILDKITE_PIPELINE_SLUG: 'pdf-to-markdown-npm-release', BUILDKITE_BRANCH: 'main',
  BUILDKITE_PULL_REQUEST: 'false', BUILDKITE_COMMIT: sha, BUILDKITE_SOURCE: 'ui'};

test('only manual builds of the selected main commit are eligible', () => {
  validateContext(env, sha);
  validateContext({...env, BUILDKITE_SOURCE: 'api'}, sha);
  for (const override of [
    {BUILDKITE_PIPELINE_SLUG: 'other'}, {BUILDKITE_BRANCH: 'feature'},
    {BUILDKITE_PULL_REQUEST: '20'}, {BUILDKITE_PULL_REQUEST: undefined},
    {BUILDKITE_SOURCE: 'webhook'}, {BUILDKITE_SOURCE: 'schedule'},
    {BUILDKITE_SOURCE: 'trigger'}, {BUILDKITE_COMMIT: 'HEAD'},
  ]) assert.throws(() => validateContext({...env, ...override}, sha));
  assert.throws(() => validateContext(env, 'b'.repeat(40)));
});

test('only the expected stable public, dependency-free package is allowed', () => {
  validatePackage(pkg);
  for (const override of [
    {name: '@other/package'}, {version: '0.6.1-beta.1'}, {version: '01.2.3'},
    {version: '1.2.3; echo bad'}, {private: true}, {publishConfig: {access: 'restricted'}},
    {dependencies: {example: '1.0.0'}}, {devDependencies: {example: '1.0.0'}}, {bin: {}},
  ]) assert.throws(() => validatePackage({...pkg, ...override}));
});

test('version comparison is numeric and rejects malformed or prerelease versions', () => {
  assert.equal(compareVersions('0.10.0', '0.9.99'), 1);
  assert.equal(compareVersions('1.0.0', '1.0.0'), 0);
  assert.equal(compareVersions('0.6.0', '0.6.1'), -1);
  assert.throws(() => compareVersions('next', '0.6.1'));
  assert.throws(() => compareVersions('0.6.1-beta.1', '0.6.1'));
});

test('validation must be completed and successful for the exact main push', () => {
  const run = {head_sha: sha, head_branch: 'main', event: 'push', status: 'completed', conclusion: 'success'};
  validateWorkflow([run], sha);
  for (const override of [{status: 'in_progress'}, {conclusion: 'failure'},
    {head_sha: 'b'.repeat(40)}, {head_branch: 'feature'}, {event: 'pull_request'}]) {
    assert.throws(() => validateWorkflow([{...run, ...override}], sha));
  }
  assert.throws(() => validateWorkflow([{...run, conclusion: 'failure'}, run], sha));
  assert.throws(() => validateWorkflow([], sha));
});

test('trusted review decisions retain approvals across comments but honor dismissal and changes requested', () => {
  const review = state => ({user: {login: 'reviewer'}, author_association: 'MEMBER', state});
  validateReviews([review('APPROVED'), review('COMMENTED')]);
  for (const reviews of [[], [review('COMMENTED')], [review('APPROVED'), review('DISMISSED')],
    [{...review('APPROVED'), author_association: 'NONE'}],
    [review('APPROVED'), {...review('CHANGES_REQUESTED'), user: {login: 'other'}}]]) {
    assert.throws(() => validateReviews(reviews));
  }
});

test('new publication requires a version higher than latest', () => {
  assert.equal(publicationState(manifest, null, {version: '0.6.0'}, null), 'new');
  assert.equal(publicationState(manifest, null, null, null), 'new');
  assert.throws(() => publicationState(manifest, null, {version: '0.6.1'}, null));
  assert.throws(() => publicationState(manifest, null, {version: '0.7.0'}, null));
});

test('an identical published tarball can resume without moving latest backwards', () => {
  assert.equal(publicationState(manifest, published, {version: '0.6.1'}, sha), 'resume');
  assert.equal(publicationState(manifest, published, {version: '0.7.0'}, null), 'resume');
});

test('different contents, conflicting tags, and inconsistent latest fail closed', () => {
  assert.throws(() => publicationState(manifest, {...published, dist: {integrity: 'different'}}, {version: '0.6.1'}, null));
  assert.throws(() => publicationState(manifest, published, {version: '0.6.1'}, 'b'.repeat(40)));
  assert.throws(() => publicationState(manifest, published, {version: '0.6.0'}, null));
  assert.throws(() => publicationState(manifest, published, null, null));
});

test('lightweight and annotated tags resolve to a commit', async () => {
  assert.equal(await tagCommit('0.6.1', async () => null), null);
  assert.equal(await tagCommit('0.6.1', async () => ({object: {type: 'commit', sha}})), sha);
  let calls = 0;
  assert.equal(await tagCommit('0.6.1', async () => ({object: ++calls === 1 ?
    {type: 'tag', sha: 'b'.repeat(40)} : {type: 'commit', sha}})), sha);
  await assert.rejects(tagCommit('0.6.1', async () => ({object: {type: 'tree', sha}})));
});

test('registry/network failures are not treated as an unpublished version', async () => {
  await assert.rejects(remoteState(manifest, async () => { throw new Error('HTTP 503'); }), /503/);
});

test('HTTP 404 is the only missing response; authentication and network errors propagate', async t => {
  t.mock.method(globalThis, 'fetch', async () => ({status: 404, ok: false}));
  assert.equal(await request('https://example.test/package', {missing: true}), null);
  await assert.rejects(request('https://example.test/package'), /404/);
  for (const status of [401, 403, 429, 500, 503]) {
    globalThis.fetch.mock.mockImplementation(async () => ({status, ok: false}));
    await assert.rejects(request('https://example.test/package', {missing: true}), new RegExp(String(status)));
  }
});

test('publication happens before verification and tagging', async () => {
  const calls = [];
  await publishRelease(manifest, {
    log: () => {},
    state: async () => 'new', publish: async () => calls.push('publish'),
    verify: async () => { calls.push('verify'); return 'resume'; },
    tag: async () => calls.push('tag'),
  });
  assert.deepEqual(calls, ['publish', 'verify', 'tag']);
});

test('retry after a tagging failure does not publish twice', async () => {
  let live = false, publications = 0, tags = 0;
  const options = {
    log: () => {},
    state: async () => live ? 'resume' : 'new',
    publish: async () => { publications++; live = true; }, verify: async () => 'resume',
    tag: async () => { if (++tags === 1) throw new Error('GitHub unavailable'); },
  };
  await assert.rejects(publishRelease(manifest, options), /GitHub unavailable/);
  await publishRelease(manifest, options);
  assert.equal(publications, 1);
  assert.equal(tags, 2);
});

test('ambiguous npm success is reconciled from the registry on retry', async () => {
  let live = false, publications = 0;
  const options = {
    log: () => {},
    state: async () => live ? 'resume' : 'new',
    publish: async () => { publications++; live = true; throw new Error('connection lost after upload'); },
    verify: async () => 'resume', tag: async () => {},
  };
  await assert.rejects(publishRelease(manifest, options), /connection lost/);
  await publishRelease(manifest, options);
  assert.equal(publications, 1);
});

test('verification failure prevents creating a release tag', async () => {
  let tagged = false;
  await assert.rejects(publishRelease(manifest, {
    log: () => {},
    state: async () => 'new', publish: async () => {},
    verify: async () => { throw new Error('different contents'); },
    tag: async () => { tagged = true; },
  }), /different contents/);
  assert.equal(tagged, false);
});

test('real npm pack contains only the public files and its recorded digest matches', () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'npm-release-pack-test-'));
  try {
    const result = pack(root, temporary, sha);
    assert.equal(result.name, PACKAGE);
    assert.equal(result.integrity, integrity(fs.readFileSync(path.join(temporary, result.filename))));
    assert.equal(result.commit, sha);
  } finally {
    fs.rmSync(temporary, {recursive: true, force: true});
  }
});

test('downloaded artifacts must match the selected commit, digest, and reviewed source', () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'npm-release-artifact-test-'));
  try {
    // A disposable source tree: never modify the developer checkout in a test.
    for (const file of ['LICENSE.md', 'README.md', 'bin/nutrient', 'bin/pdf-to-markdown',
      'bin/pdf-to-text', 'bin/query', 'docs/benchmarks.md', 'install.sh', 'package.json']) {
      const target = path.join(temporary, file);
      fs.mkdirSync(path.dirname(target), {recursive: true});
      fs.copyFileSync(path.join(root, file), target);
    }
    const destination = path.join(temporary, '.release-build');
    const result = pack(temporary, destination, sha);
    assert.deepEqual(readManifest(temporary, sha), result);
    assert.throws(() => readManifest(temporary, 'b'.repeat(40)));
    fs.appendFileSync(path.join(temporary, 'README.md'), '\nchanged\n');
    assert.throws(() => readManifest(temporary, sha), /differs from source/);
    fs.appendFileSync(path.join(destination, result.filename), 'corruption');
    assert.throws(() => readManifest(temporary, sha), /integrity mismatch/);
  } finally {
    fs.rmSync(temporary, {recursive: true, force: true});
  }
});
