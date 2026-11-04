import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

const handleProxyError = (proxy: any) => {
  proxy.on('error', (_err: any, _req: any, res: any) => {
    // Gracefully handle offline backend on port 5050 so Vite doesn't dump ECONNREFUSED stack traces
    if (res && !res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 502, message: 'Backend service offline. Using client fallback data.' }));
    }
  });
};

function geminiDevPlugin(): Plugin {
  return {
    name: 'gemini-dev-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/skills/extract' && req.method === 'POST') {
          let apiKey = process.env.GEMINI_API_KEY;
          if (!apiKey) {
            const envPaths = [
              path.resolve(import.meta.dirname, '../.env'),
              path.resolve(import.meta.dirname, '.env')
            ];
            for (const ep of envPaths) {
              if (fs.existsSync(ep)) {
                const match = fs.readFileSync(ep, 'utf-8').match(/GEMINI_API_KEY=(.+)/);
                if (match) {
                  apiKey = match[1].trim();
                  break;
                }
              }
            }
          }

          if (!apiKey) {
            return next();
          }

          let bodyStr = '';
          req.on('data', chunk => { bodyStr += chunk; });
          req.on('end', async () => {
            try {
              const { text } = JSON.parse(bodyStr || '{}');
              if (!text) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ skills: [], source: 'gemini' }));
                return;
              }

              const prompt = `Extract all key technical skills, architectural concepts, languages, frameworks, and engineering tools from this text. Return a JSON object with a 'skills' string array.\nText:\n${text}`;
              const models = ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];

              for (const model of models) {
                try {
                  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
                  const geminiRes = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      contents: [{ parts: [{ text: prompt }] }],
                      generationConfig: {
                        responseMimeType: 'application/json',
                        responseSchema: {
                          type: 'OBJECT',
                          properties: {
                            skills: { type: 'ARRAY', items: { type: 'STRING' } }
                          },
                          required: ['skills']
                        }
                      }
                    })
                  });

                  if (!geminiRes.ok) continue;

                  const data: any = await geminiRes.json();
                  const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (candidateText) {
                    const parsed = JSON.parse(candidateText);
                    if (parsed.skills && Array.isArray(parsed.skills)) {
                      res.writeHead(200, {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                      });
                      res.end(JSON.stringify({
                        skills: parsed.skills,
                        source: 'gemini',
                        model: model
                      }));
                      return;
                    }
                  }
                } catch {
                  // try next
                }
              }
            } catch (e) {
              console.error('Dev Gemini extraction error', e);
            }
            next();
          });
          return;
        }
        next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), geminiDevPlugin()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5050',
        changeOrigin: true,
        secure: false,
        configure: handleProxyError,
      },
      '/geo': {
        target: 'http://127.0.0.1:5050',
        changeOrigin: true,
        secure: false,
        configure: handleProxyError,
      }
    }
  }
})
