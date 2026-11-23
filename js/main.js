/* main.js: shared helpers, mobile menu and active link. Loaded on every page. */
var SB = {
  /* Read JSON from local storage. Returns fallback if empty or broken. */
  load: function (key, fallback) {
    try {
      var v = JSON.parse(localStorage.getItem(key));
      return v === null ? fallback : v;
    } catch (e) { return fallback; }
  },
  /* Save JSON to local storage. */
  save: function (key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (e) { alert('Could not save. Browser storage is full or blocked.'); }
  },
  /* Escape text so it is safe to put inside HTML. */
  esc: function (text) {
    var d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  },
  /* Make a simple unique id. */
  id: function () {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
};

(function () {
  /* Interactive feature: show/hide menu on small screens. */
  var btn = document.getElementById('menuBtn');
  var nav = document.getElementById('mainNav');
  if (btn && nav) {
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  /* Mark the link of the current page. */
  var page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.main-nav a').forEach(function (a) {
    if (a.getAttribute('href') === page) {
      a.classList.add('active');
      a.setAttribute('aria-current', 'page');
    }
  });
})();