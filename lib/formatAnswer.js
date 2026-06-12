/**
 * Formats a knowledge-base support_answer into a customer-facing reply.
 * Preserves exact steps from the dataset — no LLM rewriting.
 */

const OPENERS = [
  "Here's how to do that:",
  'You can follow these steps:',
  'Here is what you need to do:',
];

/**
 * @param {string} ticketId
 */
function pickOpener(ticketId) {
  const num = parseInt(ticketId.replace(/\D/g, ''), 10) || 0;
  return OPENERS[num % OPENERS.length];
}

/**
 * @param {string} text
 */
function capitalize(text) {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Converts internal agent notes into direct customer instructions.
 * @param {string} text
 */
function toCustomerVoice(text) {
  return text
    .replace(/^Tell the customer to /i, '')
    .replace(/^Guide the customer to /i, '')
    .replace(/^Ask the customer to /i, '')
    .replace(/^Ask them to /i, '')
    .replace(/^Tell the customer /i, '')
    .replace(/^Guide the customer /i, '')
    .replace(/advise the customer to /gi, '')
    .replace(/^Explain that /i, 'Note that ')
    .replace(/^Explain the /i, 'The ')
    .replace(/^If the order has not shipped/i, 'If your order has not shipped')
    .replace(
      /^If already shipped, /i,
      'If your order has already shipped, ',
    )
    .replace(/^Tell the customer they can /i, 'You can ')
    .trim();
}

/**
 * @param {string} text
 * @returns {string[]}
 */
function splitIntoSteps(text) {
  const steps = [];
  const sentences = text.split(/\.\s+/).filter(Boolean);

  for (let sentence of sentences) {
    sentence = sentence.trim();
    if (!sentence) continue;

    const goToMatch = sentence.match(
      /^((?:Go to|Open|Navigate to|You can upgrade from)\s+[^,]+),\s*(.+)$/i,
    );

    if (goToMatch) {
      steps.push(`${capitalize(goToMatch[1])}.`);
      steps.push(capitalize(goToMatch[2].replace(/\.$/, '')) + '.');
      continue;
    }

    steps.push(sentence.endsWith('.') ? capitalize(sentence) : `${capitalize(sentence)}.`);
  }

  return steps;
}

/**
 * @param {import('../src/types/support.js').SupportRecord} record
 * @returns {string}
 */
export function formatSupportAnswer(record) {
  const voice = toCustomerVoice(record.support_answer);
  const steps = splitIntoSteps(voice);
  const opener = pickOpener(record.id);

  let body;
  if (steps.length <= 1) {
    body = steps[0] ?? capitalize(voice);
  } else {
    body = steps.map((step, index) => `${index + 1}. ${step}`).join('\n');
  }

  let reply = `${opener}\n\n${body}`;

  return reply;
}

/**
 * @param {import('../src/types/support.js').SupportRecord} record
 * @param {number} similarity
 */
export function shouldUseDirectAnswer(record, similarity) {
  return Boolean(record) && similarity >= 0.78;
}
