import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Do not silently replace another team's configured hook directory.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const existing = spawnSync('git', ['config', '--local', '--get', 'core.hooksPath'], { cwd: root, encoding: 'utf8' });
if (existing.error) throw existing.error;
if (existing.stdout.trim() && existing.stdout.trim() !== '.githooks')
  throw new Error('Another hooksPath is already configured: ' + existing.stdout.trim());
const nativeHook = path.join(root, '.git/hooks/pre-commit');
if (!existing.stdout.trim() && fs.existsSync(nativeHook))
  throw new Error('An existing pre-commit hook needs manual integration.');
fs.chmodSync(path.join(root, '.githooks/pre-commit'), 0o755);
const result = spawnSync('git', ['config', '--local', 'core.hooksPath', '.githooks'], { cwd: root, stdio: 'inherit' });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
console.log('Pre-commit checks enabled for this checkout.');
