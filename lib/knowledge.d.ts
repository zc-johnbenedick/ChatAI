export interface SupportRecord {
  id: string;
  normalized_question: string;
  support_answer: string;
  category: string;
  tags: string[];
}

export interface KnowledgeMatch {
  match: SupportRecord | null;
  score: number;
}

export interface ChatMessage {
  role: string;
  content: string;
}

export function loadRecords(): SupportRecord[];
export function getBestMatch(query: string): KnowledgeMatch;
export function buildSystemPrompt(
  match: SupportRecord | null,
  score: number,
): string;
export function buildChatMessages(
  userInput: string,
  history?: ChatMessage[],
): ChatMessage[];
