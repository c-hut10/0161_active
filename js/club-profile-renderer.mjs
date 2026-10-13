import { displaySportName, sportGlossaryUrl as profileGlossaryUrl, formatMembership, WEEK_DAYS as profileDays, sessionTime, escapeHtml, onlineProfileAction, genderEligibilityLabel, beginnerFriendlyLabel } from './club-formatting.mjs';
import { clubVerificationBadge, clubConfirmation } from './club-verification.mjs';
import { sessionTitle, sessionAddress, sessionAudience, sessionScheduleNote, sessionVenueNote, sessionVenueNoteHtml, sessionTerms, clubSessionPriceLabel } from './session-details.mjs';
import { clubTrainingAreas } from './club-areas.mjs';
import { normaliseLeagues, leaguePageUrl } from './club-leagues.mjs';

/* Profile league links: list each league once, using internal pages or national organiser URLs. */
function renderProfileLeagues(club) {
  const leagues = new Map();
  normaliseLeagues(club.participatingLeagues).forEach(league => {
    const key = league.name.toLocaleLowerCase('en-GB');
    if (!leagues.has(key) || (!leagues.get(key).leagueUrl && league.leagueUrl)) leagues.set(key, league);
  });
  return [...leagues.values()].map(league => {
    const national = league.coverage === 'national';
    const href = national ? league.leagueUrl : club.sport ? leaguePageUrl(club.sport, league.name) : null;
    const label = escapeHtml(league.name);
    return href ? `<a class="profile-league-link" href="${escapeHtml(href)}"${national ? ' target="_blank" rel="noopener noreferrer" aria-description="Opens in a new tab"' : ''}>${label}</a>` : label;
  }).join(' · ');
}

/* Missing About details: inform visitors and give the club a direct route to supply an update. */
function renderEmptyAbout(club) {
  const href = `mailto:contact.0161active@gmail.com?subject=${encodeURIComponent(`Update club details: ${club.name}`)}`;
  return `<p>More about this club coming soon.</p>
        <p><a class="profile-about-update" href="${escapeHtml(href)}">Update your club details</a></p>`;
}

