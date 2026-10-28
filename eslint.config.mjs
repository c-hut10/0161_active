import js from '@eslint/js';
import globals from 'globals';

// Lint owned code; generated geography and vendor files are checked without rewriting them.
export default [
  {
    ignores: [
      'dist/**',
      'tmp/**',
      'archive/**',
      'vendor/**',
      'node_modules/**',
      'js/postcode-areas.mjs',
      'js/home-region-shapes.mjs'
    ]
  },
  {
    files: ['**/*.{js,mjs,cjs,gs}'],
    ...js.configs.recommended,
    languageOptions: { ecmaVersion: 'latest' },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
      'no-useless-escape': 'warn',
      'no-empty': ['error', { allowEmptyCatch: true }]
    }
  },
  { files: ['js/**/*.{js,mjs}'], languageOptions: { globals: globals.browser } },
  { files: ['js/club-map.js'], languageOptions: { globals: { L: 'readonly' } } },
  { files: ['scripts/**/*.{js,mjs,cjs}', 'tests/**/*.mjs', '*.mjs'], languageOptions: { globals: globals.node } },
  {
    files: ['tools/**/*.gs'],
    languageOptions: {
      sourceType: 'script',
      globals: Object.fromEntries(
        ['SpreadsheetApp', 'ScriptApp', 'HtmlService', 'Utilities', 'LockService'].map((name) => [name, 'readonly'])
      )
    },
    // Apps Script calls these public functions by name, outside the JavaScript import graph.
    rules: {
      'no-unused-vars': [
        'error',
        {
          varsIgnorePattern:
            '^(onOpen|onEdit|setup0161|importMaster0161|freshStart0161|organiseSports0161|prepareCsv0161|markCsvExported0161|deleteSelectedClub0161|exportStatus0161|importRegistration0161|previewRegistration0161|commitRegistration0161|activeEdit0161|activeChange0161|sync0161|format0161|repairClubColumns0161|backup0161|restore0161|export0161|setupUpdateTimestamps)$',
          args: 'none',
          caughtErrors: 'none'
        }
      ]
    }
  }
];
