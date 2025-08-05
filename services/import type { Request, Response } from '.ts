import type { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
        return res.status(400).send('Missing url parameter');
    }

    try {
        const userAgent = req.query['User-Agent'] || req.headers['user-agent'];
        const headers: HeadersInit = {
            'User-Agent': userAgent as string,
        };

        const response = await fetch(targetUrl, { headers });
        if (!response.ok) {
            throw new Error(`Upstream server responded with ${response.status}`);
        }

        // Copy response headers
        const resHeaders = response.headers;
        resHeaders.forEach((value, key) => {
            res.setHeader(key, value);
        });

        // Set content type if not set
        if (!res.getHeader('content-type')) {
            if (targetUrl.endsWith('.m3u8')) {
                res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            } else if (targetUrl.endsWith('.ts')) {
                res.setHeader('Content-Type', 'video/mp2t');
            }
        }

        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');

        // Stream the response
        const data = await response.arrayBuffer();
        res.send(Buffer.from(data));
    } catch (error) {
        console.error('[stream-proxy] Error:', error);
        res.status(500).send('Proxy error: ' + (error as Error).message);
    }
}
