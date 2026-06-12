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
