import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { matchesSessionBudget, matchesSessionStartTime } from '../js/club-directory-filters.js';
import { compareSessionStartTimes } from '../js/club-formatting.mjs';
import { groupWardSessions, wardClubItems, renderWardClubList } from '../js/map-zone-results.mjs';
import { renderSportsDirectory } from '../js/sports-directory-renderer.mjs';

// These checks protect user-visible filtering, ordering and per-ward session boundaries.
test('calendar times sort by clock time, including half hours', () => {
  const entries = [{ startTime: '10:00' }, { startTime: '9:30' }, { startTime: '09:00' }];
  assert.deepEqual(
    entries.sort(compareSessionStartTimes).map((session) => session.startTime),
    ['09:00', '9:30', '10:00']
  );
});
test('time flexibility works across midnight and rejects missing times', () => {
  assert.equal(matchesSessionStartTime({ startTime: '23:55' }, '00:00', 15), true);
  assert.equal(matchesSessionStartTime({ startTime: '19:30' }, '19:00', 15), false);
  assert.equal(matchesSessionStartTime({}, '19:00', 0), false);
});
test('annual budgets convert monthly dues and session overrides use their own prices', () => {
  const club = { price: { type: 'monthly_fee', amount: 25, currency: 'GBP' } };
  assert.equal(matchesSessionBudget(club, null, 'membership', '299'), false);
  assert.equal(matchesSessionBudget(club, null, 'membership', '300'), true);
  assert.equal(matchesSessionBudget(club, { price: { type: 'per_session', amount: 6 } }, 'per_session', '5'), false);
});
test('ward menu contains only matching sessions in that ward, without duplicate day cards', () => {
  const club = { id: 'sample', name: 'Sample Club', sport: 'korfball', profilePath: 'html/korfball/sample.html' };
  const input = [
    {
      club,
      sessions: [
        { postcode: 'M20 2ET', dayOfWeek: 2 },
        { postcode: 'M20 2ET', dayOfWeek: 2 },
        { postcode: 'M11 3DS', dayOfWeek: 4 },
        { postcode: 'ZZ1 1ZZ', dayOfWeek: 5 }
      ]
    }
  ];
  const { groups, unassigned } = groupWardSessions(input, { M202ET: 'ward-a', M113DS: 'ward-b' });
  assert.equal(unassigned, 1);
  assert.equal(groups.get('ward-a').get('sample').sessions.length, 2);
  assert.equal(wardClubItems(groups.get('ward-a')).length, 1);
  const html = renderWardClubList(groups.get('ward-a'));
  assert.match(html, /Korfball · Tuesday/);
  assert.doesNotMatch(html, /Thursday/);
  assert.match(renderWardClubList(new Map()), /No clubs match/);
});
test('sports cards keep club counts but do not show local league counts', () => {
  const html = renderSportsDirectory([{ name: 'Korfball', slug: 'korfball', clubCount: 3, leagueCount: 4 }]);
  assert.match(html, /3 CLUBS/);
  assert.doesNotMatch(html, /LOCAL LEAGUE|sports-directory-card__leagues/);
});
test('club IDs and generated profile routes are unique in the source data', () => {
  const { clubs } = JSON.parse(fs.readFileSync(new URL('../data/clubs.json', import.meta.url), 'utf8'));
  assert.equal(new Set(clubs.map((club) => club.id)).size, clubs.length);
  assert.equal(new Set(clubs.map((club) => club.profilePath)).size, clubs.length);
});
