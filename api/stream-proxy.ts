import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function (request: VercelRequest, response: VercelResponse) {
    const { url, ...headers } = request.query;

    if (!url || typeof url !== 'string') {
        return response.status(400).send('Missing or invalid "url" query parameter.');
    }

    try {
        const targetUrl = decodeURIComponent(url);
        const fetchHeaders: HeadersInit = {};

        if (headers['x-forwarded-for'] && typeof headers['x-forwarded-for'] === 'string') {
            fetchHeaders['X-Forwarded-For'] = headers['x-forwarded-for'];
        }

        const streamResponse = await fetch(targetUrl, {
            headers: fetchHeaders,
        });

        if (!streamResponse.ok) {
            return response.status(streamResponse.status).send(streamResponse.statusText);
        }

        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        response.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With, Range, X-Forwarded-For');
        response.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');

        const contentType = streamResponse.headers.get('content-type') || '';

        // If it's an HLS manifest, we need to rewrite the URLs
        if (contentType.includes('application/vnd.apple.mpegurl') || contentType.includes('application/x-mpegurl')) {
            const manifestText = await streamResponse.text();
            const baseUrl = new URL(targetUrl);
            const manifestBaseUrl = new URL('.', baseUrl).href;

            const rewrittenManifest = manifestText.split('\n').map(line => {
                if (line.trim().length > 0 && !line.startsWith('#') && !line.startsWith('http')) {
                    return new URL(line, manifestBaseUrl).href;
                }
                return line;
            }).join('\n');

            streamResponse.headers.forEach((value, name) => {
                if (!name.startsWith('access-control-')) {
                    response.setHeader(name, value);
                }
            });

            response.send(rewrittenManifest);
        } else {
            // For non-manifest files, just stream the body directly
            streamResponse.headers.forEach((value, name) => {
                if (!name.startsWith('access-control-')) {
                    response.setHeader(name, value);
                }
            });

            if (streamResponse.body) {
                const reader = streamResponse.body.getReader();
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    response.write(value);
                }
            }
            response.end();
        }

    } catch (error: any) {
        console.error('Proxy error:', error);
        response.status(500).send(`Proxy error: ${error.message}`);
    }
}
