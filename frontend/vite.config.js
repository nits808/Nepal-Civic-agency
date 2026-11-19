import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const rssProxyPlugin = () => ({
  name: 'rss-proxy',
  configureServer(server) {
    server.middlewares.use('/api/rss', async (req, res) => {
      try {
        const targetUrl = new URL(req.url, `http://${req.headers.host}`).searchParams.get('url');
        if (!targetUrl) {
          res.statusCode = 400;
          return res.end('Missing url parameter');
        }

        let parsed;
        try {
          parsed = new URL(targetUrl);
        } catch {
          res.statusCode = 400;
          return res.end('Invalid URL');
        }

        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
          res.statusCode = 403;
          return res.end('Forbidden protocol');
        }

        const host = parsed.hostname.toLowerCase();
        if (
          host === 'localhost' ||
          host === '127.0.0.1' ||
          host === '::1' ||
          host.startsWith('10.') ||
          host.startsWith('192.168.') ||
          host.startsWith('169.254.') ||
          /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)
        ) {
          res.statusCode = 403;
          return res.end('Access to private network denied');
        }

        const fetchRes = await fetch(targetUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NCIG-Bot/3.0)' },
          signal: AbortSignal.timeout(8000),
        });

        const arrayBuffer = await fetchRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        res.setHeader('Content-Type', fetchRes.headers.get('content-type') || 'application/xml');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.statusCode = fetchRes.status;
        res.end(buffer);
      } catch (err) {
        res.statusCode = 500;
        res.end('Proxy Error: ' + err.message);
      }
    });
  },
});

export default defineConfig({
  plugins: [react(), rssProxyPlugin()],
  server: {
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
      '/bundles': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://127.0.0.1:4000',
        ws: true,
      },
    },
  },
});
