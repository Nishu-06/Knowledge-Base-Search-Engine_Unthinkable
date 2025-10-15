import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

import { chunkText } from './chunker.js';
import { embedTexts } from './embedder.js';
import { loadIndex, saveIndex, resetIndex } from './store.js';
import { synthesizeAnswer } from './synthesize.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// cosine similarity
function cosine(a, b) {
  return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

// health check
router.get('/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString(), provider: "Google Gemini" });
});

// reset index
router.post('/reset', (_req, res) => {
  resetIndex();
  res.json({ ok: true, message: 'Index reset.' });
});

// upload & index docs
router.post('/upload', upload.array('files'), async (req, res) => {
  try {
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ ok: false, error: 'No files uploaded.' });

    const index = loadIndex();
    let newChunks = [];

    for (const f of files) {
      const full = path.resolve(f.path);
      const origName = f.originalname;

      // ✅ only text files allowed (ignore pdf for now)
      if (!/\.(txt|md)$/i.test(origName)) {
        console.warn(`Skipping non-text file: ${origName}`);
        fs.unlinkSync(full);
        continue;
      }

      const rawText = fs.readFileSync(full, 'utf-8');

      // remove temp upload
      fs.unlinkSync(full);

      if (!rawText.trim()) continue;

      // chunking
      const chunks = chunkText(rawText);
      newChunks.push(...chunks.map((text, i) => ({
        id: `${origName}-${i}`,
        source: origName,
        chunk: i,
        text,
        uploadedAt: new Date().toISOString()
      })));
    }

    if (!newChunks.length) {
      return res.status(400).json({ ok: false, error: "No valid text extracted from uploaded files." });
    }

    // embeddings
    const embeddings = await embedTexts(newChunks.map(c => c.text));
    newChunks = newChunks.map((c, i) => ({ ...c, vector: embeddings[i] }));

    // save to index
    index.chunks.push(...newChunks);
    saveIndex(index);

    res.json({ ok: true, indexed_chunks: newChunks.length, files: files.map(f => f.originalname) });
  } catch (e) {
    console.error("Upload error:", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ✅ get all uploaded files
router.get('/files', (_req, res) => {
  try {
    const index = loadIndex();
    const files = {};

    index.chunks.forEach(c => {
      if (!files[c.source]) {
        files[c.source] = { name: c.source, chunks: 0, uploadedAt: c.uploadedAt || null };
      }
      files[c.source].chunks++;
    });

    res.json({ ok: true, files: Object.values(files) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ✅ delete a specific file from index
router.delete('/files/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    let index = loadIndex();

    const before = index.chunks.length;
    index.chunks = index.chunks.filter(c => c.source !== filename);
    const after = index.chunks.length;

    saveIndex(index);

    res.json({ ok: true, deleted: before - after, remaining: after });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// query
router.post('/query', express.json(), async (req, res) => {
  try {
    const { query, k = 5 } = req.body || {};
    if (!query) return res.status(400).json({ ok: false, error: 'Query required.' });

    const index = loadIndex();
    if (!index.chunks.length) return res.status(400).json({ ok: false, error: 'Index empty.' });

    // query embed
    const [qv] = await embedTexts([query]);

    // rank by cosine similarity
    const scored = index.chunks.map(c => ({ ...c, score: cosine(qv, c.vector) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);

    // remove duplicate citations
    const seen = new Set();
    const citations = scored.filter(c => {
      const key = `${c.source}-${c.chunk}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map((c, i) => ({
      index: i + 1,
      source: c.source,
      chunk: c.chunk,
      text: c.text,
      distance: 1 - c.score
    }));

    // LLM synthesis
    const answer = await synthesizeAnswer(query, citations);

    res.json({ ok: true, answer, citations });
  } catch (e) {
    console.error("Query error:", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
