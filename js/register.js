(() => {
  const form = document.querySelector('#club-form');
  const error = document.querySelector('#form-error');
  const successScreen = document.querySelector('#application-success');
  const submitButton = form.querySelector('[type="submit"]');
  // TEMPORARY ANIMATION REVIEW MODE: set false to restore real form submission.
  const disableSubmissionForAnimationReview = true;
  if (disableSubmissionForAnimationReview) form.noValidate = true;
  const scheduleDayPatterns = {
    mon: /\b(?:mon|monday|mondays)\b/i,
    tue: /\b(?:tue|tues|tuesday|tuesdays)\b/i,
    wed: /\b(?:wed|weds|wednesday|wednesdays)\b/i,
    thu: /\b(?:thu|thur|thurs|thursday|thursdays)\b/i,
    fri: /\b(?:fri|friday|fridays)\b/i,
    sat: /\b(?:sat|saturday|saturdays)\b/i,
    sun: /\b(?:sun|sunday|sundays)\b/i
  };

  /* Form state: read answers once so the preview and submission use the same values. */
  const values = () => Object.fromEntries(new FormData(form).entries());
  const put = (selector, value, fallback) => {
    document.querySelector(selector).textContent = value.trim() || fallback;
  };

  function updatePreview() {
    const data = values();
    put('#preview-name', data.name, 'Your club name');
    put('#preview-eyebrow', [data.sport, data.area].filter(Boolean).map(value => value.toUpperCase()).join(' · '), 'YOUR SPORT · YOUR AREA');
    put('#preview-area', data.area, 'Your area');
    put('#preview-description', data.description, 'Your club description will appear here.');
    put('#preview-schedule', data.schedule, 'Add your meeting times');
    put('#preview-meeting', data.meeting, 'Your public meeting place');
    put('#preview-week-location', data.meeting || data.area, 'Add your public meeting place');

    const contactAction = document.querySelector('#preview-contact-action');
    const hasContact = Boolean(data.email.trim());
    contactAction.classList.toggle('is-available', hasContact);
    contactAction.setAttribute('aria-disabled', String(!hasContact));

    const applyAction = document.querySelector('#preview-apply-action');
    let hasApplyLink = false;
    try {
      hasApplyLink = ['http:', 'https:'].includes(new URL(data.link.trim()).protocol);
    } catch {
      hasApplyLink = false;
    }
    applyAction.classList.toggle('is-available', hasApplyLink);
    applyAction.setAttribute('aria-disabled', String(!hasApplyLink));

    document.querySelectorAll('[data-preview-day]').forEach(day => {
      const pattern = scheduleDayPatterns[day.dataset.previewDay];
      const hasSession = Boolean(data.schedule.trim() && pattern?.test(data.schedule));
      day.classList.toggle('has-session', hasSession);
      day.querySelector('b').textContent = hasSession ? 'SESSION' : '—';
    });
  }

  /* Success state: expand the confirmation screen from the submitted button. */
  function showSuccessScreen() {
    const buttonBounds = submitButton.getBoundingClientRect();
    successScreen.style.setProperty('--success-origin-x', `${buttonBounds.left + buttonBounds.width / 2}px`);
    successScreen.style.setProperty('--success-origin-y', `${buttonBounds.top + buttonBounds.height / 2}px`);
    successScreen.hidden = false;
    form.hidden = true;
    document.body.classList.add('application-success-open');
    document.querySelector('.navbar').inert = true;
    document.querySelector('.register-page').inert = true;
    document.querySelector('.register-footer').inert = true;

    requestAnimationFrame(() => successScreen.classList.add('is-expanded'));
    const focusDelay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 900;
    window.setTimeout(() => document.querySelector('#application-success-title').focus({ preventScroll: true }), focusDelay);
  }

  /* Submission: send all named form fields to Netlify and confirm only on success. */
  async function submitApplication(event) {
    event.preventDefault();
    error.hidden = true;
    if (disableSubmissionForAnimationReview) {
      showSuccessScreen();
      return;
    }
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

      showSuccessScreen();
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
