import { React, createRoot, flushSync, useEffect, useRef, useState, animate, springValue } from './gallery-runtime.js';

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
  title: button.textContent,
  description: interactions[button.dataset.subject],
  preview: './assets/previews/' + button.dataset.subject + '.webp',
  button
}));
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const ease = [.3, .72, .12, 1];
const duration = .82;

function MaterialCard({ material, stackOrder, onOpen }) {
  const art = useRef(null);
  const controls = useRef(null);
  const descriptionId = 'material-description-' + material.id;

  useEffect(() => {
    const options = { stiffness: 190, damping: 23, mass: .77 };
    const x = springValue(0, options);
    const y = springValue(0, options);
    const lift = springValue(0, options);
    const paint = () => {
      art.current.style.setProperty('--pointer-x', x.get());
      art.current.style.setProperty('--pointer-y', y.get());
      art.current.style.setProperty('--approach', lift.get());
    };
    const values = [x, y, lift];
    const subscriptions = values.map(value => value.on('change', paint));
    controls.current = { x, y, lift };
    return () => {
      subscriptions.forEach(unsubscribe => unsubscribe());
      values.forEach(value => value.destroy());
    };
  }, []);

  function move(event) {
    if (!controls.current || !finePointer.matches || reducedMotion.matches || event.pointerType === 'touch') return;
    const box = event.currentTarget.getBoundingClientRect();
    const { x, y, lift } = controls.current;
    x.set((event.clientX - box.left) / box.width * 2 - 1);
    y.set((event.clientY - box.top) / box.height * 2 - 1);
    lift.set(1);
  }

  function settle() {
    const springs = controls.current;
    if (springs) Object.values(springs).forEach(spring => spring.set(0));
  }

  return h('button', {
    className: 'material-card', type: 'button', 'aria-label': material.title,
    'aria-describedby': material.description ? descriptionId : undefined,
    'data-card': material.id, style: { '--stack-order': stackOrder },
    onPointerMove: move, onPointerLeave: settle, onClick: () => onOpen(material)
  },
    h('span', { className: 'material-card-art', ref: art, 'aria-hidden': 'true' },
      h('img', { src: material.preview, alt: '', draggable: false })),
    h('span', { className: 'material-card-title', 'aria-hidden': 'true' }, material.title),
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
  // Resize only the selected image frame so its crop opens without stretching the scene.
  const geometry = selected ? {
    transform: fromTo('translate3d(0,0,0)', 'translate3d(' + (destination.left - origin.box.left) +
      'px,' + (destination.top - origin.box.top) + 'px,0)'),
    width: fromTo(origin.box.width + 'px', destination.width + 'px'),
    height: fromTo(origin.box.height + 'px', destination.height + 'px')
  } : { transform: fromTo('translate3d(0,0,0) scale(1,1)', small) };
  const move = animate(card, geometry, transition);
  animate(art, { transform: fromTo(origin.tilt, flat), borderRadius: fromTo('17px', selected ? '10px' : '28px') }, transition);
  const opacity = selected ? [1, 1, 0] : [1, .94, 0];
  if (opening) animate(card, { opacity }, { ...transition, times: [0, selected ? .70 : .45, 1] });
  else if (!selected) animate(card, { opacity: [0, .94, 1] }, { ...transition, times: [0, .32, 1] });
  return move;
}

function measureCards(gallery) {
  const rail = gallery.querySelector('.material-rail').getBoundingClientRect();
  return new Map([...gallery.querySelectorAll('[data-card]')].map(card => {
    const box = card.getBoundingClientRect();
    const visible = box.right > rail.left && box.left < rail.right;
    return [card.dataset.card, { box, visible, order: getComputedStyle(card).zIndex, tilt: getComputedStyle(card.firstElementChild).transform }];
  }));
}

function Gallery() {
  const container = useRef(null);
  const busy = useRef(false);
  const [phase, setPhase] = useState('home');

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
    const layer = document.createElement('div');
    layer.className = 'material-flight';
    layer.setAttribute('aria-hidden', 'true');
    // Restore the studio's origin when reopening from a previous mobile scroll.
    window.scrollTo(0, 0);
    if (!reducedMotion.matches) studio.style.opacity = '0';

    try {
      showStudio(material);
      if (!reducedMotion.matches) {
        const targets = new Map(materials.map(item => [item.id, (item === material ? stage : item.button).getBoundingClientRect()]));
        document.body.dataset.studioMode = 'transition';
        studio.inert = true;
        flushSync(() => setPhase('opening'));
        document.body.append(layer);
        const flights = materials.flatMap((item, index) => {
          const origin = origins.get(item.id);
          if (!origin.visible && item !== material) return [];
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
          if (!origin.visible && item !== material) return [];
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
    h('h1', { id: 'materialHomeTitle' }, 'Material Studio ', h('em', null, '3D')),
    h('div', { className: 'material-rail' }, h('div', { className: 'material-track' },
      materials.map((material, index) => h(MaterialCard, { key: material.id, material, stackOrder: materials.length - index, onOpen: open }))
    )),
    h('p', null, 'Choose a material. Explore its nature.')
  );
}

createRoot(homeRoot).render(h(Gallery));
