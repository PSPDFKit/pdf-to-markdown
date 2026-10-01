import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';

export const PACKAGE = '@pspdfkit/pdf-to-markdown';
export const GITHUB = 'https://api.github.com/repos/PSPDFKit/pdf-to-markdown';
export const REGISTRY = `https://registry.npmjs.org/${encodeURIComponent(PACKAGE)}`;

export function command(program, args, options = {}) {
  const result = spawnSync(program, args, {
    encoding: 'utf8', timeout: 180_000, maxBuffer: 4 * 1024 * 1024, ...options,
  });
  if (result.error || result.status !== 0) {
    let output = `${result.stdout || ''}\n${result.stderr || ''}`;
    for (const value of [process.env.GITHUB_TOKEN, process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN]) {
      if (value) output = output.replaceAll(value, '[redacted]');
    }
    throw new Error(`${program} failed (${result.status ?? result.error?.code}): ${output.trim().slice(-4000) || result.error?.message || 'no output'}`);
  }
  return result.stdout.trim();
}

export function compareVersions(left, right) {
  const parse = version => {
    assert.match(version, /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/, 'Expected a stable version');
    return version.split('.').map(BigInt);
  };
  const a = parse(left), b = parse(right);
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
  return 0;
}

export function integrity(bytes) {
  return `sha512-${createHash('sha512').update(bytes).digest('base64')}`;
}

export async function request(url, {method = 'GET', body, missing = false} = {}) {
  const github = new URL(url).origin === 'https://api.github.com';
  if (github) assert.ok(process.env.GITHUB_TOKEN, 'GitHub token is missing');
  const response = await fetch(url, {
    method, redirect: 'error', signal: AbortSignal.timeout(20_000),
    headers: {
      Accept: 'application/json', 'User-Agent': 'pdf-to-markdown-release',
      ...(github ? {Authorization: `Bearer ${process.env.GITHUB_TOKEN}`} : {}),
      ...(body ? {'Content-Type': 'application/json'} : {}),
    },
    ...(body ? {body: JSON.stringify(body)} : {}),
  });
  if (response.status === 404 && missing) return null;
  if (!response.ok) throw new Error(`${method} ${new URL(url).pathname}: HTTP ${response.status}`);
  return response.json();
}

export async function tagCommit(version, read = request) {
  const ref = await read(`${GITHUB}/git/ref/tags/v${version}`, {missing: true});
  if (!ref) return null;
  let object = ref.object;
  for (let depth = 0; depth < 5; depth++) {
    if (object.type === 'commit') return object.sha;
    assert.equal(object.type, 'tag', 'Unexpected Git tag target');
    object = (await read(`${GITHUB}/git/tags/${object.sha}`)).object;
  }
  throw new Error('Git tag nesting is too deep');
}

export function pack(root, destination, commit) {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.name, PACKAGE);
  compareVersions(pkg.version, pkg.version);
  fs.mkdirSync(destination, {recursive: true});
  const [packed] = JSON.parse(command('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', destination], {cwd: root}));
  return {name: pkg.name, version: pkg.version, commit, filename: packed.filename,
    integrity: integrity(fs.readFileSync(path.join(destination, packed.filename)))};
}

export function readManifest(root, commit) {
  const directory = path.join(root, '.release-build');
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'npm-repack-'));
  try {
    // One reproducible repack checks the artifact against the clean release checkout.
    assert.deepEqual(manifest, pack(root, temporary, commit), 'Artifact does not match the release checkout');
    assert.equal(integrity(fs.readFileSync(path.join(directory, manifest.filename))), manifest.integrity, 'Tarball integrity mismatch');
    return manifest;
  } finally {
    fs.rmSync(temporary, {recursive: true, force: true});
  }
}

export async function publishRelease(manifest, {publish, read = request, sleep = delay, log = console.log}) {
  const versionURL = `${REGISTRY}/${manifest.version}`;
  const [published, latest, tagged] = await Promise.all([
    read(versionURL, {missing: true}), read(`${REGISTRY}/latest`, {missing: true}),
    tagCommit(manifest.version, read),
  ]);
  if (tagged) assert.equal(tagged, manifest.commit, 'Version tag points to a different commit');
  if (published) {
    assert.equal(published.dist?.integrity, manifest.integrity, 'Version already exists with different contents; use a new version');
  } else {
    if (latest) assert.ok(compareVersions(manifest.version, latest.version) > 0, 'Release would downgrade latest; use a new version');
    await publish();
  }

  // npm's version and dist-tag endpoints can take time to reflect a successful publish.
  let verified = false;
  for (let attempt = 0; attempt < 12; attempt++) {
    const [version, current] = await Promise.all([
      read(versionURL, {missing: true}), read(`${REGISTRY}/latest`, {missing: true}),
    ]);
    if (version) assert.equal(version.dist?.integrity, manifest.integrity, 'Published contents differ from the tested tarball');
    if (version && current && compareVersions(current.version, manifest.version) >= 0) {
      verified = true;
      break;
    }
    if (attempt < 11) await sleep(5000);
  }
  assert.ok(verified, 'Registry has not confirmed publication yet; retry this job. Do not bump the version just to retry.');
  if (!tagged) {
    await read(`${GITHUB}/git/refs`, {method: 'POST',
      body: {ref: `refs/tags/v${manifest.version}`, sha: manifest.commit}});
  }
  log(`${PACKAGE}@${manifest.version}: registry integrity verified; v${manifest.version} tagged.`);
}

export async function main(action, root = process.cwd()) {
  assert.ok(['prepare', 'publish'].includes(action), 'Expected prepare or publish');
  const commit = process.env.GITHUB_SHA;
  assert.match(commit || '', /^[0-9a-f]{40}$/, 'GitHub Actions must supply the release commit');
  const directory = path.join(root, '.release-build');
  if (action === 'prepare') {
    command('npm', ['run', 'check'], {cwd: root});
    command('npm', ['test'], {cwd: root});
    command('node', ['--test', 'ci/release.test.mjs'], {cwd: root});
    const manifest = pack(root, directory, commit);
    fs.writeFileSync(path.join(directory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    fs.writeFileSync(path.join(directory, 'summary.md'),
      `### npm release\n\nPackage: \`${PACKAGE}@${manifest.version}\`\n\nCommit: \`${commit}\`\n\nIntegrity: \`${manifest.integrity}\`\n`);
    return;
  }
  const manifest = readManifest(root, commit);
  assert.ok(process.env.GITHUB_TOKEN, 'GitHub tagging token is missing');
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'npm-publish-'));
  try {
    await publishRelease(manifest, {publish: async () => {
      assert.ok(process.env.ACTIONS_ID_TOKEN_REQUEST_URL && process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN,
        'npm trusted publishing requires a GitHub-hosted job with id-token: write');
      command('npm', ['publish', path.join(directory, manifest.filename), '--access', 'public',
        '--tag', 'latest', '--ignore-scripts', '--registry', 'https://registry.npmjs.org'], {
        // Keep the OIDC request variables; npm exchanges them for publish credentials.
        env: {...process.env, NPM_CONFIG_USERCONFIG: '/dev/null', NPM_CONFIG_CACHE: temporary,
          NPM_CONFIG_LOGS_MAX: '0', GITHUB_TOKEN: '', NODE_AUTH_TOKEN: '', NPM_TOKEN: ''},
      });
    }});
  } finally {
    fs.rmSync(temporary, {recursive: true, force: true});
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv[2]).catch(error => { console.error(error.message); process.exitCode = 1; });
}
