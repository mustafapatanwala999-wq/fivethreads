/* Site analytics for the Five Threads dashboard: Cloudflare Web Analytics, plus "Book a visit" counts that send only which button was used, never form data. */
(() => {
  const HIT = 'https://dashboard.fivethreads.net/api/hit';
  const page = /catalogue/.test(location.pathname) ? 'catalogue' : 'home';
  // Cloudflare Web Analytics, only on the live site (local copies and QA would report from origin null).
  if (/(^|\.)fivethreads\.net$/.test(location.hostname)) {
    const b = document.createElement('script');
    b.defer = true; b.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    b.setAttribute('data-cf-beacon', '{"token": "f0ca4c9f1f2441f691792c20b916652f"}');
    document.head.appendChild(b);
  }
  const send = (e, place) => { try { navigator.sendBeacon(HIT, new Blob([JSON.stringify({ e, page, place })], { type: 'text/plain' })); } catch (_) {} };

  document.addEventListener('click', ev => {
    const a = ev.target.closest && ev.target.closest('a[href$="#book"]');
    if (!a) return;
    const place = a.closest('header, nav') ? 'nav' : a.closest('footer') ? 'footer' : a.closest('.panel') ? 'product-panel' : (a.closest('section[id]') || {}).id || 'page';
    send('book_click', String(place).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24) || 'page');
  });

  // Same checks as the planner in app.js, so only requests that really go on to WhatsApp are counted.
  const planner = document.getElementById('planner');
  if (planner) planner.addEventListener('submit', () => {
    const f = new FormData(planner);
    const filled = ['name', 'store', 'phone'].every(k => String(f.get(k) || '').trim());
    if (filled && /^[+\d][\d\s-]{6,}$/.test(String(f.get('phone')).trim())) send('book_submit', 'planner');
  });
})();
