import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {
  PACKAGE, GITHUB, REGISTRY, command, compareVersions, integrity, pack,
  readManifest, publishRelease, request, tagCommit, main,
} from './release.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sha = 'a'.repeat(40);
const manifest = {name: PACKAGE, version: '0.6.1', commit: sha, integrity: integrity('tarball')};
const published = {version: manifest.version, dist: {integrity: manifest.integrity}};

function registry(overrides = {}) {
  const state = {published: null, latest: {version: '0.6.0'}, tag: null, ...overrides};
  const writes = [];
  return {state, writes, options: {
    log: () => {}, sleep: async () => {},
    publish: async () => { writes.push('publish'); state.published = published; state.latest = published; },
    read: async (url, options = {}) => {
      if (url === `${GITHUB}/git/refs`) {
        assert.equal(options.method, 'POST');
        assert.deepEqual(options.body, {ref: 'refs/tags/v0.6.1', sha});
        writes.push('tag'); state.tag = sha;
        return {object: {type: 'commit', sha}};
      }
      if (url === `${GITHUB}/git/ref/tags/v0.6.1`) return state.tag ? {object: {type: 'commit', sha: state.tag}} : null;
      if (url === `${REGISTRY}/0.6.1`) return state.published;
      if (url === `${REGISTRY}/latest`) return state.latest;
      throw new Error(`Unexpected request: ${url}`);
    },
  }};
}

test('stable versions compare numerically', () => {
  assert.equal(compareVersions('0.10.0', '0.9.99'), 1);
  assert.equal(compareVersions('1.0.0', '1.0.0'), 0);
  assert.equal(compareVersions('0.6.0', '0.6.1'), -1);
  for (const version of ['next', '01.2.3', '1.0.0-beta']) assert.throws(() => compareVersions(version, '1.0.0'));
});

test('publishes then creates the tag; an identical retry makes no writes', async () => {
  const f = registry();
  await publishRelease(manifest, f.options);
  assert.deepEqual(f.writes, ['publish', 'tag']);
  await publishRelease(manifest, f.options);
  assert.deepEqual(f.writes, ['publish', 'tag']);
});

test('conflicting versions, tags and downgrades stop before any write', async () => {
  for (const state of [
    {published: {dist: {integrity: 'different'}}},
    {tag: 'b'.repeat(40)}, {latest: {version: '0.7.0'}},
  ]) {
    const f = registry(state);
    await assert.rejects(publishRelease(manifest, f.options));
    assert.deepEqual(f.writes, []);
  }
});

test('a retry of an older published version only completes its tag', async () => {
  const f = registry({published, latest: {version: '0.7.0'}});
  await publishRelease(manifest, f.options);
  assert.deepEqual(f.writes, ['tag']);
  assert.equal(f.state.latest.version, '0.7.0');
});

test('both missing version metadata and a lagging latest endpoint are retried', async () => {
  const f = registry();
  let waits = 0;
  f.options.publish = async () => f.writes.push('publish');
  f.options.sleep = async () => {
    waits++;
    f.state.published = published;
    if (waits === 3) f.state.latest = published;
  };
  await publishRelease(manifest, f.options);
  assert.equal(waits, 3);
  assert.deepEqual(f.writes, ['publish', 'tag']);
});

test('propagation timeout asks for a retry and does not create a tag', async () => {
  const f = registry({published});
  await assert.rejects(publishRelease(manifest, f.options), /retry this job/);
  assert.deepEqual(f.writes, []);
});

test('publication and tag responses lost after success are recoverable', async () => {
  for (const stage of ['publish', 'tag']) {
    const f = registry();
    const options = {...f.options};
    if (stage === 'publish') options.publish = async () => { await f.options.publish(); throw new Error('connection lost'); };
    else options.read = async (url, args) => {
      const result = await f.options.read(url, args);
      if (args?.method === 'POST') throw new Error('connection lost');
      return result;
    };
    await assert.rejects(publishRelease(manifest, options), /connection lost/);
    await publishRelease(manifest, f.options);
    assert.deepEqual(f.writes, ['publish', 'tag']);
  }
});

