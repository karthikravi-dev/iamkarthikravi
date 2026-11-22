/* Private visit counter for karthikravi.in.
   Sends one small record per page view to Karthik's own database (Supabase).
   No cookies, no IP address, no names: the visitor id is a random string kept in this browser.
   Works on any host (Vercel, Cloudflare, GitHub Pages) because it only needs this file. */
(() => {
  try {
    const ENDPOINT = 'https://hqlvxgekstkwiixblqvs.supabase.co/rest/v1/rpc/site_track';
    const KEY = 'sb_publishable_ar_Knucicw2TINEezxnWhw_RTy7LtC-';
    const ua = navigator.userAgent || '';
    if (navigator.webdriver || /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|embedly|whatsapp|telegram|discord|slack/i.test(ua)) return;

    let ls = null, ss = null;
    try { ls = window.localStorage; ss = window.sessionStorage; } catch (e) { /* storage blocked */ }
    if (ls && ls.getItem('kr_ignore') === '1') return; // Karthik's own browsers, set from /stats

    const rid = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') : Math.random().toString(36).slice(2) + Date.now().toString(36)).slice(0, 24);
    const keep = (store, key) => {
      let v = null;
      try { v = store && store.getItem(key); } catch (e) {}
      if (!v || !/^[A-Za-z0-9_-]{8,40}$/.test(v)) { v = rid(); try { store && store.setItem(key, v); } catch (e) {} }
      return v;
    };
    const visitor = keep(ls, 'kr_vid');
    const session = keep(ss, 'kr_sid');

    let path = location.pathname.replace(/\/index\.html?$/i, '/').toLowerCase();
    if (path.length > 1) path = path.replace(/\/+$/, '');

    let referrer = '';
    try {
      const r = new URL(document.referrer);
      if (r.hostname && r.hostname !== location.hostname) referrer = r.hostname.replace(/^www\./, '');
    } catch (e) {}
    const q = new URLSearchParams(location.search);
    const utm = q.get('utm_source') || q.get('ref') || '';

    const device = /iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua)) ? 'Tablet'
      : /Mobi|iPhone|iPod|Android/i.test(ua) ? 'Mobile' : 'Desktop';
    const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\/|Opera/.test(ua) ? 'Opera' : /SamsungBrowser/.test(ua) ? 'Samsung Internet'
      : /Firefox|FxiOS/.test(ua) ? 'Firefox' : /CriOS|Chrome|Chromium/.test(ua) ? 'Chrome' : /Safari/.test(ua) ? 'Safari' : 'Other';
    const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad|iPod/.test(ua) ? 'iOS'
      : /CrOS/.test(ua) ? 'ChromeOS' : /Mac OS X|Macintosh/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Other';
    let tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}

    fetch(ENDPOINT, {
      method: 'POST',
      keepalive: true,
      headers: { apikey: KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p: {
        visitor, session, path, referrer, utm_source: utm, device, browser, os, tz,
        lang: navigator.language || '', screen_w: String(Math.round(window.screen && screen.width || 0)),
      } }),
    }).catch(() => {});
  } catch (e) { /* never break the page */ }
})();
