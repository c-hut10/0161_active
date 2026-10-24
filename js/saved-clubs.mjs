/* Read only explicitly saved IDs; blocked or invalid storage never means all clubs. */
export const savedClubsKey = '0161active-saved-clubs';
export function readSavedClubs() {
  try {
    const value = JSON.parse(localStorage.getItem(savedClubsKey) || '[]');
    if (!Array.isArray(value) || value.some(id => typeof id !== 'string')) throw new Error('Invalid saved list');
    return { ids:new Set(value), error:false };
  } catch { return { ids:new Set(), error:true }; }
}
