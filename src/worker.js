// Scorroday: een brug naar SOMtoday. De browser/Lumia mag niet rechtstreeks bij inloggen.somtoday.nl en
// api.somtoday.nl (CORS), dus deze worker stuurt de verzoeken door. Hij bewaart niets: de tokens staan alleen
// op de telefoon.
//   GET  /api/start          nieuwe PKCE-login: { url, verifier, state }
//   POST /api/token          code of refresh_token inwisselen (form: code+verifier of refresh)
//   GET  /api/rest/<pad>?…   doorgeven naar <somtoday_api_url>/rest/v1/<pad> (header X-Api: de api-url)
const KLANT = 'somtoday-leerling-native';
const TERUG = 'somtoday://nl.topicus.somtoday.leerling/oauth/callback';
const INLOG = 'https://inloggen.somtoday.nl';
const CLAIMS = JSON.stringify({
  id_token: { given_name: null, leerlingen: null, orgname: null, affiliation: { values: ['student', 'parent/guardian'] } },
});

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function willekeurig(n, tekens) {
  const b = crypto.getRandomValues(new Uint8Array(n));
  let s = '';
  for (const x of b) s += tekens[x % tekens.length];
  return s;
}

async function start() {
  const verifier = willekeurig(96, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~');
  const state = willekeurig(24, 'abcdefghijklmnopqrstuvwxyz0123456789');
  const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  const p = new URLSearchParams({
    response_type: 'code', client_id: KLANT, redirect_uri: TERUG, scope: 'openid',
    code_challenge: challenge, code_challenge_method: 'S256', state, session: 'no_session', claims: CLAIMS,
  });
  return json({ url: `${INLOG}/oauth2/authorize?${p}`, verifier, state, terug: TERUG });
}

async function token(request) {
  const f = await request.formData();
  const velden = f.get('refresh')
    ? { grant_type: 'refresh_token', refresh_token: f.get('refresh'), client_id: KLANT, scope: 'openid', claims: CLAIMS }
    : { grant_type: 'authorization_code', code: f.get('code') || '', redirect_uri: TERUG, code_verifier: f.get('verifier') || '', client_id: KLANT, scope: 'openid', claims: CLAIMS };
  const r = await fetch(`${INLOG}/oauth2/token`, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(velden),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.access_token) return json({ fout: d.error_description || d.error || `SOMtoday zegt ${r.status}` }, r.status === 400 || r.status === 401 ? 401 : 502);
  let school = '';
  try { school = JSON.parse(atob(d.id_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).orgname || ''; } catch (e) {}
  return json({
    access: d.access_token, refresh: d.refresh_token || f.get('refresh') || null, verloopt: Date.now() + (d.expires_in || 3600) * 1000,
    api: veiligeApi(d.somtoday_api_url), school,
  });
}

// alleen doorsturen naar SOMtoday zelf
function veiligeApi(u) {
  try {
    const x = new URL(u);
    if (x.protocol === 'https:' && (x.hostname === 'somtoday.nl' || x.hostname.endsWith('.somtoday.nl'))) return x.origin;
  } catch (e) {}
  return 'https://api.somtoday.nl';
}

async function rest(request, pad, u) {
  const auth = request.headers.get('authorization') || '';
  if (!/^Bearer [\w.~+/=-]+$/.test(auth) || !/^[\w/-]+$/.test(pad)) return json({ fout: 'ongeldig verzoek' }, 400);
  const headers = { authorization: auth, accept: request.headers.get('x-accept') || 'application/json' };
  const range = request.headers.get('range');
  if (range && /^items=\d+-\d+$/.test(range)) headers.range = range;
  const r = await fetch(`${veiligeApi(request.headers.get('x-api'))}/rest/v1/${pad}${u.search}`, { headers });
  const h = { 'content-type': r.headers.get('content-type') || 'application/json', 'cache-control': 'no-store' };
  if (r.headers.get('content-range')) h['x-content-range'] = r.headers.get('content-range');
  return new Response(r.body, { status: r.status, headers: h });
}

export default {
  async fetch(request, env) {
    const u = new URL(request.url);
    const p = u.pathname;
    try {
      if (p === '/api/start') return await start();
      if (p === '/api/token' && request.method === 'POST') return await token(request);
      const m = p.match(/^\/api\/rest\/(.+)$/);
      if (m && request.method === 'GET') return await rest(request, m[1], u);
      if (p === '/api/wplog' && request.method === 'POST') {
        console.log('wplog', (await request.text()).slice(0, 2000));
        return new Response(null, { status: 204 });
      }
    } catch (e) {
      return json({ fout: 'SOMtoday is niet bereikbaar' }, 502);
    }
    if (p.startsWith('/api/')) return json({ fout: 'onbekend' }, 404);
    return env.ASSETS.fetch(request);
  },
};
