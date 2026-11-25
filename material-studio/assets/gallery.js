import { React, createRoot, flushSync, useEffect, useRef, useState, animate } from './gallery-runtime.js';

const h = React.createElement;
const studio = document.querySelector('#materialStudio');
const homeRoot = document.querySelector('#materialHome');
const homeButton = document.querySelector('#materialHomeButton');
const stage = studio.querySelector('.stage');
const interactions = {
  sushi: 'Press and stretch the salmon. Pull apart individual rice grains.',
  orange: 'Squeeze to release juice, tilt to move the droplets, or cut the slice.',
  bear: 'Press or drag the gummy bear to stretch and deform it.',
  pudding: 'Press, then release to make the jelly wobble.',
  burger: 'Heat the griddle to sear the patty. Press it to release juices.',
  cloud: 'Rotate the cloud or sweep through it to disperse the vapour.'
};
const materials = [...studio.querySelectorAll('[data-subject]')].map(button => ({
  id: button.dataset.subject,
  title: window.materialStudio.title(button.dataset.subject) || [button.textContent],
  description: interactions[button.dataset.subject],
  preview: './assets/previews/' + button.dataset.subject + '.webp',
  category: 'materials',
  button
}));
// Linked experiments stay dormant: only their static preview is loaded by Home.
const projects = [
  { id: 'offroad', title: ['Water', 'Trails'], category: 'worlds', description: 'Drive the off-roader and explore the tropical diorama.', href: 'https://water-trails-diorama-jamez.jamez-ichat.chatgpt.site' },
  { id: 'basket', title: ['Venice', 'Court'], category: 'worlds', description: 'Explore the court, choose your position and take a shot.', href: '../venice-beach-court/' },
  { id: 'villa', title: ['The', 'Villa'], category: 'worlds', description: 'Explore the property, walk through its spaces and shape the architecture.', href: '../appartamento-3d/' },
  { id: 'aurelia', title: ['Aurelia', 'Bay'], category: 'worlds', description: 'Explore the waterfront city and discover its miniature world.', href: '../aurelia-bay/' },
  { id: 'fold', title: ['Fold', '3D'], category: 'product', description: 'Fold, rotate and explore the device’s internal components.', href: '../fold-3d-study-03/' }
].map(project => ({ ...project, preview: './assets/previews/' + project.id + '.webp' }));
const experiments = [...materials, ...projects];
const categories = [['all', 'All experiments'], ['materials', 'Materials'], ['worlds', 'Worlds & Dioramas'], ['product', 'Product Design']];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const ease = [.3, .72, .12, 1];
const duration = .82;

function MaterialCard({ material, featured, onActivate }) {
  const descriptionId = 'material-description-' + material.id;
  return h(material.href ? 'a' : 'button', {
    className: 'material-card', type: material.href ? undefined : 'button',
    href: material.href, target: material.href ? '_blank' : undefined,
    rel: material.href ? 'noopener noreferrer' : undefined, draggable: false,
    'aria-label': material.title.join(' ') + (featured && material.href ? ' — opens in a new tab' : ''),
    'aria-current': featured ? 'true' : undefined,
    'aria-describedby': descriptionId,
    'data-card': material.id, 'data-featured': featured ? '' : undefined,
    onClick: event => onActivate(event, material)
  },
    h('span', { className: 'material-card-art', 'aria-hidden': 'true' },
      h('img', { src: material.preview, alt: '', draggable: false })),
    h('span', { className: 'material-card-back', 'aria-hidden': 'true' },
      h('img', { src: material.preview, alt: '', draggable: false })),
    h('span', { className: 'material-card-title', 'aria-hidden': 'true' },
      material.title[0], material.title[1] && ' ', material.title[1] && h('em', null, material.title[1])),
    h('span', { className: 'material-card-description', id: descriptionId }, material.description)
  );
}

function motionTransform(from, to) {
  return 'translate3d(' + (to.left - from.left) + 'px,' + (to.top - from.top) + 'px,0) scale(' +
    to.width / from.width + ',' + to.height / from.height + ')';
}

