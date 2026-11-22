// Scorroday: SOMtoday, maar fijn. Alles wat binnenkomt wordt ook op het toestel bewaard (localStorage),
// zodat de app meteen iets laat zien en ook zonder internet werkt; daarna wordt op de achtergrond bijgewerkt.
// De verzoeken naar SOMtoday doet de Android-app zelf (ScorroNative.api); in de demo komen ze uit demo.js.

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const native = window.ScorroNative || null;
const glassUi = !!(native?.glassUi && native.glassUi());
// Glisse (glisse.js): null als het toestel het niet aankan, dan blijft alles zoals het was.
const glisse = document.documentElement.classList.contains('glisse')
  ? import('./glisse.js').then((g) => (g.kan() ? g : null)).catch(() => null).then((g) => {
    if (!g) document.documentElement.classList.remove('glisse');
    return g;
  })
  : Promise.resolve(null);
if (glassUi) document.documentElement.classList.add('glass');

const SOURCE = 'https://github.com/timmmmmmmmn/scorroday';
const ACCEPT_ROOSTER = 'application/vnd.topicus.platinum+json; charset=utf-8';
const DAY = 86400000;
const DAGEN = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
const MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const CIJFERTYPES = ['Toetskolom', 'DeeltoetsKolom', 'Werkstukcijferkolom', 'Advieskolom', 'SamengesteldeToetsKolom', 'RapportToetskolom'];

const ICONS = {
  home: 'M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H5.5A1.5 1.5 0 0 1 4 19z',
  calendar: 'M5 5h14a1.5 1.5 0 0 1 1.5 1.5V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V6.5A1.5 1.5 0 0 1 5 5zM3.5 10h17M8 3v4M16 3v4',
  chart: 'M4 20h16M7 16v-5M12 16V7M17 16v-8',
  book: 'M5 4.5h5.5A2.5 2.5 0 0 1 13 7v13a2 2 0 0 0-2-2H5zM19 4.5h-3.5A2.5 2.5 0 0 0 13 7v13a2 2 0 0 1 2-2h4z',
  plus: 'M12 5v14M5 12h14',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
  back: 'M15 5l-7 7 7 7',
  next: 'M9 5l7 7-7 7',
  close: 'M6 6l12 12M18 6 6 18',
  check: 'M4.5 12.8 9.8 18.5 19.5 5.5',
  alert: 'M12 4 2.5 20h19zM12 10v4.5M12 17.5h.01',
  sun: 'M12 8a4 4 0 1 1 0 8a4 4 0 0 1 0-8zM12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4',
  clip: 'M20 11.5l-7.8 7.8a5 5 0 0 1-7-7l8.2-8.2a3.3 3.3 0 0 1 4.7 4.7l-8.2 8.2a1.7 1.7 0 0 1-2.4-2.4l7.5-7.5',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  person: 'M12 4.5a3.5 3.5 0 1 1 0 7a3.5 3.5 0 0 1 0-7zM5 20c1-4 4-5.5 7-5.5s6 1.5 7 5.5',
  settings: 'M12 9a3 3 0 1 1 0 6a3 3 0 0 1 0-6zM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7.3 19.8l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.4 14H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.2 7.3l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 9.7 3.4V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1.3z',
  sync: 'M20 11a8 8 0 0 0-14.3-4.3L4 9M4 4v5h5M4 13a8 8 0 0 0 14.3 4.3L20 15M20 20v-5h-5',
  code: 'M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16',
  logout: 'M15 4h3.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H15M10 8l-4 4 4 4M6 12h10',
  absent: 'M12 3.5a8.5 8.5 0 1 1 0 17a8.5 8.5 0 0 1 0-17zM12 7.5V12l3 2',
  library: 'M4 19V5M8 19V5M12 19l3-14 4.5 1-3 14z',
  share: 'M12 4v11M8 8l4-4 4 4M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 9.5a2.5 2.5 0 1 1 0 5a2.5 2.5 0 0 1 0-5z',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3',
  bell: 'M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0',
  download: 'M12 4v11M8 11l4 4 4-4M5 19h14',
};
function icon(name, cls = '') {
  return `<svg class="i ${name === 'more' ? 'dots' : ''} ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[name]}"/></svg>`;
}
function fillIcons(root = document) {
  $$('[data-icon]', root).forEach((el) => {
    if (!el.querySelector('svg.i')) el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon));
  });
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- opslag ----------

function lees(k, standaard = null) {
  try { const v = localStorage.getItem('sc:' + k); return v == null ? standaard : JSON.parse(v); } catch (e) { return standaard; }
}
function zet(k, v) {
  try { if (v == null) localStorage.removeItem('sc:' + k); else localStorage.setItem('sc:' + k, JSON.stringify(v)); } catch (e) {}
}
function wisAlles() {
  try { Object.keys(localStorage).filter((k) => k.startsWith('sc:')).forEach((k) => localStorage.removeItem(k)); } catch (e) {}
}

// ---------- datums ----------

const middernacht = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const plusDagen = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const maandagVan = (d) => plusDagen(middernacht(d), -((d.getDay() + 6) % 7));
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const zelfdeDag = (a, b) => ymd(new Date(a)) === ymd(new Date(b));
const hhmm = (t) => { const d = new Date(t); return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; };
function isoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dag = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dag);
  const start = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return { jaar: t.getUTCFullYear(), week: Math.ceil(((t - start) / DAY + 1) / 7) };
}
function dagNaam(t, lang = true) {
  const d = new Date(t);
  const vandaag = middernacht(new Date()).getTime();
  const dag = middernacht(d).getTime();
  if (dag === vandaag) return 'vandaag';
  if (dag === vandaag + DAY) return 'morgen';
  if (dag === vandaag - DAY) return 'gisteren';
  if (dag > vandaag && dag < vandaag + 6 * DAY) return DAGEN[d.getDay()];
  return lang ? `${DAGEN[d.getDay()]} ${d.getDate()} ${MAANDEN[d.getMonth()]}` : `${d.getDate()} ${MAANDEN[d.getMonth()].slice(0, 3)}`;
}
const hoofd = (s) => s.charAt(0).toUpperCase() + s.slice(1);
function datumKort(t) {
  const d = new Date(t);
  return `${d.getDate()} ${MAANDEN[d.getMonth()].slice(0, 3)}`;
}
function overHoeLang(ms) {
  const min = Math.round(ms / 60000);
  if (min < 1) return 'nu';
  if (min < 60) return `over ${min} min`;
  const u = Math.floor(min / 60), m = min % 60;
  return `over ${u} uur${m ? ` ${m} min` : ''}`;
}

// ---------- kleine hulpjes ----------

function haptic(kind = 'tick') {
  try { native?.haptic?.(kind); } catch (e) {}
}

let toastTimer;
function toast(text, action) {
  const el = $('#toast');
  el.innerHTML = `<span>${esc(text)}</span>`;
  if (action) {
    const b = document.createElement('button');
    b.textContent = action.label;
    b.onclick = () => { el.hidden = true; action.run(); };
    el.appendChild(b);
  }
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, action ? 6000 : 2800);
}
window.scorroToast = (t) => toast(t);

const KLEUREN = ['#2D3A8C', '#E4572E', '#17A398', '#7B4FC9', '#D99A00', '#2C8DE0', '#C2185B', '#4C9A2A', '#8D6E63', '#00838F', '#D84315', '#5C6BC0', '#AD4CC2', '#3E7F5F'];
function kleur(vak) {
  let h = 0;
  for (let i = 0; i < vak.length; i++) h = (h * 31 + vak.charCodeAt(i)) | 0;
  return KLEUREN[Math.abs(h) % KLEUREN.length];
}
const fmt = (x, n = 1) => (x == null || isNaN(x) ? '–' : x.toFixed(n).replace('.', ','));
const linkId = (o) => String(o?.links?.[0]?.id ?? o?.id ?? '');

// Beschrijvingen uit SOMtoday zijn HTML. Alleen een paar veilige tags blijven over.
function veiligeHtml(html) {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const mag = new Set(['P', 'BR', 'UL', 'OL', 'LI', 'B', 'STRONG', 'I', 'EM', 'U', 'A', 'DIV', 'SPAN']);
  const schoon = (node) => {
    let out = '';
    for (const n of node.childNodes) {
      if (n.nodeType === 3) out += esc(n.textContent);
      else if (n.nodeType === 1) {
        const binnen = schoon(n);
        if (!mag.has(n.tagName)) { out += binnen; continue; }
        if (n.tagName === 'BR') { out += '<br>'; continue; }
        if (n.tagName === 'A') {
          const href = n.getAttribute('href') || '';
          out += /^https?:\/\//i.test(href) ? `<a href="${esc(href)}" data-ext>${binnen}</a>` : binnen;
          continue;
        }
        const tag = n.tagName === 'DIV' ? 'p' : n.tagName === 'SPAN' ? '' : n.tagName.toLowerCase();
        out += tag ? `<${tag}>${binnen}</${tag}>` : binnen;
      }
    }
    return out;
  };
  return schoon(doc.body.firstChild).replace(/(<p>\s*<\/p>)+/g, '');
}
const platteTekst = (html) => new DOMParser().parseFromString(`<div>${String(html || '').replace(/<\/(p|li|div|h\d)>|<br\s*\/?>/gi, '$& ')}</div>`, 'text/html').body.textContent.replace(/\s+/g, ' ').trim();

function openUrl(url) {
  if (native?.openUrl) native.openUrl(url);
  else window.open(url, '_blank', 'noopener');
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-ext]');
  if (!a) return;
  e.preventDefault();
  openUrl(a.href);
});

// ---------- SOMtoday ----------

let demo = lees('demo', false);
let demoMod = null;
const wacht = new Map();
let volgend = 1;
window.scorroAntw = (id, status, range, body) => {
  const w = wacht.get(id);
  if (!w) return;
  wacht.delete(id);
  let data = null;
  try { data = JSON.parse(body); } catch (e) {}
  if (status >= 200 && status < 300) w.ok({ data, range });
  else {
    const f = new Error(data?.fout || (status ? `SOMtoday zegt ${status}` : 'Geen verbinding'));
    f.status = status;
    w.mis(f);
  }
};

async function api(pad, { accept = '', range = '', methode = 'GET', body = null } = {}) {
  if (demo) {
    demoMod ||= await import('./demo.js');
    return demoMod.antwoord(methode, pad, body);
  }
  if (!native) throw Object.assign(new Error('Alleen in de app'), { status: 0 });
  const r = await new Promise((ok, mis) => {
    const id = volgend++;
    wacht.set(id, { ok, mis });
    native.api(id, methode, pad, accept, range, body == null ? '' : JSON.stringify(body));
  });
  return r;
}

// Alle pagina's van een lijst (SOMtoday geeft er hooguit 100 per keer, met Range)
async function alles(pad, opties = {}) {
  let items = [];
  for (let van = 0; van < 3000;) {
    const r = await api(pad, { ...opties, range: `items=${van}-${van + 99}` });
    const lijst = r.data?.items || [];
    items = items.concat(lijst);
    const m = (r.range || '').match(/(\d+)-(\d+)\/(\d+)/);
    if (!m || !lijst.length || +m[2] + 1 >= +m[3]) break;
    van = +m[2] + 1;
  }
  return items;
}

// Eén keer tegelijk laden: wie tijdens het laden ook vraagt, krijgt hetzelfde antwoord.
function eenTegelijk(f) {
  let bezigMet = null;
  return () => (bezigMet ||= f().finally(() => { bezigMet = null; }));
}

// ---------- gegevens ----------

