import path from 'node:path';
import type { Config } from 'jest';

// The value import above makes Node detect this file as ESM, so `__dirname` is unavailable.
const REPO_ROOT = path.resolve(import.meta.dirname, '..');

const config: Config = {
  rootDir: '..',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': [
      '<rootDir>/test/node_modules/ts-jest',
      { isolatedModules: true, tsconfig: '<rootDir>/test/tsconfig.json' }
    ]
  },
  testRegex: ['test/unit-tests/.*\\.test\\.ts$'],
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.ts', '!src/tools/**', '!src/version.ts'],
  coverageDirectory: '.coverage/unit',
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    // `lcovonly` writes each SF path as path.relative(projectRoot, file), defaulting projectRoot to
    // process.cwd(). Jest runs from test/, so without this every SF line escapes the repo root
    // ('../src/x.ts') and lcov consumers anchored at the repo root cannot resolve it.
    ['lcovonly', { projectRoot: REPO_ROOT }],
    'json'
  ],
  verbose: true
};

export default config;
