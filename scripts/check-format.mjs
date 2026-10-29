import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as prettier from 'prettier';
import { sourceFiles, formatCandidate } from './quality-files.mjs';

// Existing compact source is advisory; new files must follow the shared formatter.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baselinePath = path.join(root, 'scripts/format-baseline.json');
const baseline = new Set(JSON.parse(fs.readFileSync(baselinePath, 'utf8')).files);
const legacy = [],
  errors = [];
for (const file of sourceFiles(root).filter(formatCandidate)) {
  try {
    const options = await prettier.resolveConfig(path.join(root, file));
    const formatted = await prettier.check(fs.readFileSync(path.join(root, file), 'utf8'), {
      ...options,
      filepath: file
    });
    if (!formatted) (baseline.has(file) && !process.argv.includes('--strict') ? legacy : errors).push(file);
  } catch (error) {
    errors.push(`${file}: ${error.message}`);
  }
}
if (legacy.length)
  console.log(
    `Formatting advisory: ${legacy.length} existing files use legacy layout. Use check:format --strict to list all as failures.`
  );
if (errors.length) {
  console.error('Formatting failed:\n' + errors.map((file) => `  ${file}`).join('\n'));
  process.exitCode = 1;
} else console.log('Formatting: all new source files follow the configured style.');
