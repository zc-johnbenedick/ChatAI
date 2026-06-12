import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performWebSearch, queryNeedsFreshData } from './websearch.js';
import {
  formatSupportAnswer,
  shouldUseDirectAnswer,
} from './formatAnswer.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(
  __dirname,
  '../src/assets/support_chat_resolved_records.json',
);

/** Similarity threshold for using a knowledge-base ticket. */
export const SIMILARITY_THRESHOLD = 0.78;

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
        confidence_training_note: row.confidence_training_note ?? '',
        escalation_rule: row.escalation_rule ?? '',
        sample_ai_response: row.sample_ai_response ?? '',
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
 * Normalized similarity score between 0 and 1.
 * @param {string[]} queryWords
 * @param {import('../src/types/support.js').SupportRecord} record
 */
function computeSimilarity(queryWords, record) {
  if (queryWords.length === 0) return 0;

  const qWords = tokenize(record.normalized_question);
  const tagWords = record.tags.flatMap((tag) =>
    tokenize(tag.replace(/_/g, ' ')),
  );
  const categoryWords = tokenize(record.category);

  let matches = 0;

  for (const word of queryWords) {
    if (qWords.includes(word)) {
      matches += 1;
    } else if (tagWords.includes(word)) {
      matches += 0.75;
    } else if (categoryWords.includes(word)) {
      matches += 0.5;
    } else if (record.normalized_question.toLowerCase().includes(word)) {
      matches += 0.35;
    }
  }

  return Math.min(1, matches / queryWords.length);
}

/**
 * @param {string} query
 */
export function getBestMatch(query) {
  const words = tokenize(query);
  if (words.length === 0) {
    return {
      match: null,
      score: 0,
      similarity: 0,
      lowConfidence: true,
    };
  }

  const records = loadRecords();
  let bestMatch = null;
  let highestScore = 0;
  let bestSimilarity = 0;

  for (const record of records) {
    const qWords = tokenize(record.normalized_question);
    const tagWords = record.tags.flatMap((tag) =>
      tokenize(tag.replace(/_/g, ' ')),
    );
    const categoryWords = tokenize(record.category);

    let score = 0;

    for (const word of words) {
      if (qWords.includes(word)) score += 3;
      if (tagWords.includes(word)) score += 2;
      if (categoryWords.includes(word)) score += 1.5;
      if (record.normalized_question.toLowerCase().includes(word)) score += 1;
    }

    const similarity = computeSimilarity(words, record);

    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      highestScore = score;
      bestMatch = record;
    } else if (similarity === bestSimilarity && score > highestScore) {
      highestScore = score;
      bestMatch = record;
    }
  }

  const lowConfidence = bestSimilarity < SIMILARITY_THRESHOLD;

  return {
    match: lowConfidence ? null : bestMatch,
    score: highestScore,
    similarity: bestSimilarity,
    lowConfidence,
  };
}

/**
 * @param {{
 *   match: import('../src/types/support.js').SupportRecord | null,
 *   similarity: number,
 *   webSearchContext?: string | null,
 *   lowConfidence?: boolean,
 * }} options
 */
export function buildSystemPrompt({
  match,
  similarity,
  webSearchContext = null,
  lowConfidence = false,
}) {
  const now = new Date().toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  let prompt = `You are a customer support assistant for "AI Support Desk". Current date and time: ${now}.

Response rules:
1. Be direct, factual, and concise. One brief friendly line is fine, then give the answer.
2. Plain text only. Never use asterisk (*) or hyphen/dash (-) as list markers. Use numbered steps (1. 2. 3.) or short paragraphs.
3. Do not invent steps or options that are not supported by the context below.
4. Do not mention human support, specialists, or handoffs.`;

  if (match && similarity >= SIMILARITY_THRESHOLD) {
    prompt += `

Matched knowledge-base ticket (similarity ${similarity.toFixed(2)}):
Ticket: ${match.id}
Category: ${match.category}
Question: ${match.normalized_question}
Support Answer: ${match.support_answer}

Instructions:
1. Base your reply on the Support Answer above.
2. Rewrite agent notes into direct customer instructions without changing the steps.`;
  }

  if (webSearchContext) {
    prompt += `

Web search context:
${webSearchContext}

Instructions:
1. Use this for current facts when relevant.
2. If results are incomplete, say what you know briefly.`;
  }

  if (lowConfidence) {
    prompt += `

No close knowledge-base match (similarity ${similarity.toFixed(2)}).
Instructions:
1. Answer using web context or general guidance.
2. Stay practical and do not guess account-specific details.`;
  }

  return prompt;
}

/**
 * @param {string} userInput
 * @param {{ role: string, content: string }[]} history
 */
export async function buildChatMessages(userInput, history = []) {
  const { match, similarity, lowConfidence } = getBestMatch(userInput);

  const meta = {
    similarity,
    lowConfidence,
    usedWebSearch: false,
    matchedTicketId: match?.id ?? null,
    fromKnowledgeBase: false,
  };

  if (match && shouldUseDirectAnswer(match, similarity)) {
    return {
      messages: null,
      directAnswer: formatSupportAnswer(match),
      meta: { ...meta, fromKnowledgeBase: true },
    };
  }

  let webSearchContext = null;
  if (queryNeedsFreshData(userInput, similarity)) {
    try {
      webSearchContext = await performWebSearch(userInput);
    } catch (err) {
      console.error('Web search failed:', err);
    }
  }

  const systemPrompt = buildSystemPrompt({
    match,
    similarity,
    webSearchContext,
    lowConfidence,
  });

  return {
    messages: [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: userInput },
    ],
    directAnswer: null,
    meta: {
      ...meta,
      usedWebSearch: Boolean(webSearchContext),
    },
  };
}
