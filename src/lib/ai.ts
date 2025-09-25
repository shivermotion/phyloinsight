import type { Pipeline } from '@xenova/transformers';

let classifier: Pipeline | null = null;

export async function initAI() {
  if (typeof window === 'undefined') return; // SSR/edge guard
  if (!classifier) {
    const { pipeline } = await import('@xenova/transformers');
    classifier = await pipeline('text-classification', 'Xenova/biobert_v1.1_pubmed');
  }
}

export interface QueryParams {
  species: string;
  metric: string;
}

export async function parseQuery(text: string): Promise<QueryParams> {
  try {
    if (typeof window === 'undefined') {
      return { species: 'all', metric: 'conservation' };
    }
    await initAI();
    if (!classifier) throw new Error('classifier not ready');
    const result = await (classifier as Pipeline)(text);
    return {
      species: (Array.isArray(result) && (result as any)[0]?.label?.toLowerCase().includes('mammal')) ? 'mammals' : 'all',
      metric: 'conservation',
    };
  } catch (err) {
    console.log('AI parsing fallback:', err);
    return { species: 'all', metric: 'conservation' };
  }
}

export async function explainResults(scores: Record<string, number>): Promise<string> {
  if (typeof window === 'undefined') {
    return `Conservation score ${scores.conservation ?? 0}: higher means more conserved.`;
  }
  try {
    const { pipeline } = await import('@xenova/transformers');
    const generator = await pipeline('text-generation', 'Xenova/gpt2');
    const prompt = `Explain a conservation score of ${scores.conservation} in simple terms:`;
    const output = await (generator as any)(prompt, { max_new_tokens: 48 });
    return output?.[0]?.generated_text ?? `Conservation score ${scores.conservation ?? 0}.`;
  } catch (e) {
    return `Conservation score ${scores.conservation ?? 0}: higher means more conserved.`;
  }
}


