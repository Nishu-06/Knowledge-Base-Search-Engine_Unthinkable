import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve('data');
const INDEX_PATH = path.join(DATA_DIR, 'index.json');

export function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const uploads = path.resolve('uploads');
  if (!fs.existsSync(uploads)) fs.mkdirSync(uploads, { recursive: true });
}

export function loadIndex() {
  ensureDirs();
  if (!fs.existsSync(INDEX_PATH)) return { chunks: [] };
  return JSON.parse(fs.readFileSync(INDEX_PATH, 'utf-8'));
}

export function saveIndex(index) {
  ensureDirs();
  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2), 'utf-8');
}

export function resetIndex() {
  ensureDirs();
  if (fs.existsSync(INDEX_PATH)) fs.unlinkSync(INDEX_PATH);
  saveIndex({ chunks: [] });
}
