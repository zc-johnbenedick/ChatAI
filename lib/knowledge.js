import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(
  __dirname,
  '../src/assets/support_chat_resolved_records.json',
);

/** @type {import('../src/types/support.js').SupportRecord[] | null} */
let cachedRecords = null;

/**
 * Loads resolved support tickets from NDJSON (one JSON object per line).
 * Cached after first read.
 */
export function loadRecords() {
  if (cachedRecords) return cachedRecords;

  const text = readFileSync(DATA_PATH, 'utf8');
  cachedRecords = text
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const row = JSON.parse(line);
      return {
        id: row.ticket_id,
        normalized_question: row.normalized_question,
        support_answer: row.support_answer,
        category: row.category,
        tags: row.tags ?? [],
      };
    });

  return cachedRecords;
}

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'are',
  'but',
  'not',
  'you',
  'all',
  'can',
  'had',
  'her',
  'was',
  'one',
  'our',
  'out',
  'day',
  'get',
  'has',
  'him',
  'his',
  'how',
  'its',
  'may',
  'new',
  'now',
  'old',
  'see',
  'two',
  'who',
  'did',
  'let',
  'say',
  'she',
  'too',
  'use',
  'why',
  'with',
  'this',
  'that',
  'from',
  'have',
  'what',
  'when',
  'your',
  'please',
  'help',
  'thanks',
  'thank',
  'hello',
  'good',
  'today',
  'already',
  'tried',
  'once',
  'advise',
]);

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

/**
 * @param {string} query
 */
export function getBestMatch(query) {
  const words = tokenize(query);
  if (words.length === 0) {
    return { match: null, score: 0 };
  }

  const records = loadRecords();
  let bestMatch = null;
  let highestScore = 0;

  for (const record of records) {
    const qWords = tokenize(record.normalized_question);
    const tagWords = record.tags.flatMap((tag) => tokenize(tag.replace(/_/g, ' ')));
    const categoryWords = tokenize(record.category);

    let score = 0;

    for (const word of words) {
      if (qWords.includes(word)) score += 3;
      if (tagWords.includes(word)) score += 2;
      if (categoryWords.includes(word)) score += 1.5;
      if (record.normalized_question.toLowerCase().includes(word)) score += 1;
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = record;
    }
  }

  return { match: bestMatch, score: highestScore };
}

/**
 * @param {import('../src/types/support.js').SupportRecord | null} match
 * @param {number} score
 */
export function buildSystemPrompt(match, score) {
  let prompt = `You are a helpful, concise customer support assistant for "AI Support Desk". The current date and time is ${new Date().toLocaleString()}. Use clear formatting (short paragraphs, bullet lists, and bold for key steps) when it improves readability. Turn internal agent instructions into direct, customer-facing language.`;

  if (match && score > 0) {
    prompt += `\n\nHere is a relevant resolved ticket from our knowledge base:
---
Ticket: ${match.id}
Category: ${match.category}
Past Question: ${match.normalized_question}
Support Answer: ${match.support_answer}
---
Instructions:
- If this ticket is relevant to the user's question, base your answer on the "Support Answer" (rewrite it clearly for the customer).
- If it is NOT relevant (general chit-chat, unrelated topic, or account-specific data you cannot verify), ignore the ticket and answer accurately yourself.`;
  }

  return prompt;
}

/**
 * @param {string} userInput
 * @param {{ role: string, content: string }[]} history
 */
export function buildChatMessages(userInput, history = []) {
  const { match, score } = getBestMatch(userInput);
  const systemPrompt = buildSystemPrompt(match, score);

  return [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: userInput },
  ];
}
