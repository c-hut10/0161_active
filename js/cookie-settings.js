(() => {
  const key = '0161active-cookie-notice';
  const version = 2;
  const lifetime = 90 * 24 * 60 * 60 * 1000;
  const banner = document.createElement('section');
  banner.className = 'cookie-banner';
  banner.setAttribute('aria-label', 'Cookies and browser storage');
  banner.innerHTML = `<div><h2>Your privacy matters</h2><p>We don’t currently use optional analytics or advertising cookies. If you dismiss this notice, we store that choice on this device for 90 days. <a href="/html/privacy.html#cookies">Read our privacy policy</a>.</p></div><div class="cookie-actions"><button type="button" data-cookie-settings>Cookie settings</button><button type="button" data-cookie-dismiss>Got it</button></div>`;
  const dialog = document.createElement('dialog');
  dialog.className = 'cookie-dialog';
  dialog.setAttribute('aria-labelledby', 'cookie-settings-title');
  dialog.innerHTML = `<h2 id="cookie-settings-title">Cookie settings</h2><p>You can review browser storage used by 0161 Active here.</p><h3>Remembering this notice</h3><p>When you choose “Got it”, we store your acknowledgement in this browser for 90 days. This is local storage, rather than a cookie, and is only used to remember this notice.</p><h3>Registration security check</h3><p>The published registration form uses Google reCAPTCHA through Netlify to prevent spam. It may set a security cookie and process browser and device information. You can contact us by email if you cannot use the check.</p><h3>Optional cookies</h3><p>We currently have no analytics or advertising cookies to enable. We’ll update these controls before introducing any optional tracking.</p><p><a href="/html/privacy.html#cookies">Read our privacy policy</a></p><p class="cookie-status" role="status"></p><div class="cookie-actions"><button type="button" data-cookie-close>Close</button><button type="button" data-cookie-reset>Forget saved choice</button><button type="button" data-cookie-save>Got it</button></div>`;
  document.body.append(banner, dialog);
  const status = dialog.querySelector('.cookie-status');
  function validRecord(record) {
    return record?.version === version && Number.isFinite(record.savedAt) && record.savedAt <= Date.now() && Date.now() - record.savedAt < lifetime;
  }
  let saved = false;
  try {
    const record = JSON.parse(localStorage.getItem(key));
    saved = validRecord(record);
    if (record && !saved) localStorage.removeItem(key);
  } catch { /* Storage may be disabled; the notice remains usable. */ }
  banner.hidden = saved;
  function remember() {
    try {
      localStorage.setItem(key, JSON.stringify({ version, savedAt: Date.now() }));
      status.textContent = '';
    } catch { status.textContent = 'Your browser could not save this choice. The notice may appear again on your next visit.'; }
    banner.hidden = true;
  }
  document.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest('[data-cookie-settings]')) {
      event.preventDefault();
      status.textContent = '';
      dialog.showModal();
    } else if (event.target.closest('[data-cookie-dismiss]')) {
      remember();
    } else if (event.target.closest('[data-cookie-save]')) {
      remember();
      if (!status.textContent) dialog.close();
    } else if (event.target.closest('[data-cookie-close]')) {
      dialog.close();
    } else if (event.target.closest('[data-cookie-reset]')) {
      try {
        localStorage.removeItem(key);
        banner.hidden = false;
        status.textContent = 'Saved choice removed. The notice will appear again.';
      } catch { status.textContent = 'Your browser could not remove the saved choice.'; }
    }
  });
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) {
      try {
        const record = JSON.parse(localStorage.getItem(key));
        banner.hidden = validRecord(record);
      } catch { banner.hidden = false; }
    }
  });
})();
