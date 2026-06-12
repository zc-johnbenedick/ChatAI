import { records, type SupportRecord } from '../assets/records';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined;
const MODEL =
  (import.meta.env.VITE_OPENROUTER_MODEL as string | undefined) ??
  'nex-agi/nex-n2-pro:free';

export interface KnowledgeMatch {
  match: SupportRecord | null;
  score: number;
}

/**
 * Lightweight keyword scoring against the local knowledge base.
 * Returns the best matching record (or null) and its score.
 */
export function getBestMatch(query: string): KnowledgeMatch {
  const words = query
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2);

  let bestMatch: SupportRecord | null = null;
  let highestScore = 0;

  for (const record of records) {
    const qWords = record.normalized_question.toLowerCase().split(/\W+/);
    let score = 0;

    for (const word of words) {
      if (qWords.includes(word)) score += 2;
      if (record.tags.includes(word)) score += 1.5;
      if (record.category.toLowerCase().includes(word)) score += 1;
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = record;
    }
  }

  return { match: bestMatch, score: highestScore };
}

function buildSystemPrompt(match: SupportRecord | null, score: number): string {
  let prompt = `You are a helpful, concise customer support assistant for "AI Support Desk". The current date and time is ${new Date().toLocaleString()}. Use clear formatting (short paragraphs, bullet lists, and bold for key steps) when it improves readability.`;

  if (match && score > 0) {
    prompt += `\n\nHere is a relevant resolved ticket from our knowledge base:
---
Past Question: ${match.normalized_question}
Support Answer: ${match.support_answer}
---
Instructions:
- If the knowledge-base ticket is relevant to the user's question, base your answer on the "Support Answer".
- If it is NOT relevant (e.g. general chit-chat, the current time, or an unrelated issue), ignore the ticket and answer accurately yourself.`;
  }

  return prompt;
}

export interface ChatTurn {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Sends a question to OpenRouter, grounded with relevant knowledge-base context.
 */
export async function askAssistant(
  userInput: string,
  history: ChatTurn[] = [],
): Promise<string> {
  if (!API_KEY) {
    return 'The assistant is not configured yet. Add `VITE_OPENROUTER_API_KEY` to your `.env` file and restart the dev server.';
  }

  const { match, score } = getBestMatch(userInput);
  const systemPrompt = buildSystemPrompt(match, score);

  const messages: ChatTurn[] = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: userInput },
  ];

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'AI Support Desk',
    },
    body: JSON.stringify({ model: MODEL, messages }),
  });

  if (!response.ok) {
    let detail = '';
    try {
      const errorData = await response.json();
      detail = errorData.error?.message ?? '';
    } catch {
      /* ignore parse errors */
    }
    throw new Error(detail || `Request failed with status ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  return content?.trim() || "I'm sorry, I received an empty response. Please try again.";
}
