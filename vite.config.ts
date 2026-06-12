import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/** Dev-only proxy so `/api/chat` works locally without `vercel dev`. */
function devChatApi(): Plugin {
  return {
    name: 'dev-chat-api',
    configureServer(server) {
      server.middlewares.use('/api/chat', async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        const env = loadEnv(server.config.mode, process.cwd(), '');
        const apiKey = env.OPENROUTER_API_KEY || env.VITE_OPENROUTER_API_KEY;
        const model =
          env.OPENROUTER_MODEL ||
          env.VITE_OPENROUTER_MODEL ||
          'nex-agi/nex-n2-pro:free';

        if (!apiKey) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              error:
                'Add OPENROUTER_API_KEY or VITE_OPENROUTER_API_KEY to your .env file.',
            }),
          );
          return;
        }

        const chunks: Buffer[] = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', async () => {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString());
            const { messages } = body ?? {};

            if (!Array.isArray(messages) || messages.length === 0) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'messages array is required' }));
              return;
            }

            const response = await fetch(
              'https://openrouter.ai/api/v1/chat/completions',
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                  'HTTP-Referer': 'http://localhost:5173',
                  'X-Title': 'AI Support Desk',
                },
                body: JSON.stringify({ model, messages }),
              },
            );

            const data = (await response.json()) as {
              error?: { message?: string };
              choices?: { message?: { content?: string } }[];
            };

            if (!response.ok) {
              res.statusCode = response.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  error:
                    data.error?.message ||
                    `OpenRouter request failed (${response.status})`,
                }),
              );
              return;
            }

            const answer = data.choices?.[0]?.message?.content?.trim();
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ answer: answer ?? '' }));
          } catch (err) {
            console.error('Dev chat API error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Failed to reach the AI service' }));
          }
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), mode === 'development' ? devChatApi() : undefined].filter(
    Boolean,
  ),
}));
