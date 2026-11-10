import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { promisify } from 'node:util';
import type { TestFilter, TestFilterCandidate, TestFilterContext } from 'e2e';

const exec = promisify(execFile);

/** Calls that declare a test or a group, by the name they start with, such as `test.only` or `describe.serial`. */
const TEST_CALLS: ReadonlySet<string> = new Set(['test', 'it']);
const GROUP_CALLS: ReadonlySet<string> = new Set(['describe']);

interface Block {
  readonly kind: 'test' | 'group';
  readonly titlePath: readonly string[];
  readonly start: number;
  readonly end: number;
  readonly children: Block[];
}

/**
 * Wraps the decision filter so a changed test file runs only the tests whose
 * own lines changed, not every test in it. The wrapped filter runs every test
 * of a changed test file without asking, so this hands it the change without
 * the test files it can narrow, and the other tests of those files go to the
 * model like any other test.
 *
 * A test file can be narrowed when every changed line falls inside one test,
 * or only changes blank lines and `//` comments. A change inside a `describe`
 * but outside its tests, such as its options or a hook, reaches every test in
 * that group. A change outside every group and test, such as an import or a
 * helper, a setup file, a new or untracked file, or a test whose title isn't a
 * plain string, leaves the file to the wrapped filter.
 */
export function editedTests(decision: TestFilter): TestFilter {
  return {
    name: decision.name,
    async filter(tests, context) {
      const { changes, projectRoot } = context;
      const repoPath = (file: string) => relative(changes.root, join(projectRoot, file)).split(sep).join('/');
      const changed = new Set(changes.files);
      const setupFiles = new Set(tests.flatMap((test) => (test.setupFile === undefined ? [] : [repoPath(test.setupFile)])));

      const byFile = new Map<string, TestFilterCandidate[]>();
      for (const test of tests) byFile.set(test.file, [...(byFile.get(test.file) ?? []), test]);

      const narrowed = new Set<string>();
      const forced = new Set<string>();
      for (const [file, inFile] of byFile) {
        const path = repoPath(file);
        if (!changed.has(path) || setupFiles.has(path)) continue;
        const edited = await editedTestIds(path, inFile, context);
        if (edited === undefined) continue;
        narrowed.add(path);
        for (const id of edited) forced.add(id);
      }
      if (narrowed.size === 0) return decision.filter(tests, context);

      const ranWithoutAsking = forced.size === 0
        ? `${[...narrowed].join(', ')} changed only in blank lines or comments`
        : `${forced.size} test${forced.size === 1 ? '' : 's'} ran without asking: ${forced.size === 1 ? 'its' : 'their'} own lines in ${[...narrowed].join(', ')} changed`;
      const rest = tests.filter((test) => !forced.has(test.id));
      const files = changes.files.filter((file) => !narrowed.has(file));
      if (files.length === 0) {
        const exclude = Object.fromEntries(rest.map((test) => [test.id, 'the change touches only other tests']));
        return { exclude, note: ranWithoutAsking };
      }
      if (rest.length === 0) return { exclude: {}, note: ranWithoutAsking };

      const result = await decision.filter(rest, { ...context, changes: { ...changes, files } });
      return { exclude: result.exclude, note: [ranWithoutAsking, result.note].filter(Boolean).join('; ') };
    },
  };
}

/** The ids of the tests in a changed test file whose own lines changed, or `undefined` when the change can't be pinned to tests. */
async function editedTestIds(path: string, tests: readonly TestFilterCandidate[], context: TestFilterContext): Promise<string[] | undefined> {
  const { changes, signal } = context;
  const { stdout: diff } = await exec(
    'git',
    ['diff', '--no-color', '--no-ext-diff', '--no-textconv', '-U0', changes.base, '--', path],
    { cwd: changes.root, signal, maxBuffer: 16 * 1024 * 1024 },
  );
  const spans = changedSpans(diff);
  if (spans === undefined) return undefined;

  const ts = (await import('typescript')).default;
  const text = await readFile(join(changes.root, path), { encoding: 'utf8', signal });
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const lineOf = (position: number) => source.getLineAndCharacterOfPosition(position).line + 1;

  const callName = (expression: import('typescript').Expression): string | undefined => {
    if (ts.isIdentifier(expression)) return expression.text;
    if (ts.isPropertyAccessExpression(expression)) return callName(expression.expression);
    return undefined;
  };
  const blocks: Block[] = [];
  let unnamed = false;
  const visit = (node: import('typescript').Node, parent: { titlePath: readonly string[]; children: Block[] }) => {
    if (ts.isCallExpression(node)) {
      const name = callName(node.expression);
      const kind = name === undefined ? undefined : TEST_CALLS.has(name) ? 'test' : GROUP_CALLS.has(name) ? 'group' : undefined;
      if (kind !== undefined) {
        const title = node.arguments[0];
        if (title === undefined || !(ts.isStringLiteral(title) || ts.isNoSubstitutionTemplateLiteral(title))) {
          unnamed = true;
          return;
        }
        const block: Block = { kind, titlePath: [...parent.titlePath, title.text], start: lineOf(node.getStart(source)), end: lineOf(node.getEnd()), children: [] };
        parent.children.push(block);
        if (kind === 'group') ts.forEachChild(node, (child) => visit(child, block));
        return;
      }
    }
    ts.forEachChild(node, (child) => visit(child, parent));
  };
  visit(source, { titlePath: [], children: blocks });
  if (unnamed) return undefined;

  const key = (titlePath: readonly string[]) => JSON.stringify(titlePath);
  const idByTitle = new Map<string, string>();
  for (const test of tests) {
    if (idByTitle.has(key(test.titlePath))) return undefined;
    idByTitle.set(key(test.titlePath), test.id);
  }

  const edited = new Set<string>();
  const testsUnder = (block: Block): Block[] => (block.kind === 'test' ? [block] : block.children.flatMap(testsUnder));
  for (const [start, end] of spans) {
    let inner: Block | undefined;
    for (let level = blocks; ; ) {
      const next = level.find((block) => block.start <= start && end <= block.end);
      if (next === undefined) break;
      inner = next;
      level = next.children;
    }
    if (inner === undefined) return undefined;
    for (const test of testsUnder(inner)) {
      const id = idByTitle.get(key(test.titlePath));
      if (id === undefined) return undefined;
      edited.add(id);
    }
  }
  return [...edited];
}

/**
 * The line spans of the new file each hunk of a `-U0` diff changes, skipping
 * hunks that only change blank lines and `//` comments. A hunk that only
 * deletes lines spans the lines on both sides of the gap. `undefined` when
 * the diff has no hunks, as for an untracked or binary file.
 */
function changedSpans(diff: string): Array<[number, number]> | undefined {
  const spans: Array<[number, number]> = [];
  let hunks = 0;
  let current: { span: [number, number]; meaningful: boolean } | undefined;
  const close = () => {
    if (current?.meaningful) spans.push(current.span);
    current = undefined;
  };
  for (const line of diff.split('\n')) {
    const header = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (header) {
      close();
      hunks += 1;
      const start = Number(header[1]);
      const count = header[2] === undefined ? 1 : Number(header[2]);
      current = { span: count === 0 ? [start, start + 1] : [start, start + count - 1], meaningful: false };
      continue;
    }
    if (current === undefined || !(line.startsWith('+') || line.startsWith('-'))) continue;
    const content = line.slice(1).trim();
    if (content !== '' && !content.startsWith('//')) current.meaningful = true;
  }
  close();
  return hunks === 0 ? undefined : spans;
}
