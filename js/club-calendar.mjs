import { sessionTitle, sessionAddress, sessionAudience, sessionVenueNote } from './session-details.mjs';
export const CALENDAR_DOWNLOAD_LABEL = 'Download this week’s schedule';
export const CALENDAR_FILE_LABEL = '(Downloadable .ics file)';
const validTime = time => /^([01]\d|2[0-3]):[0-5]\d$/.test(time || '');

export function downloadClubCalendar(club, profileUrl) {
  const calendar = createClubCalendar(club, profileUrl);
  if (!calendar.count) throw new Error('No sessions with listed start times and known dates are available this Monday–Sunday week.');
  const url = URL.createObjectURL(new Blob([calendar.text], { type: 'text/calendar;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${club.id}-week-${calendar.weekStart}.ics`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return `Downloaded ${calendar.count} sessions for ${calendar.weekStart} to ${calendar.weekEnd} (Monday–Sunday). Import the .ics file into your calendar. Sessions without start times and unconfirmed fortnightly dates are omitted. This copy will not update automatically.`;
}

const london = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
});
function parts(date) {
  return Object.fromEntries(london.formatToParts(date).map(part => [part.type, part.value]));
}
function londonTime(day, time) {
  const [hour, minute] = time.split(':').map(Number);
  const wallTime = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hour, minute);
  let instant = wallTime;
  for (let attempt = 0; attempt < 3; attempt++) {
    const p = parts(new Date(instant));
    const represented = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    instant += wallTime - represented;
  }
  const p = parts(new Date(instant));
  // Skip non-existent local times during the spring clock change.
  if (+p.hour !== hour || +p.minute !== minute) return null;
  return new Date(instant);
}
const stamp = date => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const escapeText = value => String(value).replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
function fold(line) {
  const encoder = new TextEncoder();
  let result = '', length = 0;
  for (const character of line) {
    const size = encoder.encode(character).length;
    if (length + size > 75) { result += '\r\n '; length = 1; }
    result += character;
    length += size;
  }
  return result;
}

export function createClubCalendar(club, profileUrl, now = new Date()) {
  const today = parts(now);
  const firstDay = new Date(Date.UTC(+today.year, +today.month - 1, +today.day));
  firstDay.setUTCDate(firstDay.getUTCDate() - ((firstDay.getUTCDay() + 6) % 7));
  const lastDay = new Date(firstDay.getTime() + 6 * 86400000);
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//0161 Active//Club calendar//EN', 'CALSCALE:GREGORIAN'];
  let count = 0;
  for (let offset = 0; offset < 7; offset++) {
    const day = new Date(firstDay.getTime() + offset * 86400000);
    for (const [index, session] of (club.sessions || []).entries()) {
      if (Number(session.dayOfWeek) !== (day.getUTCDay() || 7) || session.everyOtherWeek
        || !validTime(session.startTime)) continue;
      const start = londonTime(day, session.startTime);
      if (!start) continue;
      const event = ['BEGIN:VEVENT', `UID:${club.id}-${index}-${stamp(start)}@0161active.co.uk`,
        `DTSTAMP:${stamp(now)}`, `DTSTART:${stamp(start)}`];
      if (validTime(session.endTime)) {
        const endDay = new Date(day);
        if (session.endTime < session.startTime) endDay.setUTCDate(endDay.getUTCDate() + 1);
        const end = londonTime(endDay, session.endTime);
        if (end && end > start) event.push(`DTEND:${stamp(end)}`);
      }
      event.push(`SUMMARY:${escapeText(`${club.name} · ${sessionTitle(club, session)}`)}`,
        `LOCATION:${escapeText(sessionAddress(session) || session.area || '')}`,
        `DESCRIPTION:${escapeText([session.subtitle, sessionVenueNote(club, session), sessionAudience(session), session.specialConsiderations, !validTime(session.endTime) ? 'End time not supplied.' : '', 'One-week copy. Check with the club for changes.', profileUrl].filter(Boolean).join('\n'))}`,
        `URL:${profileUrl}`, 'END:VEVENT');
      lines.push(...event);
      count++;
    }
  }
  lines.push('END:VCALENDAR');
  return { text: lines.map(fold).join('\r\n') + '\r\n', count,
    weekStart: firstDay.toISOString().slice(0, 10), weekEnd: lastDay.toISOString().slice(0, 10) };
}
