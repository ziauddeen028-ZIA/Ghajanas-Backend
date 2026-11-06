import express, { Request, Response } from 'express';
import cors from 'cors';
import { config } from './config.js';

import authRoutes from './routes/auth.js';
import orderRoutes from './routes/orders.js';
import profileRoutes from './routes/profile.js';
import categoryRoutes from './routes/categories.js';
import productRoutes from './routes/products.js';
import cartRoutes from './routes/cart.js';

const app = express();

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'https://ghajanas.in',
  'https://www.ghajanas.in',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Ghajanas API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);

// API Welcome
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    message: 'Welcome to Ghajanas Backend API.',
    status: 'running',
  });
});

// Local development only
if (config.nodeEnv !== 'production') {
  app.listen(config.port, () => {
    console.log(
      `🌿 Ghajanas Backend running at http://localhost:${config.port}`
    );
    console.log(
      `🔐 Admin Whitelist: ${config.adminEmails.join(', ')}`
    );
  });
}

// Vercel serverless export
export default app;