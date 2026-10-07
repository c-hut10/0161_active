import { resolveClubAreas } from './club-areas.mjs';

/* Shared directory loading: reuse one request, parse and area resolution per file on each page. */
const requests = new Map();
function loadData(file) {
  if (!requests.has(file)) {
    const request = fetch(new URL(`../data/${file}`, import.meta.url)).then(async response => {
      if (!response.ok) throw new Error('The directory could not be loaded. Please try again later.');
      const data = await response.json();
      if (file === 'clubs.json') {
        if (!Array.isArray(data.clubs)) throw new Error('The club directory has an invalid format.');
        return { ...data, clubs: data.clubs.filter(club => club && typeof club.id === 'string'
          && typeof club.name === 'string').map(resolveClubAreas) };
      }
      return data;
    }).catch(error => {
      requests.delete(file); // A failed request can be retried by a later interaction.
      throw error;
    });
    requests.set(file, request);
  }
  return requests.get(file);
}

export const loadClubDirectory = () => loadData('clubs.json');
export const loadSportCatalog = () => loadData('sports.json');
