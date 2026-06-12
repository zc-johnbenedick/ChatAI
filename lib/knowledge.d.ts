export interface SupportRecord {
  id: string;
  normalized_question: string;
  support_answer: string;
  category: string;
  tags: string[];
  confidence_training_note?: string;
  escalation_rule?: string;
  sample_ai_response?: string;
}

export interface KnowledgeMatch {
  match: SupportRecord | null;
  score: number;
  similarity: number;
  lowConfidence: boolean;
}

export interface ChatMessage {
  role: string;
  content: string;
}

export interface ChatBuildMeta {
  similarity: number;
  lowConfidence: boolean;
  usedWebSearch: boolean;
  matchedTicketId: string | null;
  fromKnowledgeBase: boolean;
}

export interface ChatBuildResult {
  messages: ChatMessage[] | null;
  directAnswer: string | null;
  meta: ChatBuildMeta;
}

export const SIMILARITY_THRESHOLD: number;

export function loadRecords(): SupportRecord[];
export function getBestMatch(query: string): KnowledgeMatch;
export function buildSystemPrompt(options: {
  match: SupportRecord | null;
  similarity: number;
  webSearchContext?: string | null;
  lowConfidence?: boolean;
}): string;
export function buildChatMessages(
  userInput: string,
  history?: ChatMessage[],
): Promise<ChatBuildResult>;
