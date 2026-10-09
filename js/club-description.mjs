import { displaySportName } from './club-formatting.mjs';
import { clubTrainingAreas } from './club-areas.mjs';

/* Public summary: use supplied copy or a factual directory summary, without inventing club history. */
export function clubDescriptionText(club) {
  if (club.description?.trim()) return club.description.trim();
  const sport = displaySportName(club.sport, { titleCase: true, fallback: 'Sport' });
  const areas = clubTrainingAreas(club);
  const location = areas.length ? `, with listed training locations in ${areas.join(' and ')}` : '';
  const schedule = club.sessions?.length
    ? 'Browse the listed training sessions below and check current arrangements with the club before attending.'
    : 'Training days and times have not yet been supplied. Contact the club for current arrangements.';
  return `${club.name} is listed in our ${sport} directory${location}. ${schedule}`;
}
