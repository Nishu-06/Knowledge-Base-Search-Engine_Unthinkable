import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { ensureDirs } from './store.js';
import routes from './routes.js';

const app = express();
app.use(cors());
ensureDirs();

app.use('/', routes);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`KB-RAG backend running on http://localhost:${PORT}`);
});
