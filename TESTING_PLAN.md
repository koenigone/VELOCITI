# VELOCITI Jest Testing Plan

## Test strategy

The Jest suite targets the aspects of VELOCITI where any small regressions will immediately impact the user: station/train search, building an API request, train statuses, journey times, and live train statuses. They are tested as fast unit tests using mocks data to simulate network/browser boundaries instead of snapshot tests.

The unit tests deliberately do not make any API requests, open socket connections, or render the Leaflet map. This is handled by the integration tests, while the unit tests ensure that VELOCITI prepares the correct input data and reacts gracefully to invalid output data.

## Covered features

| Feature area | Test suite | Main behaviours verified |
| --- | --- | --- |
| API client | `src/tests/api.test.ts` | Empty requests short-circuit; TIPLOC requests are normalized and deduplicated; station train URLs are tagged with unique TIPLOCs and the valid service-day range; faulty success responses produce safe blank arrays; HTTP error responses contain endpoint metadata. |
| Train utilities | `src/tests/trainUtils.test.ts` | The railway timetable time format is correct; invalid times revert to `--:--`; delay times are rounded to minutes while maintaining an early departure time; priorities for cancellation, lateness, termination, and punctuality are deterministic. |
| Journey timeline | `src/tests/trainDetailPanel.test.ts` | Schedule stops merge with matching movement events; pass-through stops remain in order; missing movement data stays visible with null actuals; missing coordinates fall back safely; origin-to-destination fallback is built when schedule data is unavailable. |
| Search UI | `src/tests/searchBar.test.tsx` | Changes in input and keypresses have been assigned; the station and train placeholders are swapped appropriately; clear/search triggers the correct callback functions; autocomplete pops up, hides, and selects TIPLOCs appropriately; and stations are not suggested when searching for trains. |
| Live updates | `src/tests/useLiveSelectedTrain.test.ts` | Socket payload fields merge without mutating the selected train; explicit `0` and `false` live values are preserved; updates are accepted only for the selected train by `trainId` or activation/schedule IDs. |

## Test data and mocks

- `src/tests/factories.ts` provides realistic fixtures for trains, TIPLOCs, schedule stops, and movement events. Only those fields relevant to the behavior under test will be overridden.
- `global.fetch` is stubbed for API tests to assert URLs, HTTP method, headers, and error handling without involving any external systems.
- The Jest fake timer is used for date-related status and service day URL tests.
- `src/tests/testUtils.tsx` wraps components inside `ChakraProvider` so that component tests can utilize the real Chakra provider.
- `src/tests/setupTests.ts` implements jsdom shims for browser-specific APIs used in Chakra and responsive components.

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
