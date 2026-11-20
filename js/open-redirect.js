'use strict';

(function (root) {
  const PAYLOADS = [
    { label: 'External login page', value: 'https://attacker.example/login' },
    { label: 'Protocol-relative URL', value: '//attacker.example/landing' },
    { label: 'Approved local path', value: '/dashboard' }
  ];

  function vulnerableRedirect(destination) {
    return { status: 302, location: destination, accepted: true };
  }

  const ALLOWED = new Set(['/dashboard', '/reports', '/help']);
  function fixedRedirect(destination) {
    if (!ALLOWED.has(destination)) {
      return { status: 400, location: null, accepted: false };
    }
    return { status: 302, location: destination, accepted: true };
  }

  function runRedirectDemo(destination, mode) {
    const decision = mode === 'fixed' ? fixedRedirect(destination) : vulnerableRedirect(destination);
    return { ...decision, destination, mode, localOnly: true };
  }

  const api = { PAYLOADS, ALLOWED, vulnerableRedirect, fixedRedirect, runRedirectDemo };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!root.document) return;

  const document = root.document;
  const modeButtons = Array.from(document.querySelectorAll('[data-mode]'));
  const payloadButtons = Array.from(document.querySelectorAll('[data-payload-index]'));
  const banner = document.getElementById('mode-banner');
  const redirectState = document.getElementById('redirect-state');
  const destinationValue = document.getElementById('destination-value');
  const destinationDetail = document.getElementById('destination-detail');
  const decisionPanel = document.getElementById('redirect-decision');
  const note = document.getElementById('experiment-note');
  if (!banner || !redirectState || !destinationValue || !destinationDetail || !decisionPanel || !note) return;

  let mode = 'vulnerable';
  let selected = 0;

  function render() {
    const payload = PAYLOADS[selected];
    const result = runRedirectDemo(payload.value, mode);
    const fixed = mode === 'fixed';
    modeButtons.forEach((button) => {
      const active = button.dataset.mode === mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    payloadButtons.forEach((button, index) => button.classList.toggle('is-selected', index === selected));
    banner.className = `mode-banner ${fixed ? 'mode-banner-good' : 'mode-banner-bad'}`;
    banner.querySelector('strong').textContent = fixed ? 'Fixed mode' : 'Vulnerable mode';
    banner.querySelector('small').textContent = fixed ? 'Only exact approved local paths are accepted.' : 'Any supplied destination is accepted by the simulated handler.';
    destinationValue.textContent = result.accepted ? result.location : 'BLOCKED - no destination';
    destinationDetail.textContent = result.accepted
      ? (fixed ? 'Exact path accepted by the local allowlist.' : 'The unvalidated value would be used as the Location destination.')
      : 'This value is not present in the approved local-path allowlist.';
    redirectState.className = result.accepted ? (fixed ? 'state-good' : 'state-bad') : 'state-good';
    redirectState.textContent = result.accepted ? 'ACCEPTED' : 'BLOCKED';
    decisionPanel.classList.toggle('is-blocked', !result.accepted || fixed);
    const icon = decisionPanel.querySelector('.decision-icon');
    const title = decisionPanel.querySelector('strong');
    const paragraph = decisionPanel.querySelector('p');
    if (result.accepted && !fixed) {
      icon.textContent = '!';
      title.textContent = 'Untrusted destination accepted';
      paragraph.textContent = 'The demo displays the proposed redirect only. It never sends a 302 response or opens the destination.';
    } else if (result.accepted && fixed) {
      icon.textContent = '✓';
      title.textContent = 'Approved local destination';
      paragraph.textContent = 'The exact path exists in the allowlist. A real application would still need to enforce authorization for the destination.';
    } else {
      icon.textContent = '✓';
      title.textContent = 'Untrusted destination blocked';
      paragraph.textContent = 'The allowlist rejected this value before it could be used as a redirect destination.';
    }
    note.textContent = 'Switching modes replays the same selected destination. This page only renders a decision object; it never changes window.location or makes a network request.';
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
