import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testRegex: ['unit-tests/.*.test.ts$'],
  verbose: true
};

export default config;
