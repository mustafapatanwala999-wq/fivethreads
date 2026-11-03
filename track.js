/* Counts "Book a visit" clicks for the Five Threads dashboard. Sends only which button was used, never form data. */
(() => {
  const HIT = 'https://dashboard.fivethreads.net/api/hit';
  const page = /catalogue/.test(location.pathname) ? 'catalogue' : 'home';
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
