/** Jest config for Release Manager (main process lib + runInDir/project logic) */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  roots: ['<rootDir>'],
  testPathIgnorePatterns: ['/node_modules/'],
  collectCoverageFrom: [
    'src-main/**/*.js',
    '!src-main/**/__tests__/**',
    '!src-main/**/node_modules/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  coverageThreshold: {
    global: {
      statements: 5,
      branches: 5,
      functions: 5,
      lines: 5,
    },
  },
  verbose: true,
};
