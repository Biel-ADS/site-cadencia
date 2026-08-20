/* Biel Ads — comportamento: tema, Hi-Fi/Lo-Fi, menu, reveal, progresso */
(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;
  var svg = document.getElementById('diagram');

  function isSoftwareRenderer() {
    try {
      var c = document.createElement('canvas');
      var gl = c.getContext('webgl') || c.getContext('experimental-webgl');
      if (!gl) return true;
      var ext = gl.getExtension('WEBGL_debug_renderer_info');
      var soft = false;
      if (ext) {
        var r = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '').toLowerCase();
        soft = /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/.test(r);
      }
      var lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
      return soft;
    } catch (e) { return false; }
  }

  var NOTE = {
    hifi: 'Experiência completa: animações, grão e transições.',
    lofi: 'Movimento reduzido e efeitos pesados desligados, para rodar leve.'
  };
  var mtGroups = document.querySelectorAll('.motion');
  var mtOpts = document.querySelectorAll('.mt-opt');
  var mtNote = document.getElementById('motionNote');

  function applyMotion(mode, save) {
    var lo = mode === 'lofi';
    root.classList.toggle('lo-fi', lo);
    mtGroups.forEach(function (g) { g.classList.toggle('is-lofi', lo); });
    mtOpts.forEach(function (o) {
      var on = o.dataset.motion === mode;
      o.classList.toggle('active', on);
      o.setAttribute('aria-pressed', String(on));
    });
    if (mtNote) mtNote.textContent = NOTE[mode] || '';
    if (svg && svg.pauseAnimations) lo ? svg.pauseAnimations() : svg.unpauseAnimations();
    if (save) { try { localStorage.setItem('bielads-motion', mode); } catch (e) {} }
  }

  var savedMotion = null;
  try { savedMotion = localStorage.getItem('bielads-motion'); } catch (e) {}
  if (!savedMotion) {
    var weak = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
               (navigator.deviceMemory && navigator.deviceMemory <= 4);
    savedMotion = (weak || reduced || isSoftwareRenderer()) ? 'lofi' : 'hifi';
  }
  applyMotion(savedMotion, false);
  mtOpts.forEach(function (o) {
    o.addEventListener('click', function () { applyMotion(o.dataset.motion, true); });
  });

  function loFi() { return root.classList.contains('lo-fi'); }

  var themeBtn = document.getElementById('theme');
  var themeMob = document.getElementById('theme-mob');

  function isLight() { return root.getAttribute('data-theme') === 'light'; }

  function paintTheme() {
    var light = isLight();
    if (themeBtn) {
      themeBtn.setAttribute('aria-checked', String(light));
      themeBtn.setAttribute('aria-label', light ? 'Alternar para o tema escuro' : 'Alternar para o tema claro');
    }
    if (themeMob) themeMob.innerHTML = 'Tema: <b>' + (light ? 'claro' : 'escuro') + '</b>';
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', light ? '#EDEAF5' : '#000000');
  }

  function toggleTheme() {
    var light = !isLight();
    if (light) root.setAttribute('data-theme', 'light');
    else root.removeAttribute('data-theme');
    try { localStorage.setItem('bielads-theme', light ? 'light' : 'dark'); } catch (e) {}
    paintTheme();
  }

  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
  if (themeMob) themeMob.addEventListener('click', toggleTheme);
  paintTheme();

  var burger = document.getElementById('burger');
  var menu = document.getElementById('menu-mob');
  if (burger && menu) {
    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      burger.setAttribute('aria-label', open ? 'Abrir menu' : 'Fechar menu');
      menu.hidden = open;
    });
    menu.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        burger.setAttribute('aria-expanded', 'false');
        menu.hidden = true;
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) {
        burger.setAttribute('aria-expanded', 'false');
        menu.hidden = true;
        burger.focus();
      }
    });
  }

  var items = document.querySelectorAll('.reveal');
  if (loFi() || !('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry, i) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.style.transitionDelay = Math.min(i * 60, 240) + 'ms';
        el.classList.add('is-in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  }

  var bar = document.getElementById('progress');
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav a[href^="#"]'));
  var secs = links.map(function (a) { return document.querySelector(a.getAttribute('href')); });
  var ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      if (bar) bar.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + '%';

      var y = window.scrollY + window.innerHeight * 0.32;
      var active = -1;
      secs.forEach(function (s, i) { if (s && s.offsetTop <= y) active = i; });
      links.forEach(function (a, i) { a.classList.toggle('on', i === active); });

      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (svg) {
    setTimeout(function () { svg.classList.add('settled'); }, 2200);

    svg.querySelectorAll('.node').forEach(function (node, i) {
      var wire = svg.querySelector('#w' + (i + 1));
      if (!wire) return;
      node.addEventListener('mouseenter', function () { wire.classList.add('hot'); });
      node.addEventListener('mouseleave', function () { wire.classList.remove('hot'); });
    });

    if (svg.pauseAnimations) {
      document.addEventListener('visibilitychange', function () {
        if (document.hidden || loFi()) svg.pauseAnimations();
        else svg.unpauseAnimations();
      });
    }
  }
})();
