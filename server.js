import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import { Parser } from 'm3u8-parser';

const app = express();
app.use(cors());
const port = 3001;

app.get('/stream-proxy', async (req, res) => {
  const targetUrl = decodeURIComponent(String(req.query.url));

  if (!targetUrl) {
    return res.status(400).send('URL is required');
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      return res.status(response.status).send(response.statusText);
    }

    const contentType = response.headers.get('content-type');

    if (contentType && (contentType.includes('application/vnd.apple.mpegurl') || targetUrl.endsWith('.m3u8'))) {
      let m3u8Content = await response.text();
      console.log(`[Proxy] Original M3U8 Content for ${targetUrl}:\n${m3u8Content}`); // Log full content
      const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
      console.log(`[Proxy] Base URL: ${baseUrl}`);

      // Replace relative URLs with proxied URLs
      m3u8Content = m3u8Content.replace(/(URI=)(["']?)([^"'\s,]*?)(["']?)/g, (match, p1, p2, p3, p4) => {
        if (p3.startsWith('http')) {
          return match;
        }
        const proxiedUrl = `http://localhost:${port}/stream-proxy?url=${encodeURIComponent(baseUrl + p3)}`;
        return `${p1}${p2}${proxiedUrl}${p4}`;
      });
      m3u8Content = m3u8Content.replace(/(^[^#].*\.(?:ts|aac|mp4|m4s|m3u8)(?:\?.*)?$)/gm, (match) => {
        if (match.startsWith('http')) {
          return match;
        }
        const proxiedUrl = `http://localhost:${port}/stream-proxy?url=${encodeURIComponent(baseUrl + match)}`;
        return proxiedUrl;
      });

      console.log(`[Proxy] Modified M3U8 Content:\n${m3u8Content}`); // Log full content

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.send(m3u8Content);
    } else {
      response.body.pipe(res);
    }
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).send(error.message);
  }
});

app.listen(port, () => {
  console.log(`Proxy server listening at http://localhost:${port}`);
});