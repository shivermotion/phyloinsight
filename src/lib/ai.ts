// Minimal runtime types we actually need
type TextClassifier = (input: string | string[]) => Promise<unknown>;
interface GenerationOptions { max_new_tokens?: number }
interface GeneratedText { generated_text: string }
type TextGenerator = (prompt: string, options?: GenerationOptions) => Promise<GeneratedText[]>;

type PipelineFactory = (task: string, model?: string) => Promise<unknown>;

let classifier: TextClassifier | null = null;

interface WindowWithTransformers {
  transformers?: {
    pipeline: PipelineFactory;
  };
}

async function loadTransformersFromCDN(): Promise<{ pipeline: PipelineFactory }> {
  if (typeof window === 'undefined') throw new Error('CDN load only in browser');
  const w = window as unknown as Window & WindowWithTransformers;
  if (w.transformers?.pipeline) return { pipeline: w.transformers.pipeline };
  console.log('🌐 [AI] Loading transformers from CDN …');

  const cdnUrl = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.14.2/dist/transformers.min.js';
  const code = `import { pipeline } from '${cdnUrl}'; window.transformers = { pipeline };`;

  // Inject inline ES module that attaches pipeline to window
  const s = document.createElement('script');
  s.id = 'xenova-transformers-cdn';
  s.type = 'module';
  s.textContent = code;
  document.head.appendChild(s);

  // Poll for availability (up to ~5s)
  const start = Date.now();
  await new Promise<void>((resolve, reject) => {
    const check = () => {
      if (w.transformers?.pipeline) return resolve();
      if (Date.now() - start > 5000) return reject(new Error('Failed to attach transformers from CDN'));
      setTimeout(check, 100);
    };
    check();
  });

  if (!w.transformers?.pipeline) throw new Error('CDN transformers not available');
  console.log('✅ [AI] transformers CDN ready');
  return { pipeline: w.transformers.pipeline };
}

export async function initAI() {
  if (typeof window === 'undefined') return; // SSR/edge guard
  if (!classifier) {
    try {
      console.log('🤖 [AI] Loading transformers pipeline: text-classification (BioBERT)…');
      const { pipeline } = await import('@xenova/transformers');
      const p = (await pipeline('text-classification', 'Xenova/biobert_v1.1_pubmed')) as unknown as TextClassifier;
      classifier = p;
      console.log('✅ [AI] Classifier ready (in-browser WASM).');
    } catch (e) {
      console.log('⚠️ [AI] Local import failed, using CDN fallback:', e);
      const { pipeline } = await loadTransformersFromCDN();
      const p = (await pipeline('text-classification', 'Xenova/biobert_v1.1_pubmed')) as unknown as TextClassifier;
      classifier = p;
      console.log('✅ [AI] Classifier ready via CDN (in-browser WASM).');
    }
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
    console.time('⏱️ [AI] parseQuery inference');
    const result = await classifier(text);
    console.timeEnd('⏱️ [AI] parseQuery inference');
    console.log('🧪 [AI] parseQuery output:', result);
    const firstLabel = Array.isArray(result) ? (result as any)[0]?.label : undefined;
    return {
      species: typeof firstLabel === 'string' && firstLabel.toLowerCase().includes('mammal') ? 'mammals' : 'all',
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
    console.log('🤖 [AI] Loading transformers pipeline: text-generation (GPT-2)…');
    let pipelineFn: PipelineFactory;
    try {
      const { pipeline } = await import('@xenova/transformers');
      pipelineFn = pipeline as unknown as PipelineFactory;
    } catch (e) {
      console.log('⚠️ [AI] Local import failed, using CDN fallback for generator:', e);
      const { pipeline } = await loadTransformersFromCDN();
      pipelineFn = pipeline;
    }
    const generator = (await pipelineFn('text-generation', 'Xenova/gpt2')) as unknown as TextGenerator;
    console.log('✅ [AI] Generator ready (in-browser WASM).');
    const prompt = `Explain a conservation score of ${scores.conservation} in simple terms:`;
    console.time('⏱️ [AI] explainResults generation');
    const output = await generator(prompt, { max_new_tokens: 48 });
    console.timeEnd('⏱️ [AI] explainResults generation');
    console.log('🧪 [AI] explainResults output:', output);
    return output?.[0]?.generated_text ?? `Conservation score ${scores.conservation ?? 0}.`;
  } catch (e) {
    console.log('⚠️ [AI] Falling back to template explanation:', e);
    return `Conservation score ${scores.conservation ?? 0}: higher means more conserved.`;
  }
}


