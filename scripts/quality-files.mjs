import fs from 'node:fs';
import path from 'node:path';

// One scope keeps generated output, private imports and third-party code out of cleanup.
export const excludedDirectories = new Set([
  '.git',
  'node_modules',
  '.pnpm-store',
  'dist',
  'outputs',
  'tmp',
  'archive',
  'vendor',
  'private-imports',
  '.netlify'
]);
export const generatedFiles = new Set(['js/postcode-areas.mjs', 'js/home-region-shapes.mjs']);
export const codeExtensions = new Set([
  '.js',
  '.mjs',
  '.cjs',
  '.gs',
  '.py',
  '.css',
  '.json',
  '.html',
  '.inc',
  '.yml',
  '.yaml'
]);
export function sourceFiles(root) {
  const files = [];
  function visit(relative) {
    for (const entry of fs.readdirSync(path.join(root, relative), { withFileTypes: true })) {
      if (entry.isSymbolicLink() || entry.name.startsWith('.env')) continue;
      const name = path.posix.join(relative, entry.name);
      if (entry.isDirectory()) {
        if (!excludedDirectories.has(entry.name)) visit(name);
      } else if (codeExtensions.has(path.extname(name))) files.push(name);
    }
  }
  visit('');
  return files.sort();
}
export function formatCandidate(file) {
  // Geographic datasets and emitted pages have generator-owned layout; still validate their syntax/data.
  return (
    !generatedFiles.has(file) &&
    !file.startsWith('html/') &&
    !['index.html', '404.html'].includes(file) &&
    ![
      'data/map-wards.json',
      'data/postcode-sectors.json',
      'data/club-map-locations.json',
      'data/geocoding-cache.json'
    ].includes(file) &&
    !['.py', '.inc', '.html'].includes(path.extname(file))
  );
}
