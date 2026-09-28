const assert = require('node:assert/strict');
const { execFile, execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');
const commands = [
  ['pdf-to-markdown', ['document with spaces.pdf', '--stdout']],
  ['pdf-to-text', ['document with spaces.pdf', '--stdout']],
  ['query', ['text', 'output.md', 'two words']],
  ['nutrient', ['auth', 'status']],
];

function executable(file, content) {
  fs.writeFileSync(file, content, { mode: 0o755 });
}

function binary(version, auth = true) {
  return `#!/bin/sh
if [ "\${1-}" = --version ]; then echo 'nutrient ${version}'; exit 0; fi
if [ "\${1-} \${2-}" = 'auth --help' ]; then
  echo '${auth ? 'nutrient auth login; nutrient auth status; nutrient auth logout' : 'old CLI'}'
  exit 0
fi
printf '${version}:%s\\n' "\${0##*/}"
printf '<%s>\\n' "$@"
`;
}

function fixture(t, { cached = true, windows = false, auth = true } = {}) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nutrient-wrapper-test-'));
  const home = path.join(temp, 'home');
  const state = path.join(home, '.local/share/nutrient');
  const cache = path.join(state, 'cli');
  const fakeBin = path.join(temp, 'fake-bin');
  const payload = path.join(temp, 'payload');
  const name = windows ? 'nutrient-windows-amd64.exe' : 'nutrient-linux-amd64';
  const installed = path.join(cache, name);
  for (const dir of [cache, fakeBin, payload]) fs.mkdirSync(dir, { recursive: true });
  if (cached) executable(installed, binary('old', auth));
  fs.writeFileSync(path.join(state, 'pdf-to-markdown-state'), 'LAST_CHECKED_AT=1\nRELEASE_ID=2026-09-01\n');
  executable(path.join(payload, name), binary('new'));
  const archive = path.join(temp, 'release.tar.gz');
  execFileSync('tar', ['-czf', archive, '-C', payload, name]);
  fs.writeFileSync(`${archive}.sha256`, createHash('sha256').update(fs.readFileSync(archive)).digest('hex'));
  executable(path.join(fakeBin, 'uname'), `#!/bin/sh\ncase "$1" in -s) echo ${windows ? 'MINGW64_NT-10.0' : 'Linux'};; -m) echo x86_64;; esac\n`);
  executable(path.join(fakeBin, 'curl'), `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.WRAPPER_TEST_ROOT;
const args = process.argv.slice(2);
const url = args.find(arg => arg.startsWith('https://'));
const output = args[args.indexOf('-o') + 1];
if (fs.existsSync(path.join(base, 'offline'))) process.exit(1);
if (url.endsWith('/LATEST')) { process.stdout.write('2026-09-07'); process.exit(0); }
(async () => {
  if (url.endsWith('.tar.gz')) {
    fs.writeFileSync(path.join(base, 'download-started'), '');
    while (fs.existsSync(path.join(base, 'hold-download'))) {
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    if (fs.existsSync(path.join(base, 'fail-download'))) process.exit(1);
    fs.copyFileSync(path.join(base, 'release.tar.gz'), output);
  } else if (url.endsWith('.sha256')) {
    fs.copyFileSync(path.join(base, 'release.tar.gz.sha256'), output);
  } else { process.exit(1); }
})();
`);
  executable(path.join(fakeBin, 'mv'), `#!/bin/sh
if [ -f "$WRAPPER_TEST_ROOT/hold-command-copy" ] && [ "$#" -eq 3 ] && [ "$3" = "$WRAPPER_TEST_ROOT/home/.local/share/nutrient/cli/pdf-to-text" ]; then exit 1; fi
if [ "$#" -eq 3 ] && [ "$1" = -f ] && [ "$3" = "$WRAPPER_TEST_BINARY" ]; then
  : > "$WRAPPER_TEST_ROOT/replace-started"
  while [ -f "$WRAPPER_TEST_ROOT/hold-replace" ]; do sleep 0.05; done
  if [ -f "$WRAPPER_TEST_ROOT/fail-replace" ]; then exit 1; fi
fi
exec /bin/mv "$@"
`);
  if (windows) {
    executable(path.join(fakeBin, 'ln'), `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const [, source, target] = process.argv.slice(2);
fs.copyFileSync(path.resolve(path.dirname(target), source), target);
`);
  }
  const env = {
    ...process.env,
    HOME: home,
    PATH: `${fakeBin}${path.delimiter}${process.env.PATH}`,
    NUTRIENT_REQUIRE_CHECKSUM: '1',
    WRAPPER_TEST_ROOT: temp,
    WRAPPER_TEST_BINARY: installed,
  };
  delete env.NUTRIENT_WRAPPER_VERB;
  const running = new Set();
  const mark = name => fs.writeFileSync(path.join(temp, name), '');
  const clear = name => fs.rmSync(path.join(temp, name), { force: true });
  const exists = name => fs.existsSync(path.join(temp, name));
  function run(command, args, timeout = 5000) {
    return new Promise(resolve => {
      const child = execFile(path.join(root, 'bin', command), args, { env, timeout }, (error, stdout, stderr) => {
        running.delete(child);
        resolve({ code: error ? (error.code ?? 'failed') : 0, stdout, stderr });
      });
      running.add(child);
    });
  }
  t.after(async () => {
    clear('hold-download');
    clear('hold-replace');
    const deadline = Date.now() + 5000;
    while (running.size && Date.now() < deadline) await delay(25);
    for (const child of running) child.kill('SIGKILL');
    fs.rmSync(temp, { recursive: true, force: true });
  });
  return { cache, state, installed, run, mark, clear, exists };
}

