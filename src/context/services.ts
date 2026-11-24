import type { IPager } from '../pager';

/**
 * Services provided by cockle at runtime to JavaScript and external commands via their context.
 * Commands should use these rather than importing and bundling their own implementations.
 */
export interface IServices {
  /**
   * Create a pager to display command output a page at a time, similar to `less`.
   */
  createPager(): IPager;
}
