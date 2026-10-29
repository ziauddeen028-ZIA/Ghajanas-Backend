import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/auth/me
 * Returns authenticated user info along with verified admin rights.
 */
router.get('/me', requireAuth, (req: Request, res: Response) => {
  const user = req.user!;
  res.json({
    user: {
      id: user.id,
      email: user.email,
      fullName: user.user_metadata?.full_name || '',
      phone: user.user_metadata?.phone || '',
      isAdmin: !!user.isAdmin,
    },
  });
});

/**
 * GET /api/auth/admin/verify
 * Validates whether the bearer token holds authorized admin rights.
 * Responds 200 if authorized, 401 if unauthenticated, 403 if unauthorized.
 */
router.get('/admin/verify', requireAuth, requireAdmin, (req: Request, res: Response) => {
  const user = req.user!;
  res.json({
    status: 'authorized',
    message: 'Admin authorization verified.',
    admin: {
      id: user.id,
      email: user.email,
      role: 'admin',
    },
  });
});

export default router;