async function waitFor(predicate) {
  const deadline = Date.now() + 5000;
  while (!predicate()) {
    assert.ok(Date.now() < deadline, 'Timed out waiting for the test updater');
    await delay(25);
  }
}

function assertDispatch(result, command, args, version) {
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stdout, `${version}:${command}\n${args.map(arg => `<${arg}>\n`).join('')}`);
}

async function assertAllDispatch(f, version) {
  for (const [command, args] of commands) {
    assertDispatch(await f.run(command, args), command, args, version);
  }
}

test('cached commands remain available during an update held beyond the 60-second lock timeout', { timeout: 90000 }, async t => {
  const f = fixture(t);
  const cacheInode = fs.statSync(f.cache).ino;
  f.mark('hold-download');
  f.mark('hold-replace');
  const updater = f.run('pdf-to-markdown', ['update.pdf'], 80000);
  await waitFor(() => f.exists('download-started'));
  const started = Date.now();
  await assertAllDispatch(f, 'old');
  await delay(Math.max(0, 61000 - (Date.now() - started)));
  assert.ok(fs.existsSync(path.join(f.state, '.install-lock')), 'Updater must still hold the lock');
  await assertAllDispatch(f, 'old');

  f.clear('hold-download');
  await waitFor(() => f.exists('replace-started'));
  await assertAllDispatch(f, 'old');
  const contenders = commands.map(async ([command, args]) => {
    const result = await f.run(command, args);
    const version = result.stdout.startsWith('old:') ? 'old' : 'new';
    assertDispatch(result, command, args, version);
  });
  f.clear('hold-replace');
  await Promise.all(contenders);
  assertDispatch(await updater, 'pdf-to-markdown', ['update.pdf'], 'new');
  assert.equal(fs.statSync(f.cache).ino, cacheInode, 'The live directory must not be moved aside');
  await assertAllDispatch(f, 'new');
  assert.ok(!fs.existsSync(path.join(f.state, '.install-lock')));
});

for (const failure of ['fail-download', 'fail-replace']) {
  test(`${failure} preserves the existing cache`, async t => {
    const f = fixture(t);
    const oldBinary = fs.readFileSync(f.installed);
    f.mark(failure);
    await assertAllDispatch(f, 'old');
    assert.deepEqual(fs.readFileSync(f.installed), oldBinary);
    assert.match(fs.readFileSync(path.join(f.state, 'pdf-to-markdown-state'), 'utf8'), /RELEASE_ID=2026-09-01/);
    assert.ok(!fs.existsSync(path.join(f.state, '.install-lock')));
  });
}

test('a first install waits for the updater and then dispatches the installed binary', async t => {
  const f = fixture(t, { cached: false });
  f.mark('hold-download');
  const updater = f.run('pdf-to-markdown', ['first.pdf']);
  await waitFor(() => f.exists('download-started'));
  let completed = false;
  const contender = f.run('pdf-to-text', ['second.pdf']).then(result => { completed = true; return result; });
  await delay(200);
  assert.equal(completed, false);
  f.clear('hold-download');
  assertDispatch(await updater, 'pdf-to-markdown', ['first.pdf'], 'new');
  assertDispatch(await contender, 'pdf-to-text', ['second.pdf'], 'new');
});

test('account commands still reject an incompatible cache while an updater holds the lock', async t => {
  const f = fixture(t, { auth: false });
  fs.mkdirSync(path.join(f.state, '.install-lock'));
  const result = await f.run('nutrient', ['auth', 'status']);
  assert.equal(result.code, 1);
  assert.match(result.stderr, /does not support account commands/);
  assert.equal(result.stdout, '');
  assertDispatch(await f.run('pdf-to-markdown', ['standard.pdf']), 'pdf-to-markdown', ['standard.pdf'], 'old');
});

test('Windows command copies update even when a replacement has an older timestamp', async t => {
  // Exercise Git Bash's branch with POSIX fixture executables, not a Windows runtime test.
  const f = fixture(t, { windows: true });
  for (const [command] of commands) fs.copyFileSync(f.installed, path.join(f.cache, command));
  f.mark('offline');
  await assertAllDispatch(f, 'old');
  // A timestamp-based check would accept these stale command links after the update.
  for (const [command] of commands) {
    fs.utimesSync(path.join(f.cache, command), new Date('2030-01-01'), new Date('2030-01-01'));
  }
  f.clear('offline');
  await assertAllDispatch(f, 'new');
  for (const [command] of commands) {
    assert.deepEqual(fs.readFileSync(path.join(f.cache, command)), fs.readFileSync(f.installed));
  }
});

test('a Windows command copy that cannot yet be replaced remains usable', async t => {
  const f = fixture(t, { windows: true });
  fs.copyFileSync(f.installed, path.join(f.cache, 'pdf-to-text'));
  f.mark('hold-command-copy');
  assertDispatch(await f.run('pdf-to-markdown', ['update.pdf']), 'pdf-to-markdown', ['update.pdf'], 'new');
  assertDispatch(await f.run('pdf-to-text', ['cached.pdf']), 'pdf-to-text', ['cached.pdf'], 'old');
  f.clear('hold-command-copy');
  assertDispatch(await f.run('pdf-to-text', ['updated.pdf']), 'pdf-to-text', ['updated.pdf'], 'new');
});

test('all three entry points keep the same install implementation', () => {
  const blocks = ['pdf-to-markdown', 'pdf-to-text', 'query'].map(command => {
    const source = fs.readFileSync(path.join(root, 'bin', command), 'utf8');
    return source.split('# BEGIN SHARED INSTALL WRAPPER\n')[1].split('# END SHARED INSTALL WRAPPER')[0];
  });
  assert.equal(blocks[1], blocks[0]);
  assert.equal(blocks[2], blocks[0]);
});
