/* Five Threads motion layer: Lenis smooth scroll, the Made / Sold / Worn hero,
   the factory marquee, the factory reveal, the nine stages and the glass highlights.
   GSAP + ScrollTrigger drive scroll progress; sticky CSS does the pinning. */
(function () {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const G = window.gsap, ST = window.ScrollTrigger;
  root.classList.add('js');
  if (!G || !ST) root.classList.add('nofx');
  else G.registerPlugin(ST);

  /* ---------- Smooth scroll (off for reduced motion and automated recording) ---------- */
  if (G && window.Lenis && !reduce && !navigator.webdriver) {
    const lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    lenis.on('scroll', ST.update);
    G.ticker.add(t => lenis.raf(t * 1000));
    G.ticker.lagSmoothing(0);
    $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const id = a.getAttribute('href'); if (id.length < 2 || !$(id)) return;
      e.preventDefault(); lenis.scrollTo(id, { offset: -10 });
    }));
  }

  /* ---------- Hero: Made / Sold / Worn ---------- */
  const panes = $$('.pane');
  if (panes.length) {
    let i = panes.findIndex(p => p.classList.contains('on')), timer;
    const show = k => { panes.forEach((p, j) => p.classList.toggle('on', j === k)); i = k; };
    const run = () => { clearInterval(timer); if (!reduce) timer = setInterval(() => show((i + 1) % panes.length), 5200); };
    panes.forEach((p, k) => p.addEventListener('click', () => { show(k); run(); }));
    run();
    const FT = window.FT, no = $('#tagno');
    if (FT && no) {
      let t = 1;
      setInterval(() => {
        const d = FT.designs[t++ % FT.designs.length];
        no.style.opacity = 0;
        setTimeout(() => { no.textContent = d.no; $('#tagsz').textContent = d.from + ' to ' + d.to + ' years'; no.style.opacity = 1; }, 380);
      }, 2600);
    }
  }

  /* ---------- Marquee: words with factory photos between, speeds up with scroll ---------- */
  const row = $('#chiprow');
  if (row) {
    const items = [['Knitted', 'factory/knitting'], ['Cut', 'factory/cutting'], ['Printed', 'factory/printing'], ['Embroidered', 'factory/embroidery'],
      ['Stitched', 'factory/sewing'], ['Checked', 'factory/checking'], ['Packed', 'factory/warehouse'], ['Shipped to Deira', 'shopfront']];
    const one = items.map(([w, img], k) => `<span${k % 2 ? ' class="k"' : ''}>${w}</span><img src="img/${img}.webp" alt="" loading="lazy">`).join('');
    row.innerHTML = one + one;
    if (G && !reduce) {
      let x = 0, v = 0, last = scrollY;
      G.ticker.add(() => {
        const dy = scrollY - last; last = scrollY;
        v += (Math.min(40, Math.abs(dy)) * .15 - v) * .1;
        x -= .6 + v;
        const half = row.scrollWidth / 2;
        if (-x >= half) x += half;
        row.style.transform = `translate3d(${x}px,0,0)`;
      });
    }
  }

  if (!G) return;

  /* ---------- Factory: the aerial opens to full bleed, the headline unmasks ---------- */
  const fimg = $('#fimg');
  if (fimg && !reduce) {
    const small = innerWidth < 900;
    G.fromTo(fimg, { clipPath: small ? 'inset(10% 6% 10% 6% round 28px)' : 'inset(14% 12% 14% 12% round 40px)' },
      { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', scrollTrigger: { trigger: '.factory', start: 'top bottom', end: 'top top', scrub: true } });
    G.fromTo('#fimg img', { scale: 1.25 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.factory', start: 'top bottom', end: 'bottom top', scrub: true } });
  }
  // Bar-masked lines: each line sits under a sun-yellow bar that slides away, one after another
  const lines = $$('.fcopy .ln');
  if (reduce) lines.forEach(l => l.style.setProperty('--bar', 0));
  else if (lines.length) G.to(lines, { '--bar': 0, duration: .8, ease: 'expo.inOut', stagger: .16,
    scrollTrigger: { trigger: '.factory', start: 'top 18%', once: true } });

  /* ---------- Counters ---------- */
  $$('#counts b[data-to]').forEach(b => {
    const to = +b.dataset.to, suf = b.dataset.suf || '', plain = 'plain' in b.dataset;
    const fmt = n => (plain ? String(Math.round(n)) : Math.round(n).toLocaleString('en-US')) + suf;
    if (reduce) { b.textContent = fmt(to); return; }
    const o = { n: plain ? to - 30 : 0 };
    b.textContent = fmt(o.n);
    G.to(o, { n: to, duration: 1.8, ease: 'power3.out', onUpdate: () => { b.textContent = fmt(o.n); },
      scrollTrigger: { trigger: '#counts', start: 'top 85%', once: true } });
  });

  /* ---------- Nine stages: horizontal track, HUD and a stitch with a needle ---------- */
  const st = $('#stages'), track = $('#strack');
  if (st && track) {
    const names = $$('.stage h3').map(h => h.textContent), n = names.length;
    const num = $('#stn'), name = $('#stname'), stitch = $('.stitch');
    let lastK = -1;
    ST.create({
      trigger: st, start: 'top top', end: 'bottom bottom', scrub: reduce ? false : .6,
      onUpdate: self => {
        const p = self.progress, max = track.scrollWidth - innerWidth;
        track.style.transform = `translate3d(${-p * max}px,0,0)`;
        stitch.style.setProperty('--p', (p * 100).toFixed(2) + '%');
        const k = Math.min(n - 1, Math.round(p * (n - 1)));
        if (k !== lastK) { lastK = k; num.textContent = String(k + 1).padStart(2, '0'); name.textContent = names[k]; }
      }
    });
  }

  /* ---------- Reveals ---------- */
  $$('.rv').forEach(el => {
    if (reduce) { el.style.opacity = 1; el.style.transform = 'none'; return; }
    G.to(el, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
  });

  /* ---------- Glass: the highlight follows the pointer ---------- */
  if (matchMedia('(pointer:fine)').matches) {
    $$('.glass,.certs li,.ph figcaption,.hud').forEach(el => el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px'); el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }));
  }

  addEventListener('load', () => ST.refresh());
})();

/* Shoot reels: play only while on screen; never for reduced motion */
(function () {
  const vids = [...document.querySelectorAll('.reel video')];
  if (!vids.length) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { vids.forEach(v => { v.removeAttribute('autoplay'); v.pause(); }); return; }
  const io = new IntersectionObserver(es => es.forEach(en => en.isIntersecting ? en.target.play().catch(() => {}) : en.target.pause()), { threshold: .25 });
  vids.forEach(v => io.observe(v));
})();
