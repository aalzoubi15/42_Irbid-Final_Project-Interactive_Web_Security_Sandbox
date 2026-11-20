'use strict';

(function (root) {
  const PAYLOADS = [
    { label: 'Simple addition', value: '=1+1', description: 'A spreadsheet may calculate this as 2.' },
    { label: 'Plus prefix', value: '+1+1', description: 'Some spreadsheet applications treat a leading plus as a formula prefix.' },
    { label: 'Function-like prefix', value: '@SUM(1,2)', description: 'Some spreadsheet applications recognize formula syntax beginning with @.' }
  ];

  function vulnerableCsvCell(value) {
    const text = String(value ?? '');
    const escaped = text.replaceAll('"', '""');
    return `"${escaped}"`;
  }

  function vulnerableExport(userInput) {
    const header = vulnerableCsvCell('Name');
    const cell = vulnerableCsvCell(userInput);
    return `${header}\r\n${cell}`;
  }

  function fixedCsvCell(value) {
    const text = String(value ?? '');
    const startsWithFormula = /^[\u0000-\u0020]*[=+\-@＝＋－＠]/u.test(text);
    const safeText = startsWithFormula ? `\t${text}` : text;
    const escaped = safeText.replaceAll('"', '""');
    return `"${escaped}"`;
  }

  function fixedExport(userInput) {
    const header = fixedCsvCell('Name');
    const cell = fixedCsvCell(userInput);
    return `${header}\r\n${cell}`;
  }

  function runCsvDemo(value, mode) {
    const csv = mode === 'fixed' ? fixedExport(value) : vulnerableExport(value);
    const isFormulaLike = /^[\u0000-\u0020]*[=+\-@＝＋－＠]/u.test(String(value ?? ''));
    return {
      mode,
      csv,
      value: String(value ?? ''),
      isFormulaLike,
      neutralized: mode === 'fixed' && isFormulaLike,
      validText: !isFormulaLike
    };
  }

  const api = { PAYLOADS, vulnerableCsvCell, vulnerableExport, fixedCsvCell, fixedExport, runCsvDemo };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!root.document) return;

  const document = root.document;
  const modeButtons = Array.from(document.querySelectorAll('[data-mode]'));
  const payloadButtons = Array.from(document.querySelectorAll('[data-payload-index]'));
  const banner = document.getElementById('mode-banner');
  const csvOutput = document.getElementById('csv-output');
  const csvState = document.getElementById('csv-state');
  const hypothesis = document.getElementById('spreadsheet-hypothesis');
  const note = document.getElementById('experiment-note');
  if (!banner || !csvOutput || !csvState || !hypothesis || !note) return;

  let mode = 'vulnerable';
  let selected = 0;

  function render() {
    const payload = PAYLOADS[selected];
    const result = runCsvDemo(payload.value, mode);
    const fixed = mode === 'fixed';
    modeButtons.forEach((button) => {
      const active = button.dataset.mode === mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    payloadButtons.forEach((button, index) => button.classList.toggle('is-selected', index === selected));
    banner.className = `mode-banner ${fixed ? 'mode-banner-good' : 'mode-banner-bad'}`;
    banner.querySelector('strong').textContent = fixed ? 'Fixed mode' : 'Vulnerable mode';
    banner.querySelector('small').textContent = fixed ? 'Formula-leading cells receive a tab prefix.' : 'CSV quoting is applied, but formula prefixes remain active.';
    csvOutput.textContent = result.csv.replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/\t/g, '\\t');
    csvState.className = fixed ? 'state-good' : 'state-bad';
    csvState.textContent = fixed ? (result.neutralized ? 'PREFIX NEUTRALIZED' : 'PLAIN TEXT') : (result.isFormulaLike ? 'FORMULA-LIKE CELL' : 'PLAIN TEXT');
    const heading = hypothesis.querySelector('strong');
    const paragraph = hypothesis.querySelector('p');
    heading.textContent = fixed ? (result.neutralized ? 'Treated as text' : 'Ordinary text preserved') : (result.isFormulaLike ? 'Spreadsheet interpretation risk' : 'No formula prefix detected');
    paragraph.textContent = fixed
      ? (result.neutralized ? 'A tab is inserted inside the quoted cell before the formula-like value. The tab may remain in the imported data.' : 'This value does not begin with a recognized formula prefix, so it is exported unchanged.')
      : (result.isFormulaLike ? `${payload.description} The browser preview never evaluates the formula.` : 'The value does not begin with a recognized formula prefix.');
    note.textContent = fixed
      ? 'The same payload was replayed. CSV quoting and quote escaping remain in place, and formula-like values are tab-prefixed. Test this mitigation in the spreadsheet applications used in your environment.'
      : 'CSV quoting protects the file structure, but it does not stop a spreadsheet from interpreting a formula at the start of a cell.';
  }

  modeButtons.forEach((button) => button.addEventListener('click', () => {
    mode = button.dataset.mode;
    render();
  }));
  payloadButtons.forEach((button) => button.addEventListener('click', () => {
    selected = Number(button.dataset.payloadIndex);
    render();
  }));
  render();
})(typeof window !== 'undefined' ? window : globalThis);
