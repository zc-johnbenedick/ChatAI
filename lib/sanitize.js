/**
 * Strips markdown asterisks and dash/asterisk bullet markers from assistant replies.
 * The UI still renders markdown, but support answers should read as plain text.
 */

/**
 * @param {string | undefined | null} text
 * @returns {string}
 */
export function sanitizeAssistantResponse(text) {
  if (!text) return '';

  let cleaned = text
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/__([^_\n]+)__/g, '$1')
    .replace(/_([^_\n]+)_/g, '$1');

  const lines = cleaned.split('\n');
  let listCounter = 0;

  cleaned = lines
    .map((line) => {
      const bulletMatch = line.match(/^(\s*)[-*+]\s+(.*)$/);
      if (bulletMatch) {
        listCounter += 1;
        return `${bulletMatch[1]}${listCounter}. ${bulletMatch[2]}`;
      }

      if (line.trim() === '') {
        listCounter = 0;
      } else if (!/^\s*\d+\.\s/.test(line)) {
        listCounter = 0;
      }

      return line;
    })
    .join('\n');

  return cleaned.trim();
}
