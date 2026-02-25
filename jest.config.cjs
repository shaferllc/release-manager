/** Jest config for Release Manager (main process lib + runInDir/project logic) */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  roots: ['<rootDir>'],
  testPathIgnorePatterns: ['/node_modules/'],
  collectCoverageFrom: [
    'src-main/lib/**/*.js',
    '!src-main/preload.js',
    '!**/__tests__/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  coverageThreshold: {
    global: {
      statements: 99,
      branches: 96,
      functions: 100,
      lines: 99,
    },
  },
  verbose: true,
};
