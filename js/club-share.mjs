/* Share only the clean public profile URL, never preview hosts, filters or timetable anchors. */
export function clubShareData(name, canonical, currentUrl) {
  let url;
  try {
    url = new URL(canonical || currentUrl, currentUrl);
  } catch {
    url = new URL(currentUrl);
  }
  if (!['http:', 'https:'].includes(url.protocol)) url = new URL(currentUrl);
  url.search = '';
  url.hash = '';
  return { title: `${name} | 0161 Active`, url: url.href };
}

export async function shareClub(data, device) {
  if (typeof device.share === 'function') {
    try {
      await device.share(data);
      return 'shared';
    } catch (error) {
      // Cancelling a share must not unexpectedly copy anything to the clipboard.
      if (error.name === 'AbortError') return 'cancelled';
    }
  }
  try {
    if (!device.clipboard?.writeText) return 'manual';
    await device.clipboard.writeText(data.url);
    return 'copied';
  } catch {
    return 'manual';
  }
}