test('a failed tag request can be retried without republishing', async () => {
  const f = registry();
  await assert.rejects(publishRelease(manifest, {...f.options, read: async (url, args) => {
    if (args?.method === 'POST') throw new Error('GitHub unavailable');
    return f.options.read(url, args);
  }}), /GitHub unavailable/);
  await publishRelease(manifest, f.options);
  assert.deepEqual(f.writes, ['publish', 'tag']);
});

test('network failures and a post-publish integrity mismatch prevent tagging', async () => {
  const f = registry();
  await assert.rejects(publishRelease(manifest, {...f.options, read: async () => { throw new Error('HTTP 503'); }}), /503/);
  assert.deepEqual(f.writes, []);
  f.options.publish = async () => { f.state.published = {dist: {integrity: 'different'}}; };
  await assert.rejects(publishRelease(manifest, f.options), /differ/);
  assert.deepEqual(f.writes, []);
});

test('annotated tags resolve to the underlying commit', async () => {
  let calls = 0;
  assert.equal(await tagCommit('0.6.1', async () => ({object: ++calls === 1 ?
    {type: 'tag', sha: 'b'.repeat(40)} : {type: 'commit', sha}})), sha);
});

test('GitHub reads and writes use authentication; npm reads do not receive that token', async t => {
  const previous = process.env.GITHUB_TOKEN;
  process.env.GITHUB_TOKEN = 'test-token-not-a-credential';
  t.after(() => { if (previous === undefined) delete process.env.GITHUB_TOKEN; else process.env.GITHUB_TOKEN = previous; });
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(options.headers.Authorization, url.startsWith(GITHUB) ? 'Bearer test-token-not-a-credential' : undefined);
    return {ok: true, json: async () => ({})};
  });
  await request(`${GITHUB}/git/ref/tags/v0.6.1`);
  await request(`${GITHUB}/git/refs`, {method: 'POST', body: {}});
  await request(`${REGISTRY}/latest`);
});

test('only a 404 is treated as missing', async t => {
  t.mock.method(globalThis, 'fetch', async () => ({status: 404, ok: false}));
  assert.equal(await request(`${REGISTRY}/missing`, {missing: true}), null);
  for (const status of [401, 403, 429, 500, 503]) {
    globalThis.fetch.mock.mockImplementation(async () => ({status, ok: false}));
    await assert.rejects(request(`${REGISTRY}/latest`, {missing: true}), new RegExp(String(status)));
  }
});

test('a reproducible repack rejects changed source, commit and artifact bytes', () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'npm-artifact-test-'));
  try {
    // Copy only package inputs; this also works without a .git directory.
    for (const file of ['package.json', 'LICENSE.md', 'README.md', 'install.sh', 'bin', 'docs/benchmarks.md']) {
      fs.mkdirSync(path.dirname(path.join(temporary, file)), {recursive: true});
      fs.cpSync(path.join(root, file), path.join(temporary, file), {recursive: true});
    }
    const destination = path.join(temporary, '.release-build');
    const result = pack(temporary, destination, sha);
    fs.writeFileSync(path.join(destination, 'manifest.json'), JSON.stringify(result));
    assert.deepEqual(readManifest(temporary, sha), result);
    assert.throws(() => readManifest(temporary, 'b'.repeat(40)), /release checkout/);
    fs.appendFileSync(path.join(destination, result.filename), 'corrupt');
    assert.throws(() => readManifest(temporary, sha), /integrity/);
    pack(temporary, destination, sha);
    fs.appendFileSync(path.join(temporary, 'README.md'), '\nchanged\n');
    assert.throws(() => readManifest(temporary, sha), /release checkout/);
  } finally {
    fs.rmSync(temporary, {recursive: true, force: true});
  }
});

test('invalid CLI actions fail without contacting services', async () => {
  await assert.rejects(main('preflight'), /Expected prepare or publish/);
  const result = spawnSync(process.execPath, [path.join(root, 'ci/release.mjs'), 'invalid'], {encoding: 'utf8'});
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Expected prepare or publish/);
});

