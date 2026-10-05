// Downloads the embeddings model ahead of time (e.g. during the Render build),
// so the server does not fetch ~130 MB every time it wakes up.
import { pipeline } from '@huggingface/transformers';

const model = process.env.EMBEDDINGS_MODEL ?? 'Xenova/multilingual-e5-small';
const startedAt = Date.now();
await pipeline('feature-extraction', model, { dtype: 'q8' });
console.log(`Embeddings model ready: ${model} (${Date.now() - startedAt} ms)`);
