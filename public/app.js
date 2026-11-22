// Scorroday: je SOMtoday-rooster, gemaakt voor de Lumia 435 (Edge 14, 1 GB). Gewoon ES5.
// Inloggen gaat via SOMtoday zelf (school kiezen, schoolaccount/Microsoft/Entree). Daarna stuurt SOMtoday je naar
// somtoday://…?code=…, en die link vangen we af:
//   - in de Lumia-app: SOMtoday in een x-ms-webview, de somtoday://-link wordt daar onderschept;
//   - lukt dat niet: SOMtoday in Edge, en Windows opent Scorroday weer via het protocol 'somtoday' (manifest);
//   - in een gewone browser: de link zelf plakken.
// De tokens staan alleen hier (localStorage); de worker stuurt de verzoeken alleen door (CORS).
(function () {
  'use strict';

  var W = window.Windows;
  var ACCEPT_ROOSTER = 'application/vnd.topicus.platinum+json; charset=utf-8';

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, tekst) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (tekst != null) e.textContent = tekst;
    return e;
  }
  function lees(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function zet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function log(s) { if (window.__log) window.__log(s); }

  function toon(id) {
    var p = document.querySelectorAll('.pagina');
    for (var i = 0; i < p.length; i++) p[i].hidden = p[i].id !== id;
  }

  // ---------- server ----------
  function xhr(methode, pad, body, headers) {
    return new Promise(function (klaar, mis) {
      var x = new XMLHttpRequest();
      x.open(methode, pad, true);
      x.timeout = 30000;
      for (var h in headers || {}) x.setRequestHeader(h, headers[h]);
      x.onload = function () {
        var d = null;
        try { d = JSON.parse(x.responseText); } catch (e) {}
        if (x.status >= 200 && x.status < 300) klaar({ data: d, range: x.getResponseHeader('X-Content-Range') });
        else { var f = new Error((d && d.fout) || 'Fout ' + x.status); f.status = x.status; mis(f); }
      };
      x.onerror = x.ontimeout = function () { var f = new Error('Geen verbinding'); f.status = 0; mis(f); };
      x.send(body || null);
    });
  }

  var sessie = null; // { access, refresh, verloopt, api, school }
  try { sessie = JSON.parse(lees('sc_sessie') || 'null'); } catch (e) {}
  function bewaarSessie() { zet('sc_sessie', sessie ? JSON.stringify(sessie) : null); }

  var verversen = null;
  function ververs() {
    if (verversen) return verversen;
    verversen = xhr('POST', '/api/token', 'refresh=' + encodeURIComponent(sessie.refresh), { 'Content-Type': 'application/x-www-form-urlencoded' })
      .then(function (r) {
        verversen = null;
        var school = sessie.school;
        sessie = r.data;
        if (!sessie.school) sessie.school = school;
        bewaarSessie();
      }, function (f) {
        verversen = null;
        if (f.status === 401) uitloggen('Je bent uitgelogd door SOMtoday. Log opnieuw in.');
        throw f;
      });
    return verversen;
  }
  function geldig() {
    if (!sessie) return Promise.reject(new Error('Niet ingelogd'));
    if (Date.now() < sessie.verloopt - 90000) return Promise.resolve();
    return ververs();
  }
  function api(pad, opties, opnieuw) {
    opties = opties || {};
    return geldig().then(function () {
      var h = { Authorization: 'Bearer ' + sessie.access, 'X-Api': sessie.api };
      if (opties.accept) h['X-Accept'] = opties.accept;
      if (opties.range) h.Range = opties.range;
      return xhr('GET', '/api/rest/' + pad, null, h);
    }).then(null, function (f) {
      if (f.status === 401 && !opnieuw && sessie) return ververs().then(function () { return api(pad, opties, true); });
      throw f;
    });
  }
  // alle pagina's van een lijst (SOMtoday geeft er 100 per keer, met Range)
  function alles(pad, opties) {
    var items = [];
    function stuk(van) {
      opties.range = 'items=' + van + '-' + (van + 99);
      return api(pad, opties).then(function (r) {
        var lijst = (r.data && r.data.items) || [];
        items = items.concat(lijst);
        var m = (r.range || '').match(/(\d+)-(\d+)\/(\d+)/);
        if (m && +m[2] + 1 < +m[3] && lijst.length) return stuk(+m[2] + 1);
        return items;
      });
    }
    return stuk(0);
  }

  // ---------- inloggen ----------
  var inApp = false;
  try { inApp = !!(W && W.ApplicationModel.Package.current); } catch (e) {}

  function webviewKan() {
    try {
      var w = document.createElement('x-ms-webview');
      return typeof w.navigate === 'function';
    } catch (e) { return false; }
  }

  $('inlogKnop').addEventListener('click', function () {
    $('inlogStatus').textContent = 'Even geduld…';
    xhr('GET', '/api/start').then(function (r) {
      var s = r.data;
      zet('sc_pkce', JSON.stringify({ verifier: s.verifier, state: s.state }));
      $('inlogStatus').textContent = '';
      if (inApp && webviewKan()) return inlogInApp(s.url, s.terug);
      if (inApp) {
        log('geen webview, via Edge');
        W.System.Launcher.launchUriAsync(new W.Foundation.Uri(s.url));
        $('inlogStatus').textContent = 'Log in in Edge; daarna kom je vanzelf hier terug.';
        return;
      }
      window.open(s.url, '_blank');
      $('plakDeel').hidden = false;
    }, function (f) { $('inlogStatus').textContent = f.message; });
  });

  var web = null;
  function inlogInApp(url, terug) {
    toon('pWeb');
    $('webLaden').hidden = false;
    if (!web) {
      web = document.createElement('x-ms-webview');
      $('webPlek').appendChild(web);
      var vang = function (e) {
        if (String(e.uri || '').indexOf('somtoday:') !== 0) return false;
        e.preventDefault();
        sluitWeb();
        verwerkTerug(e.uri);
        return true;
      };
      web.addEventListener('MSWebViewNavigationStarting', function (e) { if (!vang(e)) $('webLaden').hidden = false; });
      web.addEventListener('MSWebViewUnsupportedUriSchemeIdentified', vang);
      web.addEventListener('MSWebViewNavigationCompleted', function (e) {
        $('webLaden').hidden = true;
        if (!e.isSuccess) log('webview navigatie mislukt ' + e.webErrorStatus);
      });
    }
    web.navigate(url);
  }
  function sluitWeb() {
    if (web) {
      try { web.stop(); } catch (e) {}
      web.parentNode.removeChild(web); // geheugen terug
      web = null;
    }
    toon('pInlog');
  }
  $('webTerug').addEventListener('click', function () {
    if (web && web.canGoBack) web.goBack(); else sluitWeb();
  });

  // Windows opent ons weer met somtoday://… (inloggen via Edge)
  if (W) {
    try {
      W.UI.WebUI.WebUIApplication.addEventListener('activated', function (e) {
        if (e.kind === W.ApplicationModel.Activation.ActivationKind.protocol && e.uri) verwerkTerug(e.uri.absoluteUri || e.uri.rawUri);
      });
    } catch (e) {}
  }

  $('plakForm').addEventListener('submit', function (e) {
    e.preventDefault();
    verwerkTerug($('plakVeld').value.replace(/^\s+|\s+$/g, ''));
  });

  function verwerkTerug(link) {
    var pk = null;
    try { pk = JSON.parse(lees('sc_pkce') || 'null'); } catch (e) {}
    var q = {};
    String(link).replace(/[?&]([^=&#]+)=([^&#]*)/g, function (_, k, v) { q[k] = decodeURIComponent(v.replace(/\+/g, ' ')); });
    toon('pInlog');
    if (q.error) { $('inlogStatus').textContent = 'SOMtoday: ' + (q.error_description || q.error); return; }
    if (!q.code || !pk) { $('inlogStatus').textContent = 'Dit is niet de goede link. Probeer opnieuw in te loggen.'; return; }
    if (q.state && q.state !== pk.state) { $('inlogStatus').textContent = 'Deze link hoort bij een oudere poging. Log opnieuw in.'; return; }
    $('inlogStatus').textContent = 'Inloggen…';
    xhr('POST', '/api/token', 'code=' + encodeURIComponent(q.code) + '&verifier=' + encodeURIComponent(pk.verifier), { 'Content-Type': 'application/x-www-form-urlencoded' })
      .then(function (r) {
        sessie = r.data;
        bewaarSessie();
        zet('sc_pkce', null);
        $('inlogStatus').textContent = '';
        $('plakVeld').value = '';
        $('plakDeel').hidden = true;
        log('ingelogd');
        startRooster();
      }, function (f) { $('inlogStatus').textContent = 'Inloggen mislukt: ' + f.message; });
  }

  function uitloggen(bericht) {
    sessie = null;
    bewaarSessie();
    zet('sc_leerling', null);
    for (var k in cache) zet('sc_week_' + k, null);
    cache = {};
    zet('sc_weken', null);
    toon('pInlog');
    $('inlogStatus').textContent = bericht || '';
  }

  // ---------- datums ----------
  var DAG = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
  var MAAND = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  function middernacht(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function plusDagen(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function maandagVan(d) { var w = (d.getDay() + 6) % 7; return plusDagen(middernacht(d), -w); }
  function isoWeek(d) {
    var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var dag = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - dag);
    var jaarStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return { jaar: t.getUTCFullYear(), week: Math.ceil(((t - jaarStart) / 86400000 + 1) / 7) };
  }
  function ymd(d) { return d.getFullYear() + '-' + (d.getMonth() < 9 ? '0' : '') + (d.getMonth() + 1) + '-' + (d.getDate() < 10 ? '0' : '') + d.getDate(); }
  function uurMin(t) { var d = new Date(t); return d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes(); }
  function zelfdeDag(a, b) { return ymd(a) === ymd(b); }

  // ---------- rooster ----------
  var leerling = null;
  try { leerling = JSON.parse(lees('sc_leerling') || 'null'); } catch (e) {}
  var maandag = maandagVan(new Date());
  var gekozen = middernacht(new Date());
  if (gekozen.getDay() === 0 || gekozen.getDay() === 6) { maandag = plusDagen(maandag, 7); gekozen = maandag; }
  var cache = {}; // 'jaar-week' -> lessen
  var weken = [];
  try { weken = JSON.parse(lees('sc_weken') || '[]'); } catch (e) {}
  for (var wi = 0; wi < weken.length; wi++) {
    try { cache[weken[wi]] = JSON.parse(lees('sc_week_' + weken[wi]) || 'null'); } catch (e) {}
    if (!cache[weken[wi]]) delete cache[weken[wi]];
  }
  function bewaarWeek(k, lessen) {
    cache[k] = lessen;
    weken = weken.filter(function (x) { return x !== k; });
    weken.unshift(k);
    while (weken.length > 6) zet('sc_week_' + weken.pop(), null); // niet te veel bewaren
    zet('sc_weken', JSON.stringify(weken));
    zet('sc_week_' + k, JSON.stringify(lessen));
  }

  function haalLeerling() {
    if (leerling) return Promise.resolve(leerling);
    return api('leerlingen').then(function (r) {
      var l = r.data && r.data.items && r.data.items[0];
      if (!l) throw new Error('Geen leerling gevonden bij dit account');
      var id = (l.links && l.links[0] && l.links[0].id) || l.id;
      leerling = { id: id, naam: [l.roepnaam, l.achternaam].join(' ').replace(/^\s+|\s+$/g, '') };
      zet('sc_leerling', JSON.stringify(leerling));
      return leerling;
    });
  }

  function maakLes(a) {
    var ex = a.additionalObjects || {};
    var vak = a.vak || ex.vak || null;
    var docent = a.docentNamen || ex.docentAfkortingen || [];
    if (typeof docent === 'string') docent = [docent];
    var meldingen = a.statusNotifications || [];
    var uitval = false, letOp = a.wijzigingOmschrijving || '';
    for (var i = 0; i < meldingen.length; i++) {
      if (String(meldingen[i].status) === '4007') uitval = true;
      else if (meldingen[i].message && String(meldingen[i].status) !== '2002' && !letOp) letOp = meldingen[i].message;
    }
    if (a.afspraakStatus === 'VERVALLEN' || /vervalt|vervallen|uitval/i.test(a.titel || '')) uitval = true;
    return {
      b: Date.parse(a.beginDatumTijd), e: Date.parse(a.eindDatumTijd),
      uur: a.beginLesuur || null, tot: a.eindLesuur || null,
      vak: (vak && vak.naam) || a.titel || 'Afspraak', afk: (vak && vak.afkorting) || '',
      titel: a.titel || '', plek: a.locatie || '', docent: docent.join(', '),
      groep: (a.lesgroepen || []).map(function (g) { return g.naam; }).join(', '),
      tekst: a.omschrijving || '', uitval: uitval, letOp: uitval ? (letOp || 'Vervalt') : letOp,
    };
  }

  var bezig = {};
  function laadWeek(maa, stil) {
    var w = isoWeek(maa), k = w.jaar + '-' + w.week;
    if (bezig[k]) return;
    bezig[k] = true;
    if (!stil) $('laden').hidden = false;
    haalLeerling().then(function (l) {
      return alles('afspraakitems/' + l.id + '/jaar/' + w.jaar + '/week/' + w.week, { accept: ACCEPT_ROOSTER }).then(null, function (f) {
        if (f.status !== 404 && f.status !== 400) throw f;
        // oudere SOMtoday: de afspraken-lijst
        return alles('afspraken?begindatum=' + ymd(maa) + '&einddatum=' + ymd(plusDagen(maa, 6)) + '&additional=vak&additional=docentAfkortingen', {});
      });
    }).then(function (items) {
      var lessen = items.map(maakLes).filter(function (x) { return !isNaN(x.b); });
      lessen.sort(function (a, b) { return a.b - b.b; });
      bewaarWeek(k, lessen);
      delete bezig[k];
      $('laden').hidden = true;
      if (isoWeek(maandag).week === w.week && isoWeek(maandag).jaar === w.jaar) teken();
    }, function (f) {
      delete bezig[k];
      $('laden').hidden = true;
      if (!sessie) return;
      log('rooster ' + f.status + ' ' + f.message);
      if (!cache[k]) {
        $('lessen').innerHTML = '';
        var n = el('div', 'niks');
        n.appendChild(el('b', null, '!'));
        n.appendChild(document.createTextNode('Het rooster kon niet geladen worden. ' + f.message));
        $('lessen').appendChild(n);
      }
    });
  }

  var KLEUREN = ['#2d3a8c', '#e4572e', '#17a398', '#7b4fc9', '#e0a100', '#2c8de0', '#c2185b', '#4c9a2a', '#8d6e63', '#00838f', '#d84315', '#5c6bc0'];
  function kleur(vak) {
    var h = 0;
    for (var i = 0; i < vak.length; i++) h = (h * 31 + vak.charCodeAt(i)) | 0;
    return KLEUREN[Math.abs(h) % KLEUREN.length];
  }

  function teken() {
    var w = isoWeek(maandag), k = w.jaar + '-' + w.week;
    var lessen = cache[k];
    // dagknoppen
    var dagen = $('dagen');
    dagen.innerHTML = '';
    var vandaag = middernacht(new Date());
    for (var i = 0; i < 5; i++) {
      var d = plusDagen(maandag, i);
      var b = el('button');
      var heeft = lessen && lessen.some(function (l) { return zelfdeDag(new Date(l.b), d); });
      b.className = (zelfdeDag(d, gekozen) ? 'aan ' : '') + (zelfdeDag(d, vandaag) ? 'vandaag ' : '') + (lessen && !heeft ? 'leeg' : '');
      b.appendChild(el('span', null, DAG[d.getDay()].slice(0, 2)));
      b.appendChild(el('b', null, String(d.getDate())));
      (function (dd) { b.addEventListener('click', function () { gekozen = dd; teken(); }); })(d);
      dagen.appendChild(b);
    }
    $('dagTitel').textContent = DAG[gekozen.getDay()] + ' ' + gekozen.getDate() + ' ' + MAAND[gekozen.getMonth()] + ' · week ' + w.week;
    $('vandaagKnop').style.visibility = zelfdeDag(gekozen, vandaag) ? 'hidden' : 'visible';

    var vak = $('lessen');
    vak.innerHTML = '';
    if (!lessen) return;
    var dag = lessen.filter(function (l) { return zelfdeDag(new Date(l.b), gekozen); });
    if (!dag.length) {
      var n = el('div', 'niks');
      n.appendChild(el('b', null, '☀'));
      n.appendChild(document.createTextNode(gekozen.getDay() === 0 || gekozen.getDay() === 6 ? 'Weekend!' : 'Geen lessen vandaag.'));
      vak.appendChild(n);
      return;
    }
    var nu = Date.now();
    for (var j = 0; j < dag.length; j++) {
      var l = dag[j];
      if (j > 0 && l.b - dag[j - 1].e >= 10 * 60000) vak.appendChild(el('div', 'pauze', Math.round((l.b - dag[j - 1].e) / 60000) + ' min pauze'));
      vak.appendChild(lesKaart(l, nu));
    }
    vak.scrollTop = 0;
  }

  function lesKaart(l, nu) {
    var k = el('div', 'les' + (l.uitval ? ' uitval' : '') + (nu >= l.b && nu < l.e ? ' nu' : ''));
    var u = el('div', 'uur', l.uur ? String(l.uur) : '•');
    u.style.background = l.uitval ? '#c4c6d4' : kleur(l.vak);
    k.appendChild(u);
    var t = el('div', 'tekst');
    t.appendChild(el('div', 'vak', l.vak));
    var sub = [l.plek, l.docent].filter(Boolean).join(' · ');
    if (sub) t.appendChild(el('div', 'sub', sub));
    if (l.letOp) t.appendChild(el('span', 'let', l.letOp));
    k.appendChild(t);
    k.appendChild(el('div', 'tijd', uurMin(l.b) + '\n' + uurMin(l.e)));
    k.lastChild.style.whiteSpace = 'pre';
    k.addEventListener('click', function () { toonDetail(l); });
    return k;
  }

  function toonDetail(l) {
    $('dKleur').style.background = l.uitval ? '#c4c6d4' : kleur(l.vak);
    $('dVak').textContent = l.vak;
    var dl = $('dLijst');
    dl.innerHTML = '';
    var d = new Date(l.b);
    var rijen = [
      ['wanneer', DAG[d.getDay()] + ' ' + d.getDate() + ' ' + MAAND[d.getMonth()] + ', ' + uurMin(l.b) + ' – ' + uurMin(l.e) + (l.uur ? ' (' + l.uur + (l.tot && l.tot !== l.uur ? '–' + l.tot : '') + 'e uur)' : '')],
      ['lokaal', l.plek], ['docent', l.docent], ['groep', l.groep],
      ['let op', l.letOp], ['titel', l.titel !== l.vak && l.titel !== l.afk ? l.titel : ''], ['omschrijving', l.tekst],
    ];
    for (var i = 0; i < rijen.length; i++) {
      if (!rijen[i][1]) continue;
      dl.appendChild(el('dt', null, rijen[i][0]));
      dl.appendChild(el('dd', null, rijen[i][1]));
    }
    $('detail').hidden = false;
  }
  $('dSluit').addEventListener('click', function () { $('detail').hidden = true; });
  $('detail').querySelector('.schaduw').addEventListener('click', function () { $('detail').hidden = true; });

  function naarWeek(n) {
    maandag = plusDagen(maandag, 7 * n);
    gekozen = plusDagen(maandag, (gekozen.getDay() + 6) % 7);
    teken();
    laadWeek(maandag, !!cache[isoWeek(maandag).jaar + '-' + isoWeek(maandag).week]);
  }
  $('weekTerug').addEventListener('click', function () { naarWeek(-1); });
  $('weekVerder').addEventListener('click', function () { naarWeek(1); });
  $('vandaagKnop').addEventListener('click', function () {
    var v = middernacht(new Date());
    var m = maandagVan(v);
    if (v.getDay() === 0 || v.getDay() === 6) { m = plusDagen(m, 7); v = m; }
    var andereWeek = ymd(m) !== ymd(maandag);
    maandag = m; gekozen = v;
    teken();
    if (andereWeek) laadWeek(maandag, false);
  });

  // vegen: vorige/volgende dag
  var veegX = null, veegY = 0;
  $('lessen').addEventListener('touchstart', function (e) { veegX = e.touches[0].clientX; veegY = e.touches[0].clientY; });
  $('lessen').addEventListener('touchend', function (e) {
    if (veegX === null) return;
    var dx = e.changedTouches[0].clientX - veegX, dy = e.changedTouches[0].clientY - veegY;
    veegX = null;
    if (Math.abs(dx) < 70 || Math.abs(dy) > Math.abs(dx) * 0.6) return;
    var dagNr = (gekozen.getDay() + 6) % 7 + (dx < 0 ? 1 : -1);
    if (dagNr > 4) { naarWeek(1); gekozen = maandag; teken(); }
    else if (dagNr < 0) { naarWeek(-1); gekozen = plusDagen(maandag, 4); teken(); }
    else { gekozen = plusDagen(maandag, dagNr); teken(); }
  });

  // menu
  $('menuKnop').addEventListener('click', function () { $('menu').hidden = false; });
  $('menu').querySelector('.schaduw').addEventListener('click', function () { $('menu').hidden = true; });
  var mk = $('menu').querySelectorAll('button');
  for (var mi = 0; mi < mk.length; mi++) {
    mk[mi].addEventListener('click', function () {
      $('menu').hidden = true;
      if (this.getAttribute('data-doe') === 'ververs') laadWeek(maandag, false);
      if (this.getAttribute('data-doe') === 'uit' && window.confirm('Uitloggen bij Scorroday?')) uitloggen();
    });
  }

  function startRooster() {
    toon('pRooster');
    $('naam').textContent = leerling ? leerling.naam : 'Rooster';
    $('school').textContent = sessie.school || '';
    teken();
    haalLeerling().then(function (l) { $('naam').textContent = l.naam || 'Rooster'; }, function () {});
    laadWeek(maandag, !!cache[isoWeek(maandag).jaar + '-' + isoWeek(maandag).week]);
  }
  // terug in de app na een tijdje: rooster bijwerken
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && sessie && !$('pRooster').hidden) { teken(); laadWeek(maandag, true); }
  });

  // ---------- terugknop ----------
  function terug() {
    if (!$('detail').hidden) { $('detail').hidden = true; return true; }
    if (!$('menu').hidden) { $('menu').hidden = true; return true; }
    if (!$('pWeb').hidden) { $('webTerug').click(); return true; }
    return false;
  }
  document.addEventListener('keydown', function (e) { if (e.keyCode === 27) terug(); });
  if (W) {
    try {
      W.UI.Core.SystemNavigationManager.getForCurrentView().addEventListener('backrequested', function (e) {
        if (terug()) e.handled = true;
      });
    } catch (e) {}
    try {
      if (W.Foundation.Metadata.ApiInformation.isTypePresent('Windows.UI.ViewManagement.StatusBar')) {
        var sb = W.UI.ViewManagement.StatusBar.getForCurrentView();
        sb.backgroundColor = { a: 255, r: 0x2d, g: 0x3a, b: 0x8c };
        sb.backgroundOpacity = 1;
        sb.foregroundColor = { a: 255, r: 255, g: 255, b: 255 };
      }
    } catch (e) {}
  }

  if (sessie) startRooster(); else toon('pInlog');
})();
