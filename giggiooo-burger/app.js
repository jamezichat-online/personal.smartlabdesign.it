(() => {
  const story = document.querySelector('.scroll-story');
  const stage = document.querySelector('.hero-stage');
  const video = document.querySelector('#hero-video');
  const chapters = [...document.querySelectorAll('.hero-chapter')];
  const eyebrow = document.querySelector('.hero-eyebrow');
  const counter = document.querySelector('.hero-bottom > span:first-child');
  const progressBar = document.querySelector('.hero-progress-fill');
  const header = document.querySelector('.site-header');
  const menuButton = document.querySelector('.menu-toggle');
  const mobileMenu = document.querySelector('.mobile-menu');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const sceneLabels = ['LA FIRMA', 'GLI INGREDIENTI', 'L’ESPERIENZA'];
  let frame = 0;
  let needsMeasure = true;
  let currentScene = -1;
  let targetProgress = 0;
  let renderedProgress = 0;
  let currentTarget = 0;
  let ready = false;
  let primed = false;

  document.querySelector('#year').textContent = String(new Date().getFullYear());

  function setScene(scene) {
    if (scene === currentScene) return;
    currentScene = scene;
    stage.dataset.scene = String(scene);
    chapters.forEach((el, index) => {
      const active = index === scene;
      el.classList.toggle('is-active', active);
      el.setAttribute('aria-hidden', String(!active));
      const link = el.querySelector('a');
      if (link) link.tabIndex = active ? 0 : -1;
    });
    eyebrow.innerHTML = `GIGGIOOO BURGER <i></i> 0${scene + 1} / 03`;
    counter.innerHTML = `0${scene + 1}&nbsp;—&nbsp;03 <span class="hero-counter-label">${sceneLabels[scene]}</span>`;
  }

  function measure() {
    header.classList.toggle('is-scrolled', window.scrollY > 60);
    if (reducedMotion.matches) { setScene(0); return; }
    const rect = story.getBoundingClientRect();
    const travel = Math.max(1, story.offsetHeight - window.innerHeight);
    const p = Math.min(1, Math.max(0, -rect.top / travel));
    targetProgress = p;
    progressBar.style.transform = `scaleX(${p})`;
    setScene(p < .31 ? 0 : p < .69 ? 1 : 2);
  }
  function render() {
    frame = 0;
    if (needsMeasure) { measure(); needsMeasure = false; }
    if (!ready || reducedMotion.matches) return;

    renderedProgress += (targetProgress - renderedProgress) * .16;
    const duration = Number.isFinite(video.duration) ? video.duration : 10;
    currentTarget = Math.max(.001, Math.min(duration - .04, renderedProgress * (duration - .04)));
    if (Math.abs(video.currentTime - currentTarget) > .012) {
      try { video.currentTime = currentTarget; } catch (_) {}
    }
    if (Math.abs(targetProgress - renderedProgress) > .00035) {
      frame = requestAnimationFrame(render);
    }
  }
  function schedule() {
    needsMeasure = true;
    if (!frame) frame = requestAnimationFrame(render);
  }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('pageshow', () => { video.pause(); schedule(); });
  function activateVideo() {
    if (ready) return;
    video.pause();
    try { video.currentTime = .001; } catch (_) {}
    ready = true;
    schedule();
  }
  video.addEventListener('loadedmetadata', activateVideo, { once: true });
  video.addEventListener('loadeddata', schedule);
  video.addEventListener('seeked', () => {
    if (Math.abs(video.currentTime - currentTarget) > .08) schedule();
  });
  function primeVideo() {
    if (primed || window.innerWidth > 700 || reducedMotion.matches) return;
    const playback = video.play();
    if (playback) playback.then(() => {
      video.pause();
      primed = true;
      schedule();
    }).catch(() => {});
  }
  window.addEventListener('pointerdown', primeVideo, { passive: true });
  window.addEventListener('touchstart', primeVideo, { passive: true });
  window.addEventListener('pagehide', () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  });
  video.pause();
  if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
    activateVideo();
  } else {
    video.load();
  }
  schedule();

  function closeMenu() {
    document.body.classList.remove('menu-open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Apri il menu');
    mobileMenu.inert = true;
  }
  menuButton.addEventListener('click', () => {
    const open = !document.body.classList.contains('menu-open');
    document.body.classList.toggle('menu-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Chiudi il menu' : 'Apri il menu');
    mobileMenu.inert = !open;
  });
  mobileMenu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
})();
