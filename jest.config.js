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
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/tests/global_setup.ts"]
};
