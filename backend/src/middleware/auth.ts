import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

interface JwtPayload {
  userId: string;
  role: string;
}

declare global {
  namespace Express {
    interface User extends JwtPayload {}
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies.token;

  if (!token) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Master admin only — manages organizer accounts
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}

// Organizer only — runs events and venues
export function requireOrganizer(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'ORGANIZER') {
    res.status(403).json({ error: 'Organizer access required' });
    return;
  }
  next();
}

// Organizer or master Admin
export function requirePrivileged(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'ORGANIZER' && req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Organizer or admin access required' });
    return;
  }
  next();
}

// Populates req.user if a valid JWT cookie is present — does not block unauthenticated requests
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.token;
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
      req.user = payload;
    } catch { /* invalid token — leave req.user undefined */ }
  }
  next();
}
