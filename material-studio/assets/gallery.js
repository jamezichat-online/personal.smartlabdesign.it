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
const hoverAvailable = matchMedia('(hover: hover) and (pointer: fine)');
const ease = [.3, .72, .12, 1];
const duration = .82;

function MaterialCard({ material, stackOrder, featured, offset, hasNext, onFocus, onOpen }) {
  const descriptionId = 'material-description-' + material.id;

  return h(material.href ? 'a' : 'button', {
    className: 'material-card', type: material.href ? undefined : 'button',
    href: material.href, target: material.href ? '_blank' : undefined,
    draggable: false,
    rel: material.href ? 'noopener noreferrer' : undefined,
    'aria-label': material.title.join(' ') + (material.href ? ' — opens in a new tab' : ''),
    'aria-describedby': material.description ? descriptionId : undefined,
    'data-card': material.id, 'data-featured': featured ? '' : undefined,
    style: { '--stack-order': stackOrder, '--neighbor-offset': offset, '--overlap-shadow': !featured && hasNext ? 1 : 0 },
    onFocus: event => {
      if (event.currentTarget.matches(':focus-visible')) onFocus(stackOrder);
    },
    onBlur: () => onFocus(current => current === stackOrder ? null : current),
    onClick: material.href ? undefined : () => onOpen(material)
  },
    h('span', { className: 'material-card-art', 'aria-hidden': 'true' },
      h('img', { src: material.preview, alt: '', draggable: false })),
    h('span', { className: 'material-card-title', 'aria-hidden': 'true' },
      material.title[0], material.title[1] && ' ', material.title[1] && h('em', null, material.title[1])),
    material.description && h('span', { className: 'material-card-description', id: descriptionId }, material.description)
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

function measureCards(gallery) {
  const rail = gallery.querySelector('.material-rail').getBoundingClientRect();
  return new Map([...gallery.querySelectorAll('[data-card]')].map(card => {
    const slot = card.getBoundingClientRect();
    const art = card.firstElementChild;
    const width = parseFloat(getComputedStyle(art).width);
    const box = { left: slot.left + (slot.width - width) / 2, top: slot.top, width, height: slot.height };
    const visible = slot.right > rail.left && slot.left < rail.right;
    const style = getComputedStyle(art);
    const shift = style.translate === 'none' ? 0 : parseFloat(style.translate) || 0;
    box.left += shift;
    return [card.dataset.card, { box, visible, order: getComputedStyle(card).zIndex, tilt: style.transform }];
  }));
}

function Gallery() {
  const container = useRef(null);
  const busy = useRef(false);
  const [phase, setPhase] = useState('home');
  const [category, setCategory] = useState('all');
  const visibleItems = experiments.filter(item => category === 'all' || item.category === category);
  const [hovered, setHovered] = useState(null);
  const [focused, setFocused] = useState(null);
  const featured = hovered ?? focused;
  const hoverTimer = useRef(null);
  const pendingHover = useRef(null);
  const hoveredRef = useRef(null);

  function queueHover(next) {
    if (pendingHover.current === next) return;
    pendingHover.current = next;
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      hoveredRef.current = next;
      setHovered(next);
    }, next === null ? 90 : hoveredRef.current === null ? 25 : 65);
  }

  function followPointer(event) {
    if (phase !== 'home' || event.pointerType === 'touch' || !hoverAvailable.matches) return;
    if (focused !== null) setFocused(null);
    const cards = [...event.currentTarget.querySelectorAll('[data-card]')];
    let closest = null, distance = Infinity;
    cards.forEach((card, index) => {
      const box = card.getBoundingClientRect();
      if (event.clientY < box.top || event.clientY > box.bottom) return;
      const delta = Math.abs(event.clientX - box.left - box.width / 2);
      if (delta < distance && delta < box.width * .65) {
        closest = index + 1;
        distance = delta;
      }
    });
    // Keep fixed slots for smooth lateral selection, but include the visible
    // faces above and below that row. Their transformed surface is clickable.
    if (closest === null) {
      const current = hoveredRef.current ?? focused;
      const order = cards.map((_, index) => index + 1).reverse();
      if (current !== null) order.unshift(current);
      for (const index of order) {
        const face = cards[index - 1]?.firstElementChild.getBoundingClientRect();
        if (face && event.clientX >= face.left && event.clientX <= face.right &&
            event.clientY >= face.top && event.clientY <= face.bottom) {
          closest = index;
          break;
        }
      }
    }
    queueHover(closest);
  }

  function resetHover() {
    clearTimeout(hoverTimer.current);
    pendingHover.current = null;
    hoveredRef.current = null;
    setHovered(null);
  }

  function changeCategory(next) {
    resetHover();
    setFocused(null);
    setCategory(next);
    container.current.querySelector('.material-rail').scrollLeft = 0;
  }

  function scrollRail(direction) {
    resetHover();
    const rail = container.current.querySelector('.material-rail');
    rail.scrollBy({ left: direction * rail.clientWidth * .65, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  }

  useEffect(() => () => clearTimeout(hoverTimer.current), []);
  const shiftByDistance = [.235, .142, .078, .04];

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
    const origins = measureCards(gallery);
    resetHover();
    setFocused(null);
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
        const targets = new Map(materials.map(item => [item.id, (item === material ? stage : item.button).getBoundingClientRect()]));
        document.body.dataset.studioMode = 'transition';
        studio.inert = true;
        flushSync(() => setPhase('opening'));
        document.body.append(layer);
        const flights = materials.flatMap((item, index) => {
          const origin = origins.get(item.id);
          if (!origin || (!origin.visible && item !== material)) return [];
          return [fly(layer, origin, targets.get(item.id), item.preview, item === material, true, index)];
        });
        animate(gallery.querySelectorAll('h1,p'), { opacity: [1, 0] }, { duration: .24, ease });
        animate(studio, { opacity: [0, 0, 1] }, { duration, times: [0, .51, 1], ease });
        await Promise.all(flights);
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
    const layer = document.createElement('div');
    layer.className = 'material-flight';
    layer.setAttribute('aria-hidden', 'true');
    const gallery = container.current;
    try {
      if (!reducedMotion.matches) {
        const targets = new Map(materials.map(item => [item.id, (item === material ? stage : item.button).getBoundingClientRect()]));
        const liveImage = await window.materialStudio.capture();
        window.materialStudio.pause();
        flushSync(() => setPhase('closing'));
        const rail = gallery.querySelector('.material-rail');
        const activeCard = gallery.querySelector('[data-card="' + material.id + '"]');
        const railBox = rail.getBoundingClientRect();
        const cardBox = activeCard.getBoundingClientRect();
        if (cardBox.left < railBox.left || cardBox.right > railBox.right) {
          rail.scrollLeft += cardBox.left + cardBox.width / 2 - railBox.left - railBox.width / 2;
        }
        const origins = measureCards(gallery);
        document.body.dataset.studioMode = 'transition';
        studio.inert = true;
        document.body.append(layer);
        const flights = materials.flatMap((item, index) => {
          const origin = origins.get(item.id);
          if (!origin || (!origin.visible && item !== material)) return [];
          return [fly(layer, origin, targets.get(item.id), item.preview, item === material, false, index, item === material ? liveImage : null)];
        });
        animate(studio, { opacity: [1, 0] }, { duration: .25, ease });
        animate(gallery.querySelectorAll('h1,p'), { opacity: [0, 0, 1] }, { duration, times: [0, .38, 1], ease });
        await Promise.all(flights);
      }
    } finally {
      layer.remove();
      document.body.dataset.studioMode = 'home';
      studio.inert = true;
      homeButton.setAttribute('aria-expanded', 'true');
      window.materialStudio.suspend();
      flushSync(() => setPhase('home'));
      studio.style.opacity = '';
      requestAnimationFrame(() => gallery.querySelector('[data-card="' + material.id + '"]').focus({ preventScroll: true }));
      busy.current = false;
    }
  }

  useEffect(() => {
    homeButton.addEventListener('click', close);
    return () => homeButton.removeEventListener('click', close);
  }, [phase]);

  return h('section', {
    ref: container, className: 'material-home' + (phase === 'opening' || phase === 'closing' ? ' is-transitioning' : ''),
    'aria-labelledby': 'materialHomeTitle', hidden: phase === 'studio',
    inert: phase !== 'home'
  },
    h('div', { className: 'studio-home-header' },
      h('h1', { id: 'materialHomeTitle' }, 'Studio ', h('em', null, '3d')),
      h('span', { className: 'studio-signature' }, 'by Smartlabdesign')
    ),
    h('div', { className: 'material-rail', onPointerMove: followPointer, onPointerLeave: () => queueHover(null), onPointerCancel: resetHover, onScroll: resetHover }, h('div', {
      className: 'material-track', 'data-previewing': featured === null ? undefined : ''
    }, visibleItems.map((material, index) => {
      const stackOrder = index + 1;
      const distance = featured === null ? 0 : stackOrder - featured;
      const offset = Math.sign(distance) * (shiftByDistance[Math.abs(distance) - 1] ?? 0);
      return h(MaterialCard, {
        key: material.id, material, stackOrder, featured: featured === stackOrder,
        offset, hasNext: index < visibleItems.length - 1, onFocus: setFocused, onOpen: open
      });
    }))),
    h('div', { className: 'studio-home-footer' },
      h('div', { className: 'studio-categories', role: 'group', 'aria-label': 'Experiment categories' },
        categories.map(([id, label]) => h('button', { key: id, type: 'button', 'aria-pressed': category === id, onClick: () => changeCategory(id) }, label))),
      h('div', { className: 'studio-rail-controls' },
        visibleItems.length > 1 && h('button', { type: 'button', 'aria-label': 'Previous experiments', onClick: () => scrollRail(-1) }, '←'),
        h('span', { role: 'status', 'aria-live': 'polite' }, visibleItems.length === 1 ? '1 experiment' : visibleItems.length + ' experiments · scroll to explore'),
        visibleItems.length > 1 && h('button', { type: 'button', 'aria-label': 'Next experiments', onClick: () => scrollRail(1) }, '→')),
      h('p', null, 'Choose an experiment. Explore its nature.'))
  );
}

createRoot(homeRoot).render(h(Gallery));

