# Code checks

Run `pnpm check` from the repository root. These development tools do not run in visitors' browsers and are not copied into the published site.

## What is checked

- JavaScript, modules, CommonJS and Apps Script syntax, including generated JavaScript.
- Missing relative JavaScript imports.
- ESLint rules for owned browser code, build scripts, Google Sheets scripts and tests. Leaflet's global is declared only where used; Apps Script service globals are declared separately.
- Python syntax, without executing import/build/geocoding scripts or creating bytecode caches.
- JSON parsing, including generated datasets.
- CSS parsing and formatting through Prettier. New supported source/config files must follow `.prettierrc.json`.
- Public-page metadata, duplicate IDs, navigation/module-script requirements, canonicals, sitemap policy, image alt attributes, shared footers and verification labels.
- Ten behaviour checks covering separate registration session rows/IDs, club-name/sport mapping, Apps Script headings, conditional prices, multiline CSV imports, clock ordering, time windows, budgets, ward-result isolation, sport-card counts and unique club/profile identifiers.
- Shell syntax for the pre-commit entry point. The hook also rejects whitespace errors on staged lines.

Temporary previews, archived material, private import exports, packaged output, dependencies and third-party libraries are outside the owned-code cleanup scope. Generated pages still receive public-page checks; generated JavaScript/JSON still receives syntax/parsing checks. Generator-owned layout is not reformatted.

## Existing formatting

The first run found existing compact files that do not match Prettier's layout. `scripts/format-baseline.json` lists the existing files allowed to keep their style for now. This exception covers formatting only, not syntax failures, invalid CSS, missing imports, ESLint errors or test failures.

`pnpm check:format` reports the existing formatting count while enforcing new files. Use `pnpm check:format --strict` for a failing report listing every formatting mismatch. This is deliberately not described as all existing source being fully formatted. A baseline file remains advisory after edits until it is deliberately formatted and removed from the baseline. Prefer small separate formatting changes rather than mixing them into functional work.

The checks never automatically reformat, stage, commit or deploy files. Existing stored club data is not rewritten by checks. CSV importer checks use review mode only. Apps Script syntax is checked locally; these checks do not execute Google's spreadsheet services.

## Install on this machine

Node.js 22.13 or newer, Python 3 and pnpm 11.25.0 are required. Install the pinned development tools with:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm hooks:install
```

The hook installer refuses to silently replace a different hooksPath or an existing native pre-commit hook. Hooks are local to a checkout, so other clones need the install step too. The hook finds Node on PATH; on this machine it can also use the bundled Codex Node runtime when a desktop Git client has a minimal PATH.

## Commits and partial staging

The pre-commit hook checks an isolated copy of the Git index, not the working files. An unstaged fix therefore cannot make broken staged code pass. Stage the check configuration, lockfile, tests and scripts together before committing their initial setup. Nothing has been staged or committed automatically.

To regenerate public output after changing club data or renderers, run `pnpm build`, then `pnpm check`. Build commands generate files; the check command itself does not.

Git hooks can be bypassed. `.github/workflows/checks.yml` therefore runs checks and a build on pushes and pull requests after these files are committed and pushed. Making that workflow a required merge check is a separate GitHub repository setting; it has not been changed here. The local checks do not validate live deployment, tile availability, browser layout, Google authorisation, CAPTCHA or Netlify email delivery.

Tool references: [ESLint configuration](https://eslint.org/docs/latest/use/configure/configuration-files) and [Prettier checks](https://prettier.io/docs/cli).