test('command failures without stderr still have an error message', () => {
  assert.throws(() => command(process.execPath, ['-e', 'process.exit(1)']), /failed \(1\): no output/);
});

test('command failures redact GitHub and OIDC request tokens', t => {
  const overrides = {GITHUB_TOKEN: 'fake-github-secret', ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'fake-oidc-secret'};
  const previous = Object.fromEntries(Object.keys(overrides).map(key => [key, process.env[key]]));
  Object.assign(process.env, overrides);
  t.after(() => { for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
  assert.throws(() => command(process.execPath, ['-e',
    'console.error(process.env.GITHUB_TOKEN, process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN); process.exit(1)']),
  /failed \(1\): \[redacted\] \[redacted\]/);
});

test('publish entry point requires OIDC, preserves its environment and tags using fake services', async t => {
  t.mock.method(console, 'log', () => {});
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'npm-publish-test-'));
  t.after(() => fs.rmSync(temporary, {recursive: true, force: true}));
  fs.writeFileSync(path.join(temporary, 'package.json'), JSON.stringify({name: PACKAGE, version: '0.6.1', files: ['README.md']}));
  fs.writeFileSync(path.join(temporary, 'README.md'), 'test package');
  const destination = path.join(temporary, '.release-build');
  const artifact = pack(temporary, destination, sha);
  fs.writeFileSync(path.join(destination, 'manifest.json'), JSON.stringify(artifact));
  const npm = command('which', ['npm']);
  const bin = path.join(temporary, 'fake-bin');
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, 'npm'), `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
if (args[0] === 'publish') {
  const assert = require('node:assert/strict');
  assert.equal(process.env.GITHUB_TOKEN, '');
  assert.equal(process.env.NODE_AUTH_TOKEN, '');
  assert.equal(process.env.NPM_TOKEN, '');
  assert.equal(process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN, 'fake-oidc-token');
  assert.equal(process.env.ACTIONS_ID_TOKEN_REQUEST_URL, 'https://example.invalid/oidc');
  assert.equal(process.env.NPM_CONFIG_USERCONFIG, '/dev/null');
  fs.writeFileSync(${JSON.stringify(path.join(temporary, 'published'))}, JSON.stringify(args));
} else {
  require('node:child_process').execFileSync(${JSON.stringify(npm)}, args, {stdio: 'inherit'});
}
`, {mode: 0o755});
  const overrides = {PATH: `${bin}${path.delimiter}${process.env.PATH}`, GITHUB_SHA: sha,
    GITHUB_TOKEN: 'fake-github-token', ACTIONS_ID_TOKEN_REQUEST_TOKEN: '', ACTIONS_ID_TOKEN_REQUEST_URL: '',
    NODE_AUTH_TOKEN: '', NPM_TOKEN: ''};
  const previous = Object.fromEntries(Object.keys(overrides).map(key => [key, process.env[key]]));
  Object.assign(process.env, overrides);
  t.after(() => { for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
  let tagged = false;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (options.method === 'POST') {
      assert.deepEqual(JSON.parse(options.body), {ref: 'refs/tags/v0.6.1', sha});
      tagged = true;
      return {ok: true, json: async () => ({})};
    }
    const live = fs.existsSync(path.join(temporary, 'published'));
    const body = url.endsWith('/latest') ? {version: live ? artifact.version : '0.6.0'} :
      url.startsWith(REGISTRY) && live ? {dist: {integrity: artifact.integrity}} : null;
    return {ok: !!body, status: body ? 200 : 404, json: async () => body};
  });
  await assert.rejects(main('publish', temporary), /id-token: write/);
  assert.equal(tagged, false);
  assert.equal(fs.existsSync(path.join(temporary, 'published')), false);
  process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN = 'fake-oidc-token';
  process.env.ACTIONS_ID_TOKEN_REQUEST_URL = 'https://example.invalid/oidc';
  await main('publish', temporary);
  assert.equal(tagged, true);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(temporary, 'published'))), [
    'publish', path.join(destination, artifact.filename), '--access', 'public',
    '--tag', 'latest', '--ignore-scripts', '--registry', 'https://registry.npmjs.org',
  ]);
});
