// Demo: verzonnen SOMtoday-antwoorden in dezelfde vorm als de echte api, zodat je kunt rondkijken
// zonder in te loggen. Alles is elke keer hetzelfde (vaste "willekeur"), maar beweegt mee met de datum.

const DAY = 86400000;
const VAKKEN = [
  ['Nederlands', 'netl', 'Jansen', 'JAN'], ['Engels', 'entl', 'Smith', 'SMI'], ['Wiskunde B', 'wisb', 'de Vries', 'VRI'],
  ['Natuurkunde', 'nat', 'Bakker', 'BAK'], ['Scheikunde', 'schk', 'Visser', 'VIS'], ['Biologie', 'biol', 'Mulder', 'MUL'],
  ['Geschiedenis', 'ges', 'de Boer', 'BOE'], ['Lichamelijke opvoeding', 'lo', 'Peters', 'PET'], ['Frans', 'fatl', 'Dubois', 'DUB'],
  ['Informatica', 'in', 'Hendriks', 'HEN'],
];
const TIJDEN = [[8, 30], [9, 20], [10, 10], [11, 15], [12, 5], [13, 25], [14, 15], [15, 5]];

let zaad = 7;
const rnd = () => { zaad = (zaad * 16807) % 2147483647; return (zaad - 1) / 2147483646; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const iso = (d) => {
  const z = -d.getTimezoneOffset(), s = z >= 0 ? '+' : '-', p = (n) => String(Math.floor(Math.abs(n))).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00.000${s}${p(z / 60)}:${p(z % 60)}`;
};
const middernacht = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const maandag = (d) => { const m = middernacht(d); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return m; };
const vak = (v) => ({ naam: v[0], afkorting: v[1] });
const lijst = (items) => ({ data: { items }, range: `items 0-${Math.max(0, items.length - 1)}/${items.length}` });

// Rooster van een week: elke dag een vast patroon, met hier en daar uitval of een ander lokaal.
function week(maandagDatum) {
  const items = [];
  const w = Math.round(maandagDatum.getTime() / (7 * DAY));
  for (let d = 0; d < 5; d++) {
    zaad = 1000 + d * 17;
    const uren = d === 2 ? 5 : d === 4 ? 6 : 7;
    for (let u = 0; u < uren; u++) {
      if (d === 3 && u === 0) continue; // donderdag het eerste uur vrij
      const v = VAKKEN[(d * 3 + u * 7) % VAKKEN.length];
      const b = new Date(maandagDatum.getFullYear(), maandagDatum.getMonth(), maandagDatum.getDate() + d, TIJDEN[u][0], TIJDEN[u][1]);
      const e = new Date(b.getTime() + 45 * 60000);
      const uitval = (w + d + u) % 13 === 0;
      const lokaal = (w + d * u) % 17 === 5;
      items.push({
        links: [{ id: `${w}${d}${u}` }],
        beginDatumTijd: iso(b), eindDatumTijd: iso(e), beginLesuur: u + 1, eindLesuur: u + 1,
        locatie: lokaal ? 'Aula' : `${1 + ((d + u) % 3)}${String(10 + ((u * 7 + d) % 20)).padStart(2, '0')}`,
        titel: v[1], omschrijving: '', afspraakType: { naam: 'Les' }, afspraakStatus: uitval ? 'VERVALLEN' : 'ACTIEF',
        vak: vak(v), docentNamen: [v[3]], lesgroepen: [{ naam: `5v${v[1]}2` }],
        statusNotifications: uitval ? [{ status: '4007', message: 'Docent afwezig' }] : lokaal ? [{ status: '3001', message: 'Lokaalwijziging' }] : [],
      });
    }
  }
  return items;
}

function cijfers() {
  zaad = 42;
  const nu = Date.now();
  const items = [];
  const namen = ['SO hoofdstuk 1', 'Toets H2', 'Praktische opdracht', 'SO woordjes', 'Toets H3', 'Mondeling', 'Proefwerk H4', 'Leesdossier'];
  let n = 0;
  for (const v of VAKKEN) {
    if (v[1] === 'lo') {
      items.push({ links: [{ id: 'c' + n++ }], type: 'Toetskolom', geldendResultaat: 'V', isVoldoende: true, weging: 0, datumInvoer: iso(new Date(nu - 20 * DAY)), omschrijving: 'Turnen', periode: 1, vak: vak(v) });
      continue;
    }
    const aantal = 3 + Math.floor(rnd() * 4);
    const basis = 5 + rnd() * 3.5;
    for (let i = 0; i < aantal; i++) {
      const c = Math.max(1, Math.min(10, basis + (rnd() - 0.5) * 3));
      const dagen = 2 + Math.floor(((aantal - i) / aantal) * 80 + rnd() * 6);
      items.push({
        links: [{ id: 'c' + n++ }], type: 'Toetskolom', geldendResultaat: c.toFixed(1), weging: pick([1, 1, 2, 2, 3, 5]),
        datumInvoer: iso(new Date(nu - dagen * DAY)), omschrijving: pick(namen), periode: dagen > 45 ? 1 : 2, vak: vak(v),
        herkansingstype: 'Geen', teltNietmee: false, toetsNietGemaakt: false,
      });
    }
  }
  // het nieuwste cijfer: vanochtend
  items.push({ links: [{ id: 'nieuw1' }], type: 'Toetskolom', geldendResultaat: '8.4', weging: 2, datumInvoer: iso(new Date(nu - 3 * 3600000)), omschrijving: 'Toets H5 mechanica', periode: 2, vak: vak(VAKKEN[3]) });
  return items;
}

function huiswerk(soort) {
  const items = [];
  const vandaag = middernacht(new Date());
  if (soort === 'week') {
    items.push({
      links: [{ id: 'w1' }], weeknummerVanaf: isoWeek(vandaag), weeknummerTm: isoWeek(vandaag),
      studiewijzerItem: { onderwerp: 'Leesverslag inleveren', omschrijving: '<p>Lever je leesverslag van <b>Het Achterhuis</b> deze week in via de ELO.</p>', huiswerkType: 'HUISWERK', bijlagen: [], externeMaterialen: [] },
      lesgroep: { vak: vak(VAKKEN[0]) }, additionalObjects: { swigemaaktVinkjes: { items: [] } },
    });
    return items;
  }
  if (soort === 'dag') return items;
  const taken = [
    [1, 2, 'Opgaven 4.12 t/m 4.20', '<p>Maak opgaven 4.12 t/m 4.20. Let op: bij 4.18 je berekening laten zien.</p>', 'HUISWERK'],
    [1, 1, 'Woordjes unit 5 leren', '<p>Leer de woordjes van unit 5 (A en B).</p>', 'HUISWERK'],
    [2, 3, 'Practicumverslag afmaken', '<p>Maak het verslag af volgens het <a href="https://example.com/format">format</a>.</p>', 'HUISWERK'],
    [3, 2, 'Toets H5', '<p>Stof: hoofdstuk 5 paragraaf 1 t/m 4, plus de vaardigheden uit H4.</p><ul><li>Rekenmachine mee</li><li>Binas mee</li></ul>', 'TOETS'],
    [4, 6, 'Bron 12 t/m 15 analyseren', '<p>Beantwoord de vragen bij bron 12 t/m 15.</p>', 'HUISWERK'],
    [7, 0, 'Proefwerk literatuur', '<p>Literatuurgeschiedenis van de middeleeuwen tot de renaissance.</p>', 'GROTE_TOETS'],
    [9, 8, 'SO grammaire', '<p>Passé composé en imparfait.</p>', 'TOETS'],
    [0, 4, 'Opdracht 3 maken', '<p>Opdracht 3 uit het werkboek.</p>', 'HUISWERK'],
    [-2, 5, 'Samenvatting H3', '<p>Maak een samenvatting van hoofdstuk 3.</p>', 'HUISWERK'],
  ];
  taken.forEach(([dag, v, onderwerp, html, type], i) => {
    let d = new Date(vandaag.getTime() + dag * DAY);
    while (d.getDay() === 0 || d.getDay() === 6) d = new Date(d.getTime() + DAY);
    d.setHours(TIJDEN[i % 5][0], TIJDEN[i % 5][1]);
    items.push({
      links: [{ id: 'h' + i }], datumTijd: iso(d),
      studiewijzerItem: { onderwerp, omschrijving: html, huiswerkType: type, bijlagen: i === 3 ? [{ omschrijving: 'Oefentoets H5.pdf', assemblyResults: [{ sslUrl: 'https://example.com/oefentoets.pdf', fileName: 'Oefentoets H5.pdf' }] }] : [], externeMaterialen: [] },
      lesgroep: { vak: vak(VAKKEN[v]) },
      additionalObjects: { swigemaaktVinkjes: { items: dag < 0 ? [{ links: [{ id: 'g' + i }], gemaakt: true }] : [] } },
    });
  });
  return items;
}

function isoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dag = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dag);
  return Math.ceil(((t - new Date(Date.UTC(t.getUTCFullYear(), 0, 1))) / DAY + 1) / 7);
}

function berichten() {
  const nu = Math.floor(Date.now() / 3600000) * 3600000; // vast per uur, anders lijkt alles steeds nieuw
  const b = (id, van, onderwerp, inhoud, dagen) => ({
    links: [{ id }], onderwerp, inhoud, verzendDatum: iso(new Date(nu - dagen * DAY)),
    additionalObjects: { verzenderCorrespondent: { naam: van }, verzondenDoorGebruiker: false }, bijlages: [],
  });
  return [
    { links: [{ id: 'k1' }], boodschappen: [b('b1', 'M. de Vries', 'Inhaalmoment toets H4', '<p>Beste leerling,</p><p>Het inhaalmoment voor toets H4 is donderdag het 8e uur in lokaal 214.</p><p>Groet, mevrouw De Vries</p>', 0.2)] },
    { links: [{ id: 'k2' }], boodschappen: [b('b2', 'Mentor P. Bakker', 'Ouderavond', '<p>Hallo allemaal,</p><p>Volgende week dinsdag is de ouderavond. Je ouders kunnen zich inschrijven via de mail die ze hebben gekregen.</p>', 4)] },
    { links: [{ id: 'k3' }], boodschappen: [b('b3', 'Roosterbureau', 'Roosterwijziging vanaf maandag', '<p>Vanaf maandag geldt een nieuw rooster. Controleer je rooster in SOMtoday.</p>', 12)] },
  ];
}

export async function antwoord(methode, pad) {
  await new Promise((r) => setTimeout(r, 250 + Math.random() * 350));
  const p = pad.split('?')[0];
  if (methode === 'PUT') return { data: { gemaakt: true } };
  if (p === 'leerlingen') return lijst([{ links: [{ id: 1234 }], roepnaam: 'Sam', achternaam: 'de Groot', leerlingnummer: '102938' }]);
  if (/^leerlingen\/\d+\/schoolgegevens$/.test(p)) return { data: { instellingsnaam: 'Demolyceum', vestigingsnaam: 'Hoofdgebouw', leerjaar: 5, mentoren: ['P. Bakker'], telefoonnummer: '010 123 45 67' } };
  let m = p.match(/^afspraakitems\/\d+\/jaar\/(\d+)\/week\/(\d+)$/);
  if (m) {
    const jan4 = new Date(+m[1], 0, 4);
    return lijst(week(new Date(maandag(jan4).getTime() + (+m[2] - 1) * 7 * DAY + 12 * 3600000)).map((x) => x));
  }
  if (p.startsWith('resultaten/huidigVoorLeerling')) return lijst(cijfers());
  if (p === 'studiewijzeritemafspraaktoekenningen') return lijst(huiswerk('afspraak'));
  if (p === 'studiewijzeritemdagtoekenningen') return lijst(huiswerk('dag'));
  if (p === 'studiewijzeritemweektoekenningen') return lijst(huiswerk('week'));
  if (p === 'boodschappen/conversaties') return lijst(berichten());
  if (p.startsWith('vakanties/leerling')) {
    const j = new Date().getFullYear();
    return lijst([
      { naam: 'Kerstvakantie', beginDatum: iso(new Date(j, 11, 19)), eindDatum: iso(new Date(j + 1, 0, 3)) },
      { naam: 'Voorjaarsvakantie', beginDatum: iso(new Date(j + 1, 1, 13)), eindDatum: iso(new Date(j + 1, 1, 21)) },
    ]);
  }
  if (p === 'absentiemeldingen') {
    const nu = Date.now();
    return lijst([
      { beginDatumTijd: iso(new Date(nu - 9 * DAY)), eindDatumTijd: iso(new Date(nu - 9 * DAY + 3600000)), beginLesuur: 2, eindLesuur: 2, absentieReden: { omschrijving: 'Ziek', geoorloofd: true } },
      { beginDatumTijd: iso(new Date(nu - 30 * DAY)), eindDatumTijd: iso(new Date(nu - 30 * DAY)), beginLesuur: 1, eindLesuur: 1, absentieReden: { omschrijving: 'Te laat', geoorloofd: false } },
    ]);
  }
  if (p.startsWith('studiemateriaal/algemeen')) return lijst([{ product: { title: 'Getal & Ruimte', url: 'https://example.com/gr', methodeInformatie: { uitgever: 'Noordhoff' } } }, { product: { title: 'Nova Natuurkunde', url: 'https://example.com/nova', methodeInformatie: { uitgever: 'Malmberg' } } }]);
  if (p === 'icalendar') return { data: { leerlingICalendarLink: 'https://example.com/demo-rooster.ics' } };
  const f = new Error('Niet in de demo');
  f.status = 404;
  throw f;
}
