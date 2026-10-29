import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { ESLint } from 'eslint';
import { sourceFiles } from './quality-files.mjs';

// Fail closed: check staged content in isolation instead of trusting unstaged repairs.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', ...options });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`${command} ${args.join(' ')}\n${result.stdout || ''}${result.stderr || ''}`);
  return result.stdout;
}
if (process.argv.includes('--staged')) {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), '0161-staged-check-'));
  try {
    run('git', [
      'diff',
      '--cached',
      '--check',
      '--',
      '.',
      ':(exclude)tmp/**',
      ':(exclude)archive/**',
      ':(exclude)vendor/**'
    ]);
    const names = run('git', ['ls-files', '-z'])
      .split('\0')
      .filter(Boolean)
      .filter((name) => !/^(?:tmp|archive|dist|node_modules|private-imports|\.pnpm-store)(?:\/|$)/.test(name));
    run('git', ['checkout-index', '--prefix=' + temporary + '/', '-z', '--stdin'], { input: names.join('\0') + '\0' });
    if (!fs.existsSync(path.join(temporary, 'scripts/check-code.mjs')))
      throw new Error('Stage the quality-check setup before committing.');
    fs.symlinkSync(path.join(root, 'node_modules'), path.join(temporary, 'node_modules'), 'dir');
    const result = spawnSync(process.execPath, [path.join(temporary, 'scripts/check-code.mjs')], {
      cwd: temporary,
      stdio: 'inherit'
    });
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
} else {
  const files = sourceFiles(root);
  try {
    let syntax = 0;
    for (const file of files) {
      const extension = path.extname(file);
      if (['.js', '.mjs', '.cjs', '.gs'].includes(extension)) {
        run(
          process.execPath,
          ['--check', ...(extension === '.gs' ? [] : [file])],
          extension === '.gs' ? { input: fs.readFileSync(path.join(root, file), 'utf8') } : {}
        );
        // Catch renamed or missing local modules even when that feature has no test yet.
        const text = fs.readFileSync(path.join(root, file), 'utf8');
        for (const match of text.matchAll(/(?:from\s*|import\s*\(\s*)['"](\.{1,2}\/[^'"]+)['"]/g)) {
          const dependency = path.resolve(root, path.dirname(file), match[1].split(/[?#]/)[0]);
          if (!fs.existsSync(dependency)) throw new Error(`${file}: missing local import ${match[1]}`);
        }
        syntax++;
      } else if (extension === '.json') JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
      else if (extension === '.py')
        run(process.env.PYTHON_BINARY || 'python3', [
          '-c',
          'import ast,sys; ast.parse(open(sys.argv[1], encoding="utf-8").read(), filename=sys.argv[1])',
          file
        ]);
    }
    console.log(`Syntax: ${syntax} JavaScript/Apps Script files; JSON and Python parsed successfully.`);
    const eslint = new ESLint({ cwd: root });
    const results = await eslint.lintFiles(['js', 'scripts', 'tools', 'tests', 'eslint.config.mjs']);
    const formatter = await eslint.loadFormatter('stylish');
    const lint = formatter.format(results);
    if (lint) console.log(lint);
    if (results.some((result) => result.errorCount)) throw new Error('ESLint found blocking errors.');
    console.log('Lint: no blocking errors. Warnings are advisory.');
    const commands = [
      ['sh', ['-n', '.githooks/pre-commit']],
      [process.execPath, ['scripts/check-format.mjs']],
      [
        process.execPath,
        [
          '--test',
          ...fs
            .readdirSync(path.join(root, 'tests'))
            .filter((name) => name.endsWith('.test.mjs'))
            .map((name) => 'tests/' + name)
        ]
      ],
      [process.env.PYTHON_BINARY || 'python3', ['scripts/check-site-metadata.py']]
    ];
    for (const [command, args] of commands) console.log(run(command, args).trim());
    console.log('All blocking code checks passed. No files were rewritten.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
