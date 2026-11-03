/* Five Threads site behaviour: hero, five threads, the rail, booking planner, catalogue. */
(function () {
  const FT = window.FT, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sizeTxt = d => d.from + ' to ' + d.to + ' years';

  /* ---------- Visit list shared by the rail, the catalogue and the planner ---------- */
  const store = {
    get() { try { return JSON.parse(localStorage.getItem('ft-picks') || '[]'); } catch (e) { return []; } },
    set(v) { try { localStorage.setItem('ft-picks', JSON.stringify(v)); } catch (e) {} }
  };
  let picks = store.get();
  const listeners = [];
  function addPick(no) { if (!picks.includes(no)) { picks.push(no); store.set(picks); listeners.forEach(f => f()); } }
  function dropPick(no) { picks = picks.filter(p => p !== no); store.set(picks); listeners.forEach(f => f()); }

  /* ---------- Header ---------- */
  const top = $('#top');
  const onScrollHeader = () => top && top.classList.toggle('solid', scrollY > 40 || !$('.hero'));
  onScrollHeader();

  /* ---------- Tag dialog ---------- */
  const sheet = $('#sheet');
  let current = null;
  function openSheet(d) {
    if (!sheet) return;
    current = d;
    $('#sheetimg').src = 'img/cards/' + d.card + '.webp';
    $('#sheetimg').alt = 'Five Threads catalogue card for design ' + d.no;
    $('#sheetno').textContent = d.no;
    $('#sheetsize').textContent = 'Size ' + sizeTxt(d);
    syncSheet();
    sheet.showModal();
  }
  function syncSheet() {
    if (!current) return;
    const on = picks.includes(current.no);
    $('#sheetadd').innerHTML = on ? 'Added to my visit ✓' : 'Add to my visit <span aria-hidden="true">+</span>';
  }
  if (sheet) {
    $('#sheetclose').onclick = () => sheet.close();
    sheet.addEventListener('click', e => { if (e.target === sheet) sheet.close(); });
    $('#sheetadd').onclick = () => { picks.includes(current.no) ? dropPick(current.no) : addPick(current.no); syncSheet(); };
    listeners.push(syncSheet);
  }

  /* ---------- Hero: slideshow, swinging tag, tilt ---------- */
  const screen = $('#screen');
  if (screen) {
    const imgs = $$('#screen img'), dots = $$('#dots i');
    const caps = ['From the photo shoot', 'Graphic tees', 'Sets for girls', 'Printed tees'];
    let i = 0;
    setInterval(() => {
      imgs[i].classList.remove('on'); dots[i].classList.remove('on');
      i = (i + 1) % imgs.length;
      imgs[i].classList.add('on'); dots[i].classList.add('on'); $('#capt').textContent = caps[i];
    }, 4200);
    let t = 1;
    setInterval(() => {
      const d = FT.designs[t++ % FT.designs.length], no = $('#tagno');
      no.style.opacity = 0;
      setTimeout(() => { no.textContent = d.no; $('#tagsz').textContent = sizeTxt(d); no.style.opacity = 1; }, 380);
    }, 2600);
    const box = $('#box'), board = $('#board');
    if (!reduce && matchMedia('(pointer:fine)').matches) {
      board.addEventListener('pointermove', e => {
        const r = board.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        box.style.transform = `rotateY(${-14 + x * 16}deg) rotateX(${4 - y * 10}deg)`;
      });
      board.addEventListener('pointerleave', () => { box.style.transform = ''; });
    }
  }

  /* ---------- Five threads, drawn down the page as you scroll ---------- */
  const svg = $('#threads'), main = $('#main');
  let paths = [], lens = [];
  function buildThreads() {
    if (!svg) return;
    const W = document.documentElement.clientWidth, H = main.scrollHeight;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.style.height = H + 'px';
    const cols = ['#ffd25a', '#f6a6c1', '#9fe0c9', '#c7b5f0', '#f4eee2'];
    const startY = innerHeight * .92, seg = 520;
    svg.innerHTML = '';
    paths = cols.map((c, k) => {
      const x0 = W * (.5 + (k - 2) * .035);
      let d = `M ${x0} ${startY}`;
      for (let y = startY, j = 0; y < H; y += seg, j++) {
        const amp = W * (.18 + .05 * Math.sin(k + j)), dir = (j + k) % 2 ? 1 : -1;
        const x1 = W * .5 + dir * amp * (k % 2 ? .8 : 1) + (k - 2) * 14;
        d += ` S ${x1} ${y + seg * .5} ${W * (.5 + (k - 2) * .035)} ${y + seg}`;
      }
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', d); p.setAttribute('stroke', c); p.setAttribute('opacity', '.5');
      svg.appendChild(p); return p;
    });
    lens = paths.map(p => p.getTotalLength());
    paths.forEach((p, k) => { p.style.strokeDasharray = lens[k]; });
    drawThreads();
  }
  function drawThreads() {
    if (!paths.length) return;
    const H = main.scrollHeight, prog = Math.min(1, (scrollY + innerHeight * .9) / H);
    paths.forEach((p, k) => { p.style.strokeDashoffset = reduce ? 0 : lens[k] * (1 - Math.min(1, prog * (1 + k * .02))); });
  }

  /* ---------- The rail ---------- */
  const track = $('#track'), railsec = $('#rail');
  let hangers = [], angle = [], vel = [], lastY = scrollY, lastX = 0;
  if (track) {
    FT.designs.forEach((d, k) => {
      const b = document.createElement('button');
      b.className = 'hanger'; b.type = 'button';
      b.setAttribute('aria-label', `Design ${d.no}, size ${sizeTxt(d)}. Open the card`);
      b.innerHTML = `<div class="hook"></div><div class="garment"><img src="img/tags/${d.tag}.webp" alt="" loading="${k < 6 ? 'eager' : 'lazy'}"></div><div class="stag"><b>${d.no}</b><em>${d.from}–${d.to} yrs</em></div>`;
      b.onclick = () => openSheet(d);
      track.appendChild(b);
    });
    hangers = $$('.hanger'); angle = hangers.map(() => 0); vel = hangers.map(() => 0);
  }
  function railFrame() {
    if (!track) return;
    const r = railsec.getBoundingClientRect(), span = railsec.offsetHeight - innerHeight;
    const p = Math.min(1, Math.max(0, -r.top / span));
    const max = track.scrollWidth - innerWidth;
    const x = -p * max;
    track.style.transform = `translate3d(${x}px,0,0)`;
    $('#railprog').style.width = (p * 100).toFixed(1) + '%';
    const idx = Math.min(FT.designs.length, Math.max(1, Math.round(p * (FT.designs.length - 1)) + 1));
    $('#railn').textContent = String(idx).padStart(2, '0');
    $('#railhint').textContent = p > .98 ? 'End of the rail. Tap any tag to open it' : 'Scroll to slide the rail';
    // Hangers swing against the direction of travel, then settle like real ones on a rail.
    const dx = x - lastX; lastX = x;
    hangers.forEach((h, k) => {
      if (reduce) { h.style.transform = ''; return; }
      vel[k] += (-dx * .06) - angle[k] * .045;
      vel[k] *= .9; angle[k] += vel[k];
      angle[k] = Math.max(-14, Math.min(14, angle[k]));
      h.style.transform = `rotate(${angle[k].toFixed(2)}deg)`;
    });
  }
  function loop() {
    railFrame();
    if (hangers.some((h, k) => Math.abs(angle[k]) > .05 || Math.abs(vel[k]) > .05)) requestAnimationFrame(loop);
    else ticking = false;
  }
  let ticking = false;
  function kick() { if (!ticking) { ticking = true; requestAnimationFrame(loop); } }

  /* ---------- Lookbook strips ---------- */
  const s1 = $('#strip1'), s2 = $('#strip2');
  if (s1) {
    const a = ['mm0011', 'mm1822', 'mm0402', 'mm0038', 'mm1813', 'mm1216', 'mm0056', 'mm1830', 'mm0447', 'mm1210'];
    const b = ['mm1839', 'mm0404', 'mm1786', 'mm1823', 'mm0051', 'mm1209', 'mm1826', 'mm0065', 'mm1793', 'mm1811'];
    const fill = (el, list) => { el.innerHTML = list.concat(list).map((n, i) => `<img src="img/mm/${n}.webp" alt="${i < list.length ? 'Five Threads lookbook photo' : ''}" loading="lazy">`).join(''); };
    fill(s1, a); fill(s2, b);
  }

  /* ---------- Why: words light up, photo follows ---------- */
  const words = $$('.word'), stackImgs = $$('#stack img');
  if (words.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      const i = +e.target.dataset.i;
      words.forEach(w => w.classList.toggle('on', w === e.target));
      stackImgs.forEach((im, k) => im.classList.toggle('on', k === i));
    }), { rootMargin: '-45% 0px -45% 0px' });
    words.forEach(w => io.observe(w));
  }

  /* ---------- Map: threads from Deira ---------- */
  const map = $('#map');
  if (map) {
    const P = (lng, lat) => [(lng - 54.6) / 2 * 520 + 40, (26 - lat) / 2 * 420 + 30];
    const home = P(55.30, 25.27);
    const places = [
      ['Sharjah', 55.41, 25.34, 'r'], ['Ajman', 55.48, 25.40, 'r'], ['Umm Al Quwain', 55.55, 25.56, 'r'],
      ['Ras Al Khaimah', 55.94, 25.79, 'r'], ['Dibba', 56.27, 25.62, 'r'], ['Khor Fakkan', 56.35, 25.34, 'r'],
      ['Fujairah', 56.33, 25.13, 'r'], ['Al Ain', 55.74, 24.21, 'r']
    ].map(([n, lng, lat, s]) => ({ n, xy: P(lng, lat), s }));
    places.push({ n: 'Bahrain', xy: [44, 70], s: 'r', far: true });
    const cols = ['#ffd25a', '#f6a6c1', '#9fe0c9', '#c7b5f0', '#f4eee2'];
    const NS = 'http://www.w3.org/2000/svg', routes = $('#routes'), pins = $('#pins');
    places.forEach((p, k) => {
      const [x, y] = p.xy, cx = (home[0] + x) / 2, cy = Math.min(home[1], y) - (p.far ? 90 : 50);
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', `M ${home[0]} ${home[1]} Q ${cx} ${cy} ${x} ${y}`);
      path.setAttribute('class', 'route'); path.setAttribute('stroke', cols[k % 5]);
      if (p.far) path.setAttribute('stroke-dasharray', '2 8');
      routes.appendChild(path);
      const L = path.getTotalLength(); path.style.setProperty('--len', L);
      if (p.far) { path.style.strokeDasharray = ''; }
      path.style.transitionDelay = (k * .12) + 's';
      const c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 6); c.setAttribute('class', 'pin'); pins.appendChild(c);
      const t = document.createElementNS(NS, 'text'), left = p.n === 'Sharjah';
      t.setAttribute('x', left ? x - 12 : x + 12); t.setAttribute('y', left ? y + 18 : y + 5); if (left) t.setAttribute('text-anchor', 'end');
      t.textContent = p.n; pins.appendChild(t);
    });
    const pl = document.createElementNS(NS, 'circle'); pl.setAttribute('cx', home[0]); pl.setAttribute('cy', home[1]); pl.setAttribute('r', 10); pl.setAttribute('class', 'pulse'); pins.appendChild(pl);
    const hc = document.createElementNS(NS, 'circle'); hc.setAttribute('cx', home[0]); hc.setAttribute('cy', home[1]); hc.setAttribute('r', 9); hc.setAttribute('class', 'home'); pins.appendChild(hc);
    const ht = document.createElementNS(NS, 'text'); ht.setAttribute('x', home[0] - 16); ht.setAttribute('y', home[1] - 14); ht.setAttribute('text-anchor', 'end'); ht.textContent = 'Deira, Dubai'; pins.appendChild(ht);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es, o) => es.forEach(e => { if (e.isIntersecting) { map.classList.add('on'); o.disconnect(); } }), { threshold: .3 }).observe(map);
    } else map.classList.add('on');
  }

  /* ---------- Booking planner ---------- */
  const planner = $('#planner');
  if (planner) {
    const days = $('#days');
    const dubaiNow = new Date(Date.now() + (4 * 60 + new Date().getTimezoneOffset()) * 60000);
    const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], mo = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let k = 1; k <= 14; k++) {
      const d = new Date(dubaiNow); d.setDate(d.getDate() + k);
      const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      const l = document.createElement('label'); l.className = 'opt';
      l.innerHTML = `<input type="radio" name="day" value="${iso}" data-label="${wd[d.getDay()]} ${d.getDate()} ${mo[d.getMonth()]} ${d.getFullYear()}" ${k === 1 ? 'checked' : ''}><span><small>${wd[d.getDay()]}</small><b>${d.getDate()}</b><small>${mo[d.getMonth()]}</small></span>`;
      days.appendChild(l);
    }
    const renderPicks = () => {
      const box = $('#picks'); box.innerHTML = '';
      picks.forEach(no => {
        const s = document.createElement('span'); s.className = 'pick'; s.textContent = no;
        const x = document.createElement('button'); x.type = 'button'; x.textContent = '×'; x.setAttribute('aria-label', 'Remove ' + no); x.onclick = () => dropPick(no);
        s.appendChild(x); box.appendChild(s);
      });
      $('#pickhint').style.display = picks.length ? 'none' : '';
    };
    renderPicks(); listeners.push(renderPicks);

    let last = null;
    planner.addEventListener('submit', e => {
      e.preventDefault();
      const f = new FormData(planner), err = $('#formerr');
      const need = [['name', 'your name'], ['store', 'your store name'], ['phone', 'a mobile number']].filter(([k]) => !String(f.get(k) || '').trim());
      if (need.length) { err.textContent = 'Please add ' + need.map(n => n[1]).join(', ') + '.'; planner.querySelector(`[name=${need[0][0]}]`).focus(); return; }
      if (!/^[+\d][\d\s-]{6,}$/.test(String(f.get('phone')).trim())) { err.textContent = 'Please check the mobile number.'; planner.querySelector('[name=phone]').focus(); return; }
      err.textContent = '';
      const dayEl = planner.querySelector('[name=day]:checked');
      const code = 'FT-' + dayEl.value.slice(5).replace('-', '') + '-' + String(Math.floor(100 + Math.random() * 900));
      last = {
        code, kind: f.get('kind'), day: dayEl.value, dayLabel: dayEl.dataset.label, when: f.get('when'),
        name: String(f.get('name')).trim(), store: String(f.get('store')).trim(), storetype: f.get('storetype'),
        city: f.get('city'), phone: String(f.get('phone')).trim(), designs: picks.slice()
      };
      const rows = [['Code', code], ['Visit', last.kind], ['Day', last.dayLabel], ['Date', last.day], ['Time', last.when], ['Name', last.name], ['Store', last.store + ' (' + last.storetype + ')'], ['Place', last.city], ['Mobile', last.phone], ['Designs', last.designs.join(', ') || 'Show me the rail']];
      $('#tcode').textContent = code;
      $('#tlist').innerHTML = rows.slice(1).map(([k, v]) => `<dt>${k}</dt><dd></dd>`).join('');
      $$('#tlist dd').forEach((dd, k) => { dd.textContent = rows[k + 1][1]; });
      const msg = 'FIVE THREADS VISIT REQUEST\n' + rows.map(([k, v]) => k + ': ' + v).join('\n');
      $('#twa').href = 'https://wa.me/' + (FT.whatsapp || '') + '?text=' + encodeURIComponent(msg);
      planner.style.display = 'none';
      $('#ticket').classList.add('show');
      $('#ticket').scrollIntoView({ block: 'center' });
    });
    $('#tedit').onclick = () => { $('#ticket').classList.remove('show'); planner.style.display = ''; };
    $('#tics').onclick = () => {
      if (!last) return;
      const hour = { Morning: '10', Afternoon: '15', Evening: '19' }[last.when] || '10';
      const dt = last.day.replace(/-/g, '') + 'T' + hour + '0000';
      const end = last.day.replace(/-/g, '') + 'T' + String(+hour + 1).padStart(2, '0') + '0000';
      const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Five Threads Trading//Visit//EN', 'BEGIN:VEVENT',
        'UID:' + last.code + '@fivethreads', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z',
        'DTSTART;TZID=Asia/Dubai:' + dt, 'DTEND;TZID=Asia/Dubai:' + end,
        'SUMMARY:Five Threads visit (' + last.code + ')',
        'LOCATION:' + (last.kind === 'Showroom visit' ? 'Shop No. 3\\, Murshid Bazaar\\, Deira\\, Dubai' : last.store + '\\, ' + last.city),
        'DESCRIPTION:' + last.when + ' visit. Time to be confirmed on WhatsApp. Designs: ' + (last.designs.join(' ') || 'the full rail'),
        'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
      a.download = 'five-threads-visit-' + last.code + '.ics'; document.body.appendChild(a); a.click(); a.remove();
    };
  }

  /* ---------- Catalogue page ---------- */
  const grid = $('#grid');
  if (grid) {
    let type = 'all', age = null;
    const typeFromHash = () => { const h = location.hash.slice(1); return ['sweatshirts', 'tees', 'polos'].includes(h) ? h : 'all'; };
    type = typeFromHash();
    const showGrid = $('#showgrid'), bar = $('#visitbar');
    // One tap adds a piece to the visit list without opening its card.
    const selBtn = (key, label) => {
      const on = picks.includes(key), x = document.createElement('button'); x.type = 'button'; x.className = 'sel' + (on ? ' on' : '');
      x.setAttribute('aria-pressed', on); x.setAttribute('aria-label', (on ? 'Remove ' : 'Select ') + label + (on ? ' from' : ' for') + ' your visit');
      x.innerHTML = on ? '<span aria-hidden="true">✓</span> Selected' : '<span aria-hidden="true">+</span> Select';
      x.onclick = () => picks.includes(key) ? dropPick(key) : addPick(key);
      return x;
    };
    let lastView = '';
    function render() {
      const view = type + '|' + age, still = view === lastView; lastView = view;
      $$('.typebtns button').forEach(b => b.setAttribute('aria-pressed', b.dataset.t === type));
      const sw = FT.designs.filter(d => (type === 'all' || type === 'sweatshirts') && (age == null || (age >= d.from && age <= d.to)));
      grid.innerHTML = '';
      sw.forEach((d, k) => {
        const w = document.createElement('div'); w.className = 'item' + (picks.includes(d.no) ? ' added' : '');
        w.style.animation = still ? 'none' : ''; w.style.animationDelay = (k * 35) + 'ms';
        const b = document.createElement('button'); b.type = 'button'; b.className = 'open';
        b.setAttribute('aria-label', `Design ${d.no}, ${sizeTxt(d)}. Open the card`);
        b.innerHTML = `<div class="ph"><span class="typ">Sweatshirt</span><img src="img/tags/${d.tag}.webp" alt="" loading="lazy"></div><div class="meta"><b>${d.no}</b><span>${sizeTxt(d)}</span></div><span class="lk">${d.look}</span>`;
        b.onclick = () => openSheet(d);
        w.append(b, selBtn(d.no, 'design ' + d.no));
        grid.appendChild(w);
      });
      if ((type === 'all' || type === 'sweatshirts') && !sw.length) grid.innerHTML = '<p class="empty">No sweatshirt design covers that age yet. Try another age, or ask us on your visit.</p>';
      $('#swsec').style.display = (type === 'all' || type === 'sweatshirts') ? '' : 'none';
      const show = FT.showroom.filter(s => type === 'all' || (type === 'tees' && s.type === 'tee') || (type === 'polos' && s.type === 'polo'));
      $('#showsec').style.display = type === 'sweatshirts' ? 'none' : '';
      $('#showh').textContent = type === 'polos' ? 'Polos on the rail' : type === 'tees' ? 'T-shirts on the rail' : 'T-shirts and polos on the rail';
      showGrid.innerHTML = '';
      show.forEach((s, k) => {
        const ref = (s.type === 'polo' ? 'P' : 'T') + s.img.replace(/\D/g, ''), key = (s.type === 'polo' ? 'Polo ' : 'T-shirt ') + ref;
        const el = document.createElement('figure'); el.className = 'item' + (picks.includes(key) ? ' added' : ''); el.style.margin = 0; el.style.cursor = 'default'; el.style.animation = still ? 'none' : ''; el.style.animationDelay = (k * 30) + 'ms';
        el.innerHTML = `<div class="ph"><span class="typ">${s.type === 'polo' ? 'Polo' : 'T-shirt'}</span><img src="img/showroom/${s.img}.webp" alt="${s.type === 'polo' ? 'Kids polo shirt' : 'Kids graphic T-shirt'} on a hanger in the Five Threads showroom" loading="lazy"></div><figcaption class="meta"><b>Ref ${ref}</b><span>Design no. on request</span></figcaption>`;
        el.appendChild(selBtn(key, key));
        showGrid.appendChild(el);
      });
      $('#count').textContent = (sw.length ? sw.length + ' numbered designs' : '') + (sw.length && show.length ? ' · ' : '') + (show.length ? show.length + ' showroom pieces' : '');
      bar.classList.toggle('show', picks.length > 0);
      $('#barn').textContent = picks.length + (picks.length === 1 ? ' piece' : ' pieces') + ' selected for your visit';
    }
    $$('.typebtns button').forEach(b => b.onclick = () => { type = b.dataset.t; history.replaceState(null, '', type === 'all' ? location.pathname : '#' + type); render(); });
    const range = $('#agein'), out = $('#ageout');
    range.oninput = () => { age = +range.value; out.textContent = age + (age === 1 ? ' year' : ' yrs'); render(); };
    $('#ageany').onclick = () => { age = null; out.textContent = 'Any age'; render(); };
    addEventListener('hashchange', () => { type = typeFromHash(); render(); });
    listeners.push(render);
    render();
  }

  /* ---------- Journey: Burj Khalifa -> Creek -> Murshid Bazaar ---------- */
  document.documentElement.classList.add('js');
  const journey = $('#visit.journey');
  let jframe = () => {};
  if (journey) {
    const NS = 'http://www.w3.org/2000/svg', world = $('#world'), stars = $('#stars'), lights = $('#burjlights');
    for (let k = 0; k < 90; k++) { const c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', Math.random() * 1600); c.setAttribute('cy', Math.random() * 520); c.setAttribute('r', Math.random() * 1.6 + .3); c.setAttribute('fill', '#fff'); c.setAttribute('opacity', (Math.random() * .6 + .2).toFixed(2)); stars.appendChild(c); }
    // Lit windows on the tower, narrowing with the setbacks.
    [[600, 810, 700, 796], [470, 600, 712, 784], [360, 470, 722, 774], [250, 360, 731, 765], [160, 250, 738, 758]].forEach(([y0, y1, x0, x1]) => {
      for (let y = y0 + 8; y < y1; y += 14) for (let x = x0 + 4; x < x1 - 4; x += 9) if (Math.random() > .55) { const r = document.createElementNS(NS, 'rect'); r.setAttribute('x', x); r.setAttribute('y', y); r.setAttribute('width', 4); r.setAttribute('height', 6); r.setAttribute('opacity', (Math.random() * .7 + .2).toFixed(2)); lights.appendChild(r); }
    });
    const sl = $('#streetlights');
    for (let x = -380; x < 2700; x += 46) { if (x > 1630 && x < 2010) continue; const c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', x); c.setAttribute('cy', 782); c.setAttribute('r', 2.4); c.setAttribute('opacity', '.8'); sl.appendChild(c); }
    const turb = $('#turb'); let tw = 0;
    const waveFlag = () => { tw += .03; turb.setAttribute('baseFrequency', (0.012 + Math.sin(tw) * .003).toFixed(4) + ' ' + (0.045 + Math.cos(tw * .8) * .008).toFixed(4)); };
    const route = $('#route'), car = $('#car'), drop = $('#drop'), L = route.getTotalLength();
    const trail = route.cloneNode(); trail.removeAttribute('id'); trail.setAttribute('stroke-dasharray', L); trail.setAttribute('stroke-width', 6); route.setAttribute('opacity', '.28'); route.after(trail);
    const steps = $$('.jstep'), card = $('#jcard'), bar = $('#jbar');
    const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
    jframe = () => {
      const r = journey.getBoundingClientRect(), span = journey.offsetHeight - innerHeight;
      if (r.bottom < 0 || r.top > innerHeight) return;
      const p = clamp(-r.top / span);
      bar.style.width = (p * 100).toFixed(1) + '%';
      const z = ease(clamp(p / .25)), pan = ease(clamp((p - .25) / .5)), land = clamp((p - .75) / .2);
      const phone = innerWidth < 760, off = phone ? 0 : 270;
      const s = 1 + .12 * z + .08 * pan, cx = (748 - off) + (2235 + off - (748 - off)) * pan, cy = 520 + (phone ? 330 : 150) * pan;
      world.setAttribute('transform', `translate(${800 - cx * s} ${450 - cy * s + (phone ? 190 * (1 - pan) : 0)}) scale(${s})`);
      trail.setAttribute('stroke-dashoffset', L * (1 - pan));
      const pt = route.getPointAtLength(L * pan); car.setAttribute('cx', pt.x); car.setAttribute('cy', pt.y);
      car.setAttribute('opacity', pan > 0 && land < .2 ? 1 : 0);
      const b = land < 1 ? Math.sin(land * Math.PI * 1.5) * (1 - land) * 30 : 0;
      drop.setAttribute('transform', `translate(2235 ${772 - (1 - Math.min(1, land * 2)) * 260 - Math.abs(b)})`);
      drop.setAttribute('opacity', land > 0 ? 1 : 0);
      steps.forEach((el, k) => el.classList.toggle('on', k === (p < .3 ? 0 : 1) && p < .6));
      card.classList.toggle('show', p >= .78);
    };
    let jvis = false, jraf = 0;
    const tick = () => { waveFlag(); jframe(); jraf = jvis ? requestAnimationFrame(tick) : 0; };
    if ('IntersectionObserver' in window) new IntersectionObserver(es => { jvis = es[0].isIntersecting; if (jvis && !jraf && !reduce) jraf = requestAnimationFrame(tick); }).observe(journey);
    jframe();
  }

  /* ---------- Scroll + resize ---------- */
  addEventListener('scroll', () => { onScrollHeader(); drawThreads(); kick(); jframe(); lastY = scrollY; }, { passive: true });
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { buildThreads(); railFrame(); }, 150); });
  addEventListener('load', () => { buildThreads(); railFrame(); });
  buildThreads(); railFrame();
})();
