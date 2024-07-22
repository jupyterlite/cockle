module.exports = {
  preset: 'ts-jest',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        isolatedModules: true
      }
    ]
  },
  verbose: true,
  collectCoverage: true,
  coverageDirectory: '.coverage',
  coveragePathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/src/wasm/'],
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/global_setup.ts']
};
