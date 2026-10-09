# Cian Hutton Final Project

## Welcome 

### Sub-sub title

*italic effect*

**bold effect**

 - [ ] Populate HTML code for nav sections

 - [x] Generate club profile HTML from a shared template and JSON club records

 - [ ] Ask the team about API's and how to populate a club's details using a database

## Club content folders

Keep club profile pages and their club-specific images grouped by sport:

- `html/<sport>/` stores that sport's club profile pages (currently `html/run-club/`).
- `img/<sport>/` stores the matching club photos (currently `img/run-club/`).
- Shared site assets, such as the logo and social icons, stay directly in `img/`.

## Updating club pages

Edit `data/clubs.json`, then run `node scripts/build-site-metadata.cjs`. The generator uses `templates/club-profile.inc` and the shared profile renderer to create or update every club page. New records can create new sport folders and pages without copying HTML. See `docs/site-maintenance.md` for the full workflow.

## Postcode area naming

All 173 approved sector labels are saved in [docs/postcode-area-rulebook.md](docs/postcode-area-rulebook.md). Edit that table and run the profile generator to update the shared postcode lookup. The calendar, sport directories, profiles, gallery, map and registration preview use these rules to derive areas from training postcodes.
