module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test','<rootDir>/lib'],
  testMatch: ['**/**/*.test.ts', '**/**/*.spec.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  }
};
