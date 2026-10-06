'use strict';
// Único checkout disponível durante o teste de ticket.
const PAYMENT_URL = 'https://pay.trywalled.com/c06ba749-f146-4a8a-aa40-988f6c3292c6';
// Transmite ao checkout os parâmetros de campanha suportados pela Walled.
function withCampaignParams(destination) {
  const keys = ['src', 'sck', 'utm_id', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_source_platform', 'utm_term', 'utm_content', 'utm_creative_format', 'utm_marketing_tactic', 'gclid', 'gbraid', 'wbraid', 'fbclid', 'ttclid', 'msclkid'];
  const source = new URLSearchParams(window.location.search);
  const url = new URL(destination);
  keys.forEach(key => {
    const value = source.get(key);
    if (value) url.searchParams.set(key, value);
  });
  return url.toString();
}
let order = null;
try { order = JSON.parse(sessionStorage.getItem('novaCardOrder') || 'null'); } catch (_) {}
// No cartão só cabem o primeiro e o último nome.
function cardDisplayName(full) {
 const parts=String(full||'').trim().split(/\s+/).filter(Boolean);
 return parts.length>2?parts[0]+' '+parts[parts.length-1]:parts.join(' ');
}
const setText = (id, value) => { if (typeof value === 'string' && value.trim()) document.getElementById(id).textContent = value; };
if (order && typeof order === 'object') {
  setText('holder-name', order.name);
  setText('card-name', typeof order.name === 'string' ? cardDisplayName(order.name).toLocaleUpperCase('en-ZA') : '');
  setText('address', order.address);
  if (order.shippingPrice === '197 ZAR') setText('delivery-date', order.deliveryDate);
  setText('credit', order.credit);
}
// Reduz o tamanho do nome até caber na largura reservada no cartão, sem reticências.
function fitCardName(el) {
 const fit=()=>{
  el.style.fontSize='';el.style.letterSpacing='';
  const base=parseFloat(getComputedStyle(el).fontSize);let size=base;
  while(el.scrollWidth>el.clientWidth&&size>6){size-=0.5;el.style.fontSize=size+'px';if(size<base*0.85)el.style.letterSpacing='1px';if(size<base*0.65)el.style.letterSpacing='0px';}
 };
 fit();if(document.fonts)document.fonts.ready.then(fit);
 if(window.ResizeObserver)new ResizeObserver(fit).observe(el.parentElement);
}
fitCardName(document.getElementById('card-name'));
const paymentUrl = PAYMENT_URL;
const dialog = document.getElementById('info-dialog');
function showInfo(title, message) {
  document.getElementById('dialog-title').textContent = title;
  document.getElementById('dialog-message').textContent = message;
  dialog.showModal();
}
// O link nativo permite à UTMify reconhecer o checkout e aguardar o envio do IC.
const payButton = document.getElementById('pay-button');
if (paymentUrl) {
  payButton.href = withCampaignParams(paymentUrl);
} else {
  payButton.removeAttribute('href');
  payButton.addEventListener('click', () => {
    showInfo('Payment', 'Payment has not been set up yet. You have not been charged.');
  });
}
document.querySelectorAll('[data-legal]').forEach(button => button.addEventListener('click', () => {
  const url = LEGAL_URLS[button.dataset.legal];
  if (url) window.location.assign(url);
  else showInfo(button.textContent, 'This document is not available yet.');
}));
