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
    '!src-main/lib/openai.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  coverageThreshold: {
    global: {
      statements: 82,
      branches: 65,
      functions: 86,
      lines: 83,
    },
  },
  verbose: true,
};