const state = {
  view: lees('view', 'vandaag'),
  leerling: lees('leerling'),
  weken: lees('weken', {}), // 'jaar-week' -> lessen
  cijfers: lees('cijfers', null),
  huiswerk: lees('huiswerk', null),
  berichten: lees('berichten', null),
  vakanties: lees('vakanties', null),
  eigen: lees('eigen', []), // eigen taken
  gemaakt: lees('gemaakt', {}), // toekenning-id -> true/false (wat je zelf afvinkte)
  gezienCijfers: lees('gezienCijfers', null), // ids die je al gezien hebt (voor "nieuw")
  gelezen: lees('gelezen', {}),
  maandag: null,
  gekozen: null,
  cijferTab: lees('cijferTab', 'recent'),
  periode: null,
  hwFilter: 'open',
  verborgen: lees('verborgen', false),
  bezig: 0,
  fout: null,
};
(function startDag() {
  const nu = new Date();
  let m = maandagVan(nu), g = middernacht(nu);
  if (g.getDay() === 0 || g.getDay() === 6) { m = plusDagen(m, 7); g = m; }
  state.maandag = m; state.gekozen = g;
})();

function setSync() {
  const dot = $('#syncDot');
  dot.className = 'sync-dot' + (state.bezig ? ' busy' : state.fout ? ' err' : !navigator.onLine && !demo ? ' off' : '');
  dot.title = state.bezig ? 'Bezig met bijwerken…' : state.fout ? state.fout : 'Bijgewerkt';
}
async function bezig(p) {
  state.bezig++;
  setSync();
  try { const r = await p; state.fout = null; return r; } catch (e) {
    if (e.status === 401 && !demo) { uitgelogd('Je bent uitgelogd bij SOMtoday. Log opnieuw in.'); }
    state.fout = e.message;
    throw e;
  } finally { state.bezig--; setSync(); }
}

async function haalLeerling() {
  if (state.leerling?.id) return state.leerling;
  const r = await api('leerlingen');
  const l = r.data?.items?.[0];
  if (!l) throw new Error('Geen leerling gevonden bij dit account');
  state.leerling = { id: linkId(l), roepnaam: l.roepnaam || '', naam: [l.roepnaam, l.voorvoegsel, l.achternaam].filter(Boolean).join(' '), nummer: l.leerlingnummer || '' };
  zet('leerling', state.leerling);
  return state.leerling;
}

// --- rooster ---

function maakLes(a) {
  const ex = a.additionalObjects || {};
  const vak = a.vak || ex.vak || null;
  let docent = a.docentNamen || ex.docentAfkortingen || a.docentAfkortingen || [];
  if (typeof docent === 'string') docent = [docent];
  const meldingen = a.statusNotifications || [];
  let uitval = false, letOp = a.wijzigingOmschrijving || '';
  for (const m of meldingen) {
    if (String(m.status) === '4007') uitval = true;
    else if (m.message && String(m.status) !== '2002' && !letOp) letOp = m.message;
  }
  if (a.afspraakStatus === 'VERVALLEN' || /vervalt|vervallen|uitval/i.test(a.titel || '')) uitval = true;
  return {
    id: linkId(a),
    b: Date.parse(a.beginDatumTijd), e: Date.parse(a.eindDatumTijd),
    uur: a.beginLesuur || null, tot: a.eindLesuur || null,
    vak: vak?.naam || a.titel || 'Afspraak', afk: vak?.afkorting || '',
    titel: a.titel || '', plek: a.locatie || '', docent: docent.join(', '),
    groep: (a.lesgroepen || []).map((g) => g.naam).join(', '),
    tekst: a.omschrijving || '', uitval, letOp: uitval ? (letOp || 'Vervalt') : letOp,
    soort: a.afspraakType?.naam || '',
  };
}
const weekSleutel = (m) => { const w = isoWeek(m); return `${w.jaar}-${w.week}`; };

const laadtWeek = {};
function laadWeek(maandag) {
  const k = weekSleutel(maandag);
  if (laadtWeek[k]) return laadtWeek[k];
  laadtWeek[k] = bezig((async () => {
    const l = await haalLeerling();
    const w = isoWeek(maandag);
    let items;
    try {
      items = await alles(`afspraakitems/${l.id}/jaar/${w.jaar}/week/${w.week}`, { accept: ACCEPT_ROOSTER });
    } catch (f) {
      if (f.status !== 404 && f.status !== 400 && f.status !== 403) throw f;
      // oudere SOMtoday: de afspraken-lijst
      items = await alles(`afspraken?begindatum=${ymd(maandag)}&einddatum=${ymd(plusDagen(maandag, 6))}&additional=vak&additional=docentAfkortingen`);
    }
    const lessen = items.map(maakLes).filter((x) => !isNaN(x.b)).sort((a, b) => a.b - b.b || (a.uitval - b.uitval));
    state.weken[k] = lessen;
    // niet te veel bewaren: deze week en de weken eromheen
    const houd = new Set([-1, 0, 1, 2].map((n) => weekSleutel(plusDagen(maandagVan(new Date()), 7 * n))).concat(k));
    for (const s of Object.keys(state.weken)) if (!houd.has(s)) delete state.weken[s];
    zet('weken', state.weken);
    return lessen;
  })()).finally(() => { delete laadtWeek[k]; });
  return laadtWeek[k];
}
const lessenOp = (dag) => (state.weken[weekSleutel(dag)] || []).filter((l) => zelfdeDag(l.b, dag));

// --- cijfers ---

function getal(s) {
  if (s == null) return null;
  const t = String(s).trim().replace(',', '.');
  return /^\d+(\.\d+)?$/.test(t) ? parseFloat(t) : null;
}
function maakCijfer(r) {
  const tekst = r.geldendResultaat ?? r.resultaat ?? r.resultaatLabel ?? '';
  const c = getal(tekst);
  return {
    id: linkId(r),
    type: r.type || '',
    vak: r.vak?.naam || r.additionalObjects?.vaknaam || 'Onbekend vak',
    afk: r.vak?.afkorting || '',
    tekst: String(tekst).replace('.', ','),
    cijfer: c,
    weging: r.weging ?? r.examenWeging ?? 0,
    examenWeging: r.examenWeging ?? 0,
    omschrijving: r.omschrijving || r.resultaatkolom?.naam || r.additionalObjects?.resultaatkolom?.naam || '',
    datum: Date.parse(r.datumInvoer) || 0,
    periode: r.periode ?? null,
    voldoende: r.isVoldoende ?? (c == null ? null : c >= 5.5),
    telt: !r.teltNietmee && !r.toetsNietGemaakt,
    herkansing: r.herkansingstype && r.herkansingstype !== 'Geen' ? r.herkansingstype : '',
  };
}
const laadCijfers = eenTegelijk(async () => {
  return bezig((async () => {
    const l = await haalLeerling();
    const items = await alles(`resultaten/huidigVoorLeerling/${l.id}?additional=berekendRapportCijfer`);
    const lijst = items.map(maakCijfer);
    const cijfers = lijst.filter((c) => CIJFERTYPES.includes(c.type) && c.tekst !== '').sort((a, b) => b.datum - a.datum);
    const gemiddelden = lijst.filter((c) => /Gemiddelde|RapportCijfer/i.test(c.type) && c.cijfer != null);
    if (state.gezienCijfers == null) state.gezienCijfers = cijfers.map((c) => c.id); // eerste keer: niets is nieuw
    state.cijfers = { cijfers, gemiddelden, t: Date.now() };
    zet('cijfers', state.cijfers);
    zet('gezienCijfers', state.gezienCijfers);
    return state.cijfers;
  })());
});
function gemiddelde(lijst) {
  let som = 0, w = 0;
  for (const c of lijst) {
    if (c.cijfer == null || !c.telt) continue;
    const g = c.weging > 0 ? c.weging : 0;
    som += c.cijfer * g; w += g;
  }
  return w ? { gem: som / w, som, w } : null;
}
function perVak(cijfers) {
  const m = new Map();
  for (const c of cijfers) {
    if (!m.has(c.vak)) m.set(c.vak, []);
    m.get(c.vak).push(c);
  }
  return [...m.entries()].map(([vak, lijst]) => {
    const g = gemiddelde(lijst);
    const officieel = state.cijfers?.gemiddelden?.filter((x) => x.vak === vak && /Rapport/.test(x.type)).sort((a, b) => (b.periode || 0) - (a.periode || 0))[0];
    return { vak, lijst, gem: officieel?.cijfer ?? g?.gem ?? null, eigen: g, officieel: !!officieel };
  }).sort((a, b) => a.vak.localeCompare(b.vak, 'nl'));
}

// --- huiswerk ---

function maakHuiswerk(h, soort) {
  const item = h.studiewijzerItem || h.additionalObjects?.studiewijzerItem || {};
  const vak = h.lesgroep?.vak || h.additionalObjects?.lesgroep?.vak || {};
  const vinkjes = h.additionalObjects?.swigemaaktVinkjes?.items || [];
  let datum = Date.parse(h.datumTijd) || null;
  let tot = null;
  if (soort === 'week') {
    // weektaak: van maandag van weeknummerVanaf tot vrijdag van weeknummerTm (in het huidige schooljaar)
    const nu = new Date();
    const vanaf = h.weeknummerVanaf || isoWeek(nu).week;
    const totW = h.weeknummerTm || vanaf;
    const huidig = isoWeek(nu).week;
    const jaar = nu.getFullYear() + (vanaf < huidig - 26 ? 1 : vanaf > huidig + 26 ? -1 : 0);
    const maandagVanWeek = (j, w) => { const d = new Date(j, 0, 4); return plusDagen(maandagVan(d), (w - 1) * 7); };
    datum = maandagVanWeek(jaar, vanaf).getTime();
    tot = plusDagen(maandagVanWeek(jaar, totW), 4).getTime();
  }
  const bijlagen = [];
  for (const b of item.bijlagen || []) {
    const a = (b.assemblyResults || [])[0] || {};
    const url = a.sslUrl || a.fileUrl || b.url;
    if (url) bijlagen.push({ naam: b.omschrijving || a.fileName || 'Bijlage', url });
  }
  for (const b of item.externeMaterialen || []) if (b.uri) bijlagen.push({ naam: b.omschrijving || b.uri, url: b.uri, link: true });
  const id = linkId(h);
  return {
    id, soort, datum, tot,
    vak: vak.naam || '', afk: vak.afkorting || '',
    titel: item.onderwerp || (item.huiswerkType === 'TOETS' ? 'Toets' : 'Huiswerk'),
    html: item.omschrijving || '',
    type: item.huiswerkType || 'HUISWERK',
    bijlagen,
    somGemaakt: vinkjes.length ? !!vinkjes[0].gemaakt : null,
  };
}
const laadHuiswerk = eenTegelijk(async () => {
  return bezig((async () => {
    const l = await haalLeerling();
    const vanaf = ymd(plusDagen(new Date(), -14));
    const extra = `additional=swigemaaktVinkjes&additional=leerlingen&geenDifferentiatieOfGedifferentieerdVoorLeerling=${l.id}`;
    const [afspraak, dag, week] = await Promise.all([
      alles(`studiewijzeritemafspraaktoekenningen?begintNaOfOp=${vanaf}&${extra}`).catch(() => []),
      alles(`studiewijzeritemdagtoekenningen?begintNaOfOp=${vanaf}&${extra}`).catch(() => []),
      alles(`studiewijzeritemweektoekenningen?schooljaar=huidig&${extra}`).catch(() => []),
    ]);
    const lijst = [
      ...afspraak.map((h) => maakHuiswerk(h, 'afspraak')),
      ...dag.map((h) => maakHuiswerk(h, 'dag')),
      ...week.map((h) => maakHuiswerk(h, 'week')).filter((h) => h.tot >= middernacht(new Date()).getTime() - 7 * DAY),
    ].filter((h) => h.datum).sort((a, b) => a.datum - b.datum);
    state.huiswerk = { lijst, t: Date.now() };
    zet('huiswerk', state.huiswerk);
    return state.huiswerk;
  })());
});
const isGemaakt = (h) => (h.id in state.gemaakt ? state.gemaakt[h.id] : !!h.somGemaakt);
const isToets = (h) => h.type === 'TOETS' || h.type === 'GROTE_TOETS';

