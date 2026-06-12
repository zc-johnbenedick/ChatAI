import { records, type SupportRecord } from '../assets/records';

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
 * Sends a question through the server API (Vercel function in production,
 * Vite dev middleware locally). The OpenRouter key never ships to the browser.
 */
export async function askAssistant(
  userInput: string,
  history: ChatTurn[] = [],
): Promise<string> {
  const { match, score } = getBestMatch(userInput);
  const systemPrompt = buildSystemPrompt(match, score);

  const messages: ChatTurn[] = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: userInput },
  ];

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });

  let data: { answer?: string; error?: string } = {};
  try {
    data = await response.json();
  } catch {
    /* ignore parse errors */
  }

  if (!response.ok) {
    throw new Error(
      data.error ||
        `Request failed with status ${response.status}. If you just added env vars on Vercel, redeploy the project.`,
    );
  }

  return (
    data.answer?.trim() ||
    "I'm sorry, I received an empty response. Please try again."
  );
}
