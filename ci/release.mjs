import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';

export const PACKAGE = '@pspdfkit/pdf-to-markdown';
export const REPO = 'PSPDFKit/pdf-to-markdown';
const REGISTRY = 'https://registry.npmjs.org';
const GITHUB = `https://api.github.com/repos/${REPO}`;
const FILES = [
  'LICENSE.md', 'README.md', 'bin/nutrient', 'bin/pdf-to-markdown',
  'bin/pdf-to-text', 'bin/query', 'docs/benchmarks.md', 'install.sh', 'package.json',
].sort();

export function command(program, args, options = {}) {
  const result = spawnSync(program, args, {
    encoding: 'utf8', timeout: 180_000, maxBuffer: 4 * 1024 * 1024, ...options,
  });
  if (result.error || result.status !== 0) {
    // Do not include command arguments or environment values in failure messages.
    let output = `${result.stdout || ''}\n${result.stderr || ''}`;
    for (const value of [process.env.NODE_AUTH_TOKEN, process.env.RELEASE_GITHUB_TOKEN]) {
      if (value) output = output.replaceAll(value, '[redacted]');
    }
    output = output.replace(/https?:\/\/\S+\?\S+/g, '[URL with query redacted]');
    throw new Error(`${program} failed (${result.status ?? result.error?.code}): ${output.slice(-4000)}`);
  }
  return result.stdout.trim();
}

export function validateContext(env, head) {
  assert.equal(env.BUILDKITE_PIPELINE_SLUG, 'pdf-to-markdown-npm-release');
  assert.equal(env.BUILDKITE_BRANCH, 'main', 'Only main can be released');
  assert.equal(env.BUILDKITE_PULL_REQUEST, 'false', 'PR builds cannot publish');
  assert.ok(['ui', 'api'].includes(env.BUILDKITE_SOURCE), 'Start the release manually');
  assert.match(env.BUILDKITE_COMMIT || '', /^[0-9a-f]{40}$/, 'Select a full commit SHA');
  assert.equal(head, env.BUILDKITE_COMMIT, 'Checkout does not match release commit');
}

export function validatePackage(pkg) {
  assert.equal(pkg.name, PACKAGE);
  assert.match(pkg.version, /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/, 'Only stable releases may use latest');
  assert.notEqual(pkg.private, true);
  assert.equal(pkg.publishConfig?.access, 'public');
  for (const key of ['dependencies', 'optionalDependencies', 'devDependencies']) {
    assert.equal(Object.keys(pkg[key] || {}).length, 0, `Review the release smoke test before adding ${key}`);
  }
  assert.deepEqual(pkg.bin, {
    nutrient: 'bin/nutrient', 'pdf-to-markdown': 'bin/pdf-to-markdown',
    'pdf-to-text': 'bin/pdf-to-text', query: 'bin/query',
  });
}

