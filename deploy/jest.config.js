module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test', '<rootDir>/lib'],
  testMatch: ['**/**/*.test.ts', '**/**/*.spec.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  // `npm run build` emits compiled .js next to each .ts. Node resolves .js
  // first by default, so tests would silently run against stale build output
  // instead of the current source - put .ts ahead of .js.
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json', 'node'],
};
