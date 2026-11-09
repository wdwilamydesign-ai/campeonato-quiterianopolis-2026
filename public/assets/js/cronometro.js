// Cronômetro oficial por período (regulamentar + acréscimos separados)
(function () {
  'use strict';
  function format(seconds) {
    var m = String(Math.floor(seconds / 60)).padStart(2, '0');
    var s = String(seconds % 60).padStart(2, '0');
    return m + ':' + s;
  }
  function init() {
    document.querySelectorAll('[data-match-clock]').forEach(function (root) {
      var target = root.querySelector('.match-clock-value');
      if (!target) return;
      var regMin = parseInt(root.getAttribute('data-reg-minutes') || '40', 10) || 40;
      var regSec = regMin * 60;
      var base = Math.max(0, parseInt(root.getAttribute('data-seconds') || '0', 10) || 0);
      var running = root.getAttribute('data-running') === '1';
      var interval = root.getAttribute('data-interval') === '1';
      var start = performance.now();

      function render() {
        var seconds = interval
          ? 0
          : base + (running ? Math.max(0, Math.floor((performance.now() - start) / 1000)) : 0);
        target.textContent = seconds > regSec
          ? format(regSec) + ' + ' + format(seconds - regSec)
          : format(seconds);
        root.classList.toggle('match-clock-extra', !interval && seconds > regSec);
      }
      render();
      if (running) window.setInterval(render, 250);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
