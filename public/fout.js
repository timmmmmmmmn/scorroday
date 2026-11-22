// Scorroday: fouten naar de server sturen (alleen te zien in `wrangler tail scorroday`), niets opgeslagen.
(function () {
  var sent = 0;
  function send(s) {
    if (sent++ > 20) return;
    try {
      var x = new XMLHttpRequest();
      x.open('POST', '/api/wplog', true);
      x.setRequestHeader('Content-Type', 'text/plain');
      x.send(navigator.userAgent + ' | ' + s);
    } catch (e) {}
  }
  window.onerror = function (msg, src, line, col) {
    send(msg + ' @ ' + src + ':' + line + ':' + col);
    var f = document.getElementById('fout');
    if (f) { f.textContent = 'Fout: ' + msg + ' (' + line + ')'; f.hidden = false; }
  };
  window.__log = send;
})();
