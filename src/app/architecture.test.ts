import { readdirSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

import ts from 'typescript';
import { expect, it } from 'vitest';

const ROOT = resolve('src');
const FEATURE_API = new Set([
  'features/tasks/TaskProvider.tsx',
  'features/tasks/TaskListPage.tsx',
  'features/tasks/BacklogPage.tsx',
  'features/tasks/TaskDetailPage.tsx',
  'features/tasks/GuidePage.tsx',
  'features/tasks/SettingsPage.tsx',
  'features/tasks/RepeatingPage.tsx',
  'features/tasks/RepeatingCreatePage.tsx',
  'features/tasks/navigation-ui.ts',
  'features/tasks/styles.css',
]);
const ALLOWED: Readonly<Record<string, readonly string[]>> = {
  app: ['app', 'features', 'infra', 'shared', 'config', 'assets'],
  features: ['features', 'infra', 'shared', 'config', 'assets'],
  infra: ['infra', 'shared', 'config'],
  config: ['config', 'shared'],
  shared: ['shared', 'assets'],
};

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory()
      ? sourceFiles(path)
      : /\.(ts|tsx|css)$/.test(path)
        ? [path]
        : [];
  });
}

function imports(file: string): string[] {
  const contents = readFileSync(file, 'utf8');
  if (file.endsWith('.css'))
    return [...contents.matchAll(/@import\s+['"]([^'"]+)['"]/g)]
      .map((match) => match[1] ?? '')
      .filter((specifier) => specifier.startsWith('.'));
  const source = ts.createSourceFile(
    file,
    contents,
    ts.ScriptTarget.Latest,
    true,
  );
  const found: string[] = [];
  function visit(node: ts.Node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier !== undefined &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      found.push(node.moduleSpecifier.text);
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      const argument = node.arguments[0];
      if (argument !== undefined && ts.isStringLiteral(argument))
        found.push(argument.text);
      else
        throw new Error(
          `Dynamic imports must name a reviewed source file: ${relative(ROOT, file)}`,
        );
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return found.filter((specifier) => specifier.startsWith('.'));
}

it('keeps production imports acyclic, within area ownership, and outside test fixtures', () => {
  const files = sourceFiles(ROOT).filter(
    (file) =>
      !/\.test\.(ts|tsx)$/.test(file) &&
      !file.includes('/testing/') &&
      !file.includes('/test/'),
  );
  const graph = new Map(
    files.map((file) => [
      file,
      imports(file).map((specifier) =>
        resolve(dirname(file), specifier.split('?')[0] ?? specifier),
      ),
    ]),
  );
  const violations: string[] = [];
  for (const [file, dependencies] of graph) {
    const source = relative(ROOT, file);
    const area = source.split('/')[0] ?? '';
    if (!(area in ALLOWED)) violations.push(`${source}: unowned source area`);
    for (const dependency of dependencies) {
      const target = relative(ROOT, dependency);
      const targetArea = target.split('/')[0] ?? '';
      if (!(ALLOWED[area] ?? []).includes(targetArea))
        violations.push(`${source} -> ${target}: ownership`);
      if (
        targetArea === 'features' &&
        source.split('/').slice(0, 2).join('/') !==
          target.split('/').slice(0, 2).join('/') &&
        !FEATURE_API.has(target)
      )
        violations.push(`${source} -> ${target}: private feature API`);
      if (
        /\.test\.(ts|tsx)$/.test(target) ||
        target.includes('/testing/') ||
        target.startsWith('test/')
      )
        violations.push(`${source} -> ${target}: test code`);
    }
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  function visit(file: string, path: readonly string[]) {
    if (visiting.has(file)) {
      violations.push(
        `cycle: ${[...path, file].map((part) => relative(ROOT, part)).join(' -> ')}`,
      );
      return;
    }
    if (visited.has(file)) return;
    visiting.add(file);
    for (const dependency of graph.get(file) ?? [])
      visit(dependency, [...path, file]);
    visiting.delete(file);
    visited.add(file);
  }
  for (const file of graph.keys()) visit(file, []);
  expect(violations).toEqual([]);
});
