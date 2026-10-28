import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_AUDIO_HOSTS = new Set([
  'everyayah.com',
  'www.everyayah.com',
  'verses.quran.com',
  'download.quranicaudio.com',
  'cdn.islamic.network',
  'audio.qurancdn.com',
  'mirrors.quranicaudio.com',
]);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // CORS-safe audio proxy so Web Audio API decodeAudioData works reliably across all Quran CDNs
  app.get('/api/audio-proxy', async (req, res) => {
    const rawUrl = req.query.url;
    if (typeof rawUrl !== 'string' || !rawUrl.startsWith('https://')) {
      res.status(400).json({ error: 'Invalid audio URL' });
      return;
    }

    try {
      const parsed = new URL(rawUrl);
      if (!ALLOWED_AUDIO_HOSTS.has(parsed.hostname)) {
        res.status(403).json({ error: 'Host not permitted' });
        return;
      }

      const upstream = await fetch(parsed.toString(), {
        headers: {
          'User-Agent': 'QuranReels-SadaqahJariyah/1.0',
          Accept: 'audio/mpeg,audio/*;q=0.9,*/*;q=0.8',
        },
      });

      if (!upstream.ok) {
        res.status(upstream.status).json({ error: `Upstream audio returned ${upstream.status}` });
        return;
      }

      const contentType = upstream.headers.get('content-type') || 'audio/mpeg';
      const contentLength = upstream.headers.get('content-length');

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Access-Control-Allow-Origin', '*');
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }

      const arrayBuffer = await upstream.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (err) {
      console.error('Audio proxy error:', err);
      res.status(502).json({ error: 'Failed to fetch upstream recitation audio' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Quran Reels server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
