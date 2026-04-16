module.exports = {
  testEnvironment: 'jsdom',
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.test.json',
        diagnostics: {
          warnOnly: true,
        },
      },
    ],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '\\.(css|less|scss|sass)$': '<rootDir>/src/tests/styleMock.ts',
    '\\.(png|jpg|jpeg|gif|webp|svg)$': '<rootDir>/src/tests/fileMock.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/src/tests/setupTests.ts'],
  testMatch: ['<rootDir>/src/tests/**/*.test.{ts,tsx}'],
  clearMocks: true,
};