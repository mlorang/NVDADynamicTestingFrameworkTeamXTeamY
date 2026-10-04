# nvda-dynamic-testing-framework

This repository is going to be used to develop the testing framework for NVDA. There will be a separate repository linked shortly (https://github.com/mlorang/nvda-dynamic-testing-webpage) to the testing website with DOM dynamic componets for testing Dynamic DOM states to implement into NVDA.

## Running the tests

```sh
npm install
npx playwright install chromium
npm test                   # runs against the live site
npx playwright show-report # HTML report; axe results are attached to each test
```

The tests run against the live site at https://mlorang.github.io/nvda-dynamic-testing-webpage/ by default. To point them at a local copy, set `BASE_URL`, e.g. `BASE_URL=http://localhost:3000/ npm test`.

### Menu button (`tests/menu-button.spec.ts`)

For both the `accessible` and `broken` variants: load the page, run axe + ARIA checks as a baseline, click the menu button, wait for the DOM change (via `MutationObserver`), then re-run the same checks against the new state. The broken variant is marked as expected to fail.