async function zetGemaakt(h, aan) {
  if (h.eigen) {
    const t = state.eigen.find((x) => x.id === h.id);
    if (t) t.gemaakt = aan;
    zet('eigen', state.eigen);
    return;
  }
  state.gemaakt[h.id] = aan;
  zet('gemaakt', state.gemaakt);
  try {
    const l = await haalLeerling();
    await api('swigemaakt/cou', {
      methode: 'PUT',
      body: { leerling: { links: [{ id: Number(l.id), rel: 'self', href: `https://api.somtoday.nl/rest/v1/leerlingen/${l.id}` }] }, swiToekenningId: Number(h.id), gemaakt: aan },
    });
  } catch (e) { /* dan blijft het alleen hier afgevinkt */ }
}

// --- berichten ---

const laadBerichten = eenTegelijk(async () => {
  return bezig((async () => {
    const r = await api('boodschappen/conversaties?additional=verzenderCorrespondent&additional=verzondenDoorGebruiker&additional=ontvangerCorrespondenten', { range: 'items=0-99' });
    const lijst = [];
    for (const c of r.data?.items || []) {
      const b = (c.boodschappen || []).slice().sort((x, y) => Date.parse(y.verzendDatum) - Date.parse(x.verzendDatum));
      if (!b.length) continue;
      const laatste = b[0];
      lijst.push({
        id: linkId(c) || linkId(laatste),
        onderwerp: laatste.onderwerp || '(geen onderwerp)',
        van: laatste.additionalObjects?.verzenderCorrespondent?.naam || '',
        datum: Date.parse(laatste.verzendDatum) || 0,
        berichten: b.reverse().map((x) => ({
          id: linkId(x),
          van: x.additionalObjects?.verzenderCorrespondent?.naam || '',
          zelf: !!x.additionalObjects?.verzondenDoorGebruiker,
          datum: Date.parse(x.verzendDatum) || 0,
          inhoud: x.inhoud || '',
          bijlagen: (x.bijlages || []).map((a) => { const f = a.assemblyResults?.[0] || {}; return { naam: f.fileName || 'Bijlage', url: f.sslUrl || f.fileUrl }; }).filter((a) => a.url),
        })),
      });
    }
    lijst.sort((a, b) => b.datum - a.datum);
    if (!state.berichten) for (const c of lijst) state.gelezen[c.id] = c.datum; // eerste keer: alles gelezen
    zet('gelezen', state.gelezen);
    state.berichten = { lijst, t: Date.now() };
    zet('berichten', state.berichten);
    renderBadge();
    return state.berichten;
  })());
});
const ongelezen = () => (state.berichten?.lijst || []).filter((c) => (state.gelezen[c.id] || 0) < c.datum && !c.berichten[c.berichten.length - 1]?.zelf).length;
function renderBadge() {
  const n = ongelezen();
  $('#msgBadge').hidden = !n;
  $('#msgBadge').textContent = n > 9 ? '9+' : String(n);
}

async function laadVakanties() {
  try {
    const l = await haalLeerling();
    const r = await api(`vakanties/leerling/${l.id}`);
    state.vakanties = (r.data?.items || []).map((v) => ({ naam: v.naam, b: Date.parse(v.beginDatum), e: Date.parse(v.eindDatum) })).filter((v) => v.b);
    zet('vakanties', state.vakanties);
  } catch (e) {}
}

// ---------- weergave ----------

const TITELS = { vandaag: 'Vandaag', rooster: 'Rooster', cijfers: 'Cijfers', huiswerk: 'Huiswerk' };
const views = { vandaag: renderVandaag, rooster: renderRooster, cijfers: renderCijfers, huiswerk: renderHuiswerk };

function render() {
  const v = state.view;
  $('#title').textContent = TITELS[v];
  $('#kicker').textContent = '';
  views[v]();
  fillIcons($('#view'));
  renderNav();
}

function renderNav() {
  const tabs = ['vandaag', 'rooster', 'cijfers', 'huiswerk'];
  $$('#navPill [data-nav]').forEach((b) => b.setAttribute('aria-current', String(b.dataset.nav === state.view)));
  $('#navInd').style.transform = `translateX(${tabs.indexOf(state.view) * 100}%)`;
  syncGlassBar();
}

function setView(v, richting = 0) {
  if (!views[v]) return;
  const vorige = state.view;
  state.view = v;
  zet('view', v);
  render();
  const el = $('#view');
  if (vorige !== v) el.scrollTop = 0;
  if (richting) {
    el.classList.remove('swipe-l', 'swipe-r');
    void el.offsetWidth;
    el.classList.add(richting > 0 ? 'swipe-l' : 'swipe-r');
  }
  ververs(v, true);
}
window.scorroTab = (t) => {
  if (t === 'berichten') { berichtenSheet(); return true; }
  setView(t);
  return true;
};

// Op de achtergrond bijwerken wat bij dit scherm hoort (stil: geen foutmelding als er al iets staat).
const laatst = {};
function ververs(v = state.view, stil = false) {
  const nu = Date.now();
  const oud = (k, ms) => { if (!stil || !laatst[k] || nu - laatst[k] > ms) { laatst[k] = nu; return true; } return false; };
  const klaar = () => views[state.view] && render();
  const fout = (e) => { if (!stil) toast(e.message); };
  const taken = [];
  if (v === 'vandaag' || v === 'rooster') {
    const maandag = v === 'rooster' ? state.maandag : maandagVan(new Date());
    if (oud('week' + weekSleutel(maandag), 60000)) taken.push(laadWeek(maandag));
    if (v === 'vandaag') {
      const volgende = plusDagen(maandagVan(new Date()), 7);
      if (oud('week' + weekSleutel(volgende), 300000)) taken.push(laadWeek(volgende));
    }
  }
  if ((v === 'vandaag' || v === 'cijfers') && oud('cijfers', 120000)) taken.push(laadCijfers());
  if ((v === 'vandaag' || v === 'huiswerk' || v === 'rooster') && oud('huiswerk', 120000)) taken.push(laadHuiswerk());
  if (oud('berichten', 300000)) taken.push(laadBerichten().catch(() => {}));
  if (!state.vakanties && oud('vakanties', 3600000)) taken.push(laadVakanties());
  for (const t of taken) t.then(klaar, fout);
}

// --- Vandaag ---

function huiswerkLijst() {
  const lijst = (state.huiswerk?.lijst || []).slice();
  for (const t of state.eigen) lijst.push({ ...t, eigen: true, type: t.toets ? 'TOETS' : 'HUISWERK', html: esc(t.notitie || '').replace(/\n/g, '<br>'), bijlagen: [] });
  return lijst.sort((a, b) => a.datum - b.datum);
}

function renderVandaag() {
  const view = $('#view');
  const nu = Date.now();
  const vandaag = middernacht(new Date());
  const naam = state.leerling?.roepnaam;
  const u = new Date().getHours();
  $('#kicker').textContent = `${u < 6 ? 'Goedenacht' : u < 12 ? 'Goedemorgen' : u < 18 ? 'Goedemiddag' : 'Goedenavond'}${naam ? ', ' + naam : ''}`;
  $('#title').textContent = hoofd(`${DAGEN[vandaag.getDay()]} ${vandaag.getDate()} ${MAANDEN[vandaag.getMonth()].slice(0, 3)}`);

  let html = '';
  const geladen = state.weken[weekSleutel(vandaag)];
  const lessen = lessenOp(vandaag);
  const echt = lessen.filter((l) => !l.uitval);
  const bezigMet = echt.find((l) => nu >= l.b && nu < l.e);
  const straks = echt.find((l) => l.b > nu);

  // Volgende schooldag met lessen (voor na school en in het weekend)
  let volgendeDag = null;
  for (let i = 1; i <= 10 && !volgendeDag; i++) {
    const d = plusDagen(vandaag, i);
    const l = lessenOp(d).filter((x) => !x.uitval);
    if (l.length) volgendeDag = { d, l };
  }

  if (!geladen && !state.cijfers) {
    html += '<div class="skel" style="height:130px"></div><div class="skel"></div><div class="skel"></div>';
  } else if (bezigMet) {
    const p = Math.min(100, Math.max(0, ((nu - bezigMet.b) / (bezigMet.e - bezigMet.b)) * 100));
    html += `<button class="hero card-btn" data-les="${esc(bezigMet.id)}"><small>Nu${bezigMet.uur ? ` · ${bezigMet.uur}e uur` : ''}</small><b>${esc(bezigMet.vak)}</b>
      <span>${esc([bezigMet.plek, `nog ${Math.max(1, Math.round((bezigMet.e - nu) / 60000))} min`].filter(Boolean).join(' · '))}${straks ? ` · daarna ${esc(straks.vak)}${straks.plek ? ' in ' + esc(straks.plek) : ''}` : ''}</span>
      <div class="bar"><i style="width:${p}%"></i></div></button>`;
  } else if (straks) {
    html += `<button class="hero card-btn" data-les="${esc(straks.id)}"><small>Straks${straks.uur ? ` · ${straks.uur}e uur` : ''}</small><b>${esc(straks.vak)}</b>
      <span>${hoofd(overHoeLang(straks.b - nu))} · ${hhmm(straks.b)}${straks.plek ? ' · ' + esc(straks.plek) : ''}</span></button>`;
  } else if (echt.length) {
    html += `<div class="hero"><small>Klaar voor vandaag</small><b>Lekker gedaan!</b><span>${volgendeDag ? `${hoofd(dagNaam(volgendeDag.d))} begin je om ${hhmm(volgendeDag.l[0].b)}${volgendeDag.l[0].uur ? ` (${volgendeDag.l[0].uur}e uur)` : ''}` : 'Geen lessen meer in zicht.'}</span></div>`;
  } else {
    const vak = (state.vakanties || []).find((v) => nu >= v.b && nu <= v.e + DAY);
    html += `<div class="hero"><small>${vak ? esc(vak.naam) : [0, 6].includes(vandaag.getDay()) ? 'Weekend' : 'Vrij'}</small><b>${vak ? 'Vakantie!' : 'Geen lessen vandaag'}</b><span>${volgendeDag ? `${hoofd(dagNaam(volgendeDag.d))} begin je om ${hhmm(volgendeDag.l[0].b)}` : ''}</span></div>`;
  }

  // Uitval vandaag en morgen
  const morgen = volgendeDag?.d;
  const uitval = [...lessen.filter((l) => l.uitval && l.e > nu), ...(morgen ? lessenOp(morgen).filter((l) => l.uitval) : [])];
  if (uitval.length) {
    html += `<button class="alert" data-goto="rooster" data-dag="${zelfdeDag(uitval[0].b, vandaag) ? ymd(vandaag) : ymd(morgen)}">${icon('alert')}<span>${uitval.length === 1
      ? `${esc(uitval[0].vak)} vervalt ${dagNaam(uitval[0].b)}${uitval[0].uur ? ` (${uitval[0].uur}e uur)` : ''}`
      : `${uitval.length} lessen vervallen: ${uitval.slice(0, 3).map((l) => `${esc(l.vak)} ${dagNaam(l.b)}`).join(', ')}`}</span></button>`;
  }

  // Lessen van vandaag in het kort
  if (lessen.length) {
    html += `<div class="h">Rooster vandaag<button data-goto="rooster" data-dag="${ymd(vandaag)}">Hele week</button></div><div class="lessons">${lessenHtml(lessen, true)}</div>`;
  }

  // Huiswerk dat eraan komt
  const hw = huiswerkLijst();
  const grens = (volgendeDag ? middernacht(volgendeDag.d).getTime() : vandaag.getTime() + DAY) + DAY;
  const voorMorgen = hw.filter((h) => !isGemaakt(h) && h.datum >= vandaag.getTime() && h.datum < grens && h.soort !== 'week');
  const toetsen = hw.filter((h) => isToets(h) && h.datum >= vandaag.getTime() && h.datum < vandaag.getTime() + 15 * DAY);
  if (voorMorgen.length) {
    html += `<div class="h">Huiswerk voor ${volgendeDag && !echt.some((l) => l.b > nu) ? dagNaam(volgendeDag.d) : 'vandaag en morgen'}<button data-goto="huiswerk">Alles</button></div><div class="list">${voorMorgen.map(hwHtml).join('')}</div>`;
  } else if (state.huiswerk) {
    html += `<div class="h">Huiswerk</div><div class="alert sun" style="margin-top:0">${icon('check')}<span>Niets meer te doen voor ${volgendeDag ? dagNaam(volgendeDag.d) : 'morgen'}. Top!</span></div>`;
  }
  if (toetsen.length) {
    html += `<div class="h">Toetsen komende twee weken</div><div class="list">${toetsen.map((h) => `<button class="item" data-hw="${esc(h.id)}">
      <div class="datum-blok" style="--c:${kleur(h.vak)}"><small>${DAGEN[new Date(h.datum).getDay()].slice(0, 2)}</small>${new Date(h.datum).getDate()}</div>
      <div class="item-main"><span class="item-t">${esc(h.titel)}</span><span class="item-s">${esc(h.vak)}${h.type === 'GROTE_TOETS' ? ' · grote toets' : ''}</span></div>
      <div class="item-r">${hoofd(dagNaam(h.datum, false))}</div></button>`).join('')}</div>`;
  }

  // Laatste cijfers
  const cijfers = state.cijfers?.cijfers || [];
  if (cijfers.length) {
    const gezien = new Set(state.gezienCijfers || []);
    html += `<div class="h">Laatste cijfers<button data-goto="cijfers">Alle cijfers</button></div><div class="mini">${cijfers.slice(0, 8).map((c) => `<button class="mini-grade${c.voldoende === false ? ' bad' : ''}${gezien.has(c.id) ? '' : ' nieuw'}" data-cijfer="${esc(c.id)}">
      <b>${state.verborgen && !gezien.has(c.id) ? '?' : esc(c.tekst)}</b><span>${esc(c.vak)}</span></button>`).join('')}</div>`;
  }

  // Vakantie
  const vak = (state.vakanties || []).filter((v) => v.b > nu).sort((a, b) => a.b - b.b)[0];
  if (vak) {
    const dagen = Math.ceil((middernacht(new Date(vak.b)) - vandaag) / DAY);
    html += `<div class="h">Volgende vakantie</div><div class="list"><div class="item">${icon('sun')}<div class="item-main"><span class="item-t">${esc(vak.naam)}</span><span class="item-s">${datumKort(vak.b)} – ${datumKort(vak.e)}</span></div><div class="item-r"><b class="num" style="font-size:18px;color:var(--text)">${dagen}</b>${dagen === 1 ? 'dag' : 'dagen'}</div></div></div>`;
  }
  view.innerHTML = html;
}

