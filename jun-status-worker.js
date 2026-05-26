// Cloudflare Worker — Jun status relay
// KV binding: STATUS
// Secret binding: SECRET

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
        'Access-Control-Allow-Headers': 'Content-Type, x-secret',
      }});
    }

    const url = new URL(request.url);

    // Bridge pings this every 2 minutes while Jun is running
    if (request.method === 'POST' && url.pathname === '/ping') {
      const secret = request.headers.get('x-secret');
      if (!env.SECRET || secret !== env.SECRET) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers });
      }
      await env.STATUS.put('jun', JSON.stringify({ online: true, lastPing: Date.now() }));
      return new Response(JSON.stringify({ ok: true }), { headers });
    }

    // Bridge registers its public tunnel URL
    if (request.method === 'POST' && url.pathname === '/tunnel') {
      const secret = request.headers.get('x-secret');
      if (!env.SECRET || secret !== env.SECRET) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers });
      }
      const body = await request.json().catch(() => ({}));
      if (typeof body.url === 'string') {
        await env.STATUS.put('tunnel', body.url);
      }
      return new Response(JSON.stringify({ ok: true }), { headers });
    }

    // Games fetch the tunnel URL
    if (request.method === 'GET' && url.pathname === '/tunnel') {
      const tunnelUrl = (await env.STATUS.get('tunnel')) || '';
      return new Response(JSON.stringify({ url: tunnelUrl }), { headers });
    }

    // Blue sets a custom offline message
    if (request.method === 'POST' && url.pathname === '/message') {
      const secret = request.headers.get('x-secret');
      if (!env.SECRET || secret !== env.SECRET) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers });
      }
      const body = await request.json().catch(() => ({}));
      const msg  = typeof body.message === 'string' ? body.message.slice(0, 120) : '';
      await env.STATUS.put('message', msg);
      return new Response(JSON.stringify({ ok: true, message: msg }), { headers });
    }

    // Website polls this to get status
    if (request.method === 'GET' && url.pathname === '/status') {
      const raw = await env.STATUS.get('jun');
      const msg = (await env.STATUS.get('message')) || '';
      if (!raw) {
        return new Response(JSON.stringify({ online: false, lastSeen: null, message: msg }), { headers });
      }
      const data   = JSON.parse(raw);
      const online = Date.now() - data.lastPing < 5 * 60 * 1000;
      return new Response(JSON.stringify({ online, lastSeen: data.lastPing, message: msg }), { headers });
    }

    return new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers });
  }
};
