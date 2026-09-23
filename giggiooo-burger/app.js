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
  const mobileVideo = window.matchMedia('(max-width: 700px)');
  const sceneLabels = ['LA FIRMA', 'GLI INGREDIENTI', 'L’ESPERIENZA'];
  let scheduled = false;
  let currentScene = -1;
  let currentTarget = 0;
  let ready = video.readyState >= HTMLMediaElement.HAVE_METADATA;

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

  function update() {
    scheduled = false;
    header.classList.toggle('is-scrolled', window.scrollY > 60);
    if (reducedMotion.matches) { setScene(0); return; }
    const rect = story.getBoundingClientRect();
    const travel = Math.max(1, story.offsetHeight - window.innerHeight);
    const p = Math.min(1, Math.max(0, -rect.top / travel));
    progressBar.style.transform = `scaleX(${p})`;
    setScene(p < .31 ? 0 : p < .69 ? 1 : 2);
    const duration = Number.isFinite(video.duration) ? video.duration : 10;
    currentTarget = Math.max(.01, Math.min(duration - .055, p * (duration - .055)));
    if (!mobileVideo.matches && ready && Math.abs(video.currentTime - currentTarget) > .032) {
      try { video.currentTime = currentTarget; } catch (_) {}
    }
  }
  function schedule() { if (!scheduled) { scheduled = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('pageshow', schedule);
  video.addEventListener('loadedmetadata', () => { ready = true; schedule(); });
  video.addEventListener('loadeddata', () => { ready = true; schedule(); });
  video.addEventListener('canplay', () => { ready = true; schedule(); });
  video.addEventListener('seeked', () => {
    if (Math.abs(video.currentTime - currentTarget) > .08) schedule();
  });
  function syncPlayback() {
    if (reducedMotion.matches || !mobileVideo.matches) {
      video.pause();
    } else {
      const playback = video.play();
      if (playback) playback.catch(() => {});
    }
    schedule();
  }
  mobileVideo.addEventListener('change', syncPlayback);
  reducedMotion.addEventListener('change', syncPlayback);
  syncPlayback();
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
