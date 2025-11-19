import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    server: {
      proxy: {
        '/prime-freeview-aes128': {
          target: 'https://d38thhtbc3g3fc.cloudfront.net',
          changeOrigin: true,
          secure: false,
        },
        '/maori-tv-cf': {
          target: 'https://d47743dknc7xq.cloudfront.net',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/maori-tv-cf/, ''),
        },
        '/te-reo-cf': {
          target: 'https://dfecjp0pnemzw.cloudfront.net',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/te-reo-cf/, ''),
        },
        '/shine-tv-proxy': {
          target: 'https://info.shinetv.co.nz',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/shine-tv-proxy/, ''),
        },
        '/mjh-redirect': {
          target: 'https://i.mjh.nz',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/mjh-redirect/, ''),
          configure: (proxy) => {
            proxy.on('proxyRes', (proxyRes, req, res) => {
              if (proxyRes.headers.location) {
                if (proxyRes.headers.location.includes('d47743dknc7xq.cloudfront.net')) {
                  proxyRes.headers.location = proxyRes.headers.location.replace(
                    'https://d47743dknc7xq.cloudfront.net',
                    '/maori-tv-cf'
                  );
                } else if (proxyRes.headers.location.includes('dfecjp0pnemzw.cloudfront.net')) {
                  proxyRes.headers.location = proxyRes.headers.location.replace(
                    'https://dfecjp0pnemzw.cloudfront.net',
                    '/te-reo-cf'
                  );
                } else if (proxyRes.headers.location.includes('info.shinetv.co.nz')) {
                  proxyRes.headers.location = proxyRes.headers.location.replace(
                    'https://info.shinetv.co.nz',
                    '/shine-tv-proxy'
                  );
                }
              }
            });
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
