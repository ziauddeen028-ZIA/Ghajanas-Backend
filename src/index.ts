import express, { Request, Response } from 'express';
import cors from 'cors';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import orderRoutes from './routes/orders.js';
import profileRoutes from './routes/profile.js';
import categoryRoutes from './routes/categories.js';
import productRoutes from './routes/products.js';

const app = express();
const port = config.port;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Ghajanas / NJ Essentials API',
    version: '1.0.0',
    phase: 'Phase 1 - Customer & Admin Authentication Foundation',
    timestamp: new Date().toISOString(),
  });
});

// Mounted Phase 1 Routers
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/profile', profileRoutes);

// Mounted Phase 2 Catalog & Admin Routers
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);

// Root API Welcome & Phase explanation
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    message: 'Welcome to Ghajanas / NJ Essentials Backend API.',
    phase: 'Phase 1 Active: Supabase Token Verification, Auth Guards & Ownership Scoping.',
    next: 'Phase 2: PostgreSQL with Prisma ORM persistence, full product catalog DB, and admin CRUD.',
  });
});

app.listen(port, () => {
  console.log(`🌿 Ghajanas Backend running at http://localhost:${port}`);
  console.log(`🔐 Admin Whitelist: ${config.adminEmails.join(', ')}`);
});
