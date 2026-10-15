import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { App } from 'e2e';
import { expect } from 'e2e';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const artifacts = path.resolve('.e2e/visual/artifacts');
const baselines = path.resolve('tests/visual/baselines', `${process.platform}-${process.arch}`);

async function capture(app: App) {
  // e2e returns an attempt-relative path. The unique label locates its file
  // without depending on the runner's private attempt-directory naming.
  const relative = await app.screenshot(`visual-${randomUUID()}`);
  const matches = readdirSync(artifacts, { recursive: true })
    .filter((file): file is string => typeof file === 'string')
    .filter((file) => file.endsWith(relative));
  expect(matches).toHaveLength(1);
  const filename = path.join(artifacts, matches[0]);
  return { filename, bytes: readFileSync(filename) };
}

export async function compareScreenshot(app: App, name: string) {
  // Capture until two consecutive decoded images agree; never baseline a
  // frame that is still moving. Fonts and data readiness are checked first.
  let previous = await capture(app);
  await expect.poll(async () => {
    const current = await capture(app);
    const stable = PNG.sync.read(current.bytes).data.equals(PNG.sync.read(previous.bytes).data);
    previous = current;
    return stable;
  }, { timeout: 10_000, message: `${name}: screenshot did not stabilize` }).toBe(true);

  const baseline = path.join(baselines, `${name}.png`);
  if (process.env.UPDATE_VISUAL_BASELINES === '1') {
    if (process.env.CI && process.env.CI !== '0' && process.env.CI !== 'false') {
      throw new Error('Baseline updates are disabled in CI. Review and update them locally.');
    }
    mkdirSync(baselines, { recursive: true });
    writeFileSync(baseline, previous.bytes);
    return;
  }
  if (!existsSync(baseline)) {
    throw new Error(`Missing baseline: ${baseline}. Run npm run test:visual:update and review the images.`);
  }

  const actual = PNG.sync.read(previous.bytes);
  const expected = PNG.sync.read(readFileSync(baseline));
  expect({ width: actual.width, height: actual.height })
    .toEqual({ width: expected.width, height: expected.height });
  const diff = new PNG({ width: actual.width, height: actual.height });
  const changed = pixelmatch(expected.data, actual.data, diff.data, actual.width, actual.height, {
    threshold: 0.1,
    includeAA: false,
  });
  if (changed > 0) {
    const diffPath = previous.filename.replace(/\.png$/, '-diff.png');
    const expectedPath = previous.filename.replace(/\.png$/, '-expected.png');
    writeFileSync(diffPath, PNG.sync.write(diff));
    writeFileSync(expectedPath, readFileSync(baseline));
    throw new Error(`${name}: ${changed} pixels changed. Actual: ${previous.filename}; expected: ${expectedPath}; diff: ${diffPath}`);
  }
}
