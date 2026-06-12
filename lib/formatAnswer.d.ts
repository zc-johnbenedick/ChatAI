import type { SupportRecord } from '../src/types/support.js';

export function formatSupportAnswer(record: SupportRecord): string;

export function shouldUseDirectAnswer(
  record: SupportRecord | null,
  similarity: number,
): boolean;
