import { Request, Response, NextFunction } from 'express';
import { User } from '@supabase/supabase-js';
import { getSupabaseServerClient } from '../lib/supabase.js';
import { config } from '../config.js';

export interface AuthenticatedUser extends User {
  isAdmin?: boolean;
}

// Augment Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Middleware: Verifies the Supabase JWT token passed in the Authorization header.
 * Rejects with 401 if token is missing, expired, or invalid.
 */
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Authentication required. Missing or malformed Bearer token.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const supabase = getSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({
        error: 'Invalid or expired authentication session. Please log in again.',
        details: error?.message,
      });
      return;
    }

    // Determine admin status based on secure server-side checks:
    // 1. Supabase app_metadata.role === 'admin' (can only be set via server/service-role, never by client)
    // 2. Server-side ADMIN_EMAILS whitelist
    const isAppMetadataAdmin = user.app_metadata?.role === 'admin';
    const isWhitelistedEmail = user.email
      ? config.adminEmails.includes(user.email.toLowerCase())
      : false;
    const isAdmin = isAppMetadataAdmin || isWhitelistedEmail;

    const authenticatedUser: AuthenticatedUser = {
      ...user,
      isAdmin,
    };

    req.user = authenticatedUser;
    next();
  } catch (err) {
    console.error('Error during token verification:', err);
    res.status(401).json({
      error: 'Failed to verify authentication token.',
    });
  }
};

/**
 * Middleware: Requires the authenticated user to hold verified admin authorization.
 * Must be preceded by `requireAuth`. Rejects with 403 Forbidden if not admin.
 */
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      error: 'Authentication required before checking administrator rights.',
    });
    return;
  }

  if (!req.user.isAdmin) {
    res.status(403).json({
      error: 'Access denied: Administrator privileges are required to access this resource.',
    });
    return;
  }

  next();
};

