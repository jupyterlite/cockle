import MCR from 'monocart-coverage-reports';
import { coverageOptions } from './coverage';

export default async function globalSetup(): Promise<void> {
  MCR(coverageOptions).cleanCache();
}
