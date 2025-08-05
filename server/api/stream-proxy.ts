import type { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
        return res.status(400).send('Missing url parameter');
    }

    try {
        // Copy relevant headers from the original request
        const headers: HeadersInit = {
            'User-Agent': req.headers['user-agent'] as string || '',
        };

        const response = await fetch(targetUrl, { headers });
        if (!response.ok) {
            throw new Error(`Upstream server responded with ${response.status}`);
        }

        // Copy response headers
        response.headers.forEach((value, key) => {
            res.setHeader(key, value);
        });

        // Set content type if not already set
        if (!res.getHeader('content-type')) {
            let contentType = response.headers.get('content-type');
            if (targetUrl.endsWith('.m3u8')) {
                contentType = 'application/vnd.apple.mpegurl';
            } else if (targetUrl.endsWith('.ts')) {
                contentType = 'video/mp2t';
            }
            if (contentType) {
                res.setHeader('Content-Type', contentType);
                console.log(`[stream-proxy] Setting Content-Type: ${contentType}`);
            }
        }

        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');

        // Stream the response
        let data = await response.arrayBuffer();
        let responseBuffer = Buffer.from(data);

        // If it's an M3U8, rewrite internal URLs to use the correct proxy port
        if (contentType && contentType.includes('application/vnd.apple.mpegurl')) {
            let m3u8Content = responseBuffer.toString('utf8');
            // Replace localhost:3001 with localhost:5173
            m3u8Content = m3u8Content.replace(/http:\/\/localhost:3001\/stream-proxy/g, `http://localhost:${req.socket.localPort}/stream-proxy`);
            responseBuffer = Buffer.from(m3u8Content, 'utf8');
        }

        res.send(responseBuffer);
    } catch (error) {
        console.error('[stream-proxy] Error:', error);
        res.status(500).send('Proxy error: ' + (error as Error).message);
    }
}
