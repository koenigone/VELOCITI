# Jest Unit Tests

This project includes a Jest setup for the main VELOCITI features.

## Test folder structure

All Jest tests and test helper files are stored in one folder:

- `src/tests/`

## Test setup files

- `jest.config.cjs` - Jest config for Vite + TypeScript + React.
- `tsconfig.test.json` - TypeScript settings for tests.
- `src/tests/setupTests.ts` - DOM test setup and browser API mocks.
- `src/tests/testUtils.tsx` - Chakra test render helper.
- `src/tests/factories.ts` - reusable mock train object.
- `src/tests/styleMock.ts` - CSS import mock.
- `src/tests/fileMock.ts` - asset import mock.

## Test suites

- `src/tests/trainUtils.test.ts` - train status, schedule time formatting, delay calculation.
- `src/tests/api.test.ts` - API request normalisation, date range URL building, and error handling.
- `src/tests/trainDetailPanel.test.ts` - journey timeline building and fallback route behaviour.
- `src/tests/useLiveSelectedTrain.test.ts` - live socket payload merge behaviour.
- `src/tests/searchBar.test.tsx` - search input, mode placeholder, clear button, suggestions, and disabled search button.

## Run tests

Install dependencies first:

```bash
npm install
```

Then run:

```bash
npm test
```

For watch mode:

```bash
npm run test:watch
```
