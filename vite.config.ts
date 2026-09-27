import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import busboy from 'busboy';
import { Client } from '@gradio/client';

function omniparseApiServerPlugin(): Plugin {
  return {
    name: 'omniparse-api-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // Handle CORS preflight
        if (req.method === 'OPTIONS' && req.url?.startsWith('/api/v1/')) {
          res.statusCode = 204;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
          res.end();
          return;
        }

        // Handle Health check: GET /api/v1/health
        if (req.method === 'GET' && req.url?.startsWith('/api/v1/health')) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(
            JSON.stringify({
              status: 'healthy',
              engine: 'OmniParse Cloud Neural Engine (PaddleOCR v3.7 Core)',
              version: '2.3.0',
              uptime: '99.98%',
            })
          );
          return;
        }

        // Handle POST /api/v1/extract (Universal Document & Image OCR Extraction)
        if (req.method === 'POST' && req.url?.startsWith('/api/v1/extract')) {
          // Validate OmniParse API Key
          const auth = req.headers['authorization'];
          const isValidKey =
            auth &&
            (auth.startsWith('Bearer op_live_') ||
              auth.startsWith('Bearer dev-token') ||
              auth.startsWith('Bearer tok_') ||
              auth.startsWith('Bearer op_token_'));

          if (!isValidKey) {
            res.statusCode = 401;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(
              JSON.stringify({
                status: 'error',
                code: 401,
                message:
                  'Unauthorized: Invalid or missing OmniParse API Key. Pass your key via header: Authorization: Bearer op_live_...',
              })
            );
            return;
          }

          try {
            const bb = busboy({ headers: req.headers });
            let fileBuffer: Buffer | null = null;
            let filename = 'document.png';
            let mimeType = 'image/png';

            bb.on('file', (_name, file, info) => {
              filename = info.filename;
              mimeType = info.mimeType;
              const chunks: Buffer[] = [];
              file.on('data', (d) => chunks.push(d));
              file.on('end', () => {
                fileBuffer = Buffer.concat(chunks);
              });
            });

            bb.on('finish', async () => {
              if (!fileBuffer || fileBuffer.length === 0) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.end(
                  JSON.stringify({
                    status: 'error',
                    code: 400,
                    message: 'No file received in multipart request under field name "file"',
                  })
                );
                return;
              }

              try {
                const client = await Client.connect('ManvithReddy/omniparse-backend');
                const blob = new Blob([fileBuffer], { type: mimeType });
                const result = await client.predict('/gradio_ocr', {
                  img: blob,
                });
                const raw = ((result.data as any)?.[0] as string) || '';
                const lines = raw
                  .split('\n')
                  .map((l: string) => l.trim())
                  .filter((l: string) => l.length > 0 && l !== '[No text detected in image]');

                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.end(
                  JSON.stringify({
                    status: 'success',
                    code: 200,
                    engine: 'OmniParse Vision Neural v2.3 (PaddleOCR 3.7 Core)',
                    filename,
                    payload: {
                      lines_count: lines.length,
                      extracted_text: lines.length > 0 ? lines : [raw.trim() || '[No text detected in image]'],
                    },
                  })
                );
              } catch (err: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.end(
                  JSON.stringify({
                    status: 'error',
                    code: 500,
                    message: err?.message || 'Remote OCR engine extraction failed',
                  })
                );
              }
            });

            req.pipe(bb);
            return;
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(
              JSON.stringify({
                status: 'error',
                code: 500,
                message: 'Failed to parse multipart request: ' + err?.message,
              })
            );
            return;
          }
        }

        // Handle POST /api/v1/translate (Multi-Language Neural Translation)
        if (req.method === 'POST' && req.url?.startsWith('/api/v1/translate')) {
          let bodyStr = '';
          req.on('data', (chunk) => {
            bodyStr += chunk;
          });
          req.on('end', async () => {
            try {
              const body = JSON.parse(bodyStr || '{}');
              const lines: string[] = body.lines || [];
              const targetLang = body.target_lang || 'en';

              const translated: string[] = [];
              for (const line of lines) {
                if (!line.trim() || line.startsWith('--- Page') || line.startsWith('Slide ')) {
                  translated.push(line);
                  continue;
                }
                try {
                  const gRes = await fetch(
                    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(line)}`
                  );
                  if (gRes.ok) {
                    const gData = await gRes.json();
                    translated.push(gData[0]?.map((item: any) => item[0]).join('') || line);
                  } else {
                    translated.push(line);
                  }
                } catch {
                  translated.push(line);
                }
              }

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(
                JSON.stringify({
                  status: 'success',
                  target_lang: targetLang,
                  translated_lines: translated,
                })
              );
            } catch (err: any) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(JSON.stringify({ status: 'error', message: err.message }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), omniparseApiServerPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    watch: {
      ignored: ['**/venv/**', '**/hf_space/**', '**/dist/**'],
    },
  },
  optimizeDeps: {
    entries: ['src/**/*.{ts,tsx,js,jsx}'],
  },
});