// --- Rooster ---

function lessenHtml(lessen, kort = false) {
  const nu = Date.now();
  let html = '';
  const hw = huiswerkLijst();
  lessen.forEach((l, i) => {
    const vorige = lessen[i - 1];
    if (!kort && vorige && l.b - vorige.e >= 10 * 60000) html += `<div class="pauze">${Math.round((l.b - vorige.e) / 60000)} min pauze</div>`;
    const lopend = nu >= l.b && nu < l.e && !l.uitval;
    const opLes = hw.filter((h) => h.soort === 'afspraak' && zelfdeDag(h.datum, l.b) && h.vak && (h.vak === l.vak || (h.afk && h.afk === l.afk)));
    const flags = [];
    if (l.uitval) flags.push(`<span class="tag bad">${esc(l.letOp || 'Vervalt')}</span>`);
    else if (l.letOp) flags.push(`<span class="tag sun">${esc(l.letOp)}</span>`);
    for (const h of opLes) flags.push(`<span class="tag ${isToets(h) ? 'bad' : isGemaakt(h) ? 'good' : 'acc'}">${isToets(h) ? 'Toets' : isGemaakt(h) ? '✓ Huiswerk' : 'Huiswerk'}</span>`);
    html += `<button class="les${l.uitval ? ' uitval' : ''}${lopend ? ' nu' : ''}${l.e < nu && kort ? ' voorbij' : ''}" data-les="${esc(l.id)}">
      <div class="uur" style="background:${kleur(l.vak)}">${l.uur || '·'}</div>
      <div class="item-main"><span class="vak">${esc(l.vak)}</span><span class="sub">${esc([l.plek, l.docent].filter(Boolean).join(' · ') || l.soort)}</span>${flags.length ? `<div class="flags">${flags.join('')}</div>` : ''}</div>
      <div class="tijd"><b>${hhmm(l.b)}</b>${hhmm(l.e)}</div>
      ${lopend ? `<i class="voortgang" style="width:${((nu - l.b) / (l.e - l.b)) * 100}%"></i>` : ''}</button>`;
  });
  return html;
}

function renderRooster() {
  const view = $('#view');
  const w = isoWeek(state.maandag);
  const lessen = state.weken[weekSleutel(state.maandag)];
  const vandaag = middernacht(new Date());
  $('#kicker').textContent = `Week ${w.week}`;
  let html = `<div class="week-top"><button class="icon-btn" data-week="-1" aria-label="Vorige week">${icon('back')}</button>
    <b>${datumKort(state.maandag)} – ${datumKort(plusDagen(state.maandag, 4))}</b>
    <div class="row">${weekSleutel(state.maandag) !== weekSleutel(maandagVan(vandaag)) || !zelfdeDag(state.gekozen, vandaag) ? '<button class="btn small" data-week="0">Vandaag</button>' : ''}<button class="icon-btn" data-week="1" aria-label="Volgende week">${icon('next')}</button></div></div>`;
  html += '<div class="days">';
  for (let i = 0; i < 5; i++) {
    const d = plusDagen(state.maandag, i);
    const dl = lessen ? lessen.filter((l) => zelfdeDag(l.b, d)) : null;
    html += `<button data-dag="${ymd(d)}" aria-pressed="${zelfdeDag(d, state.gekozen)}" class="${zelfdeDag(d, vandaag) ? 'today' : ''} ${dl && !dl.length ? 'leeg' : ''}">
      <span>${DAGEN[d.getDay()].slice(0, 2)}</span><b>${d.getDate()}</b>${dl?.some((l) => l.uitval) ? '<i></i>' : ''}</button>`;
  }
  html += '</div>';
  if (!lessen) {
    html += '<div class="skel"></div><div class="skel"></div><div class="skel"></div><div class="skel"></div>';
  } else {
    const dag = lessen.filter((l) => zelfdeDag(l.b, state.gekozen));
    const vak = (state.vakanties || []).find((v) => state.gekozen.getTime() >= middernacht(new Date(v.b)).getTime() && state.gekozen.getTime() <= v.e);
    if (!dag.length) html += `<div class="empty">${icon('sun')}<b>${vak ? esc(vak.naam) : 'Geen lessen'}</b>${vak ? 'Geniet ervan!' : 'Er staat niets in het rooster voor deze dag.'}</div>`;
    else {
      const echt = dag.filter((l) => !l.uitval);
      if (echt.length) $('#kicker').textContent = `Week ${w.week} · ${hhmm(echt[0].b)} – ${hhmm(echt[echt.length - 1].e)}`;
      html += `<div class="lessons">${lessenHtml(dag)}</div>`;
    }
  }
  view.innerHTML = html;
}

function naarWeek(n) {
  if (n === 0) {
    const v = middernacht(new Date());
    let m = maandagVan(v), g = v;
    if (v.getDay() === 0 || v.getDay() === 6) { m = plusDagen(m, 7); g = m; }
    state.maandag = m; state.gekozen = g;
  } else {
    state.maandag = plusDagen(state.maandag, 7 * n);
    state.gekozen = plusDagen(state.maandag, Math.min(4, (state.gekozen.getDay() + 6) % 7));
  }
  render();
  ververs('rooster', true);
}

function veegDag(r) {
  const nr = (state.gekozen.getDay() + 6) % 7 + r;
  if (nr > 4) { state.maandag = plusDagen(state.maandag, 7); state.gekozen = state.maandag; ververs('rooster', true); }
  else if (nr < 0) { state.maandag = plusDagen(state.maandag, -7); state.gekozen = plusDagen(state.maandag, 4); ververs('rooster', true); }
  else state.gekozen = plusDagen(state.maandag, nr);
  haptic();
  render();
  const el = $('.lessons') || $('.empty');
  if (el) { el.classList.add(r > 0 ? 'swipe-l' : 'swipe-r'); el.style.animation = `${r > 0 ? 'in-l' : 'in-r'} 200ms cubic-bezier(.2,.8,.2,1)`; }
}

// --- Cijfers ---

function gradeCls(c) {
  if (c.cijfer == null) return 'txt' + (c.voldoende === false ? ' bad' : '');
  return c.voldoende === false || c.cijfer < 5.5 ? 'bad' : c.cijfer >= 8 ? 'top' : '';
}
function cijferRij(c, gezien) {
  const nieuw = !gezien.has(c.id);
  const verborgen = state.verborgen && nieuw;
  const bits = [c.omschrijving || c.vak];
  if (c.weging) bits.push(`${fmt(c.weging, c.weging % 1 ? 1 : 0)}x`);
  return `<button class="item${nieuw ? ' nieuw' : ''}" data-cijfer="${esc(c.id)}">
    <div class="grade ${verborgen ? 'verborgen' : gradeCls(c)}">${verborgen ? '?' : esc(c.tekst)}</div>
    <div class="item-main"><span class="item-t">${esc(c.vak)}</span><span class="item-s">${esc(bits.join(' · '))}${c.herkansing ? ' · herkansing' : ''}${!c.telt ? ' · telt niet mee' : ''}</span></div>
    <div class="item-r">${datumKort(c.datum)}</div></button>`;
}

