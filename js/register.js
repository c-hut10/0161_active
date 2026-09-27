(() => {
  const form = document.querySelector('#club-form');
  const error = document.querySelector('#form-error');
  const success = document.querySelector('#success-panel');
  const submitButton = form.querySelector('[type="submit"]');

  /* Form state: read answers once so the preview and submission use the same values. */
  const values = () => Object.fromEntries(new FormData(form).entries());
  const put = (selector, value, fallback) => {
    document.querySelector(selector).textContent = value.trim() || fallback;
  };

  function updatePreview() {
    const data = values();
    put('#preview-name', data.name, 'Your club name');
    put('#preview-sport', data.sport, 'YOUR SPORT');
    put('#preview-area-mark', data.area ? `MANCHESTER · ${data.area.toUpperCase()}` : 'MANCHESTER · YOUR AREA', 'MANCHESTER · YOUR AREA');
    put('#preview-sport-mark', data.sport ? data.sport.trim().slice(0, 1).toUpperCase() : '✳', '✳');
    put('#preview-description', data.description, 'A few words about your club will appear here. Tell people what makes it a great place to play, move and meet.');
    put('#preview-schedule', data.schedule, 'Add your meeting times');
    put('#preview-meeting', data.meeting || data.area, 'Add your meeting place');
    put('#preview-audience', data.audience, 'Everyone welcome');
  }

  /* Submission: send all named form fields to Netlify and confirm only on success. */
  async function submitApplication(event) {
    event.preventDefault();
    error.hidden = true;
    if (!form.reportValidity()) return;

    submitButton.disabled = true;
    submitButton.textContent = 'Sending your application…';
    try {
      const body = new URLSearchParams(new FormData(form)).toString();
      const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      });
      if (!response.ok) throw new Error('The application could not be sent. Please try again shortly.');

      form.hidden = true;
      success.hidden = false;
      success.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (problem) {
      error.textContent = problem.message || 'We could not send your application. Please check your connection and try again.';
      error.hidden = false;
      submitButton.disabled = false;
      submitButton.innerHTML = 'Send club application <span aria-hidden="true">↗</span>';
    }
  }

  /* Interactions: keep the preview live and submit applications through the configured form host. */
  form.addEventListener('input', updatePreview);
  form.addEventListener('submit', submitApplication);
  updatePreview();
})();
