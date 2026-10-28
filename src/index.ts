import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'NJ Essentials API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Phase 1: Customer UI Only. API routes will be implemented in subsequent phases.
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    message: 'Welcome to NJ Essentials Backend API. Database & Auth will be enabled in Phase 2.'
  });
});

app.listen(port, () => {
  console.log(`NJ Essentials Backend running at http://localhost:${port}`);
});
