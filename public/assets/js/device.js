/* Detecção inteligente de dispositivo: celular, tablet ou computador.
   Roda no <head> antes da página aparecer, para não "piscar" o layout errado. */
(function () {
  var d = document.documentElement;
  var ua = navigator.userAgent || '';
  var iPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  var ios = /iPhone|iPod|iPad/.test(ua) || iPadOS;
  var android = /Android/i.test(ua);
  var tabletUA = /iPad|Tablet|PlayBook|Silk|Kindle/i.test(ua) || iPadOS || (android && !/Mobile/i.test(ua));
  var phoneUA = !tabletUA && (/Mobi|iPhone|iPod|Android.*Mobile|Windows Phone|Opera Mini|IEMobile/i.test(ua));
  var touch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  var standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;

  function aplicar() {
    var w = Math.min(window.innerWidth || 0, (screen && screen.width) || 99999);
    var tipo;
    if (phoneUA) tipo = 'mobile';
    else if (tabletUA) tipo = 'tablet';
    else if (touch && w <= 760) tipo = 'mobile';
    else tipo = 'desktop';

    var retrato = (window.innerHeight || 0) >= (window.innerWidth || 0);
    var c = d.className.replace(/\b(is-mobile|is-tablet|is-desktop|is-portrait|is-landscape)\b/g, '').trim();
    c += ' is-' + tipo + (retrato ? ' is-portrait' : ' is-landscape');
    d.className = c.replace(/\s+/g, ' ').trim();
    d.setAttribute('data-device', tipo);
  }

  var extras = [];
  if (ios) extras.push('is-ios');
  if (android) extras.push('is-android');
  if (touch) extras.push('is-touch');
  if (standalone) extras.push('is-standalone');
  d.className = (d.className + ' ' + extras.join(' ')).trim();

  aplicar();
  window.addEventListener('resize', aplicar, { passive: true });
  window.addEventListener('orientationchange', aplicar, { passive: true });
})();
