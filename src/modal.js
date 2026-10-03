import { element, button } from './dom.js';

export function createModal() {
  const dialog = element('dialog', 'modal');
  dialog.setAttribute('aria-labelledby', 'modal-title');
  const panel = element('div', 'modal-panel');
  dialog.append(panel);
  document.body.append(dialog);
  let previousFocus;

  function close() {
    if (!dialog.open) return;
    dialog.close();
    document.body.classList.remove('modal-open');
    if (previousFocus?.isConnected) previousFocus.focus();
  }

  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    close();
  });
  let pressedBackdrop = false;
  dialog.addEventListener('pointerdown', (event) => { pressedBackdrop = event.target === dialog; });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog && pressedBackdrop) close();
  });

  function open({ eyebrow, title, content, action }) {
    if (!dialog.open) previousFocus = document.activeElement;
    const heading = element('h2', '', title);
    heading.id = 'modal-title';
    const actions = element('div', 'modal-actions');
    if (action) actions.append(button(action.text, 'button button-primary', action.handler));
    actions.append(button('Закрыть', 'button button-secondary', close));
    panel.replaceChildren(element('p', 'eyebrow', eyebrow), heading, content, actions);
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('modal-open');
  }

  return { open, close };
}
