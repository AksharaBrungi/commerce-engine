import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.ts';
import { users, sellerProfiles } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'commerce_engine_jwt_secret_local_dev_key_2026';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: 'CUSTOMER' | 'SELLER' | 'ADMIN';
  phone?: string | null;
  sellerProfileId?: string;
  sellerStatus?: string;
  storeName?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function generateToken(payload: { id: string; email: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export async function authenticateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Please sign in to continue.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };
    const userRows = await db.select().from(users).where(eq(users.id, decoded.id)).limit(1);

    if (userRows.length === 0) {
      res.status(401).json({ error: 'User session not found or expired.' });
      return;
    }

    const u = userRows[0];
    const authUser: AuthenticatedUser = {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role as 'CUSTOMER' | 'SELLER' | 'ADMIN',
      phone: u.phone,
    };

    if (u.role === 'SELLER') {
      const sellerRows = await db.select().from(sellerProfiles).where(eq(sellerProfiles.userId, u.id)).limit(1);
      if (sellerRows.length > 0) {
        authUser.sellerProfileId = sellerRows[0].id;
        authUser.sellerStatus = sellerRows[0].status;
        authUser.storeName = sellerRows[0].storeName;
      }
    }

    req.user = authUser;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired session token.' });
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };
    const userRows = await db.select().from(users).where(eq(users.id, decoded.id)).limit(1);

    if (userRows.length > 0) {
      const u = userRows[0];
      const authUser: AuthenticatedUser = {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role as 'CUSTOMER' | 'SELLER' | 'ADMIN',
        phone: u.phone,
      };

      if (u.role === 'SELLER') {
        const sellerRows = await db.select().from(sellerProfiles).where(eq(sellerProfiles.userId, u.id)).limit(1);
        if (sellerRows.length > 0) {
          authUser.sellerProfileId = sellerRows[0].id;
          authUser.sellerStatus = sellerRows[0].status;
          authUser.storeName = sellerRows[0].storeName;
        }
      }

      req.user = authUser;
    }
  } catch {
    // Ignore invalid optional tokens
  }
  next();
}

export function requireRole(allowedRoles: Array<'CUSTOMER' | 'SELLER' | 'ADMIN'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Please sign in to continue.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Access denied: You do not have permission to view this resource.' });
      return;
    }

    next();
  };
}

export function requireApprovedSeller(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Please sign in to continue.' });
    return;
  }

  if (req.user.role !== 'SELLER') {
    res.status(403).json({ error: 'Only sellers can access this endpoint.' });
    return;
  }

  if (req.user.sellerStatus !== 'APPROVED') {
    res.status(403).json({
      error: `Your seller account is currently ${req.user.sellerStatus || 'PENDING'}. Please await administrator approval.`,
    });
    return;
  }

  if (!req.user.sellerProfileId) {
    res.status(403).json({ error: 'Seller profile not found.' });
    return;
  }

  next();
}