function spark(lijst, w = 140, h = 26) {
  const p = lijst.filter((c) => c.cijfer != null).sort((a, b) => a.datum - b.datum).slice(-10);
  if (p.length < 2) return '';
  const x = (i) => (i / (p.length - 1)) * w;
  const y = (v) => h - ((Math.max(1, Math.min(10, v)) - 1) / 9) * h;
  const d = p.map((c, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(c.cijfer).toFixed(1)}`).join('');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><line x1="0" x2="${w}" y1="${y(5.5)}" y2="${y(5.5)}" stroke="var(--bad)" stroke-opacity=".35" stroke-dasharray="3 3" vector-effect="non-scaling-stroke"/><path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`;
}

function renderCijfers() {
  const view = $('#view');
  const data = state.cijfers;
  if (!data) { view.innerHTML = '<div class="skel"></div><div class="skel"></div><div class="skel"></div>'; return; }
  const gezien = new Set(state.gezienCijfers || []);
  const perioden = [...new Set(data.cijfers.map((c) => c.periode).filter((p) => p != null))].sort((a, b) => a - b);
  const lijst = data.cijfers.filter((c) => state.periode == null || c.periode === state.periode);
  const vakken = perVak(lijst);
  const gems = vakken.map((v) => v.gem).filter((g) => g != null);
  const totaal = gems.length ? gems.reduce((a, b) => a + b, 0) / gems.length : null;
  const onv = vakken.filter((v) => v.gem != null && v.gem < 5.5).length;

  let html = `<div class="seg" role="radiogroup" id="cijferSeg"><button role="radio" data-tab="recent" aria-checked="${state.cijferTab === 'recent'}">Recent</button><button role="radio" data-tab="vakken" aria-checked="${state.cijferTab === 'vakken'}">Per vak</button></div>`;
  if (perioden.length > 1) {
    html += `<div class="chips"><button class="chip" data-periode="" aria-pressed="${state.periode == null}">Heel jaar</button>${perioden.map((p) => `<button class="chip" data-periode="${p}" aria-pressed="${state.periode === p}">Periode ${p}</button>`).join('')}</div>`;
  }
  html += `<div class="stats"><div class="stat"><b class="${totaal != null && totaal < 5.5 ? 'bad' : ''}">${fmt(totaal)}</b><span>gemiddeld</span></div><div class="stat"><b>${lijst.length}</b><span>cijfers</span></div><div class="stat"><b style="color:${onv ? 'var(--bad)' : 'var(--good)'}">${onv}</b><span>${onv === 1 ? 'onvoldoende' : 'onvoldoendes'}</span></div></div>`;

  if (!lijst.length) html += `<div class="empty">${icon('chart')}<b>Nog geen cijfers</b>Zodra er een cijfer binnenkomt, zie je het hier (en krijg je een melding).</div>`;
  else if (state.cijferTab === 'recent') {
    html += `<div class="h">Nieuwste eerst</div><div class="list">${lijst.slice(0, 120).map((c) => cijferRij(c, gezien)).join('')}</div>`;
  } else {
    html += `<div class="h">Gemiddelden</div><div class="vakken">${vakken.map((v) => `<button class="vak-card" data-vak="${esc(v.vak)}">
      <span class="naam"><i style="background:${kleur(v.vak)}"></i>${esc(v.vak)}</span>
      <b class="${v.gem != null && v.gem < 5.5 ? 'bad' : ''}">${v.gem == null ? esc(v.lijst[0]?.tekst || '–') : fmt(v.gem, 1)}</b>
      <small>${v.lijst.length} ${v.lijst.length === 1 ? 'cijfer' : 'cijfers'}${v.officieel || v.gem == null ? '' : ' · berekend'}</small>${spark(v.lijst)}</button>`).join('')}</div>`;
  }
  view.innerHTML = html;
  glisseMod?.segmenten($('#cijferSeg'));
}

function markeerGezien(ids) {
  const s = new Set(state.gezienCijfers || []);
  let nieuw = false;
  for (const id of ids) if (!s.has(id)) { s.add(id); nieuw = true; }
  if (!nieuw) return;
  state.gezienCijfers = [...s];
  zet('gezienCijfers', state.gezienCijfers);
}

function cijferSheet(id) {
  const c = state.cijfers?.cijfers.find((x) => x.id === id);
  if (!c) return;
  markeerGezien([id]);
  const vak = perVak(state.cijfers.cijfers).find((v) => v.vak === c.vak);
  const zonder = gemiddelde(vak.lijst.filter((x) => x.id !== c.id));
  const effect = vak.eigen && zonder ? vak.eigen.gem - zonder.gem : null;
  openSheet(`<span style="color:${kleur(c.vak)}">${esc(c.vak)}</span><small>${esc(c.omschrijving || 'Cijfer')}</small>`, `
    <div class="group" style="align-items:center;text-align:center">
      <div class="grade ${gradeCls(c)}" style="width:96px;height:96px;border-radius:28px;font-size:44px">${esc(c.tekst)}</div>
      ${effect != null && Math.abs(effect) >= 0.005 ? `<p class="muted">Je gemiddelde ging hierdoor ${effect > 0 ? 'omhoog' : 'omlaag'} met <b style="color:${effect > 0 ? 'var(--good)' : 'var(--bad)'}">${effect > 0 ? '+' : ''}${fmt(effect, 2)}</b></p>` : ''}
    </div>
    <div class="group"><dl class="facts">
      <dt>Weging</dt><dd>${c.weging ? fmt(c.weging, c.weging % 1 ? 1 : 0) + 'x' : 'telt niet mee'}</dd>
      ${c.examenWeging ? `<dt>Examenweging</dt><dd>${fmt(c.examenWeging, c.examenWeging % 1 ? 1 : 0)}x</dd>` : ''}
      ${c.periode != null ? `<dt>Periode</dt><dd>${c.periode}</dd>` : ''}
      <dt>Ingevoerd</dt><dd>${hoofd(dagNaam(c.datum))}</dd>
      ${c.herkansing ? `<dt>Herkansing</dt><dd>${esc(c.herkansing)}</dd>` : ''}
      <dt>Gemiddelde ${esc(c.vak.toLowerCase())}</dt><dd>${fmt(vak.gem, 2)}</dd>
    </dl></div>
    <div class="group"><button class="btn" data-vak="${esc(c.vak)}">Alle cijfers voor ${esc(c.vak.toLowerCase())}</button></div>`);
  render();
}

function vakSheet(naam) {
  const vak = perVak(state.cijfers.cijfers).find((v) => v.vak === naam);
  if (!vak) return;
  markeerGezien(vak.lijst.map((c) => c.id));
  const gezien = new Set(state.gezienCijfers);
  const p = vak.lijst.filter((c) => c.cijfer != null).sort((a, b) => a.datum - b.datum);
  // grafiek: cijfers en het lopende gemiddelde
  let grafiek = '';
  if (p.length >= 2) {
    const W = 320, H = 150, pad = 10;
    const x = (i) => pad + (i / (p.length - 1)) * (W - pad * 2);
    const y = (v) => pad + (1 - (Math.max(1, Math.min(10, v)) - 1) / 9) * (H - pad * 2);
    let som = 0, w = 0;
    const loop = p.map((c) => { if (c.telt && c.weging > 0) { som += c.cijfer * c.weging; w += c.weging; } return w ? som / w : c.cijfer; });
    grafiek = `<svg class="chart" viewBox="0 0 ${W} ${H}">
      ${[1, 5.5, 10].map((v) => `<line x1="${pad}" x2="${W - pad}" y1="${y(v)}" y2="${y(v)}" stroke="${v === 5.5 ? 'var(--bad)' : 'var(--line)'}" stroke-dasharray="${v === 5.5 ? '4 4' : ''}" stroke-opacity="${v === 5.5 ? .5 : 1}"/>`).join('')}
      <path d="${loop.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join('')}" fill="none" stroke="var(--sun)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${p.map((c, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(c.cijfer).toFixed(1)}`).join('')}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-opacity=".35"/>
      ${p.map((c, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(c.cijfer).toFixed(1)}" r="4.5" fill="${c.cijfer < 5.5 ? 'var(--bad)' : 'var(--accent)'}" stroke="var(--surface)" stroke-width="2"/>`).join('')}
    </svg><p class="muted" style="font-size:13px;display:flex;gap:14px"><span><b style="color:var(--accent)">●</b> cijfers</span><span><b style="color:var(--sun)">━</b> gemiddelde</span></p>`;
  }
  const doel = Math.min(10, Math.ceil(((vak.gem ?? 5.5) + 0.05) * 2) / 2);
  openSheet(`<span style="color:${kleur(naam)}">${esc(naam)}</span><small>Gemiddeld ${fmt(vak.gem, 2)}${vak.officieel ? '' : ' (berekend)'}</small>`, `
    ${grafiek ? `<div class="group">${grafiek}</div>` : ''}
    <div class="group"><h3>Wat moet ik halen?</h3>
      <div class="calc">
        <label><span class="field-label">Gemiddelde dat je wilt</span><input class="field" id="calcDoel" inputmode="decimal" value="${fmt(doel, 1)}"></label>
        <label><span class="field-label">Weging volgende toets</span><input class="field" id="calcWeging" inputmode="decimal" value="1"></label>
        <div class="calc-out" id="calcOut"></div>
      </div>
    </div>
    <div class="group"><h3>Cijfers</h3><div class="list">${vak.lijst.map((c) => cijferRij(c, gezien)).join('')}</div></div>`);
  const reken = () => {
    const d = getal($('#calcDoel').value), w = getal($('#calcWeging').value);
    const out = $('#calcOut');
    if (d == null || !w || !vak.eigen) { out.innerHTML = '<span class="muted">Vul een gemiddelde en een weging in.</span>'; return; }
    const nodig = (d * (vak.eigen.w + w) - vak.eigen.som) / w;
    out.innerHTML = nodig <= 1 ? `<b style="color:var(--good)">1,0</b><span class="muted">Dat lukt sowieso. Rustig aan!</span>`
      : nodig > 10 ? `<b style="color:var(--bad)">${fmt(nodig)}</b><span class="muted">Helaas, met één toets haal je dat niet meer.</span>`
        : `<b style="color:${nodig >= 8 ? 'var(--bad)' : nodig >= 6.5 ? 'var(--sun-ink)' : 'var(--good)'}">${fmt(Math.ceil(nodig * 10) / 10)}</b><span class="muted">Dat moet je minimaal halen voor een ${fmt(d)}</span>`;
  };
  $('#calcDoel').oninput = $('#calcWeging').oninput = reken;
  reken();
  render();
}

// --- Huiswerk ---

function hwHtml(h) {
  const klaar = isGemaakt(h);
  const tekst = platteTekst(h.html);
  return `<div class="hw${klaar ? ' gemaakt' : ''}" data-hw="${esc(h.id)}" role="button" tabindex="0">
    <button class="check" data-vink="${esc(h.id)}" aria-label="${klaar ? 'Niet gemaakt' : 'Gemaakt'}" aria-pressed="${klaar}">${icon('check')}</button>
    <div class="hw-main"><span class="hw-t">${esc(h.titel)}</span>${tekst && tekst !== h.titel ? `<span class="hw-s">${esc(tekst)}</span>` : ''}
    <div class="hw-meta">${h.vak ? `<span class="vak-dot" style="--c:${kleur(h.vak)}">${esc(h.vak)}</span>` : ''}${h.type === 'GROTE_TOETS' ? '<span class="tag bad">Grote toets</span>' : h.type === 'TOETS' ? '<span class="tag bad">Toets</span>' : ''}${h.soort === 'week' ? '<span class="tag">Hele week</span>' : ''}${h.eigen ? '<span class="tag acc">Eigen taak</span>' : ''}${h.bijlagen.length ? `<span class="tag">${icon('clip')}${h.bijlagen.length}</span>` : ''}</div></div></div>`;
}

function renderHuiswerk() {
  const view = $('#view');
  if (!state.huiswerk && !state.eigen.length) { view.innerHTML = '<div class="skel"></div><div class="skel"></div><div class="skel"></div>'; return; }
  const vandaag = middernacht(new Date()).getTime();
  const alle = huiswerkLijst();
  const tel = {
    open: alle.filter((h) => !isGemaakt(h) && (h.tot || h.datum) >= vandaag).length,
    toetsen: alle.filter((h) => isToets(h) && h.datum >= vandaag).length,
  };
  const filters = { open: 'Te doen', toetsen: 'Toetsen', alles: 'Alles', gemaakt: 'Gemaakt' };
  let lijst = alle;
  if (state.hwFilter === 'open') lijst = alle.filter((h) => !isGemaakt(h) && (h.tot || h.datum) >= vandaag);
  if (state.hwFilter === 'toetsen') lijst = alle.filter((h) => isToets(h) && h.datum >= vandaag);
  if (state.hwFilter === 'gemaakt') lijst = alle.filter(isGemaakt).reverse();
  if (state.hwFilter === 'alles') lijst = alle.filter((h) => (h.tot || h.datum) >= vandaag - 7 * DAY);

  let html = `<div class="chips">${Object.entries(filters).map(([k, t]) => `<button class="chip" data-filter="${k}" aria-pressed="${state.hwFilter === k}">${t}${tel[k] ? ` <small>${tel[k]}</small>` : ''}</button>`).join('')}</div>`;
  if (!lijst.length) {
    html += `<div class="empty">${icon(state.hwFilter === 'open' ? 'check' : 'book')}<b>${state.hwFilter === 'open' ? 'Alles af!' : 'Niets hier'}</b>${state.hwFilter === 'open' ? 'Je hebt geen open huiswerk. Tijd voor iets leukers.' : 'Hier staat (nog) niets.'}</div>`;
  } else {
    // groeperen per dag (weektaken apart bovenaan)
    const week = lijst.filter((h) => h.soort === 'week');
    const rest = lijst.filter((h) => h.soort !== 'week');
    if (week.length && state.hwFilter !== 'gemaakt') html += `<div class="h">Deze week</div><div class="list">${week.map(hwHtml).join('')}</div>`;
    const groepen = new Map();
    for (const h of state.hwFilter === 'gemaakt' ? lijst : rest) {
      const k = ymd(new Date(h.datum));
      if (!groepen.has(k)) groepen.set(k, []);
      groepen.get(k).push(h);
    }
    for (const [, g] of groepen) {
      const d = g[0].datum;
      const verlopen = d < vandaag;
      html += `<div class="h"><span${verlopen ? ' style="color:var(--bad)"' : ''}>${hoofd(dagNaam(d))}${verlopen && state.hwFilter === 'open' ? ' · te laat' : ''}</span>${!['vandaag', 'morgen', 'gisteren'].includes(dagNaam(d)) ? '' : `<span>${datumKort(d)}</span>`}</div><div class="list">${g.map(hwHtml).join('')}</div>`;
    }
  }
  view.innerHTML = html;
}

function huiswerkSheet(id) {
  const h = huiswerkLijst().find((x) => x.id === id);
  if (!h) return;
  openSheet(`${esc(h.titel)}<small>${esc([h.vak, h.soort === 'week' ? `week van ${datumKort(h.datum)}` : hoofd(dagNaam(h.datum))].filter(Boolean).join(' · '))}</small>`, `
    <div class="group">${h.type !== 'HUISWERK' ? `<div><span class="tag bad">${h.type === 'GROTE_TOETS' ? 'Grote toets' : 'Toets'}</span></div>` : ''}
      ${h.html ? `<div class="rich">${veiligeHtml(h.html)}</div>` : '<p class="muted">Geen beschrijving.</p>'}</div>
    ${h.bijlagen.length ? `<div class="group"><h3>Bijlagen</h3><div class="files">${h.bijlagen.map((b, i) => `<button class="file" data-bijlage="${i}">${icon(b.link ? 'link' : 'clip')}<span>${esc(b.naam)}</span>${icon('next')}</button>`).join('')}</div></div>` : ''}
    <div class="group"><div class="row" style="gap:8px">
      <button class="btn ${isGemaakt(h) ? '' : 'primary'}" id="hwVink">${icon('check')}${isGemaakt(h) ? 'Toch niet gemaakt' : 'Gemaakt'}</button>
      ${h.eigen ? `<button class="btn danger" id="hwWeg">${icon('trash')}Verwijderen</button>` : `<button class="btn" id="hwDeel">${icon('share')}Delen</button>`}
    </div></div>`);
  const sheet = $('.sheet');
  $$('[data-bijlage]', sheet).forEach((b) => { b.onclick = () => openUrl(h.bijlagen[+b.dataset.bijlage].url); });
  $('#hwVink').onclick = () => { vink(h.id); closeSheet(); };
  if ($('#hwWeg')) $('#hwWeg').onclick = () => {
    const i = state.eigen.findIndex((t) => t.id === h.id);
    const weg = state.eigen.splice(i, 1)[0];
    zet('eigen', state.eigen);
    closeSheet();
    render();
    toast('Taak verwijderd', { label: 'Ongedaan maken', run: () => { state.eigen.splice(i, 0, weg); zet('eigen', state.eigen); render(); } });
  };
  if ($('#hwDeel')) $('#hwDeel').onclick = () => {
    const t = `${h.vak ? h.vak + ': ' : ''}${h.titel} (${dagNaam(h.datum)})\n${platteTekst(h.html)}`;
    if (native?.share) native.share(h.titel, t); else navigator.clipboard?.writeText(t).then(() => toast('Gekopieerd'));
  };
}

function vink(id) {
  const h = huiswerkLijst().find((x) => x.id === id);
  if (!h) return;
  const aan = !isGemaakt(h);
  haptic(aan ? 'confirm' : 'tick');
  zetGemaakt(h, aan);
  render();
  if (aan) {
    const vandaag = middernacht(new Date()).getTime();
    const over = huiswerkLijst().filter((x) => !isGemaakt(x) && x.datum >= vandaag && x.datum < vandaag + 2 * DAY).length;
    toast(over ? 'Gemaakt!' : 'Alles af voor morgen!', { label: 'Ongedaan maken', run: () => { zetGemaakt(h, false); render(); } });
  }
}

function nieuweTaak() {
  haptic();
  const morgen = plusDagen(new Date(), 1);
  const vakken = [...new Set([...Object.values(state.weken).flat().map((l) => l.vak), ...(state.cijfers?.cijfers || []).map((c) => c.vak)])].filter(Boolean).sort((a, b) => a.localeCompare(b, 'nl'));
  openSheet('Eigen taak', `
    <form id="taakForm" class="group">
      <label><span class="field-label">Wat moet je doen?</span><input class="field" id="tTitel" required maxlength="200" placeholder="bijv. Hoofdstuk 4 leren" autocomplete="off"></label>
      <label><span class="field-label">Vak</span><select class="field" id="tVak"><option value="">Geen vak</option>${vakken.map((v) => `<option>${esc(v)}</option>`).join('')}</select></label>
      <label><span class="field-label">Voor wanneer?</span><input class="field" id="tDatum" type="date" value="${ymd(morgen)}" required></label>
      <label class="opt"><span class="grow">Het is een toets<small>Komt bij je toetsen te staan</small></span><input type="checkbox" class="switch" id="tToets"></label>
      <label><span class="field-label">Notitie</span><textarea class="field" id="tNotitie" rows="3" maxlength="2000"></textarea></label>
      <button class="btn primary big" type="submit">Toevoegen</button>
    </form>`);
  setTimeout(() => $('#tTitel')?.focus(), 250);
  $('#taakForm').onsubmit = (e) => {
    e.preventDefault();
    const [j, m, d] = $('#tDatum').value.split('-').map(Number);
    state.eigen.push({
      id: 'eigen-' + Date.now().toString(36), soort: 'dag', titel: $('#tTitel').value.trim(), vak: $('#tVak').value, afk: '',
      datum: new Date(j, m - 1, d).getTime(), toets: $('#tToets').checked, notitie: $('#tNotitie').value.trim(), gemaakt: false,
    });
    zet('eigen', state.eigen);
    haptic('confirm');
    closeSheet();
    toast('Taak toegevoegd');
    if (state.view !== 'vandaag') setView('huiswerk'); else render();
  };
}

// --- Les ---

function lesSheet(id) {
  const l = Object.values(state.weken).flat().find((x) => x.id === id);
  if (!l) return;
  const hw = huiswerkLijst().filter((h) => zelfdeDag(h.datum, l.b) && h.vak && (h.vak === l.vak || (h.afk && h.afk === l.afk)));
  const rijen = [
    ['Wanneer', `${hoofd(dagNaam(l.b))}, ${hhmm(l.b)} – ${hhmm(l.e)}${l.uur ? ` (${l.uur}${l.tot && l.tot !== l.uur ? '–' + l.tot : ''}e uur)` : ''}`],
    ['Lokaal', l.plek], ['Docent', l.docent], ['Groep', l.groep],
    ['Titel', l.titel !== l.vak && l.titel !== l.afk ? l.titel : ''],
  ].filter((r) => r[1]);
  openSheet(`<span style="color:${l.uitval ? 'var(--muted)' : kleur(l.vak)}">${esc(l.vak)}</span><small>${l.uitval ? 'Vervalt' : l.soort || 'Les'}</small>`, `
    ${l.letOp ? `<div class="group"><div class="alert ${l.uitval ? '' : 'sun'}" style="margin:0">${icon('alert')}<span>${esc(l.letOp)}</span></div></div>` : ''}
    <div class="group"><dl class="facts">${rijen.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl></div>
    ${l.tekst ? `<div class="group"><h3>Omschrijving</h3><div class="rich">${veiligeHtml(l.tekst)}</div></div>` : ''}
    ${hw.length ? `<div class="group"><h3>Huiswerk en toetsen</h3><div class="list">${hw.map(hwHtml).join('')}</div></div>` : ''}`);
}

// --- Berichten ---

function berichtenSheet() {
  const lijst = state.berichten?.lijst;
  openSheet('Berichten', lijst ? (lijst.length ? `<div class="list" style="margin-top:12px">${lijst.map((c) => {
    const nieuw = (state.gelezen[c.id] || 0) < c.datum;
    return `<button class="item${nieuw ? ' nieuw' : ''}" data-conv="${esc(c.id)}"><div class="item-main"><span class="item-t">${esc(c.onderwerp)}</span><span class="item-s">${esc(c.van)}${c.berichten.length > 1 ? ` · ${c.berichten.length} berichten` : ''}</span></div><div class="item-r">${hoofd(dagNaam(c.datum, false))}</div></button>`;
  }).join('')}</div>` : `<div class="empty">${icon('mail')}<b>Geen berichten</b>Je inbox is leeg.</div>`) : '<div class="skel" style="margin-top:12px"></div><div class="skel"></div>');
  if (!lijst) laadBerichten().then(() => { if ($('.sheet')?.dataset.naam === 'Berichten') berichtenSheet(); }, (e) => toast(e.message));
}

function gesprekSheet(id) {
  const c = state.berichten?.lijst.find((x) => x.id === id);
  if (!c) return;
  state.gelezen[c.id] = c.datum;
  zet('gelezen', state.gelezen);
  renderBadge();
  openSheet(`${esc(c.onderwerp)}<small>${esc(c.van)}</small>`, c.berichten.map((b) => `<div class="group">
    <h3>${esc(b.zelf ? 'Jij' : b.van)} · ${hoofd(dagNaam(b.datum))} ${hhmm(b.datum)}</h3>
    <div class="rich">${veiligeHtml(b.inhoud)}</div>
    ${b.bijlagen.length ? `<div class="files">${b.bijlagen.map((a) => `<a class="file" href="${esc(a.url)}" data-ext>${icon('clip')}<span>${esc(a.naam)}</span></a>`).join('')}</div>` : ''}</div>`).join(''), { terug: berichtenSheet });
}

// --- Meer ---

async function afwezigheidSheet() {
  openSheet('Afwezigheid', '<div class="skel" style="margin-top:12px"></div><div class="skel"></div>');
  try {
    const nu = new Date();
    const start = new Date(nu.getMonth() >= 7 ? nu.getFullYear() : nu.getFullYear() - 1, 7, 1);
    const items = await bezig(alles(`absentiemeldingen?begindatumtijd=${ymd(start)}&einddatumtijd=${ymd(plusDagen(nu, 1))}`));
    const lijst = items.map((a) => ({
      b: Date.parse(a.beginDatumTijd), e: Date.parse(a.eindDatumTijd), uur: a.beginLesuur, tot: a.eindLesuur,
      reden: a.absentieReden?.omschrijving || a.absentieReden?.absentieSoort || 'Afwezig',
      geoorloofd: a.absentieReden?.geoorloofd, afgehandeld: a.afgehandeld,
    })).sort((a, b) => b.b - a.b);
    const ongeoorloofd = lijst.filter((a) => a.geoorloofd === false).length;
    if ($('.sheet')?.dataset.naam !== 'Afwezigheid') return;
    $('.sheet-body').innerHTML = `<div class="stats" style="margin-top:14px;grid-template-columns:1fr 1fr"><div class="stat"><b>${lijst.length}</b><span>meldingen dit jaar</span></div><div class="stat"><b style="color:${ongeoorloofd ? 'var(--bad)' : 'var(--good)'}">${ongeoorloofd}</b><span>ongeoorloofd</span></div></div>
      ${lijst.length ? `<div class="group"><div class="list">${lijst.map((a) => `<div class="item"><div class="item-main"><span class="item-t">${esc(a.reden)}</span><span class="item-s">${hoofd(dagNaam(a.b))}${a.uur ? ` · ${a.uur}${a.tot && a.tot !== a.uur ? '–' + a.tot : ''}e uur` : ''}</span></div>${a.geoorloofd === false ? '<span class="tag bad">Ongeoorloofd</span>' : a.geoorloofd ? '<span class="tag good">Geoorloofd</span>' : ''}</div>`).join('')}</div></div>` : `<div class="empty">${icon('check')}<b>Niets gemeld</b>Je bent dit schooljaar nergens afwezig gemeld.</div>`}`;
  } catch (e) {
    if ($('.sheet')?.dataset.naam === 'Afwezigheid') $('.sheet-body').innerHTML = `<div class="empty">${icon('alert')}<b>Lukt niet</b>${esc(e.message)}</div>`;
  }
}

async function leermiddelenSheet() {
  openSheet('Leermiddelen', '<div class="skel" style="margin-top:12px"></div><div class="skel"></div>');
  try {
    const l = await haalLeerling();
    const items = await bezig(alles(`studiemateriaal/algemeen/${l.id}`));
    const lijst = items.map((i) => ({ titel: i.product?.title || i.titel || 'Leermiddel', url: i.product?.url || i.url, uitgever: i.product?.methodeInformatie?.uitgever || i.product?.methodeInformatie?.methode || '' })).filter((x) => x.url);
    if ($('.sheet')?.dataset.naam !== 'Leermiddelen') return;
    $('.sheet-body').innerHTML = lijst.length ? `<div class="group"><div class="files">${lijst.map((x) => `<a class="file" href="${esc(x.url)}" data-ext>${icon('library')}<span>${esc(x.titel)}${x.uitgever ? `<small class="muted" style="display:block;font-weight:500">${esc(x.uitgever)}</small>` : ''}</span>${icon('next')}</a>`).join('')}</div></div>` : `<div class="empty">${icon('library')}<b>Geen leermiddelen</b>Je school heeft hier niets klaargezet.</div>`;
  } catch (e) {
    if ($('.sheet')?.dataset.naam === 'Leermiddelen') $('.sheet-body').innerHTML = `<div class="empty">${icon('alert')}<b>Lukt niet</b>${esc(e.message)}</div>`;
  }
}

async function agendaKoppelen() {
  try {
    const r = await bezig(api('icalendar'));
    const link = r.data?.leerlingICalendarLink || r.data?.link;
    if (!link) throw new Error('Je school staat de agendakoppeling niet toe');
    openSheet('Rooster in je agenda', `<div class="group"><p>Met deze link zet je je SOMtoday-rooster in Google Agenda, Outlook of een andere agenda-app. Hij werkt zichzelf bij.</p>
      <input class="field" readonly value="${esc(link)}" onclick="this.select()">
      <div class="row" style="gap:8px"><button class="btn primary" id="icalOpen">${icon('calendar')}Toevoegen</button><button class="btn" id="icalCopy">Kopiëren</button></div>
      <p class="muted" style="font-size:13px">Deel deze link niet: iedereen met de link kan je rooster zien.</p></div>`);
    $('#icalOpen').onclick = () => openUrl(link.replace(/^https?:/, 'webcal:'));
    $('#icalCopy').onclick = () => navigator.clipboard.writeText(link).then(() => toast('Link gekopieerd'), () => toast('Kopiëren lukte niet'));
  } catch (e) { toast(e.message); }
}

function profielSheet() {
  const l = state.leerling || {};
  openSheet(`${esc(l.naam || 'Profiel')}<small>${esc(native?.school?.() || (demo ? 'Demoschool' : ''))}</small>`, `<div class="group"><dl class="facts" id="profFeiten">${l.nummer ? `<dt>Leerlingnummer</dt><dd>${esc(l.nummer)}</dd>` : ''}</dl></div>`);
  (async () => {
    try {
      const r = await api(`leerlingen/${l.id}/schoolgegevens`);
      const s = r.data || {};
      const extra = [['School', [s.instellingsnaam, s.vestigingsnaam].filter(Boolean).join(', ')], ['Leerjaar', s.leerjaar && s.leerjaar < 20 ? s.leerjaar : ''], ['Mentor', (s.mentoren || []).join(', ')], ['Telefoon school', s.telefoonnummer], ['E-mail school', s.email]];
      const dl = $('#profFeiten');
      if (dl) dl.insertAdjacentHTML('beforeend', extra.filter((x) => x[1]).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join(''));
    } catch (e) {}
  })();
}

function instellingenSheet() {
  const pref = (() => { try { return localStorage.getItem('theme') || 'systeem'; } catch (e) { return 'systeem'; } })();
  let m = {};
  try { m = JSON.parse(native?.meldingen?.() || '{}'); } catch (e) {}
  const mogen = native?.meldingenMogen ? native.meldingenMogen() : true;
  const soorten = [['cijfers', 'Nieuwe cijfers', 'Meteen als een cijfer is ingevoerd'], ['rooster', 'Roosterwijzigingen', 'Uitval en ander lokaal, deze en volgende week'], ['toetsen', 'Nieuwe toetsen', 'Als er een toets bij komt'], ['huiswerk', 'Nieuw huiswerk', 'Elke nieuwe huiswerkopdracht'], ['berichten', 'Berichten', 'Van docenten en mentor']];
  openSheet('Instellingen', `
    <div class="group"><h3>Thema</h3><div class="seg" role="radiogroup" id="themeSeg" style="margin:0">${[['systeem', 'Systeem'], ['licht', 'Licht'], ['donker', 'Donker']].map(([k, t]) => `<button role="radio" data-thema="${k}" aria-checked="${pref === k}">${t}</button>`).join('')}</div></div>
    ${native ? `<div class="group"><h3>Meldingen</h3>
      ${mogen ? '' : `<div class="alert sun" style="margin:0">${icon('bell')}<span>Meldingen staan uit voor Scorroday. <a href="#" id="naarMeldingen">Aanzetten</a></span></div>`}
      <div>${soorten.map(([k, t, s]) => `<label class="opt"><span class="grow">${t}<small>${s}</small></span><input type="checkbox" class="switch" data-melding="${k}" ${m[k] ? 'checked' : ''}></label>`).join('')}
      <label class="opt"><span class="grow">Cijfer in de melding<small>Uit: alleen "nieuw cijfer voor …"</small></span><input type="checkbox" class="switch" data-melding="cijferTonen" ${m.cijferTonen ? 'checked' : ''}></label></div>
      <p class="muted" style="font-size:13px">Scorroday kijkt ongeveer elk kwartier. Android kan dat soms wat uitstellen als je batterij bijna leeg is.</p></div>` : ''}
    <div class="group"><h3>Cijfers</h3><label class="opt" style="border:0"><span class="grow">Nieuwe cijfers eerst verbergen<small>Je ziet een ? tot je erop tikt</small></span><input type="checkbox" class="switch" id="verbergen" ${state.verborgen ? 'checked' : ''}></label></div>
    <div class="group"><h3>App</h3><p class="muted">Scorroday ${esc(native?.appVersion?.() || '')}. Werkt zichzelf vanzelf bij.</p>
      ${native ? '<button class="btn" id="updBtn" style="align-self:flex-start">Zoeken naar updates</button>' : ''}
      <p class="muted" style="font-size:13px">Scorroday is een eigen app en hoort niet bij SOMtoday of Topicus. Je gegevens gaan rechtstreeks tussen je telefoon en SOMtoday.</p></div>`);
  const sheet = $('.sheet');
  $$('#themeSeg button', sheet).forEach((b) => { b.onclick = () => zetThema(b.dataset.thema); });
  glisseMod?.segmenten($('#themeSeg'));
  $$('[data-melding]', sheet).forEach((s) => {
    s.onchange = () => { haptic(); native.setMeldingen(JSON.stringify({ [s.dataset.melding]: s.checked })); };
  });
  $('#naarMeldingen')?.addEventListener('click', (e) => { e.preventDefault(); native.meldingenInstellingen(); });
  $('#verbergen').onchange = (e) => { state.verborgen = e.target.checked; zet('verborgen', state.verborgen); haptic(); render(); };
  $('#updBtn')?.addEventListener('click', () => native.checkForUpdate());
}

function zetThema(k) {
  try { localStorage.setItem('theme', k); } catch (e) {}
  const dark = k === 'donker' || (k === 'systeem' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'donker' : 'licht';
  try { native?.setDark(dark); } catch (e) {}
  $$('#themeSeg button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.thema === k)));
  haptic();
  syncGlassBar();
}

function meerMenu(from) {
  menu(from, [
    { title: state.leerling?.naam || 'Profiel', subtitle: native?.school?.() || (demo ? 'Demo' : ''), icon: 'person', run: profielSheet },
    { separator: true },
    { title: 'Berichten', icon: 'mail', run: berichtenSheet },
    { title: 'Afwezigheid', icon: 'absent', run: afwezigheidSheet },
    { title: 'Leermiddelen', icon: 'library', run: leermiddelenSheet },
    { title: 'Rooster in je agenda', icon: 'calendar', run: agendaKoppelen },
    { separator: true },
    { title: 'Alles verversen', icon: 'sync', run: () => { for (const k in laatst) delete laatst[k]; ververs(state.view, false); if (native?.controleerNu && !demo) native.controleerNu(); } },
    { title: 'Instellingen', icon: 'settings', run: instellingenSheet },
    { title: 'Broncode', icon: 'code', run: () => openUrl(SOURCE) },
    { separator: true },
    { title: demo ? 'Demo stoppen' : 'Uitloggen', icon: 'logout', destructive: true, run: vraagUitloggen },
  ]);
}

function vraagUitloggen() {
  if (demo) return uitgelogd();
  openSheet('Uitloggen?', `<div class="group"><p>Je gegevens worden van deze telefoon gehaald en je krijgt geen meldingen meer.</p><div class="row" style="gap:8px"><button class="btn danger" id="uitJa">Uitloggen</button><button class="btn" id="uitNee">Annuleren</button></div></div>`);
  $('#uitJa').onclick = () => { closeSheet(); uitgelogd(); };
  $('#uitNee').onclick = closeSheet;
}

// ---------- menu's en panelen ----------
// In de Android-app (13+) toont de app zelf een glazen menu; anders een gewoon plat menu.

let menuPicks = new Map();
window.scorroGlassPick = (id) => menuPicks.get(id)?.();

function menu(from, rows) {
  rows = rows.filter(Boolean).map((r, i) => ({ ...r, id: r.id || String(i) }));
  menuPicks = new Map(rows.filter((r) => r.run).map((r) => [r.id, r.run]));
  haptic();
  const box = from.getBoundingClientRect();
  if (native?.glassMenu) {
    try {
      const dark = document.documentElement.dataset.theme === 'donker';
      const items = rows.map(({ run, icon: name, ...r }) => ({ ...r, ...(name ? { icon: ICONS[name] } : {}) }));
      if (native.glassMenu(JSON.stringify({ x: box.left, y: box.top, w: box.width, h: box.height, dark, items }))) return;
    } catch (e) { /* dan het gewone menu */ }
  }
  closeMenu();
  const back = document.createElement('div');
  back.className = 'menu-back';
  const el = document.createElement('div');
  el.className = 'menu';
  el.setAttribute('role', 'menu');
  el.innerHTML = rows.map((r) => r.separator ? '<hr>' : `<button type="button" data-id="${esc(r.id)}" class="${r.destructive ? 'destructive' : ''}">${r.icon ? icon(r.icon) : ''}<span>${esc(r.title)}${r.subtitle ? `<small>${esc(r.subtitle)}</small>` : ''}</span></button>`).join('');
  back.onclick = closeMenu;
  el.onclick = (e) => {
    const b = e.target.closest('button[data-id]');
    if (!b) return;
    closeMenu();
    menuPicks.get(b.dataset.id)?.();
  };
  document.body.append(back, el);
  const w = el.offsetWidth, h = el.offsetHeight;
  el.style.left = `${Math.max(12, Math.min(innerWidth - w - 12, box.right - w))}px`;
  el.style.top = `${Math.max(12, Math.min(innerHeight - h - 12, box.bottom + 6))}px`;
}
function closeMenu() {
  $$('.menu, .menu-back').forEach((e) => e.remove());
}

let sheetTerug = null;
function openSheet(titel, body, { terug = null } = {}) {
  closeSheet(true);
  sheetTerug = terug;
  const back = document.createElement('div');
  back.className = 'sheet-back';
  back.id = 'sheetBack';
  back.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" data-naam="${esc(titel.replace(/<[^>]+>.*$/s, '').replace(/<[^>]+>/g, ''))}">
    <div class="sheet-top">${terug ? `<button class="icon-btn" data-sheet-terug aria-label="Terug">${icon('back')}</button>` : ''}<h2>${titel}</h2><button class="icon-btn" data-sluit aria-label="Sluiten">${icon('close')}</button></div>
    <div class="sheet-body">${body}</div></div>`;
  back.onclick = (e) => { if (e.target === back || e.target.closest('[data-sluit]')) closeSheet(); if (e.target.closest('[data-sheet-terug]')) sheetTerug?.(); };
  document.body.appendChild(back);
  fillIcons(back);
  if (history.state?.sheet !== true) history.pushState({ sheet: true }, '');
  syncGlassBar();
}
function closeSheet(stil = false) {
  const b = $('#sheetBack');
  if (!b) return;
  b.remove();
  if (!stil && history.state?.sheet) history.back();
  syncGlassBar();
}
addEventListener('popstate', () => { if ($('#sheetBack')) closeSheet(true); });

// Terugknop van Android: eerst menu, dan paneel; anders gaat de app weg.
window.scorroBack = () => {
  if ($('.menu')) { closeMenu(); return true; }
  if ($('#sheetBack')) { if (sheetTerug) sheetTerug(); else closeSheet(); return true; }
  if (state.view !== 'vandaag') { setView('vandaag', -1); return true; }
  return false;
};

// ---------- glazen navigatie in de Android-app ----------

let barFrame = 0;
let glisseBar = null;
let glisseMod = null;
function syncGlassBar() {
  const wacht = document.documentElement.classList.contains('glisse') && !glisseBar;
  if (!(glassUi || glisseBar) || wacht || barFrame) return;
  barFrame = requestAnimationFrame(() => {
    barFrame = 0;
    const box = (el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    };
    const names = { vandaag: 'home', rooster: 'calendar', cijfers: 'chart', huiswerk: 'book' };
    const tabs = $$('#navPill [data-nav]').map((b) => ({ id: b.dataset.nav, title: b.textContent.trim(), icon: ICONS[names[b.dataset.nav]] }));
    const visible = !$('#app').hidden && !$('#sheetBack');
    const bar = { pill: box($('#navPill')), add: box($('#navAdd')), tabs, active: state.view, dark: document.documentElement.dataset.theme === 'donker', visible };
    if (glisseBar) {
      return glisseBar.update({ ...bar, tabs: tabs.map((t) => ({ ...t, svg: icon(names[t.id]) })), addSvg: icon('plus'), addLabel: 'Eigen taak' });
    }
    try { native.glassBar(JSON.stringify(bar)); } catch (e) {}
  });
}
window.scorroGlassNav = (id) => (id === 'add' ? nieuweTaak() : navTo(id));
glisse.then((g) => {
  if (g) {
    glisseBar = g.balk({
      onNav: window.scorroGlassNav,
      z: 20,
      onStop: () => {
        glisseBar = glisseMod = null;
        document.documentElement.classList.remove('glisse');
        syncGlassBar();
      },
    });
    glisseMod = g;
  }
  syncGlassBar();
});
addEventListener('resize', syncGlassBar);
$('#view').addEventListener('animationend', syncGlassBar, true);

function navTo(id) {
  haptic();
  if (id === state.view) { $('#view').scrollTo({ top: 0, behavior: 'smooth' }); ververs(id, false); return; }
  const tabs = ['vandaag', 'rooster', 'cijfers', 'huiswerk'];
  setView(id, tabs.indexOf(id) - tabs.indexOf(state.view));
}

// ---------- klikken en vegen ----------

$('#navPill').addEventListener('click', (e) => { const b = e.target.closest('[data-nav]'); if (b) navTo(b.dataset.nav); });
$('#navAdd').addEventListener('click', nieuweTaak);
$('#moreBtn').addEventListener('click', (e) => meerMenu(e.currentTarget));
$('#msgBtn').addEventListener('click', () => { haptic(); berichtenSheet(); });

document.addEventListener('click', (e) => {
  const t = e.target;
  let b;
  if ((b = t.closest('[data-vink]'))) { e.stopPropagation(); vink(b.dataset.vink); return; }
  if ((b = t.closest('[data-goto]'))) {
    if (b.dataset.dag) { const [j, m, d] = b.dataset.dag.split('-').map(Number); state.gekozen = new Date(j, m - 1, d); state.maandag = maandagVan(state.gekozen); }
    if ($('#sheetBack')) closeSheet();
    setView(b.dataset.goto, 1);
    return;
  }
  if ((b = t.closest('[data-les]'))) { haptic(); lesSheet(b.dataset.les); return; }
  if ((b = t.closest('[data-hw]'))) { haptic(); huiswerkSheet(b.dataset.hw); return; }
  if ((b = t.closest('[data-cijfer]'))) { haptic(); cijferSheet(b.dataset.cijfer); return; }
  if ((b = t.closest('[data-vak]'))) { haptic(); vakSheet(b.dataset.vak); return; }
  if ((b = t.closest('[data-conv]'))) { haptic(); gesprekSheet(b.dataset.conv); return; }
  if ((b = t.closest('#view [data-week]'))) { haptic(); naarWeek(+b.dataset.week); return; }
  if ((b = t.closest('#view .days [data-dag]'))) {
    haptic();
    const [j, m, d] = b.dataset.dag.split('-').map(Number);
    state.gekozen = new Date(j, m - 1, d);
    render();
    return;
  }
  if ((b = t.closest('#cijferSeg [data-tab]'))) { haptic(); state.cijferTab = b.dataset.tab; zet('cijferTab', state.cijferTab); render(); return; }
  if ((b = t.closest('#view [data-periode]'))) { haptic(); state.periode = b.dataset.periode === '' ? null : +b.dataset.periode; render(); return; }
  if ((b = t.closest('#view [data-filter]'))) { haptic(); state.hwFilter = b.dataset.filter; render(); return; }
});

// Vegen: in het rooster naar de vorige/volgende dag.
let veeg = null;
$('#view').addEventListener('touchstart', (e) => { veeg = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() }; }, { passive: true });
$('#view').addEventListener('touchend', (e) => {
  if (!veeg) return;
  const dx = e.changedTouches[0].clientX - veeg.x, dy = e.changedTouches[0].clientY - veeg.y;
  const snel = Date.now() - veeg.t < 600;
  veeg = null;
  if (!snel || Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx) * 0.6) return;
  if (state.view === 'rooster') veegDag(dx < 0 ? 1 : -1);
});

// Ververs als je terugkomt in de app, en houd "nu" bij.
document.addEventListener('visibilitychange', () => { if (!document.hidden && !$('#app').hidden) { render(); ververs(state.view, true); } });
setInterval(() => { if (!document.hidden && !$('#app').hidden && ['vandaag', 'rooster'].includes(state.view) && !$('#sheetBack')) render(); }, 30000);
addEventListener('online', setSync);
addEventListener('offline', setSync);

// ---------- inloggen ----------

function toonLogin(fout) {
  $('#app').hidden = true;
  $('#login').hidden = false;
  $('#loginError').hidden = !fout;
  $('#loginError').textContent = fout || '';
  try { native?.setDark(true); } catch (e) {} // lichte statusbalk op het blauw
  syncGlassBar();
}
function startApp() {
  $('#login').hidden = true;
  $('#app').hidden = false;
  try { native?.setDark(document.documentElement.dataset.theme === 'donker'); } catch (e) {}
  render();
  ververs(state.view, false);
  ververs('vandaag', true);
  try { native?.ready?.(); } catch (e) {}
}
function uitgelogd(bericht) {
  if (!demo) try { native?.logout(); } catch (e) {}
  const thema = (() => { try { return localStorage.getItem('theme'); } catch (e) { return null; } })();
  wisAlles();
  try { if (thema) localStorage.setItem('theme', thema); } catch (e) {}
  if (bericht) zet('loginFout', bericht);
  location.reload();
}

$('#loginBtn').addEventListener('click', () => {
  haptic();
  if (!native) { toonLogin('Inloggen kan alleen in de Android-app. Probeer de demo.'); return; }
  $('#loginError').hidden = true;
  native.login();
});
window.scorroIngelogd = (fout) => {
  if (fout != null) { if (fout) toonLogin(fout); return; }
  demo = false;
  zet('demo', null);
  haptic('confirm');
  startApp();
};
$('#demoBtn').addEventListener('click', () => {
  demo = true;
  zet('demo', true);
  haptic();
  startApp();
  toast('Dit is een demo met verzonnen gegevens');
});

fillIcons();
if (demo || native?.ingelogd?.()) startApp();
else { toonLogin(lees('loginFout')); zet('loginFout', null); try { native?.ready?.(); } catch (e) {} }
