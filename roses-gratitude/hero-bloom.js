(() => {
  const art = document.querySelector('.hero-bloom-art');
  if (!art) return;

  function bloom() {
    const illustration = new SVGScene(art, metrics);
    const stems = [
      ['M53 105 C34 87 57 60 44 24', 44, 24, 15, '#d9808b'],
      ['M182 112 C186 91 209 79 192 50', 192, 50, 11, '#c85b65'],
      ['M259 112 C272 86 295 64 278 30', 278, 30, 18, '#c96272']
    ];
    const previous = ctx;
    ctx = illustration;
    try {
      stems.forEach(([path, x, y, radius, color], i) => {
        const delay = i * 160;
        illustration.add('<path class="hero-bloom-stem" d="' + path + '" pathLength="1" style="--delay:' + delay + 'ms"/>');
        illustration.add('<g transform="translate(' + x + ' ' + y + ') scale(' + radius + ')">');
        for (let layer = 0; layer < 3; layer++) {
          illustration.add('<g class="hero-bloom-petals" style="--delay:' + (delay + 510 + layer * 85) + 'ms">');
          illustration.definitionPrefix = 'hero-rose-' + i + '-' + layer + '-';
          roseWhorl(layer, 739 + i * 291, color, false);
          illustration.add('</g>');
        }
        illustration.add('</g>');
      });
    } finally {
      ctx = previous;
    }
    art.innerHTML = illustration.content();
  }

  if (!('IntersectionObserver' in window)) {
    bloom();
    return;
  }
  const observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    observer.disconnect();
    bloom();
  }, {threshold: .4});
  observer.observe(art.parentElement);
})();
