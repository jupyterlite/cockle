import MCR from 'monocart-coverage-reports';
import { coverageOptions } from './coverage';

export default async function globalTeardown(): Promise<void> {
  await MCR(coverageOptions).generate();
}
