export interface ChatTurn {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AssistantMeta {
  similarity: number;
  lowConfidence: boolean;
  usedWebSearch: boolean;
  matchedTicketId: string | null;
  fromKnowledgeBase: boolean;
}

export interface AssistantResponse {
  answer: string;
  meta: AssistantMeta | null;
}

/**
 * Sends a question through the server API. Knowledge-base matching runs
 * on the server against support_chat_resolved_records.json.
 */
export async function askAssistant(
  userInput: string,
  history: ChatTurn[] = [],
): Promise<AssistantResponse> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userInput, history }),
  });

  let data: { answer?: string; error?: string; meta?: AssistantMeta | null } =
    {};
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

  return {
    answer:
      data.answer?.trim() ||
      "I'm sorry, I received an empty response. Please try again.",
    meta: data.meta ?? null,
  };
}
