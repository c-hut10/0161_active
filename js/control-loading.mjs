/* Data-dependent controls: retain static listings while their interactive data loads. */
export function beginControlLoading(controls, message) {
  controls.forEach(control => {
    control.disabled = true;
    control.setAttribute('aria-busy', 'true');
  });
  message.textContent = 'Loading filters…';
  message.hidden = false;
  return (ready = true) => {
    controls.forEach(control => {
      control.disabled = !ready;
      control.removeAttribute('aria-busy');
    });
    message.hidden = true;
  };
}