export function renderClubProfile(club, notice = '', pageUrl = 'https://0161active.co.uk/') {
  /* Club data: build each sports profile from its matching shared JSON record. */
  /* Contact action: email is the sole source of the Contact button. */
  function contactUrl(contact) {
    const email = contact?.trim() || '';
    if (!email || !email.includes('@') || /^[a-z]+:/i.test(email)) return null;
    return { label: 'CONTACT', href: new URL(`mailto:${email}`).href };
  }

  function renderAction(action, secondary = false) {
    if (!action) return '';
    const { href, label } = action;
    const className = `profile-action${secondary ? ' profile-action--secondary' : ''}`;
    const external = href.startsWith('http:') || href.startsWith('https:');
    return `<a class="${className}" href="${escapeHtml(href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escapeHtml(label)}</a>`;
  }

  /* Training summary: show stored days and times across the full width before the club photo. */
  function renderTrainingSummary(club) {
    const sessions = Array.isArray(club.sessions) ? [...club.sessions] : [];
    const dayOrder = session => profileDays.find(day => day.number === Number(session.dayOfWeek))?.number ?? 8;
    sessions.sort((left, right) => dayOrder(left) - dayOrder(right)
      || (left.startTime || '99:99').localeCompare(right.startTime || '99:99'));
    const summaries = new Map();
    sessions.forEach(session => {
      const day = profileDays.find(day => day.number === Number(session.dayOfWeek));
      const dayName = day?.name || 'Day to confirm';
      const time = sessionTime(session);
      const note = sessionScheduleNote(session);
      // Teams sharing a time appear once here; the full timetable retains each team's details.
      const key = JSON.stringify([dayName, time, note]);
      if (!summaries.has(key)) summaries.set(key, `<li class="profile-training-summary__session">
        <strong>${escapeHtml(dayName)}</strong><time>${escapeHtml(time)}</time>
        ${note ? `<span>${escapeHtml(note)}</span>` : ''}
      </li>`);
    });
    return `<section class="profile-training-summary" aria-labelledby="profile-training-summary-title">
      <div class="profile-training-summary__heading">
        <h2 id="profile-training-summary-title">Training Summary</h2>
        <a href="#profile-week-title">Full timetable <span aria-hidden="true">↗</span></a>
      </div>
      <div class="profile-training-summary__body">
        ${summaries.size ? `<ul class="profile-training-summary__sessions">${[...summaries.values()].join('')}</ul>`
          : '<p class="profile-training-summary__empty">Training days and times are not listed yet.</p>'}
      </div>
    </section>`;
  }

  /* Weekly calendar: place each listed session beneath its day and show meeting points. */
  function renderWeek(club, notice) {
    const sessions = Array.isArray(club.sessions) ? club.sessions : [];
    const dayCells = profileDays.map(day => {
      const daySessions = sessions.filter(session => Number(session.dayOfWeek) === day.number);
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
      return `<div class="profile-day">
        <p class="profile-day__name">${day.short}</p>
        ${sessionMarkup}
      </div>`;
    }).join('');

    return `<section class="profile-week" aria-labelledby="profile-week-title">
      <div class="profile-week__heading">
        <div><h2 id="profile-week-title">Week at a glance</h2></div>
      <p>${sessions.length} ${sessions.length === 1 ? 'session' : 'sessions'}</p>
      </div>
      <div class="profile-week__grid" role="group" aria-label="${escapeHtml(club.name)} weekly sessions">${dayCells}</div>
      ${notice ? `<p class="profile-week__notice">${escapeHtml(notice)}</p>` : ''}
    </section>`;
  }

  const photoPath = typeof club.imagePath === 'string' && club.imagePath.startsWith('img/')
    ? `../../${club.imagePath}`
    : null;
  const photo = photoPath
    ? `<img class="profile-photo" src="${escapeHtml(photoPath)}" alt="${escapeHtml(`${club.name} club photo`)}">`
    : '<div class="profile-photo profile-photo--missing">Club photo not available</div>';
  const sportLabel = displaySportName(club.sport, { titleCase: true });
  const areas = clubTrainingAreas(club);
  const sportArea = [
    sportLabel ? `<a href="${escapeHtml(profileGlossaryUrl(club.sport))}">${escapeHtml(sportLabel)}</a>` : '',
    ...areas.map(area => club.sport ? `<a href="${escapeHtml(profileGlossaryUrl(club.sport, area))}">${escapeHtml(area)}</a>` : escapeHtml(area))
  ].filter(Boolean).join(' · ') || 'MANCHESTER CLUB';
  const detailRow = (label, value) => `<div class="profile-detail-row"><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`;
  const isPaidClub = ['monthly_fee', 'annual_fee', 'per_session', 'paid'].includes(club.price?.type);
  const leagueLinks = renderProfileLeagues(club);
  const genderLabel = genderEligibilityLabel(club);
  /* Booking guidance: reuse the validated club URL, with plain text when no link is supplied. */
  const onlineAction = onlineProfileAction(club.onlineProfile?.url, pageUrl);
  const bookingContact = onlineAction
    ? `<a class="profile-booking-link" href="${escapeHtml(onlineAction.href)}" target="_blank" rel="noopener noreferrer" aria-description="Opens in a new tab">contact</a>`
    : 'contact';
  const details = [
    detailRow('SPORT', club.sport ? displaySportName(club.sport, { titleCase: true }) : 'To confirm'),
    // Show confirmed eligibility without assigning a gender answer to existing records.
    genderLabel ? detailRow('GENDER ELIGIBILITY', genderLabel) : '',
    beginnerFriendlyLabel(club) ? detailRow('BEGINNER FRIENDLY', beginnerFriendlyLabel(club)) : '',
    leagueLinks ? `<div class="profile-detail-row"><dt>LEAGUE</dt><dd>${leagueLinks}</dd></div>` : '',
    detailRow('AREA', areas.join(' · ') || 'Area to confirm'),
    // Training locations: jump to the weekly timetable containing each session's venue.
    '<div class="profile-detail-row"><dt>TRAINING LOCATION(S)</dt><dd><a href="#profile-week-title">View Calendar</a></dd></div>',
    detailRow('COST', clubSessionPriceLabel(club, { compact: true, unknown: 'Not listed', free: 'free', missingAmount: 'amount to confirm' })),
    formatMembership(club) ? detailRow('OPTIONAL MEMBERSHIP', formatMembership(club)) : '',
    club.pricingNotes ? detailRow('PRICING DETAILS', club.pricingNotes) : '',
    club.tasterNotes ? detailRow('TASTER DETAILS', club.tasterNotes) : '',
    club.bookingNotes ? detailRow('BOOKING DETAILS', club.bookingNotes) : '',
    isPaidClub && Number.isInteger(club.tasterSessionCount) && club.tasterSessionCount > 0
      ? detailRow('TASTER SESSION(S)', String(club.tasterSessionCount))
      : '',
    isPaidClub && club.bookingRequired === true
      ? `<div class="profile-detail-row"><dt>BOOKING</dt><dd>Please ${bookingContact} the club for booking information</dd></div>`
      : ''
  ].join('');
  const confirmation = clubConfirmation(club);
  const informationDate = confirmation
    ? `Last Confirmed: <time datetime="${confirmation.date}">${confirmation.label}</time>`
    : 'Unverified · Last Confirmed: not yet recorded';
  const actions = [
    renderAction(contactUrl(club.contact), true),
    renderAction(onlineAction)
  ].filter(Boolean).join('');

  const html = `<section class="profile-heading" aria-labelledby="profile-title">
      <div class="profile-heading__identity">
        <p class="profile-eyebrow">${sportArea}</p>
        <h1 id="profile-title">${escapeHtml(club.name)}${clubVerificationBadge(club)}</h1>
        <p class="profile-information-date">${informationDate}</p>
      </div>
      ${actions ? `<div class="profile-actions" aria-label="Club actions">${actions}</div>` : ''}
    </section>
    ${renderTrainingSummary(club)}
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
        : renderEmptyAbout(club)}
    </section>
    ${club.additionalInformation?.trim() ? `<section class="profile-about" aria-labelledby="profile-additional-title"><h2 id="profile-additional-title">Additional information</h2><p>${escapeHtml(club.additionalInformation)}</p></section>` : ''}
    ${renderWeek(club, notice)}`;
  return { html, title: `${club.name} | 0161 Active` };
}
