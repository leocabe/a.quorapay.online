'use strict';

// Every amount in the document has a fixed USD base; conversions never compound.
(async function localizePrices() {
  // Unicode CLDR territory currencies (2026-09-23); license: unicode-license.txt.
  const countryCurrencies = {"AC":"SHP","AD":"EUR","AE":"AED","AF":"AFN","AG":"XCD","AI":"XCD","AL":"ALL","AM":"AMD","AO":"AOA","AR":"ARS","AS":"USD","AT":"EUR","AU":"AUD","AW":"AWG","AX":"EUR","AZ":"AZN","BA":"BAM","BB":"BBD","BD":"BDT","BE":"EUR","BF":"XOF","BG":"EUR","BH":"BHD","BI":"BIF","BJ":"XOF","BL":"EUR","BM":"BMD","BN":"BND","BO":"BOB","BQ":"USD","BR":"BRL","BS":"BSD","BT":"BTN","BV":"NOK","BW":"BWP","BY":"BYN","BZ":"BZD","CA":"CAD","CC":"AUD","CD":"CDF","CF":"XAF","CG":"XAF","CH":"CHF","CI":"XOF","CK":"NZD","CL":"CLP","CM":"XAF","CN":"CNY","CO":"COP","CR":"CRC","CU":"CUP","CV":"CVE","CW":"XCG","CX":"AUD","CY":"EUR","CZ":"CZK","DE":"EUR","DG":"USD","DJ":"DJF","DK":"DKK","DM":"XCD","DO":"DOP","DZ":"DZD","EA":"EUR","EC":"USD","EE":"EUR","EG":"EGP","EH":"MAD","ER":"ERN","ES":"EUR","ET":"ETB","EU":"EUR","FI":"EUR","FJ":"FJD","FK":"FKP","FM":"USD","FO":"DKK","FR":"EUR","GA":"XAF","GB":"GBP","GD":"XCD","GE":"GEL","GF":"EUR","GG":"GBP","GH":"GHS","GI":"GIP","GL":"DKK","GM":"GMD","GN":"GNF","GP":"EUR","GQ":"XAF","GR":"EUR","GS":"GBP","GT":"GTQ","GU":"USD","GW":"XOF","GY":"GYD","HK":"HKD","HM":"AUD","HN":"HNL","HR":"EUR","HT":"HTG","HU":"HUF","IC":"EUR","ID":"IDR","IE":"EUR","IL":"ILS","IM":"GBP","IN":"INR","IO":"USD","IQ":"IQD","IR":"IRR","IS":"ISK","IT":"EUR","JE":"GBP","JM":"JMD","JO":"JOD","JP":"JPY","KE":"KES","KG":"KGS","KH":"KHR","KI":"AUD","KM":"KMF","KN":"XCD","KP":"KPW","KR":"KRW","KW":"KWD","KY":"KYD","KZ":"KZT","LA":"LAK","LB":"LBP","LC":"XCD","LI":"CHF","LK":"LKR","LR":"LRD","LS":"ZAR","LT":"EUR","LU":"EUR","LV":"EUR","LY":"LYD","MA":"MAD","MC":"EUR","MD":"MDL","ME":"EUR","MF":"EUR","MG":"MGA","MH":"USD","MK":"MKD","ML":"XOF","MM":"MMK","MN":"MNT","MO":"MOP","MP":"USD","MQ":"EUR","MR":"MRU","MS":"XCD","MT":"EUR","MU":"MUR","MV":"MVR","MW":"MWK","MX":"MXN","MY":"MYR","MZ":"MZN","NA":"NAD","NC":"XPF","NE":"XOF","NF":"AUD","NG":"NGN","NI":"NIO","NL":"EUR","NO":"NOK","NP":"NPR","NR":"AUD","NU":"NZD","NZ":"NZD","OM":"OMR","PA":"PAB","PE":"PEN","PF":"XPF","PG":"PGK","PH":"PHP","PK":"PKR","PL":"PLN","PM":"EUR","PN":"NZD","PR":"USD","PS":"ILS","PT":"EUR","PW":"USD","PY":"PYG","QA":"QAR","RE":"EUR","RO":"RON","RS":"RSD","RU":"RUB","RW":"RWF","SA":"SAR","SB":"SBD","SC":"SCR","SD":"SDG","SE":"SEK","SG":"SGD","SH":"SHP","SI":"EUR","SJ":"NOK","SK":"EUR","SL":"SLE","SM":"EUR","SN":"XOF","SO":"SOS","SR":"SRD","SS":"SSP","ST":"STN","SV":"USD","SX":"XCG","SY":"SYP","SZ":"SZL","TA":"GBP","TC":"USD","TD":"XAF","TF":"EUR","TG":"XOF","TH":"THB","TJ":"TJS","TK":"NZD","TL":"USD","TM":"TMT","TN":"TND","TO":"TOP","TR":"TRY","TT":"TTD","TV":"AUD","TW":"TWD","TZ":"TZS","UA":"UAH","UG":"UGX","UM":"USD","US":"USD","UY":"UYU","UZ":"UZS","VA":"EUR","VC":"XCD","VE":"VES","VG":"USD","VI":"USD","VN":"VND","VU":"VUV","WF":"XPF","WS":"WST","XK":"EUR","YE":"YER","YT":"EUR","ZA":"ZAR","ZM":"ZMW","ZW":"ZWG"};
  const locale = navigator.language || 'es';
  const amounts = [...document.querySelectorAll('[data-usd]')];
  let rates = { USD: 1 };
  const validRate = value => typeof value === 'number' && Number.isFinite(value) && value > 0;

  async function getJSON(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
      const response = await fetch(url, { signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
      if (!response.ok) throw new Error('Service unavailable');
      return await response.json();
    } finally { clearTimeout(timeout); }
  }

  function render(code) {
    const currency = validRate(rates[code]) ? code : 'USD';
    const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'code' });
    const factor = 10 ** formatter.resolvedOptions().maximumFractionDigits;
    const converted = usd => Math.round((Number(usd) * rates[currency] + Number.EPSILON) * factor) / factor;
    amounts.filter(el => !el.hasAttribute('data-bonus-total')).forEach(el => {
      el.textContent = formatter.format(converted(el.dataset.usd));
      el.title = `USD ${Number(el.dataset.usd).toFixed(2)}`;
    });
    // Sum the displayed bonus amounts, including currencies without decimal places.
    const bonusTotal = [...document.querySelectorAll('.bono-precio-tachado[data-usd]')]
      .reduce((sum, el) => sum + Math.round(converted(el.dataset.usd) * factor), 0) / factor;
    const total = document.querySelector('[data-bonus-total]');
    if (total) total.textContent = formatter.format(bonusTotal);
    document.documentElement.dataset.displayCurrency = currency;
  }


  async function loadRates() {
    // Public-domain daily rates; no on-page attribution is required.
    function validate(data) {
      const timestamp = Date.parse(data.date + 'T00:00:00Z');
      if (data.usd?.usd !== 1 || !Number.isFinite(timestamp) ||
          timestamp > Date.now() + 86400000 || Date.now() - timestamp > 172800000) {
        throw new Error('Invalid or expired exchange rates');
      }
      return data;
    }
    let data;
    try {
      const cache = JSON.parse(localStorage.getItem('alivio-exchange-rates-v2'));
      if (cache && Date.now() - cache.saved < 86400000) data = validate(cache.data);
    } catch (_) {}
    if (!data) data = await Promise.any([
      getJSON('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json').then(validate),
      getJSON('https://latest.currency-api.pages.dev/v1/currencies/usd.json').then(validate)
    ]);
    rates = Object.fromEntries(Object.entries(data.usd).map(([code, rate]) => [code.toUpperCase(), rate]));
    try { localStorage.setItem('alivio-exchange-rates-v2', JSON.stringify({ saved: Date.now(), data })); } catch (_) {}
  }

  async function detectCurrency() {
    let location;
    try { location = JSON.parse(sessionStorage.getItem('alivio-location')); } catch (_) {}
    if (!location || Date.now() - location.saved > 3600000) {
      // Race independent providers; a blocked service must not stop localization.
      const currency = await Promise.any([
        getJSON('https://api.country.is/').then(data => {
          const code = countryCurrencies[data.country];
          if (!code) throw new Error('Unknown country');
          return code;
        }),
        getJSON('https://ipapi.co/json/').then(data => {
          if (data.error || !/^[A-Z]{3}$/.test(data.currency)) throw new Error('Location unavailable');
          return data.currency;
        })
      ]);
      location = { currency, saved: Date.now() };
      try { sessionStorage.setItem('alivio-location', JSON.stringify(location)); } catch (_) {}
    }
    return location.currency;
  }

  const results = await Promise.allSettled([loadRates(), detectCurrency()]);
  render(results[0].status === 'fulfilled' && results[1].status === 'fulfilled' ? results[1].value : 'USD');
  clearTimeout(window.alivioPriceTimeout);
  document.documentElement.classList.remove('prices-pending');
})();
