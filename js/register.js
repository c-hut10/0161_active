import { formatPrice, formatPostcodes, displaySportName, onlineProfileAction, DAY_NAMES as dayNames, DAY_NUMBERS as dayNumbers } from './club-formatting.mjs';
import { areaFromPostcode, clubTrainingAreas } from './club-areas.mjs';
import { PAID_PRICE_TYPES, sessionAnswers, submissionCsv } from './club-submission.mjs';

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

  /* Application steps: keep all answers in the form while showing one section at a time. */
  const sections = [...form.querySelectorAll('[data-form-step]')];
  const stepLabels = [...document.querySelectorAll('[data-registration-step]')];
  const navigation = document.querySelector('#form-navigation');
  const previousStep = document.querySelector('#previous-step');
  const nextStep = document.querySelector('#next-step');
  const submission = document.querySelector('#form-submission');
  let currentStep = 0;

  function showStep(index, focusHeading = true) {
    currentStep = index;
    sections.forEach((section, position) => { section.hidden = position !== index; });
    stepLabels.forEach((label, position) => {
      const active = position === index;
      label.classList.toggle('step-current', active);
      if (active) label.setAttribute('aria-current', 'step');
      else label.removeAttribute('aria-current');
    });
    previousStep.hidden = index === 0;
    nextStep.hidden = index === sections.length - 1;
    submission.hidden = index !== sections.length - 1;
    if (index < sections.length - 1) nextStep.innerHTML = `Next: ${stepLabels[index + 1].querySelector('b').textContent} <span aria-hidden="true">↗</span>`;
    if (focusHeading) sections[index].querySelector('h2').focus();
  }

  /* Validation: reveal the section containing an invalid field before reporting its error. */
  function validateStep(index) {
    const invalid = [...sections[index].querySelectorAll('input, select, textarea')]
      .find(field => field.willValidate && !field.validity.valid);
    if (!invalid) return true;
    if (currentStep !== index) showStep(index, false);
    invalid.reportValidity();
    invalid.focus();
    return false;
  }

  function advanceStep() {
    if (submitting || currentStep === sections.length - 1) return;
    updatePreview();
    error.hidden = true;
    if (validateStep(currentStep)) showStep(currentStep + 1);
  }

  /* Shared locations: copy the preceding address and postcode, or restore independent venue details. */
  function syncSessionLocations() {
    const blocks = [...sessionList.querySelectorAll('.training-session')];
    blocks.forEach((block, index) => {
      const checkbox = block.querySelector('[data-same-location]');
      block.querySelector('[data-same-location-option]').hidden = index === 0;
      if (index === 0) checkbox.checked = false;
      // Require both venue fields unless their values are copied from the previous session.
      block.querySelectorAll('[data-session-field="meetingPoint"], [data-session-field="postcode"]').forEach(field => {
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
        field.dataset.sessionField, ['postcode', 'meetingPoint'].includes(field.dataset.sessionField)
          ? formatPostcodes(field.value.trim()) : field.value.trim()
      ]));
      return sessionAnswers(fields);
    });
  }

  function sessionSummary(session) {
    const time = [session.startTime, session.endTime].filter(Boolean).join('–');
    return [session.title, dayNames[session.dayOfWeek], time, session.eligibility, session.specialConsiderations].filter(Boolean).join(' · ');
  }

  /* Session collection: submit canonical fields while deriving areas only for the preview. */
  function syncSessions() {
    syncSessionLocations();
    // Resolve each venue independently; unknown sectors stay blank for review.
    const sessions = readSessions();
    const previewSessions = sessions.map(session => ({
      ...session,
      area: areaFromPostcode(session.postcode, session.meetingPoint)
    }));
    const areas = clubTrainingAreas({ sessions: previewSessions });
    form.elements.namedItem('sessions').value = JSON.stringify(sessions);
    return { sessions, areas };
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
    const { sessions, areas } = syncSessions();
    const areaLabel = areas.join(' · ');
    // Keep paid fields out of submissions when Free or Unknown is selected.
    const pricingType = form.elements.namedItem('price.type').value;
    const paid = PAID_PRICE_TYPES.includes(pricingType);
    form.querySelectorAll('[data-paid-pricing]').forEach(row => {
      row.hidden = !paid;
      row.querySelector('input, select').disabled = !paid;
    });
    form.elements.namedItem('price.amount').required = paid;
    // Paid clubs must explicitly confirm whether booking is required.
    form.elements.namedItem('bookingRequired').required = paid;
    const data = values();
    const amount = data['price.amount'];
    put('#preview-cost', formatPrice({ price: {
      type: paid && !amount ? 'unknown' : pricingType,
      amount: amount ? Number(amount) : null
    } }, { compact: true, unknown: 'Unknown', minimumFractionDigits: 0 }), 'Unknown');
    document.querySelector('#preview-tasters-row').hidden = !(paid && Number(data.tasterSessionCount) > 0);
    put('#preview-tasters', data.tasterSessionCount || '', '');
    document.querySelector('#preview-booking-row').hidden = !(paid && data.bookingRequired === 'yes');
    put('#preview-name', data.name, 'Your club name');
    put('#preview-eyebrow', [data.sport, areaLabel].filter(Boolean).map(value => value.toUpperCase()).join(' · '), 'YOUR SPORT · YOUR AREA');
    put('#preview-area', areaLabel, 'Area to confirm');
    put('#preview-sport', displaySportName(data.sport), 'Your sport');
    put('#preview-description', data.description, 'Your club description will appear here.');
    put('#preview-schedule', sessions.map(sessionSummary).join('\n'), 'Add your meeting times');
    put('#preview-week-location', sessions.map(session => [session.meetingPoint, session.postcode].filter(Boolean).join(', ')).join('\n'), 'Add your public meeting place');
    document.querySelector('#preview-additional-section').hidden = !data.additionalInformation.trim();
    put('#preview-additional', data.additionalInformation, '');
    // Capture spreadsheet rows alongside the structured JSON without submitting stored areas.
    form.elements.namedItem('registrationCsv').value = submissionCsv(data, sessions);

    const contactAction = document.querySelector('#preview-contact-action');
    const hasContact = Boolean(data.contact.trim());
    contactAction.classList.toggle('is-available', hasContact);
    contactAction.setAttribute('aria-disabled', String(!hasContact));

    const onlineAction = document.querySelector('#preview-online-action');
    const onlineProfile = onlineProfileAction(data['onlineProfile.url']);
    onlineAction.classList.toggle('is-available', Boolean(onlineProfile));
    onlineAction.setAttribute('aria-disabled', String(!onlineProfile));
    onlineAction.textContent = onlineProfile?.label || 'WEBSITE';

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
    // Enter on an earlier step advances the form instead of submitting incomplete answers.
    if (currentStep < sections.length - 1) {
      advanceStep();
      return;
    }
    updatePreview();
    error.hidden = true;
    for (let index = 0; index < sections.length; index++) {
      if (!validateStep(index)) return;
    }
    if (!form.reportValidity()) return;

    /* Local previews cannot receive Netlify Forms submissions. Keep the answers available. */
    if (window.location.protocol === 'file:' || ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)) {
      error.textContent = 'Please submit this application from our live website. Local previews cannot send applications.';
      error.hidden = false;
      return;
    }

    const formData = new FormData(form);
    if (!String(formData.get('g-recaptcha-response') || '').trim()) {
      error.textContent = 'Please complete the reCAPTCHA security check. If it has expired, complete it again before sending.';
      error.hidden = false;
      return;
    }
    submitting = true;

    previousStep.disabled = true;
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
      previousStep.disabled = false;
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
  // Format completed venue fields without moving the cursor while the user is typing.
  sessionList.addEventListener('focusout', event => {
    if (!event.target.matches('[data-session-field="postcode"], [data-session-field="meetingPoint"]')) return;
    event.target.value = formatPostcodes(event.target.value.trim());
    updatePreview();
  });
  form.addEventListener('submit', submitApplication);
  previousStep.addEventListener('click', () => {
    if (submitting || currentStep === 0) return;
    error.hidden = true;
    showStep(currentStep - 1);
  });
  nextStep.addEventListener('click', advanceStep);
  updatePreview();
  // Validate visible steps ourselves so hidden required fields never block navigation.
  form.noValidate = true;
  navigation.hidden = false;
  showStep(0, false);
  // Enable submission once the repeatable session fields can be collected correctly.
  submitButton.disabled = false;
})();