export function compareVersions(left, right) {
  const parse = version => {
    assert.match(version, /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
    return version.split('.').map(BigInt);
  };
  const a = parse(left), b = parse(right);
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
  return 0;
}

export function integrity(bytes) {
  return `sha512-${createHash('sha512').update(bytes).digest('base64')}`;
}

export async function request(url, {method = 'GET', token, body, missing = false} = {}) {
  const response = await fetch(url, {
    method, redirect: 'error', signal: AbortSignal.timeout(20_000),
    headers: {
      Accept: 'application/json', 'User-Agent': 'pdf-to-markdown-release',
      ...(token ? {Authorization: `Bearer ${token}`} : {}),
      ...(body ? {'Content-Type': 'application/json'} : {}),
    },
    ...(body ? {body: JSON.stringify(body)} : {}),
  });
  if (response.status === 404 && missing) return null;
  if (!response.ok) throw new Error(`${method} ${new URL(url).pathname}: HTTP ${response.status}`);
  return response.json();
}

export function validateWorkflow(runs, sha) {
  // The first matching run is the newest. An old success must not hide a failing rerun.
  const run = runs.find(item => item.head_sha === sha && item.event === 'push' && item.head_branch === 'main');
  assert.ok(run, 'No main-branch Validate workflow found for this commit');
  assert.equal(run.status, 'completed', 'GitHub validation is still running');
  assert.equal(run.conclusion, 'success', 'GitHub validation did not pass');
}

export function validateReviews(reviews) {
  const decisions = new Map();
  for (const review of reviews) {
    if (!['OWNER', 'MEMBER', 'COLLABORATOR'].includes(review.author_association)) continue;
    if (['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(review.state)) {
      decisions.set(review.user.login, review.state);
    }
  }
  assert.ok([...decisions.values()].includes('APPROVED'), 'Release commit needs an approved, merged PR');
  assert.ok(![...decisions.values()].includes('CHANGES_REQUESTED'), 'A review still requests changes');
}

async function allPages(url) {
  const result = [];
  for (let page = 1; page <= 20; page++) {
    const items = await request(`${url}${url.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
    result.push(...items);
    if (items.length < 100) return result;
  }
  throw new Error('GitHub result exceeded the pagination limit');
}

async function trustedCommit(root) {
  const sha = command('git', ['rev-parse', 'HEAD'], {cwd: root});
  validateContext(process.env, sha);
  command('git', ['diff', '--quiet', 'HEAD', '--'], {cwd: root});
  // Public HTTPS avoids passing the agent's Git credentials into the container.
  command('git', ['fetch', '--no-tags', `https://github.com/${REPO}.git`, 'main'], {cwd: root});
  command('git', ['merge-base', '--is-ancestor', sha, 'FETCH_HEAD'], {cwd: root});
  const runs = await request(`${GITHUB}/actions/workflows/validate.yml/runs?head_sha=${sha}&event=push&per_page=100`);
  validateWorkflow(runs.workflow_runs, sha);
  const pulls = await allPages(`${GITHUB}/commits/${sha}/pulls`);
  const pr = pulls.find(item => item.merged_at && item.merge_commit_sha === sha &&
    item.base.ref === 'main' && item.base.repo.full_name === REPO);
  assert.ok(pr, 'Select the merge commit of a reviewed PR on main');
  validateReviews(await allPages(`${GITHUB}/pulls/${pr.number}/reviews`));
  return sha;
}

export async function tagCommit(version, read = request) {
  let ref = await read(`${GITHUB}/git/ref/tags/v${version}`, {missing: true});
  if (!ref) return null;
  let object = ref.object;
  for (let depth = 0; depth < 5; depth++) {
    if (object.type === 'commit') return object.sha;
    assert.equal(object.type, 'tag', 'Unexpected Git tag target');
    object = (await read(`${GITHUB}/git/tags/${object.sha}`)).object;
  }
  throw new Error('Git tag nesting is too deep');
}

export function publicationState(manifest, published, latest, tagged) {
  if (tagged) assert.equal(tagged, manifest.commit, 'Version tag points to a different commit');
  if (published) {
    assert.equal(published.name, PACKAGE);
    assert.equal(published.version, manifest.version);
    assert.equal(published.dist?.integrity, manifest.integrity, 'This version is published with different contents; bump the version');
    assert.ok(latest && compareVersions(latest.version, manifest.version) >= 0,
      'Published version is not latest; inspect dist-tags before continuing');
    return 'resume';
  }
  if (latest) assert.ok(compareVersions(manifest.version, latest.version) > 0, 'Release would downgrade latest; bump the version');
  return 'new';
}

export function readManifest(root, expectedCommit = process.env.BUILDKITE_COMMIT) {
  const directory = path.join(root, '.release-build');
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  validatePackage(pkg);
  assert.equal(manifest.name, pkg.name);
  assert.equal(manifest.version, pkg.version);
  assert.equal(manifest.commit, expectedCommit);
  assert.equal(manifest.filename, `pspdfkit-pdf-to-markdown-${pkg.version}.tgz`);
  const tarball = path.join(directory, manifest.filename);
  assert.equal(integrity(fs.readFileSync(tarball)), manifest.integrity, 'Tarball integrity mismatch');
  assert.deepEqual(command('tar', ['-tzf', tarball]).split('\n').sort(), FILES.map(file => `package/${file}`).sort());
  const packed = JSON.parse(command('tar', ['-xOf', tarball, 'package/package.json']));
  assert.deepEqual(packed, pkg, 'Packed package.json differs from the reviewed source');
  // Compare every shipped file to the checked-out, reviewed commit, not just the manifest.
  for (const file of FILES) {
    const result = spawnSync('tar', ['-xOf', tarball, `package/${file}`], {maxBuffer: 4 * 1024 * 1024});
    assert.equal(result.status, 0);
    assert.ok(result.stdout.equals(fs.readFileSync(path.join(root, file))), `Packed ${file} differs from source`);
  }
  return manifest;
}

export async function remoteState(manifest, read = request) {
  const base = `${REGISTRY}/${encodeURIComponent(PACKAGE)}`;
  const [published, latest, tagged] = await Promise.all([
    read(`${base}/${manifest.version}`, {missing: true}),
    read(`${base}/latest`, {missing: true}), tagCommit(manifest.version, read),
  ]);
  return publicationState(manifest, published, latest, tagged);
}

// A generated, one-page fixture with no customer data or external dependencies.
function smokePdf() {
  const stream = 'BT /F1 18 Tf 72 720 Td (Nutrient release smoke test) Tj ET\n';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}endstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}`;
  return `${pdf}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
}

export function smoke(tarball) {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-markdown-smoke-'));
  try {
    fs.writeFileSync(path.join(temporary, 'input.pdf'), smokePdf());
    // Standard mode only: no account, license key, Vision page, or DWS charge.
    const env = {PATH: process.env.PATH, HOME: temporary, TMPDIR: temporary, CI: 'true',
      npm_config_cache: path.join(temporary, 'npm-cache'), npm_config_logs_max: '0'};
    command('npm', ['install', '--prefix', temporary, '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', tarball], {env});
    const bin = path.join(temporary, 'node_modules', '.bin');
    assert.match(command(path.join(bin, 'nutrient'), ['--version'], {env}), /^nutrient \d+\.\d+\.\d+/);
    assert.match(command(path.join(bin, 'nutrient'), ['auth', '--help'], {env}), /auth login/);
    for (const [verb, extension] of [['pdf-to-markdown', 'md'], ['pdf-to-text', 'txt']]) {
      const output = path.join(temporary, `output.${extension}`);
      command(path.join(bin, verb), [path.join(temporary, 'input.pdf'), output], {env});
      assert.match(fs.readFileSync(output, 'utf8'), /Nutrient release smoke test/);
    }
    // A one-line document needs lenient ranking; balanced mode may filter it out.
    assert.match(command(path.join(bin, 'query'), ['text', path.join(temporary, 'output.txt'),
      'Nutrient', '--mode', 'lenient'], {env}), /Nutrient/);
  } finally {
    fs.rmSync(temporary, {recursive: true, force: true});
  }
}

export function pack(root, destination, commit) {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  validatePackage(pkg);
  fs.mkdirSync(destination, {recursive: true});
  const [packed] = JSON.parse(command('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', destination], {cwd: root}));
  assert.deepEqual(packed.files.map(file => file.path).sort(), FILES, 'Unexpected npm package contents');
  const manifest = {name: pkg.name, version: pkg.version, commit, filename: packed.filename,
    integrity: integrity(fs.readFileSync(path.join(destination, packed.filename)))};
  fs.writeFileSync(path.join(destination, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

export async function publishRelease(manifest, {
  state = remoteState, publish, verify = remoteState,
  log = console.log,
  tag = async () => {
    const existing = await tagCommit(manifest.version);
    if (!existing) {
      try {
        await request(`${GITHUB}/git/refs`, {method: 'POST', token: process.env.RELEASE_GITHUB_TOKEN,
          body: {ref: `refs/tags/v${manifest.version}`, sha: manifest.commit}});
      } catch (error) {
        // A previous attempt or another maintainer may have created the same tag.
        if (await tagCommit(manifest.version) !== manifest.commit) throw error;
      }
    }
    assert.equal(await tagCommit(manifest.version), manifest.commit, 'Could not verify release tag');
  },
}) {
  const before = await state(manifest);
  if (before === 'new') await publish();
  let verified = false;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (await verify(manifest) === 'resume') { verified = true; break; }
    await delay(2000);
  }
  assert.ok(verified, 'npm publication could not be verified; retry this job to inspect the registry');
  await tag();
  log(`${PACKAGE}@${manifest.version}: ${before === 'new' ? 'published' : 'already published with matching integrity'}; tag verified.`);
}

async function main(action) {
  assert.ok(['prepare', 'preflight', 'publish'].includes(action), 'Expected prepare, preflight, or publish');
  const root = process.cwd();
  const commit = await trustedCommit(root);
  if (action === 'prepare') {
    command('npm', ['run', 'check']);
    command('npm', ['test']);
    command('node', ['--test', 'ci/release.test.mjs']);
    const destination = path.join(root, '.release-build');
    const manifest = pack(root, destination, commit);
    const state = await remoteState(manifest);
    smoke(path.join(destination, manifest.filename));
    fs.writeFileSync(path.join(destination, 'summary.md'),
      `### npm release ready for approval\n\nPackage: \`${PACKAGE}@${manifest.version}\`\n\nCommit: \`${commit}\`\n\nIntegrity: \`${manifest.integrity}\`\n\nStandard conversion and all four installed commands passed.\n\n${state === 'resume' ? 'The identical package is already published; this run will finish verification and tagging.' : 'Approval publishes this tarball publicly with the latest tag.'}\n`);
    return;
  }
  const manifest = readManifest(root);
  if (action === 'preflight') { await remoteState(manifest); return; }
  assert.ok(process.env.NODE_AUTH_TOKEN, 'npm publishing token is missing');
  assert.ok(process.env.RELEASE_GITHUB_TOKEN, 'GitHub tagging token is missing');
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-markdown-npm-auth-'));
  try {
    const config = path.join(temporary, 'npmrc');
    fs.writeFileSync(config, '//registry.npmjs.org/:_authToken=${NODE_AUTH_TOKEN}\n', {mode: 0o600});
    await publishRelease(manifest, {publish: async () => {
      command('npm', ['publish', path.join(root, '.release-build', manifest.filename), '--access', 'public',
        '--tag', 'latest', '--ignore-scripts', '--registry', REGISTRY], {
        env: {...process.env, NPM_CONFIG_USERCONFIG: config, NPM_CONFIG_CACHE: temporary,
          NPM_CONFIG_LOGS_MAX: '0', RELEASE_GITHUB_TOKEN: ''},
      });
    }});
  } finally {
    fs.rmSync(temporary, {recursive: true, force: true});
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv[2]).catch(error => { console.error(error.message); process.exitCode = 1; });
}
