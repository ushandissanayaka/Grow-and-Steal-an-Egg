// Messages from the Feedback mailbox, one JSON object per line in data/feedback.jsonl.

import { appendFile, mkdir } from 'fs/promises';
import path from 'path';

const DATA_DIR = path.resolve(process.env.DATA_DIR || './data'); // the same folder as the profiles
const FILE = path.join(DATA_DIR, 'feedback.jsonl');

export async function saveFeedback(entry) {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    await appendFile(FILE, `${JSON.stringify(entry)}
`);
  } catch (err) {
    console.warn('[feedback] could not save:', err?.message || err);
  }
}