function fly(layer, origin, destination, image, selected, opening, index, liveImage) {
  const card = document.createElement('div');
  card.className = 'material-flight-card';
  Object.assign(card.style, {
    left: origin.box.left + 'px', top: origin.box.top + 'px',
    width: origin.box.width + 'px', height: origin.box.height + 'px',
    zIndex: selected ? String(materials.length + 2) : String(origin.order)
  });
  const art = document.createElement('div');
  art.className = 'material-flight-art';
  const preview = new Image();
  preview.src = image;
  art.append(preview);
  if (liveImage) {
    Object.assign(liveImage.style, { position: 'absolute', inset: '0', opacity: '1' });
    art.append(liveImage);
    animate(liveImage, { opacity: [1, 1, 0] }, { duration: .55, times: [0, .28, 1], ease });
  }
  card.append(art);
  layer.append(card);
  const small = motionTransform(origin.box, destination);
  const flat = 'perspective(950px) translate3d(0,0,0) rotateX(0deg) rotateY(0deg)';
  const transition = { duration: selected ? duration : duration * .86, delay: selected ? 0 : Math.min(.12, index * .018), ease };
  const fromTo = (a, b) => opening ? [a, b] : [b, a];
  // One compositor transform keeps scene morphs independent of layout and raster work.
  const geometry = { transform: fromTo('translate3d(0,0,0) scale(1,1)', small) };
  const move = animate(card, geometry, transition);
  animate(art, { transform: fromTo(origin.tilt, flat) }, transition);
  const opacity = selected ? [1, 1, 0] : [1, .94, 0];
  if (opening) animate(card, { opacity }, { ...transition, times: [0, selected ? .70 : .45, 1] });
  else if (!selected) animate(card, { opacity: [0, .94, 1] }, { ...transition, times: [0, .32, 1] });
  return move;
}

function measureCard(gallery, material) {
  const art = gallery.querySelector('[data-card="' + material.id + '"] .material-card-art');
  return art ? { box: art.getBoundingClientRect(), tilt: 'none' } : null;
}

