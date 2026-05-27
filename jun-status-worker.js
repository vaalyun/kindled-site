// Cloudflare Worker — Jun status relay
// KV binding: STATUS
// Secret bindings: SECRET (Jun bridge), ADMIN_SECRET (set-status admin tool)

export default {
  async fetch(request, env) {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Content-Type': 'application/json',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-secret, x-admin',
      }});
    }

    const url = new URL(request.url);

    // ── Jun bridge routes (use SECRET) ──────────────────────────

    // Bridge pings every 2 minutes while Jun is running
    if (request.method === 'POST' && url.pathname === '/ping') {
      if (!checkSecret(request, env)) return unauthorized(headers);
      await env.STATUS.put('jun', JSON.stringify({ online: true, lastPing: Date.now() }));
      return ok(headers);
    }

    // Bridge registers its public tunnel URL
    if (request.method === 'POST' && url.pathname === '/tunnel') {
      if (!checkSecret(request, env)) return unauthorized(headers);
      const body = await request.json().catch(() => ({}));
      if (typeof body.url === 'string') await env.STATUS.put('tunnel', body.url);
      return ok(headers);
    }

    // ── Admin routes (use ADMIN_SECRET) ─────────────────────────

    // Admin sets offline message
    if (request.method === 'POST' && url.pathname === '/admin/message') {
      if (!checkAdmin(request, env)) return unauthorized(headers);
      const body = await request.json().catch(() => ({}));
      const msg  = typeof body.message === 'string' ? body.message.slice(0, 120) : '';
      await env.STATUS.put('message', msg);
      return new Response(JSON.stringify({ ok: true, message: msg }), { headers });
    }

    // Admin manually updates tunnel URL
    if (request.method === 'POST' && url.pathname === '/admin/tunnel') {
      if (!checkAdmin(request, env)) return unauthorized(headers);
      const body = await request.json().catch(() => ({}));
      if (typeof body.url === 'string') await env.STATUS.put('tunnel', body.url);
      return ok(headers);
    }

    // ── Public read routes ───────────────────────────────────────

    // Games fetch the tunnel URL
    if (request.method === 'GET' && url.pathname === '/tunnel') {
      const tunnelUrl = (await env.STATUS.get('tunnel')) || '';
      return new Response(JSON.stringify({ url: tunnelUrl }), { headers });
    }

    // Website polls for online status
    if (request.method === 'GET' && url.pathname === '/status') {
      const raw = await env.STATUS.get('jun');
      const msg = (await env.STATUS.get('message')) || '';
      if (!raw) return new Response(JSON.stringify({ online: false, lastSeen: null, message: msg }), { headers });
      const data   = JSON.parse(raw);
      const online = Date.now() - data.lastPing < 5 * 60 * 1000;
      return new Response(JSON.stringify({ online, lastSeen: data.lastPing, message: msg }), { headers });
    }

    return new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers });
  }
};

function checkSecret(request, env) {
  return env.SECRET && request.headers.get('x-secret') === env.SECRET;
}

function checkAdmin(request, env) {
  return env.ADMIN_SECRET && request.headers.get('x-admin') === env.ADMIN_SECRET;
}

function ok(headers) {
  return new Response(JSON.stringify({ ok: true }), { headers });
}

function unauthorized(headers) {
  return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers });
}
