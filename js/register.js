import { formatPrice, displaySportName, onlineProfileAction, DAY_NAMES as dayNames, DAY_NUMBERS as dayNumbers } from './club-formatting.mjs';
import { resolveClubAreas } from './club-areas.mjs';

(() => {
  const form = document.querySelector('#club-form');
  const error = document.querySelector('#form-error');
  const successScreen = document.querySelector('#application-success');
  const submitButton = form.querySelector('[type="submit"]');
  /* Submission state: prevent duplicate requests while Netlify processes the application. */
  let submitting = false;
  const sessionList = document.querySelector('#training-sessions');
  const addSessionButton = document.querySelector('#add-session');
  const sessionTemplate = sessionList.querySelector('.training-session').cloneNode(true);

  /* Shared locations: copy the preceding address and postcode, or restore independent venue details. */
  function syncSessionLocations() {
    const blocks = [...sessionList.querySelectorAll('.training-session')];
    blocks.forEach((block, index) => {
      const checkbox = block.querySelector('[data-same-location]');
      block.querySelector('[data-same-location-option]').hidden = index === 0;
      if (index === 0) checkbox.checked = false;
      // Require both venue fields unless their values are copied from the previous session.
      block.querySelectorAll('[data-session-field="meeting"], [data-session-field="postcode"]').forEach(field => {
        field.closest('.field').hidden = checkbox.checked;
        field.required = !checkbox.checked;
        if (checkbox.checked) {
          if (!field.readOnly) field.dataset.independentValue = field.value;
          field.value = blocks[index - 1].querySelector(`[data-session-field="${field.dataset.sessionField}"]`).value;
          field.readOnly = true;
        } else {
          if (field.readOnly) field.value = field.dataset.independentValue || '';
          field.readOnly = false;
        }
      });
    });
  }

  /* Session data: preserve each entry's title, experience level and special considerations. */
  function readSessions() {
    return [...sessionList.querySelectorAll('.training-session')].map(block => {
      const fields = Object.fromEntries([...block.querySelectorAll('[data-session-field]')].map(field => [
        field.dataset.sessionField, field.value.trim()
      ]));
      return { ...fields, dayOfWeek: Number(fields.dayOfWeek) || null };
    });
  }

  function sessionSummary(session) {
    const time = [session.startTime, session.endTime].filter(Boolean).join('–');
    return [session.title, dayNames[session.dayOfWeek], time, session.eligibility, session.specialConsiderations].filter(Boolean).join(' · ');
  }

  /* Submission summaries: static Netlify fields hold readable details and structured session JSON. */
  function syncSessions() {
    syncSessionLocations();
    const resolved = resolveClubAreas({ area: form.elements.namedItem('area').value, sessions: readSessions() });
    const sessions = resolved.sessions;
    form.elements.namedItem('schedule').value = sessions.map(sessionSummary).filter(Boolean).join('\n');
    form.elements.namedItem('meeting').value = sessions.map((session, index) =>
      session.meeting ? `Session ${index + 1}: ${[session.meeting, session.postcode].filter(Boolean).join(', ')}` : ''
    ).filter(Boolean).join('\n');
    form.elements.namedItem('training-sessions').value = JSON.stringify(sessions);
    return resolved;
  }

  /* Session headings: reflect typed names and keep numbering correct after adding or removing entries. */
  function numberSessions() {
    const blocks = [...sessionList.querySelectorAll('.training-session')];
    blocks.forEach((block, index) => {
      const title = block.querySelector('[data-session-field="title"]').value.trim() || 'Training session';
      const heading = block.querySelector('[data-session-heading]');
      const text = `${index + 1}. ${title}`;
      if (heading.textContent !== text) heading.textContent = text;
      const removeButton = block.querySelector('[data-remove-session]');
      removeButton.hidden = blocks.length === 1;
      removeButton.setAttribute('aria-label', `Remove training session ${index + 1}`);
    });
    const status = document.querySelector('#session-status');
    const statusText = `${blocks.length} training ${blocks.length === 1 ? 'session' : 'sessions'} added.`;
    if (status.textContent !== statusText) status.textContent = statusText;
  }

  /* Form state: read answers once so the preview and submission use the same values. */
  const values = () => Object.fromEntries(new FormData(form).entries());
  const put = (selector, value, fallback) => {
    document.querySelector(selector).textContent = value.trim() || fallback;
  };

  function updatePreview() {
    numberSessions();
    const { sessions, area } = syncSessions();
    // Keep paid fields out of submissions when Free or Unknown is selected.
    const pricingType = form.elements.namedItem('pricing-type').value;
    const paid = ['monthly', 'annual', 'per-session'].includes(pricingType);
    form.querySelectorAll('[data-paid-pricing]').forEach(row => {
      row.hidden = !paid;
      row.querySelector('input, select').disabled = !paid;
    });
    form.elements.namedItem('pricing-amount').required = paid;
    // Paid clubs must explicitly confirm whether booking is required.
    form.elements.namedItem('booking-required').required = paid;
    const data = values();
    const priceTypes = { monthly: 'monthly_fee', annual: 'annual_fee', 'per-session': 'per_session' };
    const amount = data['pricing-amount'];
    put('#preview-cost', formatPrice({ price: {
      type: paid && !amount ? 'unknown' : priceTypes[pricingType] || pricingType,
      amount: amount ? Number(amount) : null
    } }, { compact: true, unknown: 'Unknown', minimumFractionDigits: 0 }), 'Unknown');
    document.querySelector('#preview-tasters-row').hidden = !(paid && Number(data['taster-sessions']) > 0);
    put('#preview-tasters', data['taster-sessions'] || '', '');
    document.querySelector('#preview-booking-row').hidden = !(paid && data['booking-required'] === 'yes');
    put('#preview-name', data.name, 'Your club name');
    put('#preview-eyebrow', [data.sport, area].filter(Boolean).map(value => value.toUpperCase()).join(' · '), 'YOUR SPORT · YOUR AREA');
    put('#preview-area', area, 'Your area');
    put('#preview-sport', displaySportName(data.sport), 'Your sport');
    put('#preview-description', data.description, 'Your club description will appear here.');
    put('#preview-schedule', data.schedule, 'Add your meeting times');
    put('#preview-meeting', data.meeting, 'Your public meeting place');
    put('#preview-week-location', data.meeting || data.area, 'Add your public meeting place');

    const contactAction = document.querySelector('#preview-contact-action');
    const hasContact = Boolean(data.email.trim());
    contactAction.classList.toggle('is-available', hasContact);
    contactAction.setAttribute('aria-disabled', String(!hasContact));

    const onlineAction = document.querySelector('#preview-online-action');
    const onlineProfile = onlineProfileAction(data.link);
    onlineAction.classList.toggle('is-available', Boolean(onlineProfile));
    onlineAction.setAttribute('aria-disabled', String(!onlineProfile));

    document.querySelectorAll('[data-preview-day]').forEach(day => {
      const count = sessions.filter(session => session.dayOfWeek === dayNumbers[day.dataset.previewDay]).length;
      const hasSession = count > 0;
      day.classList.toggle('has-session', hasSession);
      day.querySelector('b').textContent = hasSession ? `${count} ${count === 1 ? 'SESSION' : 'SESSIONS'}` : '—';
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
    document.querySelector('[data-site-nav]').inert = true;
    document.querySelector('.register-page').inert = true;
    // Keep the shared footer outside the active confirmation dialog.
    const footer = document.querySelector('[data-site-footer]');
    if (footer) footer.inert = true;

    requestAnimationFrame(() => successScreen.classList.add('is-expanded'));
    const focusDelay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 900;
    window.setTimeout(() => document.querySelector('#application-success-title').focus({ preventScroll: true }), focusDelay);
  }

  /* Submission: send all named form fields to Netlify and confirm only on success. */
  async function submitApplication(event) {
    event.preventDefault();
    if (submitting) return;
    const { area } = syncSessions();
    error.hidden = true;
    if (!form.reportValidity()) return;

    /* Local previews cannot receive Netlify Forms submissions. Keep the answers available. */
    if (window.location.protocol === 'file:' || ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)) {
      error.textContent = 'Please submit this application from our live website. Local previews cannot send applications.';
      error.hidden = false;
      return;
    }

    const formData = new FormData(form);
    // Submit the same postcode-derived club area shown in the live preview.
    if (area) formData.set('area', area);
    if (!String(formData.get('g-recaptcha-response') || '').trim()) {
      error.textContent = 'Please complete the reCAPTCHA security check. If it has expired, complete it again before sending.';
      error.hidden = false;
      return;
    }
    submitting = true;

    submitButton.disabled = true;
    submitButton.textContent = 'Sending your application…';
    try {
      const body = new URLSearchParams(formData).toString();
      const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      });
      if (!response.ok || response.redirected) throw new Error('The application could not be sent. Please complete the security check again and retry.');

      showSuccessScreen();
    } catch (problem) {
      if (typeof window.grecaptcha?.reset === 'function') window.grecaptcha.reset();
      error.textContent = problem.message || 'We could not send your application. Please check your connection and try again.';
      error.hidden = false;
      submitButton.disabled = false;
      submitButton.innerHTML = 'Send club application <span aria-hidden="true">↗</span>';
    } finally {
      submitting = false;
    }
  }

  /* Interactions: keep the preview live and submit applications through the configured form host. */
  addSessionButton.addEventListener('click', () => {
    const block = sessionTemplate.cloneNode(true);
    sessionList.append(block);
    updatePreview();
    block.querySelector('select').focus();
  });
  sessionList.addEventListener('click', event => {
    const removeButton = event.target.closest('[data-remove-session]');
    if (!removeButton || sessionList.children.length <= 1) return;
    removeButton.closest('.training-session').remove();
    updatePreview();
    addSessionButton.focus();
  });
  form.addEventListener('input', updatePreview);
  form.addEventListener('change', updatePreview);
  form.addEventListener('submit', submitApplication);
  updatePreview();
  // Enable submission once the repeatable session fields can be collected correctly.
  submitButton.disabled = false;
})();
