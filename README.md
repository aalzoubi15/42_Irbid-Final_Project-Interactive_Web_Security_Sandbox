# Ghurir - Interactive Web Security Sandbox

Ghurir is a beginner-friendly website with three safe, browser-only demonstrations of web application weaknesses:

1. Prototype Pollution (CWE-1321)
2. CSV / Formula Injection (CWE-1236)
3. Unvalidated Redirects / Open Redirect (CWE-601)

Each lab has working payload buttons, a visible result, vulnerable and fixed code, a Vulnerable/Fixed switch, and a short explanation of the fix. Separate source lists are omitted because the official brief says they are preferred, not required. CWE and OWASP classification labels remain on the lab pages. Selecting Fixed reruns the currently selected payload with the corrected logic.

## Technologies

- HTML5 for the four pages and accessible controls
- CSS for the shared responsive visual design
- Plain JavaScript for all three demonstrations
- Node.js (optional) for the included automated smoke tests

There is no backend, login, database, framework, third-party JavaScript library, or network request in the demonstrations.

## Folder structure

```text
Ghurir/
  index.html
  prototype-pollution.html
  csv-injection.html
  open-redirect.html
  css/
    style.css
  js/
    main.js
    prototype-pollution.js
    csv-injection.js
    open-redirect.js
  tests/
    smoke-tests.js
  README.md
```

There are exactly four website pages: one home page and three lab pages.

## Run locally

**Option 1 - open the page directly**

Open `index.html` in a modern browser. All assets are relative paths and the labs do not require a server.

**Option 2 - use a local static server (optional)**

From this folder, run:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Run automated logic tests (optional)

Node.js 18 or later is recommended:

```bash
node tests/smoke-tests.js
```

The tests cover all sample payloads in both modes, ordinary valid inputs, CSV quoting, the redirect allowlist, and the prototype-isolation guarantee. They do not replace manual browser testing or testing with the spreadsheet programs used by your team.

## Deploy with GitHub Pages

1. Create or open the team's GitHub repository.
2. Add the contents of this `Ghurir` folder to the repository root (or configure Pages to use the folder containing `index.html`).
3. Commit and push the project.
4. In the repository, open **Settings -> Pages**.
5. Choose **Deploy from a branch**, select the branch containing the site (usually `main`) and the correct folder (usually `/root`), then save.
6. Wait for GitHub Pages to publish the site.
7. Open the published URL and test the home page, all three lab pages, all payloads, and both modes on desktop and mobile.
8. Replace the line below with the final published URL and commit the updated README.

**Final live website URL:** `ADD_THE_TEAM_GITHUB_PAGES_URL_HERE`

Do not submit this placeholder as the final URL. No repository or live URL has been invented for this package.

## Safety and demonstration limits

- Prototype Pollution writes only into a newly-created, private demonstration prototype object. `Object.prototype` is checked and remains unchanged.
- CSV output is rendered as escaped text. The browser does not evaluate formulas or open a spreadsheet. The fixed export uses a tab prefix for formula-like cells; that technique has application-specific trade-offs and must be tested against the team's target spreadsheet workflow.
- Redirect handling returns a decision object and shows the proposed destination. It never sets `window.location`, sends a redirect response, or contacts `attacker.example`.
- The vulnerable snippets model unsafe application logic. The local simulations intentionally isolate effects to keep the training website safe.
