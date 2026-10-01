import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

// One page of generated text, with no account or customer data.
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
pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'npm-smoke-'));
try {
  const env = {PATH: process.env.PATH, HOME: temporary, TMPDIR: temporary, CI: 'true',
    npm_config_cache: path.join(temporary, 'npm-cache'), npm_config_logs_max: '0'};
  const run = (program, args) => execFileSync(program, args, {
    cwd: temporary, env, encoding: 'utf8', timeout: 180_000, maxBuffer: 4 * 1024 * 1024,
  });
  fs.writeFileSync(path.join(temporary, 'input.pdf'), pdf);
  fs.writeFileSync(path.join(temporary, '.npmrc'), 'min-release-age=15\n');
  run('npm', ['install', '--prefix', temporary, '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', path.resolve(process.argv[2])]);
  const bin = path.join(temporary, 'node_modules', '.bin');
  assert.match(run(path.join(bin, 'nutrient'), ['--version']), /^nutrient \d+\.\d+\.\d+/);
  assert.match(run(path.join(bin, 'nutrient'), ['auth', '--help']), /auth login/);
  for (const [verb, extension] of [['pdf-to-markdown', 'md'], ['pdf-to-text', 'txt']]) {
    const output = path.join(temporary, `output.${extension}`);
    run(path.join(bin, verb), [path.join(temporary, 'input.pdf'), output]);
    assert.match(fs.readFileSync(output, 'utf8'), /Nutrient release smoke test/);
  }
  // A one-line document needs lenient ranking; balanced mode may filter it out.
  assert.match(run(path.join(bin, 'query'), ['text', path.join(temporary, 'output.txt'),
    'Nutrient', '--mode', 'lenient']), /Nutrient/);
  console.log('Installed package: all four commands and Standard conversion passed.');
} finally {
  fs.rmSync(temporary, {recursive: true, force: true});
}
