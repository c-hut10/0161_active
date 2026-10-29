/* Shared filter menus: keep native select values and events as the filtering contract. */
const pickers = new Map();
let opened = null;
let nextId = 0;

export function syncFilterPickers() {
  pickers.forEach(picker => picker.sync());
}

export function focusFilterControl(control) {
  (pickers.get(control)?.button || control)?.focus({ preventScroll: true });
}

export function enhanceFilterPickers(selector) {
  // Repeatable registration rows can be removed; release their observers and controls.
  pickers.forEach((picker, select) => {
    if (!select.isConnected) { picker.close(); picker.observer.disconnect(); pickers.delete(select); }
  });
  document.querySelectorAll(selector).forEach(select => {
    if (pickers.has(select)) return;
    const label = select.closest('label');
    if (!label) return;
    if (!select.id) select.id = `answer-picker-${++nextId}`;
    const field = document.createElement('div');
    [...label.attributes].forEach(attribute => {
      if (attribute.name !== 'for') field.setAttribute(attribute.name, attribute.value);
    });
    field.classList.add('filter-field');
    const originalHeading = label.querySelector('.field-title');
    const heading = originalHeading?.cloneNode(true) || document.createElement('span');
    heading.id = `${select.id}-label`;
    if (!originalHeading) heading.textContent = [...label.childNodes].filter(node => node.nodeType === Node.TEXT_NODE)
      .map(node => node.textContent.trim()).join(' ');
    const notes = [...label.children].filter(child => child !== select && child !== originalHeading);
    const widget = document.createElement('div');
    widget.className = 'filter-picker';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'filter-picker__trigger';
    button.setAttribute('role', 'combobox');
    button.setAttribute('aria-haspopup', 'listbox');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-labelledby', heading.id);
    const value = document.createElement('span');
    const arrow = document.createElement('span');
    arrow.className = 'filter-picker__arrow';
    arrow.textContent = '⌄';
    arrow.setAttribute('aria-hidden', 'true');
    button.append(value, arrow);
    const menu = document.createElement('div');
    menu.className = 'filter-picker__options';
    menu.id = `${select.id}-options`;
    menu.setAttribute('role', 'listbox');
    menu.setAttribute('aria-labelledby', heading.id);
    menu.hidden = true;
    button.setAttribute('aria-controls', menu.id);
    const additive = ['filter-sport', 'filter-area'].includes(select.id);
    if (additive) {
      menu.setAttribute('aria-multiselectable', 'true');
      button.setAttribute('aria-description', 'Choose an option to add or remove it. Selected filters appear below.');
    }
    if (select.getAttribute('aria-describedby')) button.setAttribute('aria-describedby', select.getAttribute('aria-describedby'));
    let choices = [], active = -1, search = '', typedAt = 0, optionSignature = '';

    function close() {
      menu.hidden = true;
      button.setAttribute('aria-expanded', 'false');
      button.removeAttribute('aria-activedescendant');
      field.classList.remove('filter-field--open');
      if (opened === picker) opened = null;
    }
    function activate(index, scroll = true) {
      if (!choices.length) return;
      active = Math.max(0, Math.min(index, choices.length - 1));
      [...menu.children].forEach((item, position) => item.classList.toggle('is-active', position === active));
      button.setAttribute('aria-activedescendant', menu.children[active].id);
      if (scroll) menu.children[active].scrollIntoView({ block: 'nearest' });
    }
    function sync() {
      const previous = choices[active]?.value;
      button.disabled = select.disabled;
      button.setAttribute('aria-required', String(select.required));
      if (select.hasAttribute('aria-invalid')) button.setAttribute('aria-invalid', select.getAttribute('aria-invalid'));
      else button.removeAttribute('aria-invalid');
      if (select.hasAttribute('aria-describedby')) button.setAttribute('aria-describedby', select.getAttribute('aria-describedby'));
      else button.removeAttribute('aria-describedby');
      button.setAttribute('aria-busy', select.getAttribute('aria-busy') === 'true' ? 'true' : 'false');
      value.textContent = select.selectedOptions[0]?.textContent || 'Choose an option';
      choices = [...select.options].filter(option => !option.hidden && !option.disabled && (!additive || option.value !== ''));
      // Typing in another registration field must not rebuild unchanged answer lists.
      const signature = JSON.stringify(choices.map(option => [option.value, option.textContent, option.selected]));
      if (signature === optionSignature) {
        if (select.disabled) close();
        return;
      }
      optionSignature = signature;
      menu.replaceChildren(...choices.map((option, index) => {
        const item = document.createElement('div');
        item.className = 'filter-picker__option';
        item.id = `${menu.id}-${index}`;
        item.dataset.optionIndex = String(index);
        item.setAttribute('role', 'option');
        const selected = additive ? option.textContent.startsWith('✓ ')
          || (option.value === 'all' && !choices.some(choice => choice.textContent.startsWith('✓ '))) : option.selected;
        item.setAttribute('aria-selected', String(selected));
        const text = document.createElement('span');
        text.textContent = option.textContent.replace(/^✓\s*/, '');
        const check = document.createElement('span');
        check.textContent = selected ? '✓' : '';
        check.setAttribute('aria-hidden', 'true');
        item.append(text, check);
        return item;
      }));
      if (select.disabled) close();
      else if (!menu.hidden) activate(Math.max(0, choices.findIndex(option => option.value === previous)), false);
    }
    function open(last = false) {
      if (button.disabled) return;
      opened?.close();
      sync();
      if (!choices.length) return;
      opened = picker;
      menu.hidden = false;
      field.classList.add('filter-field--open');
      button.setAttribute('aria-expanded', 'true');
      const bounds = button.getBoundingClientRect();
      const viewport = window.visualViewport;
      const viewportBottom = viewport ? viewport.height + viewport.offsetTop : window.innerHeight;
      const below = viewportBottom - bounds.bottom - 12;
      const above = bounds.top - (viewport?.offsetTop || 0) - 12;
      const upwards = below < 160 && above > below;
      widget.classList.toggle('filter-picker--above', upwards);
      menu.style.maxHeight = `${Math.max(44, Math.min(320, upwards ? above : below))}px`;
      // Mobile map menus rise from its bottom bar, within the map's visible height.
      const mapPanel = field.closest('.home-map-filter-panel');
      if (mapPanel && window.matchMedia('(max-width:1040px)').matches) {
        const frame = mapPanel.closest('.home-map-frame').getBoundingClientRect();
        const barHeight = mapPanel.querySelector('.home-map-filter-toggle').getBoundingClientRect().height;
        menu.style.maxHeight = `${Math.max(0, Math.min(window.innerHeight * .5, frame.height) - barHeight)}px`;
      }
      const selected = choices.findIndex(option => additive ? option.textContent.startsWith('✓ ') : option.selected);
      activate(selected >= 0 ? selected : last ? choices.length - 1 : 0);
    }
    function choose(index) {
      if (!choices[index]) return;
      select.value = choices[index].value;
      close();
      select.dispatchEvent(new Event('change', { bubbles: true }));
      syncFilterPickers();
      button.focus({ preventScroll: true });
    }
    const picker = { button, sync, close, field, observer: null };
    pickers.set(select, picker);
    button.addEventListener('click', () => menu.hidden ? open() : close());
    button.addEventListener('keydown', event => {
      if (event.key === 'Tab') { close(); return; }
      if (event.key === 'Escape') { close(); event.preventDefault(); return; }
      if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(event.key)) {
        event.preventDefault();
        if (menu.hidden) {
          open(event.key === 'ArrowUp');
          if (event.key === 'Home') activate(0);
          if (event.key === 'End') activate(choices.length - 1);
          return;
        }
        if (event.key === 'Enter' || event.key === ' ') choose(active);
        else activate(event.key === 'Home' ? 0 : event.key === 'End' ? choices.length - 1 : active + (event.key === 'ArrowDown' ? 1 : -1));
      } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        const now = Date.now();
        search = now - typedAt > 700 ? event.key : search + event.key;
        typedAt = now;
        if (menu.hidden) open();
        const term = search.toLocaleLowerCase();
        const repeated = [...term].every(letter => letter === term[0]);
        const prefix = repeated ? term[0] : term;
        for (let step = 1; step <= choices.length; step++) {
          const index = (active + step) % choices.length;
          if (choices[index].textContent.replace(/^✓\s*/, '').toLocaleLowerCase().startsWith(prefix)) { activate(index); break; }
        }
      }
    });
    menu.addEventListener('pointerdown', event => event.preventDefault());
    menu.addEventListener('click', event => {
      const option = event.target.closest('[data-option-index]');
      if (option) choose(Number(option.dataset.optionIndex));
    });
    button.addEventListener('blur', close);
    select.addEventListener('change', sync);
    /* Native state remains authoritative when data loads, options change, or filtering is reset. */
    picker.observer = new MutationObserver(sync);
    picker.observer.observe(select, { attributes: true, childList: true, subtree: true, characterData: true });
    widget.append(button, menu);
    label.replaceWith(field);
    field.append(heading, select, widget, ...notes);
    select.hidden = true;
    select.classList.add('filter-native');
    sync();
  });
}

document.addEventListener('pointerdown', event => {
  if (opened && !opened.field.contains(event.target)) opened.close();
});
window.addEventListener('resize', () => opened?.close());
