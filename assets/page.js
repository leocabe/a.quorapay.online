'use strict';

// Purchase links navigate directly to the supplied Hotmart offer.
// Native links work without JavaScript, popups, or third-party widget loading.

// Accessible, mutually exclusive FAQ panels.
const questions = [...document.querySelectorAll('.bpsg-faq-q')];
questions.forEach((button, index) => {
  const panel = button.nextElementSibling;
  panel.id = `faq-answer-${index}`;
  button.id = `faq-question-${index}`;
  button.type = 'button';
  button.setAttribute('aria-controls', panel.id);
  button.setAttribute('aria-expanded', 'false');
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', button.id);
  button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') !== 'true';
    questions.forEach(other => {
      other.setAttribute('aria-expanded', 'false');
      other.closest('.bpsg-faq-item').classList.remove('open');
    });
    button.setAttribute('aria-expanded', String(open));
    button.closest('.bpsg-faq-item').classList.toggle('open', open);
  });
});

const title = document.getElementById('bpsg-dia-titulo');
if (title) {
  const day = new Intl.DateTimeFormat('es-AR', { weekday: 'long' }).format(new Date());
  title.textContent = `¡Oferta solo por hoy ${day}!`;
}
const duration = 15 * 60 * 1000;
let deadline = Date.now() + duration;
try {
  const saved = Number(sessionStorage.getItem('alivio-countdown'));
  if (saved > 0) deadline = saved;
  else sessionStorage.setItem('alivio-countdown', String(deadline));
} catch (_) { /* File previews can have storage disabled. */ }
function updateCountdown() {
  const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  document.getElementById('bpsg-min').textContent = String(Math.floor(remaining / 60)).padStart(2, '0');
  document.getElementById('bpsg-seg').textContent = String(remaining % 60).padStart(2, '0');
}
updateCountdown();
setInterval(updateCountdown, 1000);
