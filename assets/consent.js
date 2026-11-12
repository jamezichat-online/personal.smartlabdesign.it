/* Measurement consent: loads the Metricool tag only after an explicit "Accept". */
(function () {
  var KEY = 'sl-consent';
  var TAG_SRC = 'https://tracker.metricool.com/resources/be.js';
  var HASH = 'b84a520cb96ae09df9e3c3e6da90a870';

  function read() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function save(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* storage blocked: banner returns next page */ } }

  function loadTracker() {
    var s = document.createElement('script');
    s.src = TAG_SRC;
    s.async = true;
    s.onload = function () {
      try { window.beTracker.t({ hash: HASH }); } catch (e) { /* tag unavailable */ }
    };
    document.head.appendChild(s);
  }

  var state = read();
  if (state === 'accepted') { loadTracker(); return; }
  if (state === 'declined') { return; }

  var css = [
    '#sl-consent{position:fixed;right:24px;bottom:24px;z-index:9999;max-width:420px;box-sizing:border-box;',
    'background:#062d31;color:#fff0ce;border:2px solid rgba(255,240,206,.42);border-radius:6px 44px 6px 44px;',
    'box-shadow:8px 8px 0 #ff2d87;padding:20px 22px;font-family:"Barlow Condensed","Arial Narrow",sans-serif;font-size:18px;line-height:1.4}',
    '#sl-consent h2{margin:0 0 6px;font-weight:800;text-transform:uppercase;font-size:24px;letter-spacing:.02em;line-height:1}',
    '#sl-consent p{margin:0 0 16px}',
    '#sl-consent .row{display:flex;gap:12px;flex-wrap:wrap}',
    '#sl-consent button{flex:1 1 140px;min-height:44px;padding:12px 14px;cursor:pointer;',
    'font:500 13px/1 "DM Mono",ui-monospace,monospace;text-transform:uppercase;letter-spacing:.12em;border-radius:0;}',
    '#sl-consent .accept{background:#ffbc42;color:#062d31;border:2px solid #ffbc42;box-shadow:5px 5px 0 #ff2d87}',
    '#sl-consent .decline{background:transparent;color:#fff0ce;border:2px solid rgba(255,240,206,.6)}',
    '#sl-consent button:focus-visible{outline:3px solid #ffbc42;outline-offset:4px}',
    '@media (max-width:560px){#sl-consent{left:24px;right:24px;bottom:20px;max-width:none;',
    'border-radius:5px 26px 5px 26px;box-shadow:6px 6px 0 #ff2d87}}'
  ].join('');

  function build() {
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var box = document.createElement('section');
    box.id = 'sl-consent';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-labelledby', 'sl-consent-title');

    var title = document.createElement('h2');
    title.id = 'sl-consent-title';
    title.textContent = 'Measurement';

    var text = document.createElement('p');
    text.textContent = 'We use one analytics tool (Metricool) to see which pages bring visitors. It runs only if you accept.';

    var row = document.createElement('div');
    row.className = 'row';

    var accept = document.createElement('button');
    accept.type = 'button';
    accept.className = 'accept';
    accept.textContent = 'Accept';

    var decline = document.createElement('button');
    decline.type = 'button';
    decline.className = 'decline';
    decline.textContent = 'Decline';

    function close(v) {
      save(v);
      box.parentNode && box.parentNode.removeChild(box);
    }
    accept.addEventListener('click', function () { close('accepted'); loadTracker(); });
    decline.addEventListener('click', function () { close('declined'); });

    row.appendChild(accept);
    row.appendChild(decline);
    box.appendChild(title);
    box.appendChild(text);
    box.appendChild(row);
    document.body.appendChild(box);
    accept.focus({ preventScroll: true });
  }

  if (document.body) build();
  else document.addEventListener('DOMContentLoaded', build);
})();
