/**
 * Vercel Serverless Function: Mastify Reverse Proxy
 * Menghubungkan Frontend HTTPS (Vercel) ke Backend Mastify IoT (HTTP 178.128.107.238:8080)
 * Mengatasi 100% masalah Mixed Content (HTTPS -> HTTP) & CORS di browser.
 */

export default async function handler(req, res) {
  // 1. Konfigurasi Header CORS Lengkap
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Authorization, Authorization'
  );

  // Handle pre-flight CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 2. Ambil parameter endpoint dari query string
    const { endpoint, ...otherParams } = req.query;

    if (!endpoint) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Parameter "endpoint" wajib disertakan. Contoh: /api/mastify?endpoint=/alarm/DEVICE/...'
      });
    }

    const host = process.env.MASTIFY_HOST || 'http://178.128.107.238:8080';
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    // Buat target URL lengkap
    const targetUrl = new URL(`${host}/api${cleanEndpoint}`);

    // Teruskan query param tambahan jika ada
    for (const [key, val] of Object.entries(otherParams)) {
      if (val !== undefined && val !== null && !targetUrl.searchParams.has(key)) {
        targetUrl.searchParams.append(key, val);
      }
    }

    // 3. Teruskan Header Otentikasi (X-Authorization)
    // Prioritas 1: Gunakan token rahasia dari Environment Variable Vercel (MASTIFY_JWT_TOKEN)
    // Prioritas 2: Fallback ke header otentikasi dari request client jika ada
    const forwardHeaders = {
      'Accept': 'application/json'
    };

    const serverToken = process.env.MASTIFY_JWT_TOKEN;
    const clientAuth = req.headers['x-authorization'] || req.headers['authorization'];

    if (serverToken) {
      forwardHeaders['X-Authorization'] = serverToken.startsWith('Bearer ')
        ? serverToken
        : `Bearer ${serverToken}`;
    } else if (clientAuth) {
      forwardHeaders['X-Authorization'] = clientAuth.startsWith('Bearer ')
        ? clientAuth
        : `Bearer ${clientAuth}`;
    }

    // 4. Lakukan request ke server Mastify via Node.js fetch (bebas Mixed Content)
    const response = await fetch(targetUrl.toString(), {
      method: req.method,
      headers: forwardHeaders
    });

    const responseBody = await response.text();

    res.status(response.status);
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json');
    return res.send(responseBody);

  } catch (error) {
    console.error('[Mastify Proxy Error]:', error);
    return res.status(502).json({
      error: 'Bad Gateway',
      message: 'Proxy Vercel gagal menghubungi server Mastify (178.128.107.238:8080)',
      details: error.message
    });
  }
}
