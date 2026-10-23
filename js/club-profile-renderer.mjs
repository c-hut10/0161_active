import { displaySportName, sportGlossaryUrl as profileGlossaryUrl, WEEK_DAYS as profileDays, sessionTime, escapeHtml, clubSports, compareSessionStartTimes } from './club-formatting.mjs';
import { clubVerificationBadge, clubConfirmation } from './club-verification.mjs';
import { sessionTitle, sessionAddress, sessionAudience, sessionScheduleNote, sessionVenueNote, sessionVenueNoteHtml, sessionTerms } from './session-details.mjs';
import { clubTrainingAreas } from './club-areas.mjs';
import { favouriteButton } from './club-favourites-renderer.mjs';
import { clubProfileActions, renderProfileDetails } from './club-profile-details.mjs';

/* Missing About details: inform visitors and give the club a direct route to supply an update. */
function renderEmptyAbout() {
  return `<p>More about this club coming soon.</p>
        <p><a class="profile-about-update" href="/html/contact.html">Update your club details</a></p>`;
}

export function renderClubProfile(club, notice = '', pageUrl = 'https://0161active.co.uk/') {
  /* Club data: build each sports profile from its matching shared JSON record. */
  function renderAction(action, secondary = false) {
    if (!action) return '';
    const { href, label } = action;
    const className = `profile-action${secondary ? ' profile-action--secondary' : ''}`;
    const external = href.startsWith('http:') || href.startsWith('https:');
    return `<a class="${className}" href="${escapeHtml(href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escapeHtml(label)}</a>`;
  }

  /* Weekly calendar: place each listed session beneath its day and show meeting points. */
  function renderWeek(club, notice) {
    /* Partial venue details must not appear as a confirmed calendar session. */
    const sessions = (Array.isArray(club.sessions) ? club.sessions : []).filter(session =>
      profileDays.some(day => day.number === Number(session.dayOfWeek))
      && /^([01]?\d|2[0-3]):[0-5]\d$/.test(session.startTime || ''));
    const hasScheduledDays = sessions.some(session => profileDays.some(day => day.number === Number(session.dayOfWeek)));
    const dayCells = profileDays.map(day => {
      const daySessions = sessions.filter(session => Number(session.dayOfWeek) === day.number).sort(compareSessionStartTimes);
      const sessionMarkup = daySessions.length
        ? daySessions.map(session => `<article class="profile-session">
            <strong class="session-title">${escapeHtml(sessionTitle(club, session))}</strong>
            ${session.subtitle?.trim() ? `<span class="session-subtitle">${escapeHtml(session.subtitle)}</span>` : ''}
            <time>${escapeHtml(sessionTime(session))}</time>
            ${sessionTerms(club, session).map(term => `<span>${escapeHtml(term)}</span>`).join('')}
            ${sessionAudience(session) ? `<span>${escapeHtml(sessionAudience(session))}</span>` : ''}
            <span>${escapeHtml(sessionAddress(session) || session.area || 'Location to confirm')}</span>
            ${sessionAddress(session) ? `<button type="button" class="profile-copy-address" data-copy-address="${escapeHtml(sessionAddress(session))}" aria-label="Copy address for ${escapeHtml(sessionTitle(club, session))} on ${escapeHtml(day.name)}" hidden>Copy address</button><span class="profile-copy-address-status" role="status" hidden></span>` : ''}
            ${sessionVenueNote(club, session) ? `<span>${sessionVenueNoteHtml(club, session)}</span>` : ''}
            ${sessionScheduleNote(session) ? `<span>${escapeHtml(sessionScheduleNote(session))}</span>` : ''}
          </article>`).join('')
        : '<span class="profile-empty">—</span>';
      return `<div class="profile-day${daySessions.length ? '' : ' profile-day--empty'}">
        <p class="profile-day__name">${day.short}</p>
        ${sessionMarkup}
      </div>`;
    }).join('');

    return `<section class="profile-week" aria-labelledby="profile-week-title">
      <div class="profile-week__heading">
        <div><h2 id="profile-week-title">Week at a glance</h2></div>
      </div>
      <div class="profile-week__grid" role="group" aria-label="${escapeHtml(club.name)} weekly sessions">${dayCells}${hasScheduledDays ? '' : '<p class="profile-week__empty-summary">Training to be confirmed</p>'}</div>
      ${notice ? `<p class="profile-week__notice">${escapeHtml(notice)}</p>` : ''}
    </section>`;
  }

  const photoPath = typeof club.imagePath === 'string' && club.imagePath.startsWith('img/')
    ? `../../${club.imagePath}`
    : null;
  const photo = photoPath
    ? `<img class="profile-photo" src="${escapeHtml(photoPath)}" alt="${escapeHtml(`${club.name} club photo`)}">`
    : '<div class="profile-photo profile-photo--missing">Club photo not available</div>';
  const profileSports = clubSports(club);
  const areas = clubTrainingAreas(club);
  const sportArea = [
    ...profileSports.map(sport => `<a href="${escapeHtml(profileGlossaryUrl(sport))}">${escapeHtml(displaySportName(sport === profileSports[0] ? club.sport.replaceAll('-', ' ') : sport.replaceAll('-', ' '), { titleCase: true }))}</a>`),
    ...areas.map(area => club.sport ? `<a href="${escapeHtml(profileGlossaryUrl(club.sport, area))}">${escapeHtml(area)}</a>` : escapeHtml(area))
  ].filter(Boolean).join(' · ') || 'MANCHESTER CLUB';
  const { contact, online } = clubProfileActions(club, pageUrl);
  const details = renderProfileDetails(club, { onlineAction: online });
  const confirmation = clubConfirmation(club);
  const informationDate = confirmation
    ? `Last Confirmed: <time datetime="${confirmation.date}">${confirmation.label}</time>`
    : 'Unverified · Last Confirmed: not yet recorded';
  const actions = [
    renderAction(contact, true),
    renderAction(online)
  ].filter(Boolean).join('');

  const html = `<section class="profile-heading" aria-labelledby="profile-title">
      <div class="profile-heading__identity">
        <p class="profile-eyebrow">${sportArea}</p>
        <h1 id="profile-title">${escapeHtml(club.name)}${clubVerificationBadge(club)}</h1>
        <p class="profile-information-date">${informationDate}</p>
      </div>
      <div class="profile-actions" aria-label="Club actions">${actions}${favouriteButton(club)}</div>
    </section>
    ${renderWeek(club, notice)}
    <section class="profile-overview" aria-label="${escapeHtml(club.name)} photo and details">
      ${photo}
      <div class="profile-copy">
        <dl class="profile-details-list">${details}</dl>
      </div>
    </section>
    <section class="profile-about" aria-labelledby="profile-about-title">
      <h2 id="profile-about-title">About the club</h2>
      ${club.description?.trim()
        ? `<p>${escapeHtml(club.description)}</p>`
        : club.additionalInformation?.trim() ? '' : renderEmptyAbout()}
      ${club.additionalInformation?.trim() ? `<p>${escapeHtml(club.additionalInformation)}</p>` : ''}
    </section>`;
  return { html, title: `${club.name} | 0161 Active` };
}
