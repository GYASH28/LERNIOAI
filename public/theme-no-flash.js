(function () {
  try {
    var p = null;
    var match = document.cookie.match(/(?:^|;\s*)lernio-theme=([^;]+)/);
    if (match) {
      p = JSON.parse(decodeURIComponent(match[1]));
    }

    if (!p && window.localStorage) {
      var stored = localStorage.getItem('lernio-theme-prefs');
      if (stored) {
        p = JSON.parse(stored);
      }
    }

    if (!p && window.localStorage) {
      var legacy = localStorage.getItem('lernio-prefs');
      if (legacy) {
        var lp = JSON.parse(legacy);
        p = {};
        if (lp.theme === 'light' || lp.theme === 'dark' || lp.theme === 'system') {
          p.appearance = lp.theme;
        }
        if (typeof lp.reducedMotion === 'boolean') {
          p.motion = lp.reducedMotion ? 'reduced' : 'full';
        }
        if (typeof lp.lowPower === 'boolean') {
          p.lowPower = lp.lowPower;
        }
      }
    }

    p = p || {};
    var app = p.appearance || 'system';
    var pal = p.palette || 'aurora';
    var con = p.contrast || 'normal';
    var den = p.density || 'comfortable';
    var sur = p.surfaceStyle || 'soft';
    var sti = p.subjectTint || 'subtle';
    var mot = p.motion || 'full';
    var lpw = !!p.lowPower;
    var osRed = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (osRed && mot !== 'none') {
      mot = 'reduced';
    }
    var dark = app === 'dark' || (app === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var r = document.documentElement;
    r.classList.toggle('dark', dark);
    r.classList.toggle('reduce-motion', mot !== 'full');
    r.setAttribute('data-appearance', app);
    r.setAttribute('data-palette', pal);
    r.setAttribute('data-contrast', con);
    r.setAttribute('data-density', den);
    r.setAttribute('data-surface', sur);
    r.setAttribute('data-subject-tint', sti);
    r.setAttribute('data-motion', mot);
    r.setAttribute('data-low-power', String(lpw));
  } catch {
    return;
  }
})();
