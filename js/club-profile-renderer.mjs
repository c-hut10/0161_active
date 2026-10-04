import { trainingTimesBadge, trainingTimesConfirmation, verificationDate } from './club-verification.mjs';

export function renderClubProfile(club, notice = '', pageUrl = 'https://0161active.co.uk/') {
  /* Club data: build each sports profile from its matching shared JSON record. */
  let html = '';
  let title = '';
  const profileDays = [
    { number: 1, name: 'Monday', short: 'MON' },
    { number: 2, name: 'Tuesday', short: 'TUE' },
    { number: 3, name: 'Wednesday', short: 'WED' },
    { number: 4, name: 'Thursday', short: 'THU' },
    { number: 5, name: 'Friday', short: 'FRI' },
    { number: 6, name: 'Saturday', short: 'SAT' },
    { number: 7, name: 'Sunday', short: 'SUN' }
  ];

  /* HTML escaping: render club-submitted text as text instead of executable markup. */
  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]);
  }

  /* Link validation: only allow useful web and contact protocols in the two action buttons. */
  function safeUrl(value, allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:']) {
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
      const url = new URL(value.trim(), pageUrl);
      return allowedProtocols.includes(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  }

  /* Glossary routing: build a sport link, optionally preselecting the club's canonical area. */
  function profileSportSlug(value) {
    return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  /* Sport labels: show Run Club while routing through the existing running slug. */
  function displaySportName(value) {
    const title = String(value || '').replace(/\b\w/g, letter => letter.toUpperCase());
    return title.toLocaleLowerCase() === 'running' ? 'Run Club' : title;
  }

  function profileCanonicalArea(value) {
    const area = String(value || '').trim();
    return /didsbury/i.test(area) ? 'Didsbury' : area;
  }

  function profileGlossaryUrl(sport, area) {
    const params = new URLSearchParams({ sport: profileSportSlug(sport) });
    if (area) params.set('area', profileCanonicalArea(area));
    return `../sports/glossary.html?${params.toString()}`;
  }

  function contactUrl(contact) {
    const email = typeof contact === 'string' ? contact.trim() : String(contact?.email || '').trim();
    if (!email || !email.includes('@') || /^[a-z]+:/i.test(email)) return null;
    return `mailto:${email}`;
  }

  function renderAction(label, value, secondary = false, allowedProtocols) {
    const href = safeUrl(value, allowedProtocols);
    if (!href) return '';
    const className = `profile-action${secondary ? ' profile-action--secondary' : ''}`;
    const external = href.startsWith('http:') || href.startsWith('https:');
    return `<a class="${className}" href="${escapeHtml(href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${label}</a>`;
  }

  /* Social button labels: identify Instagram and Facebook from their URL host; default to Website. */
  function onlineProfileLabel(value) {
    const href = safeUrl(value, ['http:', 'https:']);
    if (!href) return '';
    const hostname = new URL(href).hostname.toLocaleLowerCase().replace(/^www\./, '');
    if (hostname === 'instagram.com' || hostname.endsWith('.instagram.com')) return 'INSTAGRAM';
    if (hostname === 'facebook.com' || hostname.endsWith('.facebook.com') || hostname === 'fb.com' || hostname.endsWith('.fb.com')) return 'FACEBOOK';
    return 'WEBSITE';
  }

  function priceText(club) {
    const price = club.price;
    if (!price || price.type === 'unknown') return 'Not listed';
    if (price.type === 'free') return 'free';
    const feePeriods = {
      monthly_fee: '/month',
      annual_fee: '/year',
      per_session: '/session'
    };
    if (Number.isFinite(price.amount)) {
      const amount = new Intl.NumberFormat('en-GB', { style: 'currency', currency: price.currency || 'GBP' }).format(price.amount);
      const period = feePeriods[price.type] || price.period;
      return period ? `${amount}${period}` : amount;
    }
    const feeLabels = { monthly_fee: 'Monthly fee', annual_fee: 'Annual fee', per_session: 'Per-session fee' };
    return feeLabels[price.type] ? `${feeLabels[price.type]} · amount to confirm` : 'Paid · amount to confirm';
  }

  /* Attendance: display confirmed per-session headcounts, or a clear placeholder. */
  function attendanceText(count) {
    if (!Number.isInteger(count) || count < 0) return 'To be confirmed';
    return `${count} ${count === 1 ? 'person' : 'people'} per regular session`;
  }

  function sessionTime(session) {
    if (!session.startTime) return 'Time TBC';
    return session.endTime ? `${session.startTime}–${session.endTime}` : session.startTime;
  }

  /* Weekly calendar: place each listed session beneath its day and show meeting points. */
  function renderWeek(club, notice) {
    const sessions = Array.isArray(club.sessions) ? club.sessions : [];
    const dayCells = profileDays.map(day => {
      const daySessions = sessions.filter(session => Number(session.dayOfWeek) === day.number);
      const sessionMarkup = daySessions.length
        ? daySessions.map(session => `<article class="profile-session">
            <time>${escapeHtml(sessionTime(session))}</time>
            <span>${escapeHtml(session.meetingPoint || session.area || club.area || 'Location to confirm')}</span>
            ${session.group ? `<span>${escapeHtml(session.group)}</span>` : ''}
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

  function renderProfile(club, notice) {
    const photoPath = typeof club.imagePath === 'string' && club.imagePath.startsWith('img/')
      ? `../../${club.imagePath}`
      : null;
    const photo = photoPath
      ? `<img class="profile-photo" src="${escapeHtml(photoPath)}" alt="${escapeHtml(`${club.name} club photo`)}">`
      : '<div class="profile-photo profile-photo--missing">Club photo not available</div>';
    const sportLabel = displaySportName(club.sport);
    const areaLabel = club.area ? club.area.replace(/\b\w/g, letter => letter.toUpperCase()) : '';
    const sportArea = [
      sportLabel ? `<a href="${escapeHtml(profileGlossaryUrl(club.sport))}">${escapeHtml(sportLabel)}</a>` : '',
      areaLabel && club.sport ? `<a href="${escapeHtml(profileGlossaryUrl(club.sport, club.area))}">${escapeHtml(areaLabel)}</a>` : areaLabel ? escapeHtml(areaLabel) : ''
    ].filter(Boolean).join(' · ') || 'MANCHESTER CLUB';
    const tagline = club.title ? `<p class="profile-tagline">${escapeHtml(club.title)}</p>` : '';
    const detailRow = (label, value, modifier = '') => `<div class="profile-detail-row${modifier ? ` ${modifier}` : ''}"><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`;
    const isPaidClub = ['monthly_fee', 'annual_fee', 'per_session', 'paid'].includes(club.price?.type);
    const details = [
      detailRow('AREA', club.area || club.location || 'Manchester area'),
      club.location && club.location !== 'Manchester' && club.location !== club.area
        ? detailRow('LOCATION', club.location)
        : '',
      detailRow('SPORT', club.sport ? displaySportName(club.sport) : 'To confirm'),
      detailRow('COST', priceText(club)),
      club.pricingNotes ? detailRow('PRICING DETAILS', club.pricingNotes) : '',
      club.tasterNotes ? detailRow('TASTER DETAILS', club.tasterNotes) : '',
      club.bookingNotes ? detailRow('BOOKING DETAILS', club.bookingNotes) : '',
      isPaidClub && Number.isInteger(club.tasterSessionCount) && club.tasterSessionCount > 0
        ? detailRow('TASTER SESSION(S)', String(club.tasterSessionCount))
        : '',
      isPaidClub && club.bookingRequired === true ? detailRow('BOOKING', 'Required') : '',
      detailRow('REGULAR SESSION ATTENDANCE', attendanceText(club.regularSessionAttendance)),
      Array.isArray(club.tags) && club.tags.length ? detailRow('TAGS', club.tags.join(' · ')) : ''
    ].join('');
    const onlineUrl = club.onlineProfile?.url;
    const latestCheck = [
      club.verification?.lastSourceCheck || club.research?.checkedAt,
      club.verification?.lastConfirmedByClub,
      trainingTimesConfirmation(club)?.date
    ].map(verificationDate).filter(Boolean).sort((a, b) => b.date.localeCompare(a.date))[0];
    const informationDate = latestCheck
      ? `Information last checked: <time datetime="${latestCheck.date}">${latestCheck.label}</time>`
      : 'Information last checked: not yet recorded';
    const verificationLabel = club.confirmed === true ? '' : 'Unverified · ';
    const actions = [
      renderAction('CONTACT', contactUrl(club.contact), true),
      renderAction(onlineProfileLabel(onlineUrl), onlineUrl, false, ['http:', 'https:'])
    ].filter(Boolean).join('');

    html = `<section class="profile-heading" aria-labelledby="profile-title">
        <div class="profile-heading__identity">
          <p class="profile-eyebrow">${sportArea}</p>
          <h1 id="profile-title">${escapeHtml(club.name)}${trainingTimesBadge(club)}</h1>
          <p class="profile-information-date">${verificationLabel}${informationDate}</p>
          ${tagline}
        </div>
        ${actions ? `<div class="profile-actions" aria-label="Club actions">${actions}</div>` : ''}
      </section>
      <section class="profile-overview" aria-label="${escapeHtml(club.name)} photo and details">
        ${photo}
        <div class="profile-copy">
          <dl class="profile-details-list">${details}</dl>
        </div>
      </section>
      <section class="profile-about" aria-labelledby="profile-about-title">
        <h2 id="profile-about-title">About the club</h2>
        <p>${escapeHtml(club.description || `${club.name} is listed in the 0161 Active ${String(club.sport || 'sports')} directory for ${club.area || 'Greater Manchester'}.`)}</p>
      </section>
      ${renderWeek(club, [club.trainingNotes, club.research?.fields?.['Issues / confirmation needed'], notice].filter(Boolean).join(' '))}`;
    title = `${club.name} | 0161 Active`;
  }


  renderProfile(club, notice);
  return { html, title };
}
