/**
 * Vercel serverless handler — keeps the OpenRouter key on the server.
 */
import { buildChatMessages } from '../lib/knowledge.js';
import { sanitizeAssistantResponse } from '../lib/sanitize.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey =
    process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY;

  const model =
    process.env.OPENROUTER_MODEL ||
    process.env.VITE_OPENROUTER_MODEL ||
    'nex-agi/nex-n2-pro:free';

  if (!apiKey) {
    return res.status(500).json({
      error:
        'OpenRouter API key is not configured. Add OPENROUTER_API_KEY (or VITE_OPENROUTER_API_KEY) in your Vercel project settings, then redeploy.',
    });
  }

  const { userInput, history, messages: rawMessages } = req.body ?? {};

  let messages = rawMessages;
  let meta = null;

  if (!messages) {
    if (!userInput || typeof userInput !== 'string') {
      return res.status(400).json({ error: 'userInput is required' });
    }
    const built = await buildChatMessages(userInput, history ?? []);
    meta = built.meta;

    if (built.directAnswer) {
      return res.status(200).json({
        answer: sanitizeAssistantResponse(built.directAnswer),
        meta,
      });
    }

    messages = built.messages;
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  try {
    const referer =
      req.headers.origin ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:5173');

    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': referer,
          'X-Title': 'AI Support Desk',
        },
        body: JSON.stringify({ model, messages }),
      },
    );

    if (!response.ok) {
      let detail = '';
      try {
        const errorData = await response.json();
        detail = errorData.error?.message ?? '';
      } catch {
        /* ignore */
      }
      return res.status(response.status).json({
        error: detail || `OpenRouter request failed (${response.status})`,
      });
    }

    const data = await response.json();
    const rawAnswer = data.choices?.[0]?.message?.content?.trim();
    const answer = sanitizeAssistantResponse(rawAnswer);

    if (!answer) {
      return res.status(502).json({ error: 'Empty response from OpenRouter' });
    }

    return res.status(200).json({ answer, meta });
  } catch (err) {
    console.error('Chat API error:', err);
    return res.status(500).json({ error: 'Failed to reach the AI service' });
  }
}
