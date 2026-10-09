import { displaySportName } from './club-formatting.mjs';
import { clubDescriptionText } from './club-description.mjs';

/* Structured data: describe visible directory records; training venues are not club headquarters. */
export function siteStructuredData({ origin, relative, title, description, club, clubs = [], sports = [], items = [] }) {
  const absolute = path => new URL(path, `${origin}/`).href;
  const pageUrl = absolute(relative === 'index.html' ? '' : relative);
  const organization = {
    '@type': 'Organization', '@id': `${origin}/#organization`, name: '0161 Active',
    url: `${origin}/`, logo: absolute('img/0161 Active_Logo.png'),
    email: 'contact.0161active@gmail.com'
  };
  const website = {
    '@type': 'WebSite', '@id': `${origin}/#website`, url: `${origin}/`,
    name: '0161 Active', inLanguage: 'en-GB', publisher: { '@id': organization['@id'] }
  };
  const page = {
    '@type': clubs.length || sports.length || items.length ? 'CollectionPage' : 'WebPage',
    '@id': `${pageUrl}#page`, url: pageUrl, name: title, description,
    inLanguage: 'en-GB', isPartOf: { '@id': website['@id'] }
  };
  const graph = [page];
  if (relative === 'index.html') graph.push(organization, website);
  if (club) {
    const entity = {
      '@type': club.sport === 'health & wellbeing' ? 'Organization' : 'SportsOrganization',
      '@id': `${pageUrl}#club`, name: club.name, description: clubDescriptionText(club),
      mainEntityOfPage: { '@id': page['@id'] }
    };
    if (entity['@type'] === 'SportsOrganization') entity.sport = displaySportName(club.sport);
    if (club.imagePath) entity.image = absolute(club.imagePath);
    if (club.contact) entity.email = club.contact;
    if (club.onlineProfile?.url) entity.sameAs = [club.onlineProfile.url];
    graph.push(entity);
    page.mainEntity = { '@id': entity['@id'] };
  } else if (clubs.length || sports.length || items.length) {
    const entries = items.length ? items.map(item => ({ name: item.name, url: absolute(item.url) })) : clubs.length
      ? clubs.map(record => ({ name: record.name, url: absolute(record.profilePath) }))
      : sports.map(record => ({ name: displaySportName(record.name), url: absolute(`html/sports/${record.slug}.html`) }));
    const list = {
      '@type': 'ItemList', '@id': `${pageUrl}#list`, numberOfItems: entries.length,
      itemListElement: entries.map((entry, index) => ({ '@type': 'ListItem', position: index + 1, ...entry }))
    };
    page.mainEntity = { '@id': list['@id'] };
    graph.push(list);
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}
