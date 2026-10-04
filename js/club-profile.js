const profileRoot = document.querySelector('#club-profile-root');
const clubId = profileRoot?.dataset.clubId;

async function loadProfile() {
  if (!profileRoot || profileRoot.querySelector('#profile-title')) return;
  try {
    const response = await fetch('../../data/clubs.json');
    if (!response.ok) throw new Error('Club information could not be loaded. Please try again later.');
    const data = await response.json();
    const club = data.clubs?.find(item => item.id === clubId);
    if (!club) throw new Error('This club profile is not in the shared club directory yet.');
    const { renderClubProfile } = await import('./club-profile-renderer.mjs');
    const rendered = renderClubProfile(club, data.metadata?.sampleDataNotice || '', window.location.href);
    profileRoot.innerHTML = rendered.html;
    document.title = rendered.title;
  } catch (error) {
    const message = document.createElement('p');
    message.className = 'profile-status';
    message.setAttribute('role', 'status');
    message.textContent = error.message || 'Club information could not be loaded.';
    profileRoot.replaceChildren(message);
  }
}
loadProfile();
