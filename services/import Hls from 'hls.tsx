import Hls from 'hls.js';

// ...existing code...

interface ExtendedHlsConfig extends Hls.Config {
    pLoader?: any;
    xhrSetup?: (xhr: XMLHttpRequest, url: string) => void;
}

const hlsConfig: Partial<ExtendedHlsConfig> = {
    pLoader: class ProxyHlsLoader extends Hls.DefaultConfig.loader {
        constructor(config: Hls.Config) {
            super(config);
            const load = this.load.bind(this);
            this.load = (context, config, callbacks) => {
                const url = context.url;
                
                // Skip if already proxied
                if (url.includes('/stream-proxy')) {
                    load(context, config, callbacks);
                    return;
                }

                // Get original URL from proxy URL if it exists
                const originalUrl = url.includes('?url=') 
                    ? decodeURIComponent(url.split('?url=')[1].split('&')[0])
                    : url;

                // Build new proxy URL
                let proxyUrl = `${window.location.origin}/stream-proxy?url=${encodeURIComponent(originalUrl)}`;
                if (context.headers?.['User-Agent']) {
                    proxyUrl += `&User-Agent=${encodeURIComponent(context.headers['User-Agent'])}`;
                }

                context.url = proxyUrl;
                load(context, config, callbacks);
            };
        }
    },
    // ...rest of hlsConfig...
};

// ...existing code...