function Gallery() {
  const container = useRef(null);
  const rail = useRef(null);
  const busy = useRef(false);
  const motion = useRef({ angle: -38, target: -38, frame: 0, time: 0 });
  const gesture = useRef(null);
  const dragged = useRef(false);
  const [phase, setPhase] = useState('home');
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState(null);
  const items = experiments.filter(item => category === 'all' || item.category === category);

  function paintRotation() {
    const track = rail.current?.firstElementChild;
    if (!track) return;
    const pages = track.children;
    for (let i = 0; i < pages.length; i++) {
      const angle = motion.current.angle + i * 360 / pages.length;
      const radians = angle * Math.PI / 180;
      const light = .23 + .51 * Math.abs(Math.cos(radians + .62));
      pages[i].style.setProperty('--face-angle', angle + 'deg');
      pages[i].style.setProperty('--face-shadow', (1 - light).toFixed(3));
      // Positive sine places the center of this radial panel behind the pivot.
      const distance = Math.max(0, (Math.sin(radians) - .12) / .88);
      pages[i].style.setProperty('--depth-blur', (distance ** 1.5).toFixed(3));
    }
  }

  function stopRotation() {
    const state = motion.current;
    cancelAnimationFrame(state.frame);
    state.frame = 0;
    state.time = 0;
    state.target = state.angle;
  }

  function tick(time) {
    const state = motion.current;
    const elapsed = state.time ? Math.min(48, time - state.time) : 16;
    state.time = time;
    const delta = state.target - state.angle;
    const finished = reducedMotion.matches || Math.abs(delta) < .12;
    state.angle = finished ? state.target : state.angle + delta * (1 - Math.exp(-elapsed / 85));
    paintRotation();
    state.frame = finished ? 0 : requestAnimationFrame(tick);
    if (finished) state.time = 0;
  }

  function rotateBy(degrees) {
    const state = motion.current;
    state.target = state.angle + Math.max(-180, Math.min(180, state.target - state.angle + degrees));
    if (!state.frame) state.frame = requestAnimationFrame(tick);
  }

  function changeCategory(next) {
    if (next === category) return;
    stopRotation();
    motion.current.angle = motion.current.target = -38;
    setSelected(null);
    setCategory(next);
  }

  function returnToOrbit() {
    if (selected) setSelected(null);
  }

  useEffect(() => {
    const element = rail.current;
    function wheel(event) {
      if (phase !== 'home' || (items.length < 2 && !selected) || event.ctrlKey) return;
      event.preventDefault();
      returnToOrbit();
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1;
      if (items.length > 1) rotateBy(Math.max(-72, Math.min(72, delta * unit * .24)));
    }
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [phase, category, selected]);

  React.useLayoutEffect(paintRotation, [category, phase]);
  useEffect(() => stopRotation, []);

  function startDrag(event) {
    if (event.button !== 0 || !event.isPrimary) return;
    dragged.current = false;
    gesture.current = { id: event.pointerId, startX: event.clientX, startY: event.clientY,
      x: event.clientX, time: event.timeStamp, speed: 0, active: false };
  }

  function moveDrag(event) {
    const drag = gesture.current;
    if (!drag || drag.id !== event.pointerId || (items.length < 2 && !selected)) return;
    const fromStart = event.clientX - drag.startX;
    if (!drag.active) {
      const vertical = Math.abs(event.clientY - drag.startY);
      if (Math.abs(fromStart) < 8 || Math.abs(fromStart) < vertical) return;
      drag.active = true;
      dragged.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      stopRotation();
      returnToOrbit();
    }
    const delta = (drag.x - event.clientX) * .43;
    drag.speed = .4 * drag.speed + .6 * delta / Math.max(8, event.timeStamp - drag.time);
    drag.x = event.clientX;
    drag.time = event.timeStamp;
    if (items.length > 1) rotateBy(delta);
  }

  function endDrag(event) {
    const drag = gesture.current;
    if (!drag || drag.id !== event.pointerId) return;
    gesture.current = null;
    if (event.type === 'pointerup' && drag.active && items.length > 1 &&
        event.timeStamp - drag.time < 90 && !reducedMotion.matches) {
      rotateBy(Math.max(-62, Math.min(62, drag.speed * 130)));
    }
  }

  function activate(event, material) {
    if (busy.current || (dragged.current && event.detail !== 0)) {
      event.preventDefault();
      return;
    }
    if (selected !== material.id) {
      event.preventDefault();
      stopRotation();
      const card = event.currentTarget;
      const from = getComputedStyle(card).transform;
      flushSync(() => setSelected(material.id));
      if (!reducedMotion.matches) {
        card.animate([{ transform: from }, { transform: getComputedStyle(card).transform }], {
          duration: 480, easing: 'cubic-bezier(.22,.72,.2,1)'
        });
      }
    } else if (!material.href) {
      for (const animation of event.currentTarget.getAnimations()) animation.finish();
      open(material);
    }
  }

  function studioFocus() {
    // Focus the selected scene's tab so keyboard navigation can continue in reading order.
    const selected = studio.querySelector('[data-subject][aria-pressed="true"]');
    (selected || homeButton).focus({ preventScroll: true });
  }

  function showStudio(material) {
    document.body.dataset.studioMode = 'studio';
    studio.inert = false;
    homeButton.setAttribute('aria-expanded', 'false');
    window.materialStudio.open(material.id);
  }

  async function open(material) {
    if (busy.current || phase !== 'home') return;
    busy.current = true;
    const gallery = container.current;
    const origin = measureCard(gallery, material);
    const layer = document.createElement('div');
    layer.className = 'material-flight';
    layer.setAttribute('aria-hidden', 'true');
    // Restore the studio's origin when reopening from a previous mobile scroll.
    window.scrollTo(0, 0);
    if (!reducedMotion.matches) studio.style.opacity = '0';

    try {
      showStudio(material);
      if (!reducedMotion.matches) {
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        window.materialStudio.pause();
        const target = stage.getBoundingClientRect();
        document.body.dataset.studioMode = 'transition';
        studio.inert = true;
        flushSync(() => setPhase('opening'));
        document.body.append(layer);
        const flight = origin && fly(layer, origin, target, material.preview, true, true, 0);
        animate(gallery.querySelectorAll('h1,p'), { opacity: [1, 0] }, { duration: .24, ease });
        animate(studio, { opacity: [0, 0, 1] }, { duration, times: [0, .51, 1], ease });
        await flight;
      }
    } finally {
      layer.remove();
      studio.style.opacity = '';
      document.body.dataset.studioMode = 'studio';
      studio.inert = false;
      flushSync(() => setPhase('studio'));
      window.materialStudio.resume();
      studioFocus();
      busy.current = false;
    }
  }

  async function close() {
    if (busy.current || phase !== 'studio') return;
    busy.current = true;
    const material = materials.find(item => item.button.getAttribute('aria-pressed') === 'true') || materials[0];
    flushSync(() => {
      if (!items.includes(material)) setCategory('materials');
      setSelected(material.id);
    });
    const layer = document.createElement('div');
    layer.className = 'material-flight';
    layer.setAttribute('aria-hidden', 'true');
    const gallery = container.current;
    try {
      if (!reducedMotion.matches) {
        const target = stage.getBoundingClientRect();
        const liveImage = await window.materialStudio.capture();
        window.materialStudio.pause();
        flushSync(() => setPhase('closing'));
        const origin = measureCard(gallery, material);
        document.body.dataset.studioMode = 'transition';
        studio.inert = true;
        document.body.append(layer);
        const flight = origin && fly(layer, origin, target, material.preview, true, false, 0, liveImage);
        animate(studio, { opacity: [1, 0] }, { duration: .25, ease });
        animate(gallery.querySelectorAll('h1,p'), { opacity: [0, 0, 1] }, { duration, times: [0, .38, 1], ease });
        await flight;
      }
    } finally {
      layer.remove();
      document.body.dataset.studioMode = 'home';
      studio.inert = true;
      homeButton.setAttribute('aria-expanded', 'true');
      window.materialStudio.suspend();
      flushSync(() => setPhase('home'));
      studio.style.opacity = '';
      requestAnimationFrame(() => (gallery.querySelector('[data-card="' + material.id + '"]') || gallery.querySelector('[data-card]'))?.focus({ preventScroll: true }));
      busy.current = false;
    }
  }

  useEffect(() => {
    homeButton.addEventListener('click', close);
    return () => homeButton.removeEventListener('click', close);
  }, [phase, category]);

  return h('section', {
    ref: container, className: 'material-home' + (phase === 'opening' || phase === 'closing' ? ' is-transitioning' : ''),
    'aria-labelledby': 'materialHomeTitle', hidden: phase === 'studio',
    inert: phase !== 'home'
  },
    h('div', { className: 'studio-home-header' },
      h('h1', { id: 'materialHomeTitle' }, 'Studio ', h('em', null, '3d')),
      h('span', { className: 'studio-signature' }, 'by Smartlabdesign'),
      h('div', { className: 'studio-categories', role: 'group', 'aria-label': 'Experiment categories' },
        categories.map(([id, label]) => h('button', { key: id, type: 'button', 'aria-pressed': category === id, onClick: () => changeCategory(id) }, label)))
    ),
    h('div', { className: 'studio-gallery' },
      h('div', { ref: rail, className: 'material-rail',
        onPointerDown: startDrag, onPointerMove: moveDrag, onPointerUp: endDrag,
        onPointerCancel: endDrag, onLostPointerCapture: endDrag,
        onClick: event => { if (event.target === rail.current && !dragged.current) returnToOrbit(); } },
        h('div', { className: 'material-track', 'data-previewing': selected ? '' : undefined,
          'data-single': items.length === 1 ? '' : undefined },
          items.map(material => h(MaterialCard, { key: material.id, material,
            featured: selected === material.id, onActivate: activate })))),
      items.length > 1 && h('div', { className: 'studio-rail-controls' },
        h('button', { type: 'button', 'aria-label': 'Rotate left', onClick: () => { returnToOrbit(); rotateBy(-360 / items.length); } }, '←'),
        h('button', { type: 'button', 'aria-label': 'Rotate right', onClick: () => { returnToOrbit(); rotateBy(360 / items.length); } }, '→'))),
    h('div', { className: 'studio-home-footer' },
      h('p', null, 'Choose an experiment. Explore its nature.',
        h('span', { className: 'studio-footer-divider', 'aria-hidden': 'true' }, ' · '),
        h('a', { href: 'https://smartlabdesign.it/', target: '_blank', rel: 'noopener noreferrer' }, 'Smartlabdesign')))
  );
}

createRoot(homeRoot).render(h(Gallery));

