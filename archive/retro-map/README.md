# Protected retro-map archive

Status: intentionally preserved. The map is still live on the landing page. This archive does not remove, move or disable it.

Do not treat these files as dead code, even if the website stops referring to them. Explicit approval naming the retro map is required to delete this archive.

## Saved source snapshot

`retro-map-source-2026-10-28.zip` contains the files listed in `manifest-2026-10-28.json`, with their original repository-relative paths. The manifest records SHA-256 hashes for verification. This captures the current local files, not just the last Git commit.

- `index.html`: full-map SVG shapes, borough hit areas and landing-page markup. This is a shared file: restore map sections only, not the entire old homepage.
- `css/home-entry.css`, `img/home-entry-glow.svg`: visual treatment and glow.
- `js/home-entry.js`: landing map interactions.
- `js/home-region-detail.mjs`: detailed region view and interactions.
- `js/home-region-shapes.mjs`: named SVG paths for the detailed wards in all ten boroughs.
- `img/manchester-regions/hover/`: ten borough glow images.
- `data/map-wards.json`: shared geographic source, also used by the main map. Do not replace it with an older copy without review.
- `scripts/build-retro-ward-links.py`, `scripts/build-region-details.py`, `scripts/prepare-ward-partitions.py`, `scripts/build-map-wards.py`: geometry preparation and regeneration sources.
- `archive/artwork/borough-source-cutouts/`, `archive/artwork/manchester-regions/`, the three pixelated-map drafts and `archive/geo/wards-may-2026-source.geojson`: original reference artwork and geographic source.
- `tmp/satellite-map-draft/*.json`: existing animation path data, copied here so a later temporary-folder cleanup cannot lose it.

The ZIP is a source archive, not a complete runnable copy of the site. Shared navigation, fonts and other website dependencies remain in the repository. SVG/PNG presentation exports and an editable Resolve animation project have not been created by this archive step. The detailed paths are preserved exactly in the source.

## Recovery

Extract the ZIP into a separate folder first. Review the manifest and recover only the map files or sections needed. Check all ten boroughs, detailed ward views, hover/selection and mobile behaviour before replacing live work. Preserve newer main-map and club-data changes.

A local ZIP is not an independent backup while it stays in this repository. Copy it to a separate drive or cloud backup. Keep the source files and archive in a Git commit too.

## Save a Git version

In VS Code Source Control, review the changed files. Stage only the changes you want saved. For this protection update, stage `AGENTS.md` and `archive/retro-map/` without staging unrelated work. Commit with a clear message such as `Protect and archive retro map before removal`. A commit saves a local recovery point; pushing publishes it to the configured remote. Tagging a commit only names that saved version and does not save uncommitted edits.

No commit, tag, push or live deployment was performed by creating this archive.
