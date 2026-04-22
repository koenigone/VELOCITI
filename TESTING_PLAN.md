# VELOCITI Jest Testing Plan

## Test strategy

The Jest suite focuses on the parts of VELOCITI where small regressions would directly affect users: station/train search, API request construction, train status labels, journey timelines, and live train updates. These are covered as fast unit tests with mocked network/browser boundaries rather than broad snapshot tests.

The tests intentionally avoid real API calls, real sockets, and Leaflet map rendering. Those dependencies are integration concerns; the unit suite verifies that VELOCITI prepares the right inputs, handles malformed responses safely, and keeps UI-facing state predictable.

## Covered features

| Feature area | Test suite | Main behaviours verified |
| --- | --- | --- |
| API client | `src/tests/api.test.ts` | Empty requests short-circuit; TIPLOC requests are normalised and de-duplicated; station train URLs include unique TIPLOCs and the current service-day range; malformed success bodies return safe empty arrays; HTTP errors include endpoint context. |
| Train utilities | `src/tests/trainUtils.test.ts` | Railway timetable values format correctly; invalid times fall back to `--:--`; delays round to minutes and preserve early running; cancelled, late, terminated, and on-time status priorities are deterministic. |
| Journey timeline | `src/tests/trainDetailPanel.test.ts` | Schedule stops merge with matching movement events; pass-through stops remain in order; missing movement data stays visible with null actuals; missing coordinates fall back safely; origin-to-destination fallback is built when schedule data is unavailable. |
| Search UI | `src/tests/searchBar.test.tsx` | Input changes and key presses are delegated; station and train placeholders switch correctly; clear/search actions call the right callbacks; autocomplete opens, closes, and selects TIPLOCs correctly; station suggestions do not appear in train search mode. |
| Live updates | `src/tests/useLiveSelectedTrain.test.ts` | Socket payload fields merge without mutating the selected train; explicit `0` and `false` live values are preserved; updates are accepted only for the selected train by `trainId` or activation/schedule IDs. |

## Test data and mocks

- `src/tests/factories.ts` provides realistic train, TIPLOC, schedule-stop, and movement-event fixtures. Tests override only the fields that matter for the behaviour under test.
- `global.fetch` is mocked in API tests so request URLs, methods, headers, and error handling can be asserted without external services.
- Jest fake timers are used for date-sensitive status and service-day URL tests.
- `src/tests/testUtils.tsx` wraps React components in `ChakraProvider` so component tests exercise the real Chakra context.
- `src/tests/setupTests.ts` provides jsdom shims for browser APIs used by Chakra and responsive components.

## How to run

Install dependencies:

```bash
npm install
```

Run the full unit suite:

```bash
npm test
```

Run in watch mode while developing:

```bash
npm run test:watch
```

## Quality gate

Before submitting coursework or merging changes:

- Run `npm test` and confirm every suite passes.
- Do not skip failing tests unless the skipped case is documented with a clear reason.
- Add or update tests whenever API request shape, train status rules, search interactions, timeline construction, or live-update identity logic changes.
- Keep tests behaviour-focused. Prefer one clear assertion path over inflated cases that duplicate implementation details.

## Manual and future test coverage

The current Jest plan does not cover full Leaflet map rendering, real RailSmart API availability, real Socket.IO connectivity, or browser end-to-end journeys. Those should be checked manually or with future integration/E2E tests. Suggested future coverage:

- A Sidebar integration test for full station search and headcode search flows with mocked `trainApi`.
- A TrainDetailPanel component test for loading, refresh, and error states around `trainApi.getTrainSchedule` and `getTrainMovement`.
- A lightweight E2E smoke test that opens the app, searches a known station, selects a train, and verifies the detail panel appears.
