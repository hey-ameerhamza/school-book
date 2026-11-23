/* theme.js: applies the saved theme and text size. Loaded in <head> to avoid a flash. */
(function () {
  function get(key, fallback) {
    try { return localStorage.getItem(key) || fallback; } catch (e) { return fallback; }
  }
  function put(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* storage blocked */ }
  }

  var root = document.documentElement;
  root.setAttribute('data-theme', get('sb_theme', 'light'));
  root.setAttribute('data-font', get('sb_font', 'medium'));

  window.SBTheme = {
    set: function (name) { root.setAttribute('data-theme', name); put('sb_theme', name); },
    setFont: function (size) { root.setAttribute('data-font', size); put('sb_font', size); }
  };
})();