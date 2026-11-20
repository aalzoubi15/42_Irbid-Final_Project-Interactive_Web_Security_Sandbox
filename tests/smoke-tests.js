'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const prototype = require('../js/prototype-pollution.js');
const csv = require('../js/csv-injection.js');
const redirect = require('../js/open-redirect.js');

let checks = 0;
function check(name, fn) {
  fn();
  checks += 1;
  process.stdout.write(`PASS ${name}\n`);
}

check('four required HTML pages exist', () => {
  for (const page of ['index.html', 'prototype-pollution.html', 'csv-injection.html', 'open-redirect.html']) {
    assert.ok(fs.existsSync(path.join(root, page)), `${page} is missing`);
  }
});

check('all prototype payloads show an inherited value in vulnerable mode', () => {
  for (const payload of prototype.PAYLOADS) {
    const result = prototype.runPrototypeDemo(payload.value, 'vulnerable', payload.property);
    assert.equal(result.value, payload.property === 'role' ? 'admin' : true);
    assert.equal(result.inherited, true);
    assert.equal(result.own, false);
    assert.equal(result.globalUnchanged, true);
  }
  assert.equal(Object.prototype.role, undefined);
  assert.equal(Object.prototype.canExport, undefined);
  assert.equal(Object.prototype.trusted, undefined);
});

check('the same prototype payloads are rejected in fixed mode', () => {
  for (const payload of prototype.PAYLOADS) {
    const result = prototype.runPrototypeDemo(payload.value, 'fixed', payload.property);
    assert.deepEqual(result.rejected, ['__proto__']);
    assert.equal(result.own, false);
    assert.equal(result.value, undefined);
    assert.equal(result.globalUnchanged, true);
  }
});

check('safe prototype merge still accepts ordinary data', () => {
  const target = Object.create(null);
  const rejected = prototype.safeMerge(target, { profile: { name: 'Sam' }, enabled: true });
  assert.deepEqual(rejected, []);
  assert.equal(target.profile.name, 'Sam');
  assert.equal(target.enabled, true);
  assert.equal(Object.getPrototypeOf(target), null);
});

check('CSV vulnerable mode preserves formula-like values as formula-leading CSV cells', () => {
  for (const payload of csv.PAYLOADS) {
    const result = csv.runCsvDemo(payload.value, 'vulnerable');
    assert.equal(result.isFormulaLike, true);
    assert.equal(result.neutralized, false);
    assert.ok(result.csv.endsWith(`"${payload.value.replaceAll('"', '""')}"`));
  }
});

check('CSV fixed mode prefixes formula-like values with a tab inside the quoted cell', () => {
  for (const payload of csv.PAYLOADS) {
    const result = csv.runCsvDemo(payload.value, 'fixed');
    assert.equal(result.isFormulaLike, true);
    assert.equal(result.neutralized, true);
    assert.ok(result.csv.endsWith(`"\t${payload.value.replaceAll('"', '""')}"`));
  }
});

check('CSV fixed mode preserves ordinary text and escapes quotes', () => {
  assert.equal(csv.fixedCsvCell('Monthly report'), '"Monthly report"');
  assert.equal(csv.fixedCsvCell('Sam "S"'), '"Sam ""S"""');
  assert.equal(csv.runCsvDemo('Quarterly report', 'fixed').validText, true);
});

check('CSV fixed mode detects a formula after leading whitespace/control characters', () => {
  const result = csv.runCsvDemo('  =1+1', 'fixed');
  assert.equal(result.neutralized, true);
  assert.ok(result.csv.endsWith('"\t  =1+1"'));
});

check('open redirect vulnerable mode accepts external targets in the local decision model', () => {
  for (const payload of redirect.PAYLOADS.slice(0, 2)) {
    const result = redirect.runRedirectDemo(payload.value, 'vulnerable');
    assert.equal(result.accepted, true);
    assert.equal(result.location, payload.value);
    assert.equal(result.localOnly, true);
  }
});

check('open redirect fixed mode blocks both external target forms', () => {
  for (const payload of redirect.PAYLOADS.slice(0, 2)) {
    const result = redirect.runRedirectDemo(payload.value, 'fixed');
    assert.equal(result.accepted, false);
    assert.equal(result.location, null);
  }
});

check('open redirect fixed mode accepts an approved local path', () => {
  const fixed = redirect.runRedirectDemo('/dashboard', 'fixed');
  const vulnerable = redirect.runRedirectDemo('/dashboard', 'vulnerable');
  assert.equal(fixed.accepted, true);
  assert.equal(fixed.location, '/dashboard');
  assert.equal(vulnerable.accepted, true);
  assert.equal(vulnerable.location, '/dashboard');
});

check('static HTML references existing local CSS and JavaScript files', () => {
  for (const page of ['index.html', 'prototype-pollution.html', 'csv-injection.html', 'open-redirect.html']) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    const references = [...html.matchAll(/(?:href|src)="(css\/[^"#?]+|js\/[^"#?]+)"/g)].map((match) => match[1]);
    for (const ref of references) assert.ok(fs.existsSync(path.join(root, ref)), `${page} references missing ${ref}`);
  }
});

check('lab pages provide 3 payload buttons and both modes', () => {
  for (const page of ['prototype-pollution.html', 'csv-injection.html', 'open-redirect.html']) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    assert.equal((html.match(/data-payload-index=/g) || []).length, 3, `${page} should have three payload buttons`);
    assert.equal((html.match(/data-mode=/g) || []).length, 2, `${page} should have two mode buttons`);
  }
});

process.stdout.write(`\n${checks} smoke checks passed.\n`);
