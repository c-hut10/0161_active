/* One line per optional payment choice; the pipe form also survives plain spreadsheet pasting. */
export function paymentOptions(value) {
  const items = Array.isArray(value) ? value : String(value || '').split(/\r?\n|\s+\|\s+/);
  return [
    ...new Set(
      items.map((item) => String(item || '').trim()).filter((item) => item && !/^(not confirmed|false)$/i.test(item))
    )
  ];
}

export function paymentOptionParts(value) {
  const split = value.indexOf(':');
  return split < 0
    ? ['Payment option', value]
    : [value.slice(0, split).trim() || 'Payment option', value.slice(split + 1).trim()];
}
