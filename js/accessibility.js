(() => {
  const key = '0161active-accessibility';
  const root = document.documentElement;
  let preferences = { largerText: false, reduceMotion: false };
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    preferences = { largerText: saved?.largerText === true, reduceMotion: saved?.reduceMotion === true };
  } catch { /* Browser storage is optional. */ }
  function apply() {
    root.classList.toggle('a11y-larger-text', preferences.largerText);
    root.classList.toggle('a11y-reduce-motion', preferences.reduceMotion);
  }
  apply();
  const dialog = document.createElement('dialog');
  dialog.className = 'accessibility-dialog';
  dialog.setAttribute('aria-labelledby', 'accessibility-title');
  dialog.innerHTML = `<h2 id="accessibility-title">Accessibility settings</h2><p>Choose what makes browsing easier. These preferences are saved on this device when you change them.</p><label><input type="checkbox" name="larger-text"> Larger body text</label><label><input type="checkbox" name="reduce-motion"> Reduce motion</label><p>Your device’s reduced-motion setting is also respected. You can zoom further using your browser.</p><p role="status" class="accessibility-status"></p><button type="button">Close</button>`;
  document.body.append(dialog);
  const largerText = dialog.querySelector('[name="larger-text"]');
  const reduceMotion = dialog.querySelector('[name="reduce-motion"]');
  largerText.checked = preferences.largerText;
  reduceMotion.checked = preferences.reduceMotion;
  dialog.addEventListener('change', () => {
    preferences = { largerText: largerText.checked, reduceMotion: reduceMotion.checked };
    apply();
    try {
      localStorage.setItem(key, JSON.stringify(preferences));
      dialog.querySelector('[role="status"]').textContent = 'Preferences saved.';
    } catch { dialog.querySelector('[role="status"]').textContent = 'Applied for this visit. Your browser could not save your preferences.'; }
  });
  dialog.querySelector('button').addEventListener('click', () => dialog.close());
  document.addEventListener('click', event => {
    if (event.target instanceof Element && event.target.closest('[data-accessibility-settings]')) {
      event.preventDefault();
      dialog.showModal();
    }
  });
})();
