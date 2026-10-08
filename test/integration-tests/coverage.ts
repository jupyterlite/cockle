import type { BrowserContext, CDPSession, Page } from '@playwright/test';
import { test as base } from '@playwright/test';
import type { CoverageReportOptions } from 'monocart-coverage-reports';
import MCR from 'monocart-coverage-reports';
import path from 'node:path';
import ts from 'typescript';
import type { TestOptions } from './utils';

// __dirname is <repo>/test/integration-tests.
const ROOT = path.resolve(__dirname, '..', '..');
const SRC_DIR = path.join(ROOT, 'src');
const COVERAGE_DIR = path.join(ROOT, '.coverage');
const INTEGRATION_DIR = path.join(COVERAGE_DIR, 'integration');

/**
 * Collapse any entry/source url shape to a repo-relative path. Verified inputs:
 * 'webpack://cockle-tests/../src/x.ts', 'cockle-tests/src/x.ts', 'src/x.ts'.
 */
export function toSourcePath(filePath: string): string {
  return filePath
    .replace(/^webpack:\/\//, '')
    .replace(/^.*?cockle-tests\//, '')
    .replace(/^\.\.\//, '');
}

interface ITransformerEntry {
  source: string;
  url: string;
  fake: boolean;
}

/** Transpile a .ts source so MCR's AST parser can produce statement/branch metrics. */
export async function transformSource(entry: ITransformerEntry): Promise<void> {
  const { outputText } = ts.transpileModule(entry.source, {
    fileName: entry.url,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
  });
  entry.source = outputText;
  entry.fake = false;
}

/** Options for the browser (V8) report written to <repo>/.coverage/integration. */
export const coverageOptions: CoverageReportOptions = {
  name: 'cockle integration coverage',
  outputDir: INTEGRATION_DIR,
  clean: true,
  logging: 'off',
  reports: [['console-summary'], ['v8'], ['lcovonly']],
  baseDir: ROOT,
  entryFilter: entry => {
    if (/node_modules|\/cockle_fs\/|\/coreutils\//.test(entry.url)) {
      return false;
    }
    // Every src-derived artifact (page bundle, worker bundles, the hashed service-worker chunk) is
    // emitted at the document root. External command assets are served from per-command
    // subdirectories ('/vim/vim.js', '/util-js/js-tab.js') and hold no src code.
    return new URL(entry.url).pathname.lastIndexOf('/') === 0;
  },
  sourceFilter: sourcePath => sourcePath.startsWith('src/') && sourcePath !== 'src/version.ts',
  sourcePath: toSourcePath,
  all: {
    dir: [SRC_DIR],
    filter: { '**/*.d.ts': false, '**/tools/**': false, '**/version.ts': false, '**/*': true },
    transformer: transformSource
  }
};

interface ICoverageEntry {
  url: string;
  type: 'js';
  source: string;
  functions: unknown[];
}

interface ICoverage {
  stop: () => Promise<ICoverageEntry[]>;
}

interface ICdpScriptCoverage {
  scriptId: string;
  url: string;
  functions: unknown[];
}

/**
 * Reply to a message forwarded to a target session. The Playwright `Protocol` namespace is not
 * re-exported from `playwright-core`, so the CDP reply shapes are declared here.
 */
interface ICdpReply<T> {
  id: number;
  result?: T;
  error?: { message?: string };
}

/** Start V8 coverage for the page bundle and all workers started from now on. Chromium only. */
export async function startCoverage(context: BrowserContext, page: Page): Promise<ICoverage> {
  const cdp: CDPSession = await context.newCDPSession(page);
  let nextId = 0;
  const pending = new Map<string, (reply: unknown) => void>();

  cdp.on('Target.receivedMessageFromTarget', event => {
    const message: unknown = JSON.parse(event.message);
    if (
      typeof message !== 'object' ||
      message === null ||
      !('id' in message) ||
      typeof message.id !== 'number'
    ) {
      return;
    }
    const key = `${event.sessionId}:${message.id}`;
    const resolve = pending.get(key);
    if (resolve !== undefined) {
      pending.delete(key);
      resolve(message);
    }
  });

  const send = async (sessionId: string, method: string, params: object = {}): Promise<unknown> => {
    const id = nextId++;
    const { promise, resolve } = Promise.withResolvers<unknown>();
    pending.set(`${sessionId}:${id}`, resolve);
    await cdp.send('Target.sendMessageToTarget', {
      sessionId,
      message: JSON.stringify({ id, method, params })
    });
    const reply = (await promise) as ICdpReply<unknown>;
    if (reply.error !== undefined) {
      throw new Error(`${method} failed: ${reply.error.message}`);
    }
    return reply.result;
  };

  const workers: Array<() => Promise<ICoverageEntry[]>> = [];
  cdp.on('Target.attachedToTarget', async event => {
    const { sessionId, targetInfo } = event;
    if (targetInfo.type !== 'worker' && targetInfo.type !== 'service_worker') {
      return;
    }
    await send(sessionId, 'Profiler.enable');
    await send(sessionId, 'Debugger.enable');
    await send(sessionId, 'Profiler.startPreciseCoverage', { callCount: true, detailed: true });
    workers.push(async () => {
      const coverage = (await send(sessionId, 'Profiler.takePreciseCoverage')) as {
        result: ICdpScriptCoverage[];
      };
      const entries: ICoverageEntry[] = [];
      for (const script of coverage.result) {
        const source = (await send(sessionId, 'Debugger.getScriptSource', {
          scriptId: script.scriptId
        })) as { scriptSource: string };
        entries.push({
          url: script.url,
          type: 'js',
          source: source.scriptSource,
          functions: script.functions
        });
      }
      return entries;
    });
  });

  await cdp.send('Target.setAutoAttach', {
    autoAttach: true,
    waitForDebuggerOnStart: false,
    flatten: false
  });
  await page.coverage.startJSCoverage({ resetOnNavigation: false });

  return {
    stop: async () => {
      const entries: ICoverageEntry[] = [];
      for (const take of workers) {
        try {
          entries.push(...(await take()));
        } catch {
          // A worker that detached before this call cannot be queried any more; the page bundle
          // captured below still contributes coverage.
        }
      }
      for (const entry of await page.coverage.stopJSCoverage()) {
        entries.push({
          url: entry.url,
          type: 'js',
          source: entry.source ?? '',
          functions: entry.functions
        });
      }
      return entries;
    }
  };
}

/**
 * `test` extended with the same `page` override the suite previously declared in utils.ts plus an
 * automatic per-test coverage fixture. Coverage APIs are Chromium-only, so non-chromium projects are
 * skipped.
 */
export const test = base.extend<TestOptions & { coverage: void }>({
  supportsSAB: [false, { option: true }],

  page: async ({ page }, use) => {
    await page.goto('/');
    await use(page);
  },

  coverage: [
    async ({ context, page }, use) => {
      if (!test.info().project.name.startsWith('chromium')) {
        await use();
        return;
      }
      const coverage = await startCoverage(context, page);
      await use();
      const entries = await coverage.stop();
      if (entries.length > 0) {
        await MCR(coverageOptions).add(entries);
      }
    },
    { auto: true, scope: 'test' }
  ]
});
