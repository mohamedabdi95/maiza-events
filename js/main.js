/* Maiza Events — UI interactions (no dependencies) */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---- hero title: split into letters ---- */
  $$('[data-split] .line').forEach((line) => {
    const text = line.textContent;
    line.textContent = '';
    line.setAttribute('aria-hidden', 'true');
    [...text].forEach((c) => {
      const s = document.createElement('span');
      s.className = 'ch';
      s.textContent = c === ' ' ? '\u00a0' : c;
      line.appendChild(s);
    });
  });
  $$('[data-split] .ch').forEach((s, i) => s.style.setProperty('--i', i));

  /* ---- loader ---- */
  const loader = $('#loader'), bar = $('#loaderBar');
  let pct = 0, done = false, sceneReady = false, pageReady = document.readyState === 'complete';
  const finish = () => {
    if (done) return;
    done = true;
    bar.style.transform = 'scaleX(1)';
    setTimeout(() => {
      loader.classList.add('is-done');
      document.body.classList.remove('is-loading');
      document.body.classList.add('is-ready');
      $$('.hero .reveal').forEach((el) => el.classList.add('is-in'));
    }, 350);
  };
  const tick = setInterval(() => {
    pct = Math.min(pct + 0.04 + Math.random() * 0.08, 0.9);
    if (!done) bar.style.transform = `scaleX(${pct})`;
    if (sceneReady && pageReady) { clearInterval(tick); finish(); }
  }, 120);
  addEventListener('load', () => { pageReady = true; });
  addEventListener('scene-ready', () => {
    sceneReady = true;
  });
  setTimeout(() => {
    clearInterval(tick);
    if (!sceneReady) document.documentElement.classList.add('no-webgl');
    finish();
  }, 6000);

  /* ---- nav ---- */
  const nav = $('#nav'), burger = $('#burger'), links = $$('#navLinks a');
  const setMenu = (open) => {
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  links.forEach((a) => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  const progress = $('#progress');
  const onScroll = () => {
    const y = scrollY;
    nav.classList.toggle('is-stuck', y > 30);
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  links.forEach((a) => { const t = $(a.getAttribute('href')); if (t) spy.observe(t); });

  /* ---- reveal on scroll ---- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal').forEach((el) => { if (!el.closest('.hero')) io.observe(el); });

  /* ---- counters ---- */
  const cio = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      cio.unobserve(e.target);
      const end = +e.target.dataset.count;
      if (reduce) { e.target.textContent = end; return; }
      const t0 = performance.now(), dur = 1800;
      const step = (t) => {
        const k = clamp((t - t0) / dur, 0, 1);
        e.target.textContent = Math.round(end * (1 - Math.pow(1 - k, 4)));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach((el) => cio.observe(el));

  /* ---- 3D tilt cards ---- */
  if (fine && !reduce) {
    $$('.tilt').forEach((el) => {
      const max = el.classList.contains('event') ? 7 : 11;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        el.classList.add('is-tilting');
        el.style.setProperty('--ry', ((px - 0.5) * 2 * max).toFixed(2) + 'deg');
        el.style.setProperty('--rx', ((0.5 - py) * 2 * max).toFixed(2) + 'deg');
        el.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
        el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      });
      el.addEventListener('pointerleave', () => {
        el.classList.remove('is-tilting');
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
      });
    });

    /* magnetic buttons */
    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${(x * 0.22).toFixed(1)}px,${(y * 0.32).toFixed(1)}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });

    /* portrait parallax */
    const portrait = $('#portrait');
    if (portrait) {
      const img = $('.portrait-img', portrait);
      portrait.addEventListener('pointermove', (e) => {
        const r = portrait.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        img.style.transform = `rotateY(${x * 14}deg) rotateX(${-y * 14}deg)`;
        img.style.transition = 'transform .1s linear';
      });
      portrait.addEventListener('pointerleave', () => {
        img.style.transition = 'transform .7s cubic-bezier(.2,.75,.2,1)';
        img.style.transform = '';
      });
    }

    /* cursor */
    const cur = $('.cursor'), dot = $('.cursor-dot'), ringEl = $('.cursor-ring');
    let cx = innerWidth / 2, cy = innerHeight / 2, rx = cx, ry = cy, shown = false;
    addEventListener('pointermove', (e) => { cx = e.clientX; cy = e.clientY; shown = true; }, { passive: true });
    addEventListener('pointerdown', () => cur.classList.add('is-down'));
    addEventListener('pointerup', () => cur.classList.remove('is-down'));
    document.addEventListener('pointerover', (e) => {
      cur.classList.toggle('is-hover', !!e.target.closest('a,button,.ring-stage,input,select,textarea'));
    });
    const loop = () => {
      rx += (cx - rx) * 0.18; ry += (cy - ry) * 0.18;
      cur.style.opacity = shown ? 1 : 0;
      dot.style.transform = `translate3d(${cx}px,${cy}px,0)`;
      ringEl.style.transform = `translate3d(${rx}px,${ry}px,0)`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /* ---- 3D ring carousel ---- */
  const stage = $('#ringStage'), ring = $('#ring');
  if (stage && ring) {
    const panels = $$('.panel', ring), n = panels.length, stepDeg = 360 / n;
    let radius = 0, angle = 0, target = 0, dragging = false, lastX = 0, vel = 0, visible = false, hover = false, raf = 0, lastT = 0;
    const layout = () => {
      const w = ring.offsetWidth;
      radius = Math.round(w / 2 / Math.tan(Math.PI / n) + w * 0.16);
      panels.forEach((p, i) => { p.style.transform = `rotateY(${i * stepDeg}deg) translateZ(${radius}px)`; });
      render();
    };
    const render = () => {
      ring.style.transform = `translateZ(${-radius}px) rotateY(${angle.toFixed(3)}deg)`;
      panels.forEach((p, i) => {
        const a = (((i * stepDeg + angle) % 360) + 540) % 360 - 180;
        const c = Math.cos((a * Math.PI) / 180);
        p.style.opacity = c <= 0 ? 0 : (0.25 + 0.75 * c * c).toFixed(3);
      });
    };
    const frame = (t) => {
      const dt = Math.min(50, t - (lastT || t)); lastT = t;
      if (!dragging) {
        if (Math.abs(vel) > 0.01) { target += vel; vel *= 0.94; }
        else if (!hover && !reduce) target -= dt * 0.006;
      }
      angle += (target - angle) * Math.min(1, dt * 0.008);
      render();
      raf = visible ? requestAnimationFrame(frame) : 0;
    };
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) { lastT = 0; raf = requestAnimationFrame(frame); }
    }, { rootMargin: '100px' }).observe(stage);

    stage.addEventListener('pointerdown', (e) => {
      dragging = true; lastX = e.clientX; vel = 0;
      stage.classList.add('is-drag');
      stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX; lastX = e.clientX;
      const d = dx * (innerWidth < 860 ? 0.34 : 0.2);
      target += d; vel = d;
    });
    const end = () => { dragging = false; stage.classList.remove('is-drag'); };
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', end);
    stage.addEventListener('pointerenter', () => { hover = true; });
    stage.addEventListener('pointerleave', () => { hover = false; });
    const snap = (dir) => { vel = 0; target = Math.round(target / stepDeg) * stepDeg + dir * stepDeg; };
    $('#ringPrev').addEventListener('click', () => snap(1));
    $('#ringNext').addEventListener('click', () => snap(-1));
    stage.tabIndex = 0;
    stage.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') snap(1);
      if (e.key === 'ArrowRight') snap(-1);
    });
    addEventListener('resize', layout);
    layout();
  }

  /* ---- testimonials ---- */
  const quotes = $$('#quotes .quote'), dotsBox = $('#quoteDots');
  if (quotes.length && dotsBox) {
    let idx = 0, timer = 0;
    const show = (i) => {
      idx = (i + quotes.length) % quotes.length;
      quotes.forEach((q, k) => q.classList.toggle('is-active', k === idx));
      $$('button', dotsBox).forEach((b, k) => b.classList.toggle('is-active', k === idx));
    };
    const play = () => { clearInterval(timer); if (!reduce) timer = setInterval(() => show(idx + 1), 6000); };
    quotes.forEach((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', `Show testimonial ${i + 1}`);
      b.addEventListener('click', () => { show(i); play(); });
      dotsBox.appendChild(b);
    });
    show(0); play();
  }

  /* ---- booking form (front-end only; connect to your backend or form service) ---- */
  const form = $('#bookForm'), note = $('#formNote');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let ok = true;
      $$('[required]', form).forEach((f) => {
        const bad = !f.value.trim();
        f.classList.toggle('is-bad', bad);
        if (bad && ok) { f.focus(); ok = false; }
      });
      note.classList.toggle('is-bad', !ok);
      if (!ok) { note.textContent = 'Please fill in the highlighted fields.'; return; }
      note.textContent = `Thank you, ${$('#f-name').value.trim().split(' ')[0]} — we will be in touch shortly.`;
      form.reset();
    });
    form.addEventListener('input', (e) => e.target.classList.remove('is-bad'));
  }
})();
