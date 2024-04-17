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
  coverageDirectory: '.coverage'
};
