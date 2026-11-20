'use strict';

(function (root) {
  const PAYLOADS = [
    { label: 'Add a role', value: '{"__proto__":{"role":"admin"}}', property: 'role' },
    { label: 'Enable export', value: '{"__proto__":{"canExport":true}}', property: 'canExport' },
    { label: 'Mark trusted', value: '{"__proto__":{"trusted":true}}', property: 'trusted' }
  ];

  function vulnerableMerge(target, source) {
    for (const key of Object.keys(source)) {
      const value = source[key];
      if (value && typeof value === 'object') {
        const child = target[key] || {};
        target[key] = vulnerableMerge(child, value);
      } else {
        target[key] = value;
      }
    }
    return target;
  }

  const BLOCKED_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
  function safeMerge(target, source, rejected = []) {
    for (const key of Object.keys(source)) {
      if (BLOCKED_KEYS.has(key)) { rejected.push(key); continue; }
      const value = source[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const child = Object.prototype.hasOwnProperty.call(target, key) ? target[key] : Object.create(null);
        target[key] = child;
        safeMerge(child, value, rejected);
      } else target[key] = value;
    }
    return rejected;
  }

  function runPrototypeDemo(rawPayload, mode, property) {
    const input = JSON.parse(rawPayload);
    if (mode === 'fixed') {
      const target = Object.create(null);
      const rejected = safeMerge(target, input);
      return {
        mode,
        property,
        own: Object.prototype.hasOwnProperty.call(target, property),
        value: target[property],
        rejected,
        globalUnchanged: typeof Object.prototype[property] === 'undefined'
      };
    }
    const localPrototype = {};
    const target = Object.create(localPrototype);
    vulnerableMerge(target, input);
    return {
      mode,
      property,
      own: Object.prototype.hasOwnProperty.call(target, property),
      value: target[property],
      inherited: Object.prototype.hasOwnProperty.call(localPrototype, property),
      globalUnchanged: typeof Object.prototype[property] === 'undefined'
    };
  }

  const api = { PAYLOADS, vulnerableMerge, safeMerge, runPrototypeDemo };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!root.document) return;

  const document = root.document;
  const modeButtons = Array.from(document.querySelectorAll('[data-mode]'));
  const payloadButtons = Array.from(document.querySelectorAll('[data-payload-index]'));
  const banner = document.getElementById('mode-banner');
  const resultState = document.getElementById('result-state');
  const resultBody = document.getElementById('result-body');
  const note = document.getElementById('experiment-note');
  if (!banner || !resultState || !resultBody || !note) return;

  let mode = 'vulnerable';
  let selected = 0;

  function render() {
    const payload = PAYLOADS[selected];
    const result = runPrototypeDemo(payload.value, mode, payload.property);
    modeButtons.forEach((button) => {
      const active = button.dataset.mode === mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    payloadButtons.forEach((button, index) => button.classList.toggle('is-selected', index === selected));
    const fixed = mode === 'fixed';
    banner.className = `mode-banner ${fixed ? 'mode-banner-good' : 'mode-banner-bad'}`;
    banner.querySelector('strong').textContent = fixed ? 'Fixed mode' : 'Vulnerable mode';
    banner.querySelector('small').textContent = fixed ? 'Special keys are rejected before recursion.' : 'Untrusted keys are merged without a denylist.';
    resultState.className = fixed ? 'state-good' : 'state-bad';
    resultState.textContent = fixed ? 'KEY REJECTED' : 'PROPERTY INJECTED';
    const shownValue = result.value === undefined ? 'guest' : String(result.value);
    resultBody.innerHTML = '';
    const main = document.createElement('div');
    main.className = 'result-main';
    const key = document.createElement('span'); key.className = 'result-key'; key.textContent = payload.property;
    const value = document.createElement('strong'); value.textContent = shownValue;
    value.style.color = fixed ? 'var(--mint)' : 'var(--red)';
    const detail = document.createElement('small'); detail.textContent = fixed ? 'No inherited value was added' : 'Visible through the private prototype chain';
    main.append(key, value, detail);
    const side = document.createElement('div'); side.className = 'result-side';
    const ownLabel = document.createElement('span'); ownLabel.textContent = 'OWN PROPERTY';
    const ownValue = document.createElement('strong'); ownValue.textContent = result.own ? 'Yes' : 'No';
    const globalLabel = document.createElement('span'); globalLabel.textContent = 'GLOBAL OBJECT.PROTOTYPE';
    const globalValue = document.createElement('strong'); globalValue.className = 'good-text'; globalValue.textContent = result.globalUnchanged ? 'Unchanged' : 'Changed';
    side.append(ownLabel, ownValue, globalLabel, globalValue);
    resultBody.append(main, side);
    note.textContent = fixed
      ? `The same payload was replayed. ${result.rejected.length ? `Rejected key: ${result.rejected.join(', ')}.` : 'No forbidden key was present.'} The destination object has no inherited prototype.`
      : 'The unsafe merge follows the target\'s __proto__ accessor into a private prototype object. The injected property is inherited by this demo target only.';
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
