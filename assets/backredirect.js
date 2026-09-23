'use strict';
(function () {
  const offer = window.ALIVIO_EXIT_OFFER;
  let checkout;
  try {
    checkout = new URL(offer?.checkoutUrl);
    if (checkout.protocol !== 'https:' || checkout.hostname !== 'pay.hotmart.com') return;
  } catch (_) { return; }
  const key = 'alivio-exit-offer-seen';
  const isOffer = document.body.dataset.page === 'exit-offer';
  if (isOffer) {
    try { sessionStorage.setItem(key, '1'); } catch (_) {}
    document.querySelectorAll('[data-offer-checkout]').forEach(button => {
      const link = document.createElement('a');
      link.className = button.className;
      link.href = checkout.href;
      link.textContent = button.textContent;
      button.replaceWith(link);
    });
    return;
  }
  try { if (sessionStorage.getItem(key)) return; } catch (_) { return; }
  let armed = false;
  let used = false;
  function arm() {
    if (armed || used) return;
    armed = true;
    history.replaceState({ ...history.state, alivioReturnPoint: true }, '', location.href);
    history.pushState({ alivioOfferGuard: true }, '', location.href);
  }
  // Arm only after an actual interaction; never add repeated history entries.
  document.addEventListener('pointerdown', arm, { once: true });
  document.addEventListener('keydown', arm, { once: true });
  window.addEventListener('popstate', event => {
    if (!armed || used || !event.state?.alivioReturnPoint) return;
    used = true;
    sessionStorage.setItem(key, '1');
    location.replace(new URL('oferta.html', location.href).href);
  });
})();
