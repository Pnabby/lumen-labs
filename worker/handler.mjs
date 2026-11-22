const topics = new Set(['Pilot participation', 'Research & accessibility', 'Partnerships & investment', 'Manufacturing & distribution', 'Media enquiry', 'Something else']);
const security = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self'" };
export const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { ...security, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
export async function handleEnquiry(request, env) {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { ...security, Allow: 'POST' } });
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return json({ error: 'Please submit your enquiry from the Lumen Labs website.' }, 403);
  if (!(request.headers.get('content-type') || '').startsWith('application/json')) return json({ error: 'Expected a JSON enquiry.' }, 415);
  if (Number(request.headers.get('content-length')) > 20000) return json({ error: 'Your enquiry is too long.' }, 413);
  let data;
  try { const body = await request.text(); if (new TextEncoder().encode(body).length > 20000) return json({ error: 'Your enquiry is too long.' }, 413); data = JSON.parse(body); } catch { return json({ error: 'Please check your enquiry and try again.' }, 400); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return json({ error: 'Invalid enquiry.' }, 400);
  if (data.website) return json({ error: 'Your enquiry could not be accepted. Please email us directly.' }, 400);
  const clean = key => typeof data[key] === 'string' ? data[key].trim() : '';
  const name = clean('name'), email = clean('email'), organization = clean('organization'), reason = clean('reason'), message = clean('message'), id = clean('id');
  if (!name || name.length > 120 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || organization.length > 180 || !topics.has(reason) || message.length < 10 || message.length > 5000 || data.consent !== true || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return json({ error: 'Please provide a valid name, email, topic, message (10–5,000 characters) and consent.' }, 400);
  if (!env.DB) return json({ error: 'Enquiry storage is temporarily unavailable. Please email lumenlabs@gmail.com directly.' }, 503);
  try {
    const existing = await env.DB.prepare('SELECT id FROM enquiries WHERE id = ?').bind(id).first();
    if (existing) return json({ ok: true, reference: 'LL-' + id.slice(0, 8).toUpperCase() });
    const rate = await env.DB.prepare("SELECT COUNT(*) AS count FROM enquiries WHERE email = ? AND created_at > datetime('now', '-1 hour')").bind(email.toLowerCase()).first();
    if (rate && rate.count >= 5) return json({ error: 'You have sent several enquiries recently. Please try again in an hour or email us directly.' }, 429);
    await env.DB.prepare('INSERT OR IGNORE INTO enquiries (id, name, email, organization, reason, message, consent, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, datetime(\'now\'))').bind(id, name, email.toLowerCase(), organization, reason, message).run();
    return json({ ok: true, reference: 'LL-' + id.slice(0, 8).toUpperCase() }, 201);
  } catch { return json({ error: 'Your enquiry could not be saved. Please try again or email lumenlabs@gmail.com.' }, 503); }
}
export function makeWorker(assets) {
  return { async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === '/api/enquiries') return handleEnquiry(request, env);
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405, headers: { ...security, Allow: 'GET, HEAD' } });
    const asset = assets[path === '/' ? '/index.html' : path];
    if (!asset) return new Response('Page not found. Visit the Lumen Labs home page.', { status: 404, headers: { ...security, 'Content-Type': 'text/plain; charset=utf-8' } });
    const bytes = asset.encoding === 'base64' ? Uint8Array.from(atob(asset.body), c => c.charCodeAt(0)) : asset.body;
    return new Response(request.method === 'HEAD' ? null : bytes, { headers: { ...security, 'Content-Type': asset.type, 'Cache-Control': path.endsWith('.html') || path === '/' ? 'no-cache' : 'public, max-age=3600' } });
  } };
}